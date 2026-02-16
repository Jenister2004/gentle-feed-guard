import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-8">
        <div className="flex items-center gap-8 mb-8">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="instagram-gradient text-primary-foreground text-2xl font-bold">
              {profile?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{profile?.username}</h1>
            <p className="text-muted-foreground text-sm">{profile?.full_name}</p>
            <p className="text-sm mt-1"><span className="font-semibold">{posts.length}</span> posts</p>
            {profile?.bio && <p className="text-sm mt-1">{profile.bio}</p>}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
              <div key={post.id} className="aspect-square">
                <img src={post.image_url} alt="" className="w-full h-full object-cover rounded" loading="lazy" />
              </div>
            ))}
          </div>
          {posts.length === 0 && <p className="text-center text-muted-foreground py-10">No posts yet.</p>}
        </div>
      </main>
    </div>
  );
}
