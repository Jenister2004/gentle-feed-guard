import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Terminal, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminLogin() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <Loader2 className="h-8 w-8 animate-spin text-green-500" />
    </div>
  );

  // If already logged in as admin, go to dashboard
  if (user && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    // If user is already logged in with a non-admin account, sign out first
    if (user) {
      await signOut();
      // Small delay to let auth state clear
      await new Promise(r => setTimeout(r, 500));
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Access denied: ' + error.message);
      setSubmitting(false);
      return;
    }

    // Check if the logged-in user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (roleData?.role !== 'admin') {
        toast.error('Access denied: You are not an admin.');
        await supabase.auth.signOut();
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    // Auth state change will trigger redirect via the Navigate above
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-20 text-green-500/70 hover:text-green-400 transition-colors">
        <ArrowLeft className="h-6 w-6" />
      </button>

      {/* Matrix-style background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <pre className="text-green-500 text-[10px] leading-3 font-mono whitespace-pre-wrap break-all animate-pulse">
          {Array(200).fill('01').map((_, i) => Math.random() > 0.5 ? '1' : '0').join(' ')}
        </pre>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="border border-green-500/30 bg-[#0d0d0d] rounded-lg p-8 shadow-[0_0_30px_rgba(0,255,0,0.1)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded border border-green-500/30">
              <Terminal className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-green-500 font-mono text-lg font-bold">ADMIN ACCESS</h1>
              <p className="text-green-500/50 font-mono text-xs">// authorized personnel only</p>
            </div>
          </div>

          <div className="border-t border-green-500/20 my-4" />

          <div className="flex items-center gap-2 mb-4 text-yellow-500/80 text-xs font-mono">
            <AlertTriangle className="h-4 w-4" />
            <span>WARNING: Unauthorized access is prohibited</span>
          </div>

          {user && !isAdmin && (
            <div className="mb-4 p-2 border border-yellow-500/30 rounded bg-yellow-500/5 text-yellow-400 text-xs font-mono">
              You're logged in as a regular user. Enter admin credentials below to switch.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-green-500/70 font-mono text-xs mb-1 block">ADMIN_EMAIL:</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-[#111] border-green-500/30 text-green-400 font-mono placeholder:text-green-500/20 focus:border-green-500 focus:ring-green-500/30"
                placeholder="admin@system.local"
                required
              />
            </div>
            <div>
              <label className="text-green-500/70 font-mono text-xs mb-1 block">ADMIN_PASSWORD:</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-[#111] border-green-500/30 text-green-400 font-mono placeholder:text-green-500/20 focus:border-green-500 focus:ring-green-500/30"
                placeholder="••••••••••"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-500/20 border border-green-500/50 text-green-400 font-mono hover:bg-green-500/30 hover:text-green-300 transition-all"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {submitting ? 'AUTHENTICATING...' : '> INITIATE_LOGIN'}
            </Button>
          </form>

          <p className="text-green-500/30 font-mono text-[10px] mt-4 text-center">
            sys.admin.v2.0 | encrypted_channel
          </p>
        </div>
      </div>
    </div>
  );
}
