import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Camera } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const handleSelect = (platform: string) => {
    if (!user) {
      // Store chosen platform, redirect to auth
      sessionStorage.setItem('platform', platform);
      navigate('/auth');
    } else {
      navigate(platform);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <h1 className="text-2xl font-bold mb-2 text-foreground">Welcome!</h1>
      <p className="text-muted-foreground text-sm mb-10">Choose a platform</p>

      <div className="flex gap-6 w-full max-w-sm">
        {/* Instagram */}
        <button
          onClick={() => handleSelect('/instagram')}
          className="flex-1 group relative overflow-hidden rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4 hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="h-16 w-16 rounded-2xl instagram-gradient flex items-center justify-center">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">Instagram</span>
          <span className="text-xs text-muted-foreground">Photos, Stories & Reels</span>
        </button>

        {/* YouTube */}
        <button
          onClick={() => handleSelect('/youtube')}
          className="flex-1 group relative overflow-hidden rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4 hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="h-16 w-16 rounded-2xl bg-destructive flex items-center justify-center">
            <Play className="h-8 w-8 text-destructive-foreground fill-destructive-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">YouTube</span>
          <span className="text-xs text-muted-foreground">Videos & Comments</span>
        </button>
      </div>
    </div>
  );
}
