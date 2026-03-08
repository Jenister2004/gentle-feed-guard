import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
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
  const story = stories[currentIndex];

  const isOwner = user?.id === group.userId;

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }, [onClose]);

  useEffect(() => {
    if (paused || confirmDelete) return;
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
  }, [currentIndex, stories.length, handleClose, paused, confirmDelete]);

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
    if (error) {
      toast.error('Failed to delete story');
      return;
    }
    toast.success('Story deleted');
    const remaining = stories.filter((_, i) => i !== currentIndex);
    onDeleted?.();
    if (remaining.length === 0) {
      handleClose();
      return;
    }
    setStories(remaining);
    setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
    setProgress(0);
    setConfirmDelete(false);
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
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
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
      `}</style>

      <div className="relative w-full max-w-sm h-[85vh] max-h-[700px]">
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
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="text-white/70 hover:text-destructive transition-colors active:scale-90"
                title="Delete story"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button onClick={handleClose} className="text-white hover:opacity-70 transition-all active:scale-90">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Story image with transition */}
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
        <button onClick={goPrev} className="absolute left-0 top-16 bottom-16 w-1/3 z-10" aria-label="Previous story" />
        <button onClick={goNext} className="absolute right-0 top-16 bottom-16 w-1/3 z-10" aria-label="Next story" />

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
      </div>

      {/* Delete confirmation dialog */}
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
    </div>
  );
}
