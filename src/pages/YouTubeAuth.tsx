import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play, Shield } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
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
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <div className="bg-red-600 rounded-xl p-2">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">YouTube</span>
          </div>
          <p className="text-[#aaa] text-sm flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> AI-powered safe video platform
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-1">
            {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <p className="text-[#aaa] text-sm mb-6">
            {mode === 'login' ? 'to continue to YouTube' : mode === 'signup' ? 'to get started with YouTube' : 'Enter your new password'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="yt-fullName" className="text-[#aaa] text-xs">Full Name</Label>
                  <Input id="yt-fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe"
                    className="mt-1.5 bg-[#121212] border-[#333] text-white placeholder:text-[#666] focus:border-blue-500 focus:ring-blue-500/20" />
                </div>
                <div>
                  <Label htmlFor="yt-username" className="text-[#aaa] text-xs">Username</Label>
                  <Input id="yt-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" required
                    className="mt-1.5 bg-[#121212] border-[#333] text-white placeholder:text-[#666] focus:border-blue-500 focus:ring-blue-500/20" />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="yt-email" className="text-[#aaa] text-xs">Email</Label>
              <Input id="yt-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="mt-1.5 bg-[#121212] border-[#333] text-white placeholder:text-[#666] focus:border-blue-500 focus:ring-blue-500/20" />
            </div>
            {mode !== 'forgot' && (
              <div>
                <Label htmlFor="yt-password" className="text-[#aaa] text-xs">Password</Label>
                <Input id="yt-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  className="mt-1.5 bg-[#121212] border-[#333] text-white placeholder:text-[#666] focus:border-blue-500 focus:ring-blue-500/20" />
              </div>
            )}
            {mode === 'forgot' && (
              <>
                <div>
                  <Label htmlFor="yt-newPassword" className="text-[#aaa] text-xs">New Password</Label>
                  <Input id="yt-newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                    className="mt-1.5 bg-[#121212] border-[#333] text-white placeholder:text-[#666] focus:border-blue-500 focus:ring-blue-500/20" />
                </div>
                <div>
                  <Label htmlFor="yt-confirmPassword" className="text-[#aaa] text-xs">Confirm Password</Label>
                  <Input id="yt-confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                    className="mt-1.5 bg-[#121212] border-[#333] text-white placeholder:text-[#666] focus:border-blue-500 focus:ring-blue-500/20" />
                </div>
              </>
            )}

            <Button type="submit" disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full h-10 mt-2">
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </Button>

            {mode === 'login' && (
              <button type="button" onClick={() => setMode('forgot')} className="w-full text-xs text-blue-400 hover:text-blue-300 mt-1">
                Forgot password?
              </button>
            )}
          </form>
        </div>

        {/* Toggle */}
        <div className="text-center text-sm text-[#aaa]">
          {mode === 'forgot' ? (
            <>Remember your password?{' '}<button onClick={() => setMode('login')} className="text-blue-400 hover:text-blue-300 font-medium">Sign In</button></>
          ) : mode === 'login' ? (
            <>New to YouTube?{' '}<button onClick={() => setMode('signup')} className="text-blue-400 hover:text-blue-300 font-medium">Create Account</button></>
          ) : (
            <>Already have an account?{' '}<button onClick={() => setMode('login')} className="text-blue-400 hover:text-blue-300 font-medium">Sign In</button></>
          )}
        </div>
      </div>
    </div>
  );
}
