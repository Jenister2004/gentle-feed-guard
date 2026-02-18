import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Shield } from 'lucide-react';

export default function Auth() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
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
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <div className="w-full max-w-sm space-y-4">
        <Card className="border border-border">
          <CardContent className="pt-8 pb-6 px-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Camera className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold instagram-gradient-text">Insta Lite</h1>
            </div>
            <p className="text-center text-muted-foreground text-sm mb-6 flex items-center justify-center gap-1">
              <Shield className="h-3.5 w-3.5" /> AI-powered safe social platform
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="mt-1 bg-secondary" />
                  </div>
                  <div>
                    <Label htmlFor="username" className="text-xs text-muted-foreground">Username</Label>
                    <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" required className="mt-1 bg-secondary" />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1 bg-secondary" />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1 bg-secondary" />
              </div>
              <Button type="submit" className="w-full instagram-gradient text-primary-foreground font-semibold" disabled={submitting}>
                {submitting ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="py-4 text-center text-sm">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-primary hover:underline">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
