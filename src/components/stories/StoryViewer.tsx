import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, MoreVertical, Trash2, Flag, Heart, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StoryGroup {
  userId: string;
  username: string;
  stories: { id: string; image_url: string; created_at: string }[];
}

interface StoryViewerProps {
  group: StoryGroup;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function StoryViewer({ group, onClose, onDeleted }: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stories, setStories] = useState(group.stories);
  const [closing, setClosing] = useState(false);
  const [imageTransition, setImageTransition] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Like state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [animateHeart, setAnimateHeart] = useState(false);

  // Views state
  const [viewCount, setViewCount] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ username: string; avatar_url: string | null }[]>([]);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);

  const story = stories[currentIndex];
  const isOwner = user?.id === group.userId;

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }, [onClose]);

  // Record view + load like/view data when story changes
  useEffect(() => {
    if (!story || !user) return;

    // Record view (ignore errors for duplicates)
    if (user.id !== group.userId) {
      supabase.from('story_views').insert({ story_id: story.id, viewer_id: user.id }).then(() => {});
    }

    // Load like state
    supabase.from('story_likes').select('id').eq('story_id', story.id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));

    // Load like count
    supabase.from('story_likes').select('id', { count: 'exact', head: true }).eq('story_id', story.id)
      .then(({ count }) => setLikeCount(count || 0));

    // Load view count (owner only)
    if (isOwner) {
      supabase.from('story_views').select('id', { count: 'exact', head: true }).eq('story_id', story.id)
        .then(({ count }) => setViewCount(count || 0));
    }
  }, [story?.id, user?.id]);

  // Timer
  useEffect(() => {
    if (paused || confirmDelete || menuOpen || showViewers) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setImageTransition(true);
            setTimeout(() => {
              setCurrentIndex(i => i + 1);
              setImageTransition(false);
            }, 150);
            return 0;
          } else {
            handleClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentIndex, stories.length, handleClose, paused, confirmDelete, menuOpen, showViewers]);

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setImageTransition(true);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setProgress(0);
        setImageTransition(false);
      }, 150);
    } else {
      handleClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setImageTransition(true);
      setTimeout(() => {
        setCurrentIndex(i => i - 1);
        setProgress(0);
        setImageTransition(false);
      }, 150);
    }
  };

  const deleteStory = async () => {
    if (!story) return;
    const { error } = await supabase.from('stories').delete().eq('id', story.id);
    if (error) { toast.error('Failed to delete story'); return; }
    toast.success('Story deleted');
    const remaining = stories.filter((_, i) => i !== currentIndex);
    onDeleted?.();
    if (remaining.length === 0) { handleClose(); return; }
    setStories(remaining);
    setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
    setProgress(0);
    setConfirmDelete(false);
  };

  const toggleLike = async () => {
    if (!story || !user) return;
    if (liked) {
      await supabase.from('story_likes').delete().eq('story_id', story.id).eq('user_id', user.id);
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('story_likes').insert({ story_id: story.id, user_id: user.id });
      setLiked(true);
      setLikeCount(c => c + 1);
      setAnimateHeart(true);
      setTimeout(() => setAnimateHeart(false), 600);
    }
  };

  const reportUser = () => {
    const reason = window.prompt('Why are you reporting this story?');
    if (!reason || !story || !user) return;
    supabase.from('flagged_content').insert({
      content_type: 'story',
      content_id: story.id,
      user_id: user.id,
      reason,
      original_content: story.image_url,
      action_taken: 'pending_review',
    }).then(({ error }) => {
      if (error) toast.error('Failed to report');
      else toast.success('Story reported. We will review it.');
    });
  };

  const loadViewers = async () => {
    if (!story) return;
    const { data } = await supabase
      .from('story_views')
      .select('viewer_id')
      .eq('story_id', story.id);
    if (data && data.length > 0) {
      const ids = data.map(v => v.viewer_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      setViewers((profiles || []).map(p => ({ username: p.username, avatar_url: p.avatar_url })));
    } else {
      setViewers([]);
    }
    setShowViewers(true);
  };

  if (!story) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/95 flex items-center justify-center transition-all duration-300 ${
        closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{ animation: closing ? undefined : 'story-open 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        setTouchDelta(0);
      }}
      onTouchMove={(e) => {
        if (!touchStart) return;
        const dx = e.touches[0].clientX - touchStart.x;
        setTouchDelta(dx);
      }}
      onTouchEnd={() => {
        setPaused(false);
        if (touchStart) {
          if (touchDelta < -50) {
            goNext();
          } else if (touchDelta > 50) {
            goPrev();
          }
          setTouchStart(null);
          setTouchDelta(0);
        }
      }}
    >
      <style>{`
        @keyframes story-open {
          0% { opacity: 0; transform: scale(0.3); }
          60% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes story-image-in {
          0% { opacity: 0; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes heart-burst {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div
        className="relative w-full max-w-sm h-[85vh] max-h-[700px] transition-transform duration-100"
        style={{ transform: touchDelta ? `translateX(${touchDelta * 0.4}px)` : undefined }}
      >
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-3 right-3 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full instagram-gradient flex items-center justify-center">
              <span className="text-xs font-bold text-white">{group.username[0]?.toUpperCase()}</span>
            </div>
            <span className="text-white text-sm font-semibold">{group.username}</span>
            <span className="text-white/60 text-xs">
              {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* 3-dot menu */}
            <DropdownMenu onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={e => e.stopPropagation()}
                  className="text-white hover:opacity-70 transition-all active:scale-90 p-1"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete story
                  </DropdownMenuItem>
                )}
                {!isOwner && (
                  <DropdownMenuItem onClick={reportUser}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={handleClose} className="text-white hover:opacity-70 transition-all active:scale-90 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Story image */}
        <img
          key={story.id}
          src={story.image_url}
          alt="Story"
          className={`w-full h-full object-cover rounded-xl transition-all duration-200 ${
            imageTransition ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
          style={{ animation: imageTransition ? undefined : 'story-image-in 0.3s ease-out' }}
        />

        {/* Navigation areas */}
        <button onClick={goPrev} className="absolute left-0 top-16 bottom-24 w-1/3 z-10" aria-label="Previous story" />
        <button onClick={goNext} className="absolute right-0 top-16 bottom-24 w-1/3 z-10" aria-label="Next story" />

        {/* Nav arrows */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 rounded-full p-1 text-white opacity-0 hover:opacity-100 transition-all active:scale-90">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 rounded-full p-1 text-white opacity-0 hover:opacity-100 transition-all active:scale-90">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Bottom bar — Like + Views */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
          {/* Like button */}
          <button
            onClick={e => { e.stopPropagation(); toggleLike(); }}
            className="flex items-center gap-1.5 text-white active:scale-90 transition-transform"
          >
            <Heart
              className={`h-6 w-6 transition-all ${liked ? 'fill-destructive text-destructive' : 'text-white'}`}
              style={animateHeart ? { animation: 'heart-burst 0.5s ease-out' } : undefined}
            />
            {likeCount > 0 && (
              <span className="text-white text-xs font-semibold">{likeCount}</span>
            )}
          </button>

          {/* View count — only for owner */}
          {isOwner && (
            <button
              onClick={e => { e.stopPropagation(); loadViewers(); }}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors active:scale-90"
            >
              <Eye className="h-5 w-5" />
              <span className="text-xs font-semibold">{viewCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story?</AlertDialogTitle>
            <AlertDialogDescription>
              This story will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteStory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Viewers sheet */}
      {showViewers && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowViewers(false)}>
          <div
            className="bg-card w-full max-w-sm rounded-t-2xl p-4 max-h-[50vh] animate-slide-in-right"
            style={{ animation: 'slide-up 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes slide-up {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Viewers · {viewers.length}
              </h3>
              <button onClick={() => setShowViewers(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[35vh]">
              {viewers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No views yet</p>
              ) : (
                viewers.map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full instagram-gradient flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{v.username[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium">{v.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
