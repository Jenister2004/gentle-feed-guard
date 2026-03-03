import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, Users, Image, MessageSquare, AlertTriangle, Ban, 
  Loader2, Trash2, Terminal, Activity, Eye, SkullIcon, LogOut 
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function Admin() {
  const { isAdmin, loading: authLoading, signOut } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('flagged');

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flagged_content' }, () => loadFlagged())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => loadComments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const loadAll = async () => {
    await Promise.all([loadUsers(), loadFlagged(), loadPosts(), loadComments()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const loadFlagged = async () => {
    const { data } = await supabase.from('flagged_content').select('*').order('created_at', { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profs } = await supabase.from('profiles').select('user_id, username').in('user_id', userIds);
      const map = Object.fromEntries((profs || []).map(p => [p.user_id, p.username]));
      setFlaggedContent(data.map(f => ({ ...f, username: map[f.user_id] || 'unknown' })));
    }
  };

  const loadPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
  };

  const loadComments = async () => {
    const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false });
    setComments(data || []);
  };

  const warnUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ warning_count: (users.find(u => u.user_id === userId)?.warning_count || 0) + 1 }).eq('user_id', userId);
    if (!error) { toast.success('User warned'); loadUsers(); }
  };

  const suspendUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: true }).eq('user_id', userId);
    if (!error) { toast.success('User suspended'); loadUsers(); }
  };

  const banUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('user_id', userId);
    if (!error) { toast.success('User banned'); loadUsers(); }
  };

  const unsuspendUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: false }).eq('user_id', userId);
    if (!error) { toast.success('User unsuspended'); loadUsers(); }
  };

  const unbanUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_banned: false }).eq('user_id', userId);
    if (!error) { toast.success('User unbanned'); loadUsers(); }
  };

  const markReviewed = async (id: string) => {
    const { error } = await supabase.from('flagged_content').update({ reviewed: true }).eq('id', id);
    if (!error) { toast.success('Marked as reviewed'); loadFlagged(); }
  };

  const adminDeleteComment = async (id: string) => {
    const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', id);
    if (!error) { toast.success('Comment deleted'); loadComments(); }
    else toast.error('Failed to delete comment');
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>;

  const tabs = [
    { id: 'flagged', label: 'THREATS', icon: AlertTriangle, count: flaggedContent.filter(f => !f.reviewed).length },
    { id: 'users', label: 'AGENTS', icon: Users, count: users.length },
    { id: 'posts', label: 'INTEL', icon: Image, count: posts.length },
    { id: 'comments', label: 'COMMS', icon: MessageSquare, count: comments.length },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono">
      {/* Top Bar */}
      <header className="border-b border-green-500/20 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-green-500" />
            <span className="text-green-500 font-bold text-sm">ADMIN_CONTROL_PANEL</span>
            <span className="text-green-500/30 text-xs">v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <Activity className="h-3 w-3 text-green-500 animate-pulse" />
              <span className="text-green-500/70">SYSTEM ONLINE</span>
            </div>
            <Link to="/" className="text-green-500/50 hover:text-green-400 transition-colors text-xs">
              [EXIT]
            </Link>
            <button onClick={signOut} className="text-red-500/50 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'TOTAL_AGENTS', value: users.length, icon: Users, color: 'text-green-500' },
            { label: 'INTEL_POSTS', value: posts.length, icon: Image, color: 'text-cyan-500' },
            { label: 'COMM_LOGS', value: comments.length, icon: MessageSquare, color: 'text-blue-500' },
            { label: 'THREAT_LEVEL', value: flaggedContent.filter(f => !f.reviewed).length, icon: SkullIcon, color: 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="border border-green-500/20 bg-[#0d0d0d] rounded p-3">
              <div className="flex items-center gap-2 text-green-500/50 text-[10px] mb-1">
                <stat.icon className="h-3 w-3" />
                {stat.label}
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b border-green-500/20 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'text-green-500/40 hover:text-green-500/70 border border-transparent'
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1 rounded ${
                  tab.id === 'flagged' && tab.count > 0 ? 'bg-red-500/30 text-red-400' : 'bg-green-500/10 text-green-500/60'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'flagged' && (
          <div className="border border-green-500/20 bg-[#0d0d0d] rounded">
            <div className="px-4 py-2 border-b border-green-500/20 text-green-500/70 text-xs flex items-center gap-2">
              <Eye className="h-3 w-3" /> THREAT_MONITOR // flagged content analysis
            </div>
            {flaggedContent.length === 0 ? (
              <p className="text-green-500/30 text-center py-8 text-sm">[ NO THREATS DETECTED ] ✓</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-500/20 text-green-500/50">
                      <th className="text-left px-3 py-2">TYPE</th>
                      <th className="text-left px-3 py-2">AGENT</th>
                      <th className="text-left px-3 py-2">CONTENT</th>
                      <th className="text-left px-3 py-2">THREAT_REASON</th>
                      <th className="text-left px-3 py-2">STATUS</th>
                      <th className="text-left px-3 py-2">TIMESTAMP</th>
                      <th className="text-left px-3 py-2">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedContent.map(f => (
                      <tr key={f.id} className="border-b border-green-500/10 hover:bg-green-500/5">
                        <td className="px-3 py-2"><span className="text-cyan-400">[{f.content_type}]</span></td>
                        <td className="px-3 py-2 text-green-400">{f.username}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate text-green-500/60">{f.original_content || '—'}</td>
                        <td className="px-3 py-2 text-red-400">{f.reason}</td>
                        <td className="px-3 py-2">
                          {f.reviewed
                            ? <span className="text-green-500">[CLEARED]</span>
                            : <span className="text-red-400 animate-pulse">[PENDING]</span>}
                        </td>
                        <td className="px-3 py-2 text-green-500/40">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {!f.reviewed && (
                              <button onClick={() => markReviewed(f.id)} className="px-2 py-0.5 border border-green-500/30 text-green-500/70 rounded hover:bg-green-500/20 text-[10px]">
                                REVIEW
                              </button>
                            )}
                            <button onClick={() => warnUser(f.user_id)} className="px-2 py-0.5 border border-yellow-500/30 text-yellow-500/70 rounded hover:bg-yellow-500/20 text-[10px]">
                              WARN
                            </button>
                            <button onClick={() => banUser(f.user_id)} className="px-2 py-0.5 border border-red-500/30 text-red-500/70 rounded hover:bg-red-500/20 text-[10px]">
                              BAN
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="border border-green-500/20 bg-[#0d0d0d] rounded">
            <div className="px-4 py-2 border-b border-green-500/20 text-green-500/70 text-xs flex items-center gap-2">
              <Users className="h-3 w-3" /> AGENT_DATABASE // registered users
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-green-500/20 text-green-500/50">
                    <th className="text-left px-3 py-2">CALLSIGN</th>
                    <th className="text-left px-3 py-2">FULL_ID</th>
                    <th className="text-left px-3 py-2">WARNINGS</th>
                    <th className="text-left px-3 py-2">STATUS</th>
                    <th className="text-left px-3 py-2">JOINED</th>
                    <th className="text-left px-3 py-2">CONTROLS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-green-500/10 hover:bg-green-500/5">
                      <td className="px-3 py-2 text-green-400 font-bold">{u.username}</td>
                      <td className="px-3 py-2 text-green-500/60">{u.full_name || '—'}</td>
                      <td className="px-3 py-2">
                        {u.warning_count > 0 ? <span className="text-red-400">[{u.warning_count}]</span> : <span className="text-green-500/30">0</span>}
                      </td>
                      <td className="px-3 py-2">
                        {u.is_banned ? <span className="text-red-500">[BANNED]</span> :
                         u.is_suspended ? <span className="text-yellow-500">[SUSPENDED]</span> :
                         <span className="text-green-500">[ACTIVE]</span>}
                      </td>
                      <td className="px-3 py-2 text-green-500/40">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => warnUser(u.user_id)} className="px-2 py-0.5 border border-yellow-500/30 text-yellow-500/70 rounded hover:bg-yellow-500/20 text-[10px]">
                            WARN
                          </button>
                          {u.is_suspended ?
                            <button onClick={() => unsuspendUser(u.user_id)} className="px-2 py-0.5 border border-green-500/30 text-green-500/70 rounded hover:bg-green-500/20 text-[10px]">
                              UNSUSPEND
                            </button> :
                            <button onClick={() => suspendUser(u.user_id)} className="px-2 py-0.5 border border-yellow-500/30 text-yellow-500/70 rounded hover:bg-yellow-500/20 text-[10px]">
                              SUSPEND
                            </button>}
          {u.is_banned ? (
                            <button onClick={() => unbanUser(u.user_id)} className="px-2 py-0.5 border border-green-500/30 text-green-500/70 rounded hover:bg-green-500/20 text-[10px]">
                              UNBAN
                            </button>
                          ) : (
                            <button onClick={() => banUser(u.user_id)} className="px-2 py-0.5 border border-red-500/30 text-red-500/70 rounded hover:bg-red-500/20 text-[10px]">
                              <Ban className="h-3 w-3 inline" /> BAN
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="border border-green-500/20 bg-[#0d0d0d] rounded">
            <div className="px-4 py-2 border-b border-green-500/20 text-green-500/70 text-xs flex items-center gap-2">
              <Image className="h-3 w-3" /> INTEL_FEED // all posts
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
              {posts.map(p => (
                <div key={p.id} className="relative aspect-square rounded overflow-hidden group border border-green-500/20">
                  <img src={p.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                  {p.is_flagged && (
                    <div className="absolute top-1 right-1">
                      <span className="bg-red-500/80 text-red-100 text-[10px] px-1.5 py-0.5 rounded font-mono">[FLAGGED]</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[10px] p-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    {p.caption || '// no caption'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="border border-green-500/20 bg-[#0d0d0d] rounded">
            <div className="px-4 py-2 border-b border-green-500/20 text-green-500/70 text-xs flex items-center gap-2">
              <MessageSquare className="h-3 w-3" /> COMM_INTERCEPTS // all comments
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-green-500/20 text-green-500/50">
                    <th className="text-left px-3 py-2">CONTENT</th>
                    <th className="text-left px-3 py-2">TYPE</th>
                    <th className="text-left px-3 py-2">STATUS</th>
                    <th className="text-left px-3 py-2">TIMESTAMP</th>
                    <th className="text-left px-3 py-2">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map(c => (
                    <tr key={c.id} className="border-b border-green-500/10 hover:bg-green-500/5">
                      <td className="px-3 py-2 max-w-[300px] truncate text-green-500/70">
                        {c.gif_url ? (
                          <img src={c.gif_url} alt="GIF" className="h-10 w-10 object-cover rounded border border-green-500/20" />
                        ) : c.content}
                      </td>
                      <td className="px-3 py-2"><span className="text-cyan-400">[{c.gif_url ? 'GIF' : 'TEXT'}]</span></td>
                      <td className="px-3 py-2">
                        {c.is_deleted ? <span className="text-red-500">[TERMINATED]</span> :
                         c.is_flagged ? <span className="text-yellow-500">[FLAGGED]</span> :
                         <span className="text-green-500">[ACTIVE]</span>}
                      </td>
                      <td className="px-3 py-2 text-green-500/40">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</td>
                      <td className="px-3 py-2">
                        {!c.is_deleted && (
                          <button onClick={() => adminDeleteComment(c.id)} className="px-2 py-0.5 border border-red-500/30 text-red-500/70 rounded hover:bg-red-500/20 text-[10px] flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> TERMINATE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
