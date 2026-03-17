import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play, Shield, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function YouTubeAuth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'hsl(var(--destructive))', borderTopColor: 'transparent' }} />
    </div>
  );

  if (user) return <Navigate to="/youtube" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        if (password !== confirmPassword) { toast.error('Passwords do not match'); setSubmitting(false); return; }
        if (password.length < 6) { toast.error('Password must be at least 6 characters'); setSubmitting(false); return; }
        const { data, error } = await supabase.functions.invoke('reset-password', { body: { email, password } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success('Password updated! You can now sign in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        if (!username.trim()) { toast.error('Username is required'); setSubmitting(false); return; }
        const { error } = await signUp(email, password, username, fullName);
        if (error) throw error;
        toast.success('Account created! You are now signed in.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #141414 40%, #1a0a0a 100%)' }}
    >
      {/* Decorative red glow blobs */}
      <div className="absolute top-[-120px] left-[20%] w-[300px] h-[300px] rounded-full opacity-15 blur-[80px] pointer-events-none"
        style={{ background: 'hsl(var(--destructive))' }} />
      <div className="absolute bottom-[-80px] right-[10%] w-[250px] h-[250px] rounded-full opacity-10 blur-[60px] pointer-events-none"
        style={{ background: 'hsl(0 84% 40%)' }} />
      <div className="absolute top-[60%] left-[-5%] w-[150px] h-[150px] rounded-full opacity-8 blur-[50px] pointer-events-none"
        style={{ background: 'hsl(220 80% 50%)' }} />

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'hsl(var(--destructive))', boxShadow: '0 8px 30px hsl(0 84% 60% / 0.3)' }}>
              <Play className="h-6 w-6 fill-white" style={{ color: 'white' }} />
            </div>
            <span className="font-bold text-2xl tracking-tight" style={{ color: 'white' }}>YouTube</span>
          </div>
          <p className="text-sm flex items-center justify-center gap-1.5" style={{ color: '#999' }}>
            <Shield className="h-3.5 w-3.5" style={{ color: 'hsl(var(--destructive))' }} /> AI-powered safe video platform
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-8 border backdrop-blur-sm"
          style={{ background: 'rgba(26, 26, 26, 0.8)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'white' }}>
            {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            {mode === 'login' ? 'to continue to YouTube' : mode === 'signup' ? 'to get started with YouTube' : 'Enter your new password'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="yt-fullName" className="text-xs" style={{ color: '#999' }}>Full Name</Label>
                  <Input id="yt-fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe"
                    className="mt-1.5" style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
                <div>
                  <Label htmlFor="yt-username" className="text-xs" style={{ color: '#999' }}>Username</Label>
                  <Input id="yt-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" required
                    className="mt-1.5" style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="yt-email" className="text-xs" style={{ color: '#999' }}>Email</Label>
              <Input id="yt-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="mt-1.5" style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
            </div>
            {mode !== 'forgot' && (
              <div>
                <Label htmlFor="yt-password" className="text-xs" style={{ color: '#999' }}>Password</Label>
                <Input id="yt-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  className="mt-1.5" style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
            )}
            {mode === 'forgot' && (
              <>
                <div>
                  <Label htmlFor="yt-newPassword" className="text-xs" style={{ color: '#999' }}>New Password</Label>
                  <Input id="yt-newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                    className="mt-1.5" style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
                <div>
                  <Label htmlFor="yt-confirmPassword" className="text-xs" style={{ color: '#999' }}>Confirm Password</Label>
                  <Input id="yt-confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                    className="mt-1.5" style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
              </>
            )}

            <Button type="submit" disabled={submitting}
              className="w-full font-semibold rounded-full h-11 mt-2 border-0 text-white"
              style={{ background: 'hsl(var(--destructive))', boxShadow: '0 6px 24px hsl(0 84% 60% / 0.3)' }}
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </Button>

            {mode === 'login' && (
              <button type="button" onClick={() => setMode('forgot')} className="w-full text-xs mt-1" style={{ color: 'hsl(217 91% 60%)' }}>
                Forgot password?
              </button>
            )}
          </form>
        </div>

        {/* Toggle */}
        <div className="text-center text-sm" style={{ color: '#888' }}>
          {mode === 'forgot' ? (
            <>Remember your password?{' '}<button onClick={() => setMode('login')} className="font-medium" style={{ color: 'hsl(217 91% 60%)' }}>Sign In</button></>
          ) : mode === 'login' ? (
            <>New to YouTube?{' '}<button onClick={() => setMode('signup')} className="font-medium" style={{ color: 'hsl(217 91% 60%)' }}>Create Account</button></>
          ) : (
            <>Already have an account?{' '}<button onClick={() => setMode('login')} className="font-medium" style={{ color: 'hsl(217 91% 60%)' }}>Sign In</button></>
          )}
        </div>

        <p className="text-center text-[10px] tracking-widest uppercase flex items-center justify-center gap-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <Sparkles className="h-3 w-3" /> Protected by AI Moderation
        </p>
      </div>
    </div>
  );
}
