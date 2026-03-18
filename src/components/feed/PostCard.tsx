import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MessageCircle, Trash2, Flag, Send, Bookmark, BookmarkCheck, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import GifPicker from '@/components/feed/GifPicker';
import ShareDialog from '@/components/feed/ShareDialog';
import EmojiPicker from '@/components/feed/EmojiPicker';
import FollowButton from '@/components/profile/FollowButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [bookmarked, setBookmarked] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const canDelete = user && (user.id === post.user_id || isAdmin);

  // Double-tap to like
  let lastTap = 0;
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked) toggleLike();
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 800);
    }
    lastTap = now;
  };

  const deletePost = async () => {
    try {
      const path = post.image_url.split('/post-images/')[1];
      if (path) await supabase.storage.from('post-images').remove([path]);
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
    if (!error) { toast.success('Comment deleted'); loadComments(); }
    else toast.error('Failed to delete comment');
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      const { data: userProfile } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', user.id).maybeSingle();
      if (userProfile?.is_banned) { toast.error('🚫 Your account has been banned.', { duration: 6000 }); setSubmitting(false); return; }
      if (userProfile?.is_suspended) { toast.error('⚠️ Your account is suspended.', { duration: 6000 }); setSubmitting(false); return; }

      const resp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'text', content: newComment, userId: user.id, postId: post.id },
      });
      if (resp.data?.flagged) { toast.error('⚠️ Your comment was detected as cyberbullying and has been removed.', { duration: 5000 }); setNewComment(''); setSubmitting(false); return; }

      const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, content: newComment });
      if (error) throw error;
      setNewComment('');
      loadComments();
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  const submitGif = async (gifUrl: string, isFlaggedInDataset: boolean) => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const { data: userProfile } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', user.id).maybeSingle();
      if (userProfile?.is_banned) { toast.error('🚫 Your account has been banned.', { duration: 6000 }); setSubmitting(false); return; }
      if (userProfile?.is_suspended) { toast.error('⚠️ Your account is suspended.', { duration: 6000 }); setSubmitting(false); return; }

      if (isFlaggedInDataset) {
        await supabase.functions.invoke('moderate-content', { body: { type: 'gif', content: gifUrl, userId: user.id, postId: post.id, forceFlag: true } });
        toast.error('⚠️ This GIF was detected as cyberbullying.', { duration: 5000 });
        setSubmitting(false);
        return;
      }

      const resp = await supabase.functions.invoke('moderate-content', { body: { type: 'image', content: gifUrl, userId: user.id, postId: post.id } });
      if (resp.data?.flagged) { toast.error('⚠️ This GIF was detected as harmful.', { duration: 5000 }); setSubmitting(false); return; }

      const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, content: '[GIF]', gif_url: gifUrl });
      if (error) throw error;
      loadComments();
    } catch { toast.error('Failed to post GIF'); }
    finally { setSubmitting(false); }
  };

  const reportPost = async () => {
    if (!user) return;
    const reason = prompt('Why are you reporting this post?');
    if (!reason?.trim()) return;
    const { error } = await supabase.from('flagged_content').insert({
      content_type: 'post', user_id: user.id, content_id: post.id,
      original_content: post.image_url, reason: `User report: ${reason.trim()}`, action_taken: 'pending_review',
    });
    if (error) toast.error('Failed to report');
    else toast.success('Post reported. Our team will review it.');
  };

  const reportComment = async (commentId: string, content: string) => {
    if (!user) return;
    const reason = prompt('Why are you reporting this comment?');
    if (!reason?.trim()) return;
    const { error } = await supabase.from('flagged_content').insert({
      content_type: 'comment', user_id: user.id, content_id: commentId,
      original_content: content, reason: `User report: ${reason.trim()}`, action_taken: 'pending_review',
    });
    if (error) toast.error('Failed to report');
    else toast.success('Comment reported.');
  };

  const sharePost = () => {
    setShareOpen(true);
  };

  return (
    <div className="bg-card border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-[2px] rounded-full instagram-gradient">
            <Avatar className="h-8 w-8 border-2 border-card">
              <AvatarImage src={posterAvatarUrl || undefined} alt={posterUsername} />
              <AvatarFallback className="text-xs font-semibold bg-muted">
                {posterUsername[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{posterUsername}</span>
            {user && user.id !== post.user_id && <FollowButton targetUserId={post.user_id} compact />}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:opacity-60 transition-opacity p-1">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            {canDelete && (
              <DropdownMenuItem onClick={deletePost} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
            {user && user.id !== post.user_id && (
              <DropdownMenuItem onClick={reportPost}>
                <Flag className="h-4 w-4 mr-2" /> Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Image — double tap to like */}
      <div className="relative aspect-square bg-muted" onClick={handleDoubleTap}>
        <img src={post.image_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" loading="lazy" />
        {/* Double-tap heart animation */}
        {doubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="h-24 w-24 text-white fill-white drop-shadow-lg animate-heart-burst" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="hover:opacity-60 transition-opacity">
              <Heart className={`h-6 w-6 transition-all ${liked ? 'fill-destructive text-destructive' : ''} ${animateHeart ? 'scale-125' : 'scale-100'}`} />
            </button>
            <button onClick={() => setShowComments(!showComments)} className="hover:opacity-60 transition-opacity">
              <MessageCircle className="h-6 w-6" />
            </button>
            <button onClick={sharePost} className="hover:opacity-60 transition-opacity">
              <Send className="h-6 w-6 -rotate-12" />
            </button>
          </div>
          <button onClick={() => setBookmarked(!bookmarked)} className="hover:opacity-60 transition-opacity">
            {bookmarked ? <BookmarkCheck className="h-6 w-6 fill-foreground" /> : <Bookmark className="h-6 w-6" />}
          </button>
        </div>

        {/* Likes */}
        <p className="font-semibold text-sm mt-2">{likeCount.toLocaleString()} likes</p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm mt-1">
            <span className="font-semibold">{posterUsername}</span>{' '}{post.caption}
          </p>
        )}

        {/* Comments preview */}
        <button onClick={() => setShowComments(!showComments)} className="text-muted-foreground text-sm mt-1 block">
          {showComments ? 'Hide comments' : 'View all comments'}
        </button>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-3 pb-3 border-t border-border mt-2 pt-2">
          <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
            {comments.map(c => (
              <div key={c.id} className="text-sm group flex items-start gap-1">
                <div className="flex-1">
                  <span className="font-semibold">{c.profile?.username}</span>{' '}
                  {c.gif_url ? (
                    <img src={c.gif_url} alt="GIF" className="mt-1 rounded max-w-[200px] max-h-[150px]" loading="lazy" />
                  ) : c.content}
                  <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                {user && user.id === c.user_id && (
                  <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {user && user.id !== c.user_id && (
                  <button onClick={() => reportComment(c.id, c.gif_url || c.content)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1" title="Report">
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          </div>
          <form onSubmit={submitComment} className="flex gap-2 items-center">
            <GifPicker onSelect={submitGif} disabled={submitting} />
            <EmojiPicker onSelect={(emoji) => setNewComment(prev => prev + emoji)} disabled={submitting} />
            <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="text-sm bg-secondary border-0 flex-1" disabled={submitting} />
            <Button type="submit" variant="ghost" size="sm" className="text-primary font-semibold" disabled={submitting || !newComment.trim()}>
              Post
            </Button>
          </form>
        </div>
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postId={post.id}
        posterUsername={posterUsername}
        caption={post.caption}
      />

      <style>{`
        @keyframes heart-burst-post {
          0% { opacity: 0; transform: scale(0); }
          15% { opacity: 1; transform: scale(1.2); }
          30% { transform: scale(0.95); }
          45% { transform: scale(1.05); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
        .animate-heart-burst {
          animation: heart-burst-post 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
