import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MessageCircle, MoreHorizontal, Trash2, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  is_flagged: boolean;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_flagged: boolean;
  is_deleted: boolean;
  profile?: { username: string };
}

export default function PostCard({ post, posterUsername }: { post: Post; posterUsername: string }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if liked
    supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle().then(({ data }) => setLiked(!!data));
    // Get like count
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id).then(({ count }) => setLikeCount(count || 0));
  }, [post.id, user]);

  useEffect(() => {
    if (!showComments) return;
    loadComments();
  }, [showComments]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (data) {
      // Fetch usernames for comments
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.username]));
      setComments(data.map(c => ({ ...c, profile: { username: profileMap[c.user_id] || 'unknown' } })));
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikeCount(prev => prev + 1);
      setAnimateHeart(true);
      setTimeout(() => setAnimateHeart(false), 300);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      // Call moderation edge function
      const resp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'text', content: newComment, userId: user.id, postId: post.id },
      });
      
      if (resp.data?.flagged) {
        toast.error('⚠️ Your comment was detected as cyberbullying and has been removed.', { duration: 5000 });
        setNewComment('');
        setSubmitting(false);
        return;
      }

      // Insert comment
      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: user.id,
        content: newComment,
      });
      if (error) throw error;
      setNewComment('');
      loadComments();
    } catch (err: any) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="instagram-gradient text-primary-foreground text-xs font-semibold">
              {posterUsername[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">{posterUsername}</span>
          {post.is_flagged && <AlertTriangle className="h-4 w-4 text-warning" />}
        </div>
      </div>

      {/* Image */}
      <div className="aspect-square bg-muted">
        <img src={post.image_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" loading="lazy" />
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="hover:opacity-60 transition-opacity">
            <Heart className={`h-6 w-6 ${liked ? 'fill-destructive text-destructive' : ''} ${animateHeart ? 'animate-heart-pop' : ''}`} />
          </button>
          <button onClick={() => setShowComments(!showComments)} className="hover:opacity-60 transition-opacity">
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
        <p className="font-semibold text-sm mt-2">{likeCount} likes</p>
        {post.caption && (
          <p className="text-sm mt-1">
            <span className="font-semibold">{posterUsername}</span>{' '}
            {post.caption}
          </p>
        )}
        <button onClick={() => setShowComments(!showComments)} className="text-muted-foreground text-sm mt-1 hover:underline">
          {showComments ? 'Hide comments' : 'View comments'}
        </button>
        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-3 border-t border-border mt-2 pt-2">
          <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
            {comments.map(c => (
              <div key={c.id} className="text-sm">
                <span className="font-semibold">{c.profile?.username}</span>{' '}
                {c.content}
                <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          </div>
          <form onSubmit={submitComment} className="flex gap-2">
            <Input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="text-sm bg-secondary border-0 flex-1"
              disabled={submitting}
            />
            <Button type="submit" variant="ghost" size="sm" className="text-primary font-semibold" disabled={submitting || !newComment.trim()}>
              Post
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
