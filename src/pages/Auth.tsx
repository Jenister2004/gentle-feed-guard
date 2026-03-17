import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Camera, Sparkles } from 'lucide-react';
import InstagramLogo from '@/components/icons/InstagramLogo';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (user) {
    const savedPlatform = sessionStorage.getItem('platform');
    if (savedPlatform) {
      sessionStorage.removeItem('platform');
      return <Navigate to={savedPlatform} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setSubmitting(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('reset-password', {
          body: { email, password },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success('Password updated successfully! You can now log in.');
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
        toast.success('Account created! You are now logged in.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(340 82% 52% / 0.1) 0%, hsl(var(--background)) 50%, hsl(25 95% 53% / 0.08) 100%)'
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-100px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'hsl(var(--primary))' }} />
      <div className="absolute bottom-[-80px] left-[-40px] w-[220px] h-[220px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'hsl(var(--accent))' }} />
      <div className="absolute top-[50%] left-[15%] w-[120px] h-[120px] rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: 'hsl(280 72% 50%)' }} />

      <div className="w-full max-w-sm space-y-4 relative z-10 animate-fade-in">
        <Card className="border border-border/60 shadow-xl backdrop-blur-sm bg-card/80">
          <CardContent className="pt-8 pb-6 px-10">
            {/* Logo section */}
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div className="instagram-logo-gradient rounded-xl p-2 shadow-lg shadow-primary/20">
                <InstagramLogo className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold instagram-gradient-text">Insta Lite</h1>
            </div>
            <p className="text-center text-muted-foreground text-sm mb-1 flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" /> AI-powered safe social platform
            </p>
            <p className="text-center text-muted-foreground/60 text-xs mb-6">
              {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  <div>
                    <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="mt-1 bg-secondary/60 border-border/50 focus:border-primary/50 focus:ring-primary/20" />
                  </div>
                  <div>
                    <Label htmlFor="username" className="text-xs text-muted-foreground">Username</Label>
                    <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" required className="mt-1 bg-secondary/60 border-border/50 focus:border-primary/50 focus:ring-primary/20" />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1 bg-secondary/60 border-border/50 focus:border-primary/50 focus:ring-primary/20" />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1 bg-secondary/60 border-border/50 focus:border-primary/50 focus:ring-primary/20" />
                </div>
              )}
              {mode === 'forgot' && (
                <>
                  <div>
                    <Label htmlFor="newPassword" className="text-xs text-muted-foreground">New Password</Label>
                    <Input id="newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1 bg-secondary/60 border-border/50 focus:border-primary/50 focus:ring-primary/20" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1 bg-secondary/60 border-border/50 focus:border-primary/50 focus:ring-primary/20" />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full instagram-gradient text-primary-foreground font-semibold rounded-xl h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow" disabled={submitting}>
                {submitting ? 'Please wait...' : mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
              </Button>
              {mode === 'login' && (
                <button type="button" onClick={() => setMode('forgot')} className="w-full text-xs text-primary hover:underline mt-1">
                  Forgot password?
                </button>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-md backdrop-blur-sm bg-card/80">
          <CardContent className="py-4 text-center text-sm">
            {mode === 'forgot' ? (
              <>
                Remember your password?{' '}
                <button onClick={() => setMode('login')} className="font-semibold text-primary hover:underline">Log In</button>
              </>
            ) : mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">Sign Up</button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-semibold text-primary hover:underline">Log In</button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/40 tracking-widest uppercase flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" /> Protected by AI Moderation
        </p>
      </div>
    </div>
  );
}
