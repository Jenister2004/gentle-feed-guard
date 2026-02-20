import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Shield } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session from the email link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setReady(true);
    } else {
      // Also listen for auth state change with recovery event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      });
      // Give it a moment then check session
      setTimeout(() => setReady(true), 1000);
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <div className="w-full max-w-sm">
        <Card className="border border-border">
          <CardContent className="pt-8 pb-6 px-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Camera className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold instagram-gradient-text">Insta Lite</h1>
            </div>
            <p className="text-center text-muted-foreground text-sm mb-6 flex items-center justify-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Set your new password
            </p>
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <Label htmlFor="newPassword" className="text-xs text-muted-foreground">New Password</Label>
                <Input id="newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1 bg-secondary" />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1 bg-secondary" />
              </div>
              <Button type="submit" className="w-full instagram-gradient text-primary-foreground font-semibold" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
