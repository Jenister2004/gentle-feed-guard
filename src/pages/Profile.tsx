import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { Loader2, Pencil, Check, X, Grid3X3, Bookmark, UserSquare2, Settings, Plus, Heart, MessageCircle, Lock, Globe, UserCheck, UserX, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

type ProfileTab = 'posts' | 'saved' | 'tagged';

interface FollowRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profile?: { username: string; avatar_url: string | null; full_name: string };
}

const HIGHLIGHT_ICONS = [
  { label: 'Travel', emoji: '✈️' },
  { label: 'Food', emoji: '🍕' },
  { label: 'Fitness', emoji: '💪' },
  { label: 'Music', emoji: '🎵' },
  { label: 'Pets', emoji: '🐾' },
];

export default function Profile() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  // Edit states
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Privacy & follow requests
  const [isPrivate, setIsPrivate] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const loadFollowRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follow_requests')
      .select('*')
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const requesterIds = data.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, full_name')
        .in('user_id', requesterIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url, full_name: p.full_name }])
      );

      setFollowRequests(data.map(r => ({
        ...r,
        profile: profileMap[r.requester_id],
      })));
    } else {
      setFollowRequests([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    setAvatarUrl(profile?.avatar_url || null);

    supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });

    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id)
      .then(({ count }) => setFollowerCount(count || 0));
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id)
      .then(({ count }) => setFollowingCount(count || 0));

    // Load privacy setting
    supabase.from('profiles').select('is_private').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsPrivate(data?.is_private ?? false));

    loadFollowRequests();
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
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio.trim() })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Bio updated!');
      setEditingBio(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bio');
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveFullName = async () => {
    if (!user || !newFullName.trim()) return;
    if (newFullName.trim() === profile?.full_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newFullName.trim() })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Name updated!');
      setEditingName(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const togglePrivacy = async () => {
    if (!user) return;
    setTogglingPrivacy(true);
    try {
      const newValue = !isPrivate;
      const { error } = await supabase
        .from('profiles')
        .update({ is_private: newValue })
        .eq('user_id', user.id);
      if (error) throw error;
      setIsPrivate(newValue);
      toast.success(newValue ? 'Account set to Private 🔒' : 'Account set to Public 🌐');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update privacy');
    } finally {
      setTogglingPrivacy(false);
    }
  };

  const acceptRequest = async (requestId: string, requesterId: string) => {
    setProcessingRequest(requestId);
    try {
      // Create the follow relationship
      await supabase.from('follows').insert({
        follower_id: requesterId,
        following_id: user!.id,
      });
      // Delete the request
      await supabase.from('follow_requests').delete().eq('id', requestId);
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
      setFollowerCount(prev => prev + 1);
      toast.success('Follow request accepted');
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await supabase.from('follow_requests').delete().eq('id', requestId);
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Follow request declined');
    } catch {
      toast.error('Failed to decline request');
    } finally {
      setProcessingRequest(null);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <AppHeader />
      <main className="max-w-[935px] mx-auto px-4 pt-20 pb-8">

        {/* === Profile Header Section === */}
        <div className="flex flex-col md:flex-row items-start gap-6 md:gap-16 mb-6 md:mb-10">

          {/* Avatar — large, centered on mobile */}
          <div className="flex-shrink-0 mx-auto md:mx-0 md:ml-8">
            <AvatarUpload
              size="h-[86px] w-[86px] md:h-[150px] md:w-[150px]"
              avatarUrl={avatarUrl}
              username={profile?.username}
              onUploaded={(url) => setAvatarUrl(url)}
            />
          </div>

          {/* Info Column */}
          <div className="flex-1 w-full">
            {/* Row 1: Username + Edit Profile + Settings */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {editingUsername ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="h-8 w-44 text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveUsername} disabled={savingUsername}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingUsername(false)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <h1 className="text-xl font-normal tracking-tight">{profile?.username}</h1>
              )}

              {!editingUsername && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-lg text-sm font-semibold px-4"
                    onClick={handleEditUsername}
                  >
                    Edit profile
                  </Button>

                  {/* Follow Requests Button */}
                  <Dialog open={requestsOpen} onOpenChange={setRequestsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg relative">
                        <Bell className="h-4 w-4" />
                        {followRequests.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                            {followRequests.length}
                          </span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Follow Requests</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-80 overflow-y-auto space-y-3">
                        {followRequests.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
                        ) : (
                          followRequests.map(req => (
                            <div key={req.id} className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={req.profile?.avatar_url || undefined} />
                                <AvatarFallback className="instagram-gradient text-primary-foreground text-sm font-semibold">
                                  {req.profile?.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{req.profile?.username}</p>
                                <p className="text-xs text-muted-foreground truncate">{req.profile?.full_name}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs instagram-gradient text-primary-foreground"
                                  onClick={() => acceptRequest(req.id, req.requester_id)}
                                  disabled={processingRequest === req.id}
                                >
                                  {processingRequest === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs"
                                  onClick={() => rejectRequest(req.id)}
                                  disabled={processingRequest === req.id}
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Settings — Privacy Toggle */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xs">
                      <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPrivate ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
                            <div>
                              <p className="text-sm font-medium">Private Account</p>
                              <p className="text-xs text-muted-foreground">
                                {isPrivate ? 'Only approved followers can see your posts' : 'Anyone can follow you and see your posts'}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={isPrivate}
                            onCheckedChange={togglePrivacy}
                            disabled={togglingPrivacy}
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>

            {/* Row 2: Stats */}
            <div className="flex gap-8 mb-4">
              <div className="text-sm">
                <span className="font-semibold">{posts.length}</span>{' '}
                <span className="text-foreground">posts</span>
              </div>
              <div className="text-sm cursor-pointer hover:opacity-70">
                <span className="font-semibold">{followerCount}</span>{' '}
                <span className="text-foreground">followers</span>
              </div>
              <div className="text-sm cursor-pointer hover:opacity-70">
                <span className="font-semibold">{followingCount}</span>{' '}
                <span className="text-foreground">following</span>
              </div>
            </div>

            {/* Row 3: Name */}
            <div className="mb-1">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    className="h-7 w-48 text-sm font-semibold"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveFullName()}
                    placeholder="Your name"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveFullName} disabled={savingName}>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(false)}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <button
                  className="text-sm font-semibold hover:opacity-70 transition-opacity flex items-center gap-1"
                  onClick={() => { setNewFullName(profile?.full_name || ''); setEditingName(true); }}
                >
                  {profile?.full_name || 'Add your name'}
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Row 4: Bio */}
            <div className="max-w-sm">
              {editingBio ? (
                <div className="space-y-1">
                  <Textarea
                    value={newBio}
                    onChange={e => setNewBio(e.target.value)}
                    className="text-sm resize-none min-h-[60px]"
                    placeholder="Write something about yourself..."
                    maxLength={150}
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground flex-1">{newBio.length}/150</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSaveBio} disabled={savingBio}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingBio(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  className="text-sm text-foreground text-left hover:opacity-70 transition-opacity block"
                  onClick={() => { setNewBio(profile?.bio || ''); setEditingBio(true); }}
                >
                  {profile?.bio || (
                    <span className="text-muted-foreground italic">+ Add bio</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* === Story Highlights === */}
        <div className="mb-6 border-b border-border pb-6">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide px-2">
            {/* Add new highlight */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
              <div className="w-[64px] h-[64px] md:w-[77px] md:h-[77px] rounded-full border border-border flex items-center justify-center bg-background group-hover:bg-secondary transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <span className="text-[11px] text-foreground font-normal max-w-[64px] md:max-w-[77px] truncate text-center">
                New
              </span>
            </div>

            {/* Placeholder highlights */}
            {HIGHLIGHT_ICONS.map((h) => (
              <div key={h.label} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
                <div className="w-[64px] h-[64px] md:w-[77px] md:h-[77px] rounded-full border border-border flex items-center justify-center bg-background group-hover:bg-secondary transition-colors">
                  <span className="text-2xl">{h.emoji}</span>
                </div>
                <span className="text-[11px] text-foreground font-normal max-w-[64px] md:max-w-[77px] truncate text-center">
                  {h.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* === Tab Navigation === */}
        <div className="flex justify-center border-t border-border">
          <button
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-colors border-t -mt-px ${
              activeTab === 'posts'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Posts
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-colors border-t -mt-px ${
              activeTab === 'saved'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('saved')}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Saved
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-colors border-t -mt-px ${
              activeTab === 'tagged'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('tagged')}
          >
            <UserSquare2 className="h-3.5 w-3.5" />
            Tagged
          </button>
        </div>

        {/* === Posts Grid === */}
        {activeTab === 'posts' && (
          <div className="pt-1">
            <div className="grid grid-cols-3 gap-1">
              {posts.map(post => (
                <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden">
                  <img
                    src={post.image_url}
                    alt={post.caption || ''}
                    className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
                    loading="lazy"
                  />
                  {/* Hover overlay with like/comment counts */}
                  <div className="absolute inset-0 bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1.5 text-background font-semibold text-sm">
                      <Heart className="h-5 w-5 fill-background" />
                    </div>
                    <div className="flex items-center gap-1.5 text-background font-semibold text-sm">
                      <MessageCircle className="h-5 w-5 fill-background" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {posts.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                  <Grid3X3 className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-light mb-2">Share Photos</h3>
                <p className="text-sm text-muted-foreground">When you share photos, they will appear on your profile.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-foreground flex items-center justify-center mb-4">
              <Bookmark className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-light mb-2">Save</h3>
            <p className="text-sm text-muted-foreground">Save photos and videos that you want to see again.</p>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-foreground flex items-center justify-center mb-4">
              <UserSquare2 className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-light mb-2">Photos of you</h3>
            <p className="text-sm text-muted-foreground">When people tag you in photos, they'll appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
