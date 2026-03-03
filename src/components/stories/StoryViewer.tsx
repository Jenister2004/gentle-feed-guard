import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StoryGroup {
  userId: string;
  username: string;
  stories: { id: string; image_url: string; created_at: string }[];
}

export default function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stories, setStories] = useState(group.stories);
  const story = stories[currentIndex];

  const isOwner = user?.id === group.userId;

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, stories.length, onClose]);

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
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
    if (remaining.length === 0) {
      onClose();
      return;
    }
    setStories(remaining);
    setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
    setProgress(0);
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-page-enter">
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
              <button onClick={deleteStory} className="text-white/70 hover:text-red-400 transition-colors" title="Delete story">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Story image */}
        <img
          src={story.image_url}
          alt="Story"
          className="w-full h-full object-cover rounded-xl"
        />

        {/* Navigation areas */}
        <button onClick={goPrev} className="absolute left-0 top-16 bottom-16 w-1/3 z-10" aria-label="Previous story" />
        <button onClick={goNext} className="absolute right-0 top-16 bottom-16 w-1/3 z-10" aria-label="Next story" />

        {/* Nav arrows */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 rounded-full p-1 text-white opacity-0 hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 rounded-full p-1 text-white opacity-0 hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
