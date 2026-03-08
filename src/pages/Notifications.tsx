import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, UserPlus, Eye, Check, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
  id: string;
  type: 'follow_request' | 'post_like' | 'story_like' | 'story_view';
  userId: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  extra?: string; // e.g. post caption
  requestId?: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    setLoading(true);
    const all: NotificationItem[] = [];
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Follow requests
    const { data: requests } = await supabase
      .from('follow_requests')
      .select('id, requester_id, created_at, status')
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requests) {
      const ids = requests.map(r => r.requester_id);
      const { data: profiles } = ids.length > 0
        ? await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', ids)
        : { data: [] };
      const pMap = new Map((profiles || []).map(p => [p.user_id, p]));
      for (const r of requests) {
        const p = pMap.get(r.requester_id);
        all.push({
          id: `fr-${r.id}`,
          type: 'follow_request',
          userId: r.requester_id,
          username: p?.username || 'user',
          avatarUrl: p?.avatar_url || null,
          createdAt: r.created_at,
          requestId: r.id,
        });
      }
    }

    // 2. Post likes
    const { data: myPosts } = await supabase
      .from('posts')
      .select('id, caption')
      .eq('user_id', user.id);

    if (myPosts && myPosts.length > 0) {
      const postIds = myPosts.map(p => p.id);
      const capMap = new Map(myPosts.map(p => [p.id, p.caption]));
      const { data: likes } = await supabase
        .from('likes')
        .select('id, post_id, user_id, created_at')
        .in('post_id', postIds)
        .neq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);

      if (likes && likes.length > 0) {
        const uids = [...new Set(likes.map(l => l.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', uids);
        const pMap = new Map((profiles || []).map(p => [p.user_id, p]));
        for (const l of likes) {
          const p = pMap.get(l.user_id);
          all.push({
            id: `pl-${l.id}`,
            type: 'post_like',
            userId: l.user_id,
            username: p?.username || 'user',
            avatarUrl: p?.avatar_url || null,
            createdAt: l.created_at,
            extra: capMap.get(l.post_id) || '',
          });
        }
      }
    }

    // 3. Story likes
    const { data: myStories } = await supabase
      .from('stories')
      .select('id')
      .eq('user_id', user.id);

    if (myStories && myStories.length > 0) {
      const storyIds = myStories.map(s => s.id);
      const { data: sLikes } = await supabase
        .from('story_likes')
        .select('id, story_id, user_id, created_at')
        .in('story_id', storyIds)
        .neq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(30);

      if (sLikes && sLikes.length > 0) {
        const uids = [...new Set(sLikes.map(l => l.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', uids);
        const pMap = new Map((profiles || []).map(p => [p.user_id, p]));
        for (const l of sLikes) {
          const p = pMap.get(l.user_id);
          all.push({
            id: `sl-${l.id}`,
            type: 'story_like',
            userId: l.user_id,
            username: p?.username || 'user',
            avatarUrl: p?.avatar_url || null,
            createdAt: l.created_at,
          });
        }
      }
    }

    // Sort all by time
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setItems(all);
    setLoading(false);
  }

  async function acceptRequest(requestId: string, requesterId: string) {
    if (!user) return;
    await supabase.from('follow_requests').update({ status: 'accepted' }).eq('id', requestId);
    await supabase.from('follows').insert({ follower_id: requesterId, following_id: user.id });
    toast.success('Follow request accepted');
    setItems(prev => prev.filter(i => i.requestId !== requestId));
  }

  async function rejectRequest(requestId: string) {
    await supabase.from('follow_requests').delete().eq('id', requestId);
    toast('Request declined');
    setItems(prev => prev.filter(i => i.requestId !== requestId));
  }

  function getIcon(type: string) {
    switch (type) {
      case 'follow_request': return <UserPlus className="h-4 w-4 text-primary" />;
      case 'post_like': return <Heart className="h-4 w-4 text-destructive" fill="currentColor" />;
      case 'story_like': return <Heart className="h-4 w-4 text-accent" fill="currentColor" />;
      default: return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function getMessage(item: NotificationItem) {
    switch (item.type) {
      case 'follow_request': return 'requested to follow you';
      case 'post_like': return `liked your post${item.extra ? `: "${item.extra.slice(0, 30)}…"` : ''}`;
      case 'story_like': return 'liked your story';
      default: return 'interacted with your content';
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center">
          <button onClick={() => navigate(-1)} className="p-1 hover:opacity-60 transition-opacity mr-3">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="font-semibold text-base">Notifications</span>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-14">

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/profile/${item.userId}`)}>
                  <AvatarImage src={item.avatarUrl || ''} />
                  <AvatarFallback className="bg-muted text-xs">{item.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">
                    <span className="font-semibold">{item.username}</span>{' '}
                    <span className="text-muted-foreground">{getMessage(item)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.type === 'follow_request' ? (
                    <>
                      <Button size="sm" className="h-7 text-xs px-3" onClick={() => acceptRequest(item.requestId!, item.userId)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => rejectRequest(item.requestId!)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    getIcon(item.type)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
