import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Volume2, VolumeX, Loader2, Plus, Play } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AppHeader from '@/components/layout/AppHeader';
import UploadReel from '@/components/reels/UploadReel';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  username: string;
  avatar_url: string | null;
  liked: boolean;
  likeCount: number;
  commentCount: number;
}

export default function Reels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadReels();
  }, [user]);

  const loadReels = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('reels')
      .select('*')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) { setReels([]); setLoading(false); return; }

    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Get likes
    const reelIds = data.map(r => r.id);
    const { data: myLikes } = await supabase
      .from('reel_likes')
      .select('reel_id')
      .eq('user_id', user.id)
      .in('reel_id', reelIds);
    const likedSet = new Set((myLikes || []).map(l => l.reel_id));

    const enriched: Reel[] = data.map(r => ({
      ...r,
      username: profileMap[r.user_id]?.username || 'unknown',
      avatar_url: profileMap[r.user_id]?.avatar_url || null,
      liked: likedSet.has(r.id),
      likeCount: 0,
      commentCount: 0,
    }));

    setReels(enriched);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
        <button onClick={() => navigate('/')} className="text-white hover:opacity-70">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-white font-bold text-lg">Reels</h1>
        <button onClick={() => setShowUpload(true)} className="text-white hover:opacity-70">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-screen text-white gap-3">
          <Play className="h-12 w-12 opacity-50" />
          <p className="text-sm opacity-70">No reels yet</p>
          <button onClick={() => setShowUpload(true)} className="text-primary font-semibold text-sm">
            Upload the first reel
          </button>
        </div>
      ) : (
        <div className="snap-y snap-mandatory h-screen overflow-y-scroll">
          {reels.map(reel => (
            <ReelCard key={reel.id} reel={reel} userId={user.id} onUpdate={loadReels} />
          ))}
        </div>
      )}

      {showUpload && <UploadReel onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); loadReels(); }} />}
    </div>
  );
}

function ReelCard({ reel, userId, onUpdate }: { reel: Reel; userId: string; onUpdate: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(reel.liked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [animateHeart, setAnimateHeart] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Auto-play with IntersectionObserver
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.7 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Load like count
  useEffect(() => {
    supabase
      .from('reel_likes')
      .select('id', { count: 'exact', head: true })
      .eq('reel_id', reel.id)
      .then(({ count }) => setLikeCount(count || 0));
  }, [reel.id]);

  const toggleLike = async () => {
    if (liked) {
      await supabase.from('reel_likes').delete().eq('reel_id', reel.id).eq('user_id', userId);
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('reel_likes').insert({ reel_id: reel.id, user_id: userId });
      setLiked(true);
      setLikeCount(c => c + 1);
      setAnimateHeart(true);
      setTimeout(() => setAnimateHeart(false), 600);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  };

  return (
    <div className="snap-start h-screen w-full relative flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={reel.video_url}
        className="h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        onClick={togglePlay}
      />

      {/* Play indicator */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play className="h-16 w-16 text-white/60 fill-white/60" />
        </div>
      )}

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart
            className={`h-7 w-7 transition-all ${liked ? 'fill-destructive text-destructive' : 'text-white'}`}
            style={animateHeart ? { animation: 'heart-burst 0.5s ease-out' } : undefined}
          />
          <span className="text-white text-xs font-semibold">{likeCount}</span>
        </button>
        <button onClick={() => setMuted(!muted)} className="flex flex-col items-center gap-1">
          {muted ? <VolumeX className="h-7 w-7 text-white" /> : <Volume2 className="h-7 w-7 text-white" />}
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-16">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8 border border-white">
            <AvatarFallback className="text-xs font-bold bg-muted">
              {reel.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm">{reel.username}</span>
          <span className="text-white/60 text-xs">
            {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
          </span>
        </div>
        {reel.caption && <p className="text-white text-sm">{reel.caption}</p>}
      </div>

      <style>{`
        @keyframes heart-burst {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
