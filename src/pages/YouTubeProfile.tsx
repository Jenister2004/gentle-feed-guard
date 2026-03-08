import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Edit2, Video, ThumbsUp, MessageSquare, Eye, Clock,
  Loader2, Shield, Play, Trash2, Camera, Settings, User
} from 'lucide-react';

interface ChannelVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  video_type: string;
  created_at: string;
  is_flagged: boolean;
  likeCount: number;
  commentCount: number;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function YouTubeProfile() {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalLikes: 0, totalComments: 0, totalVideos: 0 });

  useEffect(() => {
    if (user) {
      loadVideos();
      if (profile) {
        setEditUsername(profile.username || '');
        setEditFullName(profile.full_name || '');
        setEditBio(profile.bio || '');
      }
    }
  }, [user, profile]);

  const loadVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) {
      let totalLikes = 0;
      let totalComments = 0;
      const enriched = await Promise.all(data.map(async (v) => {
        const { count: likeCount } = await supabase.from('youtube_likes').select('id', { count: 'exact', head: true }).eq('video_id', v.id);
        const { count: commentCount } = await supabase.from('youtube_comments').select('id', { count: 'exact', head: true }).eq('video_id', v.id).eq('is_deleted', false);
        totalLikes += likeCount || 0;
        totalComments += commentCount || 0;
        return { ...v, likeCount: likeCount || 0, commentCount: commentCount || 0 };
      }));
      setVideos(enriched);
      setStats({ totalLikes, totalComments, totalVideos: data.length });
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) { toast.error('Username is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      username: editUsername.trim(),
      full_name: editFullName.trim(),
      bio: editBio.trim(),
    }).eq('user_id', user!.id);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Username taken' : 'Failed to save');
    } else {
      toast.success('Profile updated!');
      setEditOpen(false);
    }
    setSaving(false);
  };

  const deleteVideo = async (videoId: string) => {
    const { error } = await supabase.from('youtube_videos').delete().eq('id', videoId);
    if (!error) { toast.success('Video deleted'); loadVideos(); }
    else toast.error('Failed to delete');
  };

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Navigate to="/youtube-auth" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/youtube')} className="p-1.5 hover:bg-secondary rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1">
              <div className="bg-destructive rounded-lg p-1.5">
                <Play className="h-4 w-4 text-destructive-foreground fill-destructive-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">YouTube</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-1.5 text-xs">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Channel Banner */}
      <div className="h-32 sm:h-48 bg-gradient-to-r from-destructive/20 via-secondary to-destructive/10" />

      {/* Channel Info */}
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 sm:-mt-12">
          <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-2xl font-bold bg-muted">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{profile?.full_name || profile?.username || 'Your Channel'}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>@{profile?.username || 'user'}</span>
              <span>·</span>
              <span>{stats.totalVideos} videos</span>
              <span>·</span>
              <span>{stats.totalLikes} total likes</span>
            </div>
            {profile?.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{profile.bio}</p>}
          </div>
          <div className="flex gap-2 pb-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="rounded-full gap-1.5">
                  <Edit2 className="h-4 w-4" /> Customize channel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Edit Channel</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Channel Name</label>
                    <Input value={editFullName} onChange={e => setEditFullName(e.target.value)} placeholder="Your channel name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Handle</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="pl-8" placeholder="username" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Description</label>
                    <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell viewers about your channel" rows={3} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'videos', label: 'Videos', icon: Video },
              { id: 'stats', label: 'Channel Stats', icon: Eye },
              { id: 'about', label: 'About', icon: User },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'videos' && (
            loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium text-lg">No videos uploaded yet</p>
                <p className="text-sm mt-1">Upload your first video to get started</p>
                <Button className="mt-4" onClick={() => navigate('/youtube')}>Go to YouTube</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                {videos.map(v => {
                  const ytId = extractYouTubeId(v.video_url);
                  const thumb = v.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
                  return (
                    <div key={v.id} className="group relative">
                      <div className="rounded-xl overflow-hidden bg-muted aspect-video relative">
                        {thumb ? (
                          <img src={thumb} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <video src={v.video_url} className="w-full h-full object-cover" muted preload="metadata" />
                        )}
                        {v.is_flagged && (
                          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">Flagged</span>
                        )}
                        <button
                          onClick={() => deleteVideo(v.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-destructive/80 hover:bg-destructive text-destructive-foreground p-1.5 rounded-full transition-opacity"
                          title="Delete video"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2">
                        <p className="font-medium text-sm line-clamp-2">{v.title || 'Untitled'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {v.likeCount}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {v.commentCount}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              {[
                { label: 'Total Videos', value: stats.totalVideos, icon: Video, color: 'text-destructive' },
                { label: 'Total Likes', value: stats.totalLikes, icon: ThumbsUp, color: 'text-primary' },
                { label: 'Total Comments', value: stats.totalComments, icon: MessageSquare, color: 'text-primary' },
              ].map(s => (
                <div key={s.label} className="border border-border rounded-xl p-5 bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <s.icon className="h-4 w-4" /> {s.label}
                  </div>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
              <div className="border border-border rounded-xl p-5 bg-card col-span-full">
                <p className="text-sm text-muted-foreground mb-1">Member since</p>
                <p className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Description</h3>
                <p className="text-sm">{profile?.bio || 'No description provided.'}</p>
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Handle:</span>
                    <span>@{profile?.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Videos:</span>
                    <span>{stats.totalVideos}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span>{profile?.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
