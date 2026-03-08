import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bell } from 'lucide-react';
import InstagramLogo from '@/components/icons/InstagramLogo';
import CameraCapture from '@/components/camera/CameraCapture';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AppHeader() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchNotifications() {
      // Count: pending follow requests targeting me
      const { count: reqCount } = await supabase
        .from('follow_requests')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', user!.id)
        .eq('status', 'pending');

      // Count: likes on my posts in last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user!.id);

      let likeCount = 0;
      if (myPosts && myPosts.length > 0) {
        const postIds = myPosts.map(p => p.id);
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)
          .neq('user_id', user!.id)
          .gte('created_at', since);
        likeCount = count || 0;
      }

      // Count: story likes in last 24h
      const { data: myStories } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', user!.id);

      let storyLikeCount = 0;
      if (myStories && myStories.length > 0) {
        const storyIds = myStories.map(s => s.id);
        const { count } = await supabase
          .from('story_likes')
          .select('*', { count: 'exact', head: true })
          .in('story_id', storyIds)
          .neq('user_id', user!.id)
          .gte('created_at', since);
        storyLikeCount = count || 0;
      }

      if (!cancelled) {
        setUnreadCount((reqCount || 0) + likeCount + storyLikeCount);
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        {/* Left: Colorful Logo */}
        <Link to="/" className="flex items-center gap-1.5">
          <div className="instagram-logo-gradient rounded-lg p-[5px]">
            <InstagramLogo className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold instagram-gradient-text tracking-tight">Insta Lite</span>
        </Link>

        {/* Right: Action icons */}
        <div className="flex items-center gap-3.5">
          <CameraCapture />
          <Link to="/notifications" className="relative hover:opacity-60 transition-opacity" title="Notifications">
            <Heart className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/messages" className="relative hover:opacity-60 transition-opacity" title="Messages">
            <MessageCircle className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
