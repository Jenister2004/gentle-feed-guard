import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PostCard from '@/components/feed/PostCard';
import CreatePost from '@/components/feed/CreatePost';
import AppHeader from '@/components/layout/AppHeader';
import StoryBar from '@/components/stories/StoryBar';
import { Loader2 } from 'lucide-react';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { username: string; avatar_url: string | null }>>({});

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data);
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profs } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
      if (profs) {
        setProfiles(Object.fromEntries(profs.map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url }])));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();

    // Realtime subscription for new posts
    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {})
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30 animate-page-enter">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 pt-16 pb-8">
        <StoryBar />
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No posts yet.</p>
            <p className="text-muted-foreground text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} posterUsername={profiles[post.user_id]?.username || 'unknown'} posterAvatarUrl={profiles[post.user_id]?.avatar_url} />
          ))
        )}
      </main>
    </div>
  );
}
