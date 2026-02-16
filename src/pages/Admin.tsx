import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, Image, MessageSquare, AlertTriangle, Ban, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import AppHeader from '@/components/layout/AppHeader';

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const markReviewed = async (id: string) => {
    const { error } = await supabase.from('flagged_content').update({ reviewed: true }).eq('id', id);
    if (!error) { toast.success('Marked as reviewed'); loadFlagged(); }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Users</div>
              <p className="text-2xl font-bold mt-1">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Image className="h-4 w-4" /> Posts</div>
              <p className="text-2xl font-bold mt-1">{posts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><MessageSquare className="h-4 w-4" /> Comments</div>
              <p className="text-2xl font-bold mt-1">{comments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="h-4 w-4" /> Flagged</div>
              <p className="text-2xl font-bold mt-1 text-destructive">{flaggedContent.filter(f => !f.reviewed).length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="flagged">
          <TabsList className="mb-4">
            <TabsTrigger value="flagged">
              <AlertTriangle className="h-4 w-4 mr-1" /> Flagged Content
              {flaggedContent.filter(f => !f.reviewed).length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{flaggedContent.filter(f => !f.reviewed).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="posts"><Image className="h-4 w-4 mr-1" /> Posts</TabsTrigger>
            <TabsTrigger value="comments"><MessageSquare className="h-4 w-4 mr-1" /> Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="flagged">
            <Card>
              <CardHeader><CardTitle>Flagged Content</CardTitle></CardHeader>
              <CardContent>
                {flaggedContent.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No flagged content. The platform is clean! 🎉</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedContent.map(f => (
                        <TableRow key={f.id}>
                          <TableCell><Badge variant={f.content_type === 'comment' ? 'secondary' : 'outline'}>{f.content_type}</Badge></TableCell>
                          <TableCell className="font-medium">{f.username}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{f.original_content || '—'}</TableCell>
                          <TableCell className="text-sm text-destructive">{f.reason}</TableCell>
                          <TableCell>{f.reviewed ? <Badge className="bg-success text-success-foreground">Reviewed</Badge> : <Badge variant="destructive">Pending</Badge>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!f.reviewed && <Button size="sm" variant="outline" onClick={() => markReviewed(f.id)}>Review</Button>}
                              <Button size="sm" variant="outline" className="text-warning" onClick={() => warnUser(f.user_id)}>Warn</Button>
                              <Button size="sm" variant="destructive" onClick={() => banUser(f.user_id)}>Ban</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Warnings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>{u.full_name || '—'}</TableCell>
                        <TableCell>{u.warning_count > 0 ? <Badge variant="destructive">{u.warning_count}</Badge> : '0'}</TableCell>
                        <TableCell>
                          {u.is_banned ? <Badge variant="destructive">Banned</Badge> :
                           u.is_suspended ? <Badge className="bg-warning text-warning-foreground">Suspended</Badge> :
                           <Badge className="bg-success text-success-foreground">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => warnUser(u.user_id)}>Warn</Button>
                            {u.is_suspended ?
                              <Button size="sm" variant="outline" onClick={() => unsuspendUser(u.user_id)}>Unsuspend</Button> :
                              <Button size="sm" variant="outline" className="text-warning" onClick={() => suspendUser(u.user_id)}>Suspend</Button>}
                            {!u.is_banned && <Button size="sm" variant="destructive" onClick={() => banUser(u.user_id)}><Ban className="h-3 w-3" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card>
              <CardHeader><CardTitle>All Posts ({posts.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {posts.map(p => (
                    <div key={p.id} className="relative aspect-square rounded overflow-hidden group">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      {p.is_flagged && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Flagged</Badge>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-foreground/70 text-background text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.caption || 'No caption'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader><CardTitle>All Comments ({comments.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-[300px] truncate">{c.content}</TableCell>
                        <TableCell>
                          {c.is_deleted ? <Badge variant="destructive">Deleted</Badge> :
                           c.is_flagged ? <Badge className="bg-warning text-warning-foreground">Flagged</Badge> :
                           <Badge className="bg-success text-success-foreground">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
