import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MessageCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import GifPicker from '@/components/feed/GifPicker';
import EmojiPicker from '@/components/feed/EmojiPicker';
import FollowButton from '@/components/profile/FollowButton';
import { AvatarImage } from '@/components/ui/avatar';

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  is_flagged: boolean;
}

interface PostCardProps {
  post: Post;
  posterUsername: string;
  posterAvatarUrl?: string | null;
}

interface Comment {
  id: string;
  content: string;
  gif_url: string | null;
  user_id: string;
  created_at: string;
  is_flagged: boolean;
  is_deleted: boolean;
  profile?: { username: string };
}

export default function PostCard({ post, posterUsername, posterAvatarUrl, onDeleted }: PostCardProps & { onDeleted?: () => void }) {
  const { user, isAdmin } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const canDelete = user && (user.id === post.user_id || isAdmin);

  const deletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      // Delete image from storage
      const path = post.image_url.split('/post-images/')[1];
      if (path) await supabase.storage.from('post-images').remove([path]);
      // Delete post row
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      setDeleted(true);
      toast.success('Post deleted');
      onDeleted?.();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle().then(({ data }) => setLiked(!!data));
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id).then(({ count }) => setLikeCount(count || 0));
  }, [post.id, user]);

  useEffect(() => {
    if (!showComments) return;
    loadComments();
  }, [showComments]);

  if (deleted) return null;

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (data) {
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

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
    if (!error) {
      toast.success('Comment deleted');
      loadComments();
    } else {
      toast.error('Failed to delete comment');
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      // Check if user is banned
      const { data: userProfile } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', user.id).maybeSingle();
      if (userProfile?.is_banned) {
        toast.error('🚫 Your account has been banned due to violating the community guidelines. You cannot post comments.', { duration: 6000 });
        setSubmitting(false);
        return;
      }
      if (userProfile?.is_suspended) {
        toast.error('⚠️ Your account is suspended due to violating the community guidelines. You cannot post comments.', { duration: 6000 });
        setSubmitting(false);
        return;
      }

      const resp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'text', content: newComment, userId: user.id, postId: post.id },
      });
      
      if (resp.data?.flagged) {
        toast.error('⚠️ Your comment was detected as cyberbullying and has been removed.', { duration: 5000 });
        setNewComment('');
        setSubmitting(false);
        return;
      }

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

  const submitGif = async (gifUrl: string, isFlaggedInDataset: boolean) => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      // Check if user is banned
      const { data: userProfile } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', user.id).maybeSingle();
      if (userProfile?.is_banned) {
        toast.error('🚫 Your account has been banned due to violating the community guidelines. You cannot post content.', { duration: 6000 });
        setSubmitting(false);
        return;
      }
      if (userProfile?.is_suspended) {
        toast.error('⚠️ Your account is suspended due to violating the community guidelines. You cannot post content.', { duration: 6000 });
        setSubmitting(false);
        return;
      }
      // If the GIF is from the known cyberbullying dataset, auto-block it immediately
      if (isFlaggedInDataset) {
        // Log to flagged_content via moderation edge function
        await supabase.functions.invoke('moderate-content', {
          body: { type: 'gif', content: gifUrl, userId: user.id, postId: post.id, forceFlag: true },
        });
        toast.error('⚠️ This GIF was detected as cyberbullying by CNN analysis and has been automatically deleted.', { duration: 5000 });
        setSubmitting(false);
        return;
      }

      // Moderate unknown GIFs using CNN simulation
      const resp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'image', content: gifUrl, userId: user.id, postId: post.id },
      });

      if (resp.data?.flagged) {
        toast.error('⚠️ This GIF was detected as harmful by CNN analysis and has been automatically deleted.', { duration: 5000 });
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: user.id,
        content: '[GIF]',
        gif_url: gifUrl,
      });
      if (error) throw error;
      loadComments();
    } catch (err: any) {
      toast.error('Failed to post GIF');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg mb-4 card-animate animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={posterAvatarUrl || undefined} alt={posterUsername} />
            <AvatarFallback className="instagram-gradient text-primary-foreground text-xs font-semibold">
              {posterUsername[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">{posterUsername}</span>
          {post.is_flagged && <AlertTriangle className="h-4 w-4 text-warning" />}
        </div>
        <div className="flex items-center gap-2">
          <FollowButton targetUserId={post.user_id} compact />
          {canDelete && (
            <button onClick={deletePost} className="text-destructive/60 hover:text-destructive transition-colors" title="Delete post">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="aspect-square bg-muted">
        <img src={post.image_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" loading="lazy" />
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="icon-click hover:opacity-60 transition-opacity">
            <Heart className={`h-6 w-6 ${liked ? 'fill-destructive text-destructive' : ''} ${animateHeart ? 'animate-heart-pop' : ''}`} />
          </button>
          <button onClick={() => setShowComments(!showComments)} className="icon-click hover:opacity-60 transition-opacity">
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
              <div key={c.id} className="text-sm group flex items-start gap-1">
                <div className="flex-1">
                  <span className="font-semibold">{c.profile?.username}</span>{' '}
                  {c.gif_url ? (
                    <img src={c.gif_url} alt="GIF" className="mt-1 rounded max-w-[200px] max-h-[150px]" />
                  ) : (
                    c.content
                  )}
                  <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                {user && user.id === c.user_id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          </div>
          <form onSubmit={submitComment} className="flex gap-2 items-center">
            <GifPicker onSelect={submitGif} disabled={submitting} />
            <EmojiPicker onSelect={(emoji) => setNewComment(prev => prev + emoji)} disabled={submitting} />
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
