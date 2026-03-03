import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!user) return;
    setAvatarUrl(profile?.avatar_url || null);

    supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });

    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id)
      .then(({ count }) => setFollowerCount(count || 0));
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id)
      .then(({ count }) => setFollowingCount(count || 0));
  }, [user, profile]);

  const handleEditUsername = () => {
    setNewUsername(profile?.username || '');
    setEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;
    if (newUsername.trim() === profile?.username) {
      setEditingUsername(false);
      return;
    }
    setSavingUsername(true);
    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername.trim())
        .neq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        toast.error('Username is already taken');
        setSavingUsername(false);
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Username updated!');
      setEditingUsername(false);
      // Force page reload to update profile context
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-secondary/30 animate-page-enter">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-8">
        <div className="flex items-center gap-8 mb-8">
          <AvatarUpload
            size="h-20 w-20"
            avatarUrl={avatarUrl}
            username={profile?.username}
            onUploaded={(url) => setAvatarUrl(url)}
          />
          <div>
            <div className="flex items-center gap-2">
              {editingUsername ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="h-8 w-40 text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveUsername} disabled={savingUsername}>
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingUsername(false)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold">{profile?.username}</h1>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditUsername}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{profile?.full_name}</p>
            <div className="flex gap-4 text-sm mt-1">
              <span><span className="font-semibold">{posts.length}</span> posts</span>
              <span><span className="font-semibold">{followerCount}</span> followers</span>
              <span><span className="font-semibold">{followingCount}</span> following</span>
            </div>
            {profile?.bio && <p className="text-sm mt-1">{profile.bio}</p>}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
              <div key={post.id} className="aspect-square">
                <img src={post.image_url} alt="" className="w-full h-full object-cover rounded" loading="lazy" />
              </div>
            ))}
          </div>
          {posts.length === 0 && <p className="text-center text-muted-foreground py-10">No posts yet.</p>}
        </div>
      </main>
    </div>
  );
}
