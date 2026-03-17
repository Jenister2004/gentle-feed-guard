import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Camera, Shield, Sparkles } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const handleSelect = (platform: string, authRoute: string) => {
    if (!user) {
      navigate(authRoute);
    } else {
      navigate(platform);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(340 82% 52% / 0.08) 0%, hsl(var(--background)) 40%, hsl(25 95% 53% / 0.06) 100%)'
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-120px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'hsl(var(--primary))' }} />
      <div className="absolute bottom-[-100px] right-[-60px] w-[250px] h-[250px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'hsl(var(--destructive))' }} />
      <div className="absolute top-[30%] right-[10%] w-[150px] h-[150px] rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: 'hsl(var(--accent))' }} />

      {/* Shield icon */}
      <div className="mb-4 flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 animate-fade-in">
        <Shield className="h-7 w-7 text-primary" />
      </div>

      <h1 className="text-3xl font-bold mb-1 text-foreground tracking-tight animate-fade-in">
        Safe Social
      </h1>
      <p className="text-muted-foreground text-sm mb-2 animate-fade-in flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        AI-Powered Cyberbullying Detection
      </p>
      <p className="text-muted-foreground/70 text-xs mb-10 animate-fade-in">Choose a platform to get started</p>

      <div className="flex gap-5 w-full max-w-sm animate-slide-up">
        {/* Instagram */}
        <button
          onClick={() => handleSelect('/instagram', '/auth')}
          className="flex-1 group relative overflow-hidden rounded-3xl border border-border bg-card p-6 flex flex-col items-center gap-4 hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:border-primary/30"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(180deg, hsl(340 82% 52% / 0.06) 0%, transparent 60%)' }} />
          <div className="h-16 w-16 rounded-2xl instagram-gradient flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow duration-300">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground relative z-10">Instagram</span>
          <span className="text-xs text-muted-foreground relative z-10">Photos, Stories & Reels</span>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-primary/20 group-hover:w-12 group-hover:bg-primary/40 transition-all duration-300" />
        </button>

        {/* YouTube */}
        <button
          onClick={() => handleSelect('/youtube', '/youtube-auth')}
          className="flex-1 group relative overflow-hidden rounded-3xl border border-border bg-card p-6 flex flex-col items-center gap-4 hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:border-destructive/30"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(180deg, hsl(0 84% 60% / 0.06) 0%, transparent 60%)' }} />
          <div className="h-16 w-16 rounded-2xl bg-destructive flex items-center justify-center shadow-lg shadow-destructive/20 group-hover:shadow-destructive/40 transition-shadow duration-300">
            <Play className="h-8 w-8 text-destructive-foreground fill-destructive-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground relative z-10">YouTube</span>
          <span className="text-xs text-muted-foreground relative z-10">Videos & Comments</span>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-destructive/20 group-hover:w-12 group-hover:bg-destructive/40 transition-all duration-300" />
        </button>
      </div>

      {/* Footer tagline */}
      <p className="mt-12 text-[10px] text-muted-foreground/50 tracking-widest uppercase animate-fade-in">
        Powered by AI Content Moderation
      </p>
    </div>
  );
}
