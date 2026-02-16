
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    is_banned BOOLEAN NOT NULL DEFAULT false,
    warning_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flag_reason TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update comments" ON public.comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Likes table
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by authenticated" ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Flagged content log for admin
CREATE TABLE public.flagged_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'comment' or 'image'
    content_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_content TEXT,
    reason TEXT NOT NULL,
    action_taken TEXT DEFAULT 'auto_deleted',
    reviewed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view flagged content" ON public.flagged_content FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert flagged content" ON public.flagged_content FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update flagged content" ON public.flagged_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Max 10 users
  IF user_count >= 10 THEN
    RAISE EXCEPTION 'Maximum number of users (10) reached';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- First user becomes admin, rest are regular users
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flagged_content;

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images');
CREATE POLICY "Anyone can view post images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
