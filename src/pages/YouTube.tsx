import { useState, useEffect, useRef } from 'react';
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
  ThumbsUp, MessageSquare, Share2, Upload, Link as LinkIcon, Play,
  Loader2, ArrowLeft, Trash2, Send, Search, Video, Home, Compass,
  Bell, User, Menu, Plus, Shield
} from 'lucide-react';

interface YTVideo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  video_type: string;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
}

interface YTComment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  is_flagged: boolean;
  is_deleted: boolean;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
}

// Sample YouTube video IDs for demo content
const SAMPLE_VIDEOS = [
  { ytId: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', desc: 'The official video for "Never Gonna Give You Up" by Rick Astley.' },
  { ytId: 'jNQXAC9IVRw', title: 'Me at the zoo', desc: 'The first video on YouTube. Shot at the San Diego Zoo.' },
  { ytId: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', desc: 'The worldwide viral hit from PSY.' },
  { ytId: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', desc: 'One of the most viewed videos on YouTube.' },
  { ytId: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', desc: 'The official music video for Shape of You.' },
  { ytId: 'RgKAFK5djSk', title: 'Wiz Khalifa - See You Again ft. Charlie Puth', desc: 'Official video for "See You Again" from Furious 7.' },
];

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function YouTube() {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YTVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) loadVideos();
  }, [user]);

  const loadVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(v => v.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
      const pMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      const enriched = await Promise.all(data.map(async (v) => {
        const { count: likeCount } = await supabase.from('youtube_likes').select('id', { count: 'exact', head: true }).eq('video_id', v.id);
        const { count: commentCount } = await supabase.from('youtube_comments').select('id', { count: 'exact', head: true }).eq('video_id', v.id).eq('is_deleted', false);
        const { data: likeData } = user ? await supabase.from('youtube_likes').select('id').eq('video_id', v.id).eq('user_id', user.id).maybeSingle() : { data: null };
        return {
          ...v,
          username: pMap[v.user_id]?.username || 'unknown',
          avatar_url: pMap[v.user_id]?.avatar_url,
          likeCount: likeCount || 0,
          commentCount: commentCount || 0,
          liked: !!likeData,
        };
      }));
      setVideos(enriched);
    } else {
      // Show sample videos as placeholders
      setVideos(SAMPLE_VIDEOS.map((sv, i) => ({
        id: `sample-${i}`,
        user_id: '',
        title: sv.title,
        description: sv.desc,
        video_url: `https://www.youtube.com/watch?v=${sv.ytId}`,
        thumbnail_url: `https://img.youtube.com/vi/${sv.ytId}/hqdefault.jpg`,
        video_type: 'youtube',
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        username: 'YouTube',
        avatar_url: null,
        likeCount: Math.floor(Math.random() * 1000),
        commentCount: Math.floor(Math.random() * 100),
        liked: false,
      })));
    }
    setLoading(false);
  };

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Navigate to="/youtube-auth" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* YouTube Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center gap-4">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 hover:bg-secondary rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => { setSelectedVideo(null); setSearchQuery(''); }}>
              <div className="bg-destructive rounded-lg p-1.5">
                <Play className="h-4 w-4 text-destructive-foreground fill-destructive-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:inline">YouTube</span>
            </div>
          </div>

          {/* Center — search */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="flex">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="rounded-l-full rounded-r-none border-r-0 bg-secondary border-border h-10 pl-4"
                />
              </div>
              <button className="px-5 bg-secondary border border-border rounded-r-full hover:bg-muted transition-colors">
                <Search className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <button className="p-2 hover:bg-secondary rounded-full">
                  <Video className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Upload Video</DialogTitle></DialogHeader>
                <UploadForm userId={user.id} onDone={() => { setUploadOpen(false); loadVideos(); }} />
              </DialogContent>
            </Dialog>
            {isAdmin && (
              <button onClick={() => navigate('/admin')} className="p-2 hover:bg-secondary rounded-full" title="Admin Dashboard">
                <Shield className="h-5 w-5" />
              </button>
            )}
            <button className="p-2 hover:bg-secondary rounded-full">
              <Bell className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate('/youtube-profile')}>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-muted">{profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {selectedVideo ? (
        <VideoPlayer video={selectedVideo} user={user} onBack={() => { setSelectedVideo(null); loadVideos(); }} />
      ) : (
        <main className="max-w-[1400px] mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">No videos found</p>
              <p className="text-sm mt-1">Upload your first video or paste a YouTube link</p>
            </div>
          ) : (
            <>
              {/* Category chips */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {['All', 'Music', 'Gaming', 'Education', 'Entertainment', 'Sports', 'News'].map(cat => (
                  <button key={cat} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${cat === 'All' ? 'bg-foreground text-background' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Video grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {filteredVideos.map(v => (
                  <VideoCard key={v.id} video={v} onClick={() => setSelectedVideo(v)} />
                ))}
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}

/* ── Video Card (thumbnail) ── */
function VideoCard({ video, onClick }: { video: YTVideo; onClick: () => void }) {
  const ytId = extractYouTubeId(video.video_url);
  const thumb = video.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

  return (
    <button onClick={onClick} className="w-full text-left group">
      <div className="rounded-xl overflow-hidden bg-muted aspect-video relative">
        {thumb ? (
          <img src={thumb} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <video src={video.video_url} className="w-full h-full object-cover" muted preload="metadata" />
        )}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
        <div className="absolute bottom-2 right-2 bg-foreground/80 text-background text-[10px] px-1.5 py-0.5 rounded font-medium">
          3:45
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={video.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-muted">{(video.username || 'U')[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-5 line-clamp-2">{video.title || 'Untitled'}</p>
          <p className="text-xs text-muted-foreground mt-1">{video.username}</p>
          <p className="text-xs text-muted-foreground">
            {(video.likeCount || 0).toLocaleString()} likes · {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ── Upload Form ── */
function UploadForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [tab, setTab] = useState('upload');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmitUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      const path = `${userId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('youtube-videos').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('youtube-videos').getPublicUrl(path);
      const { error } = await supabase.from('youtube_videos').insert({
        user_id: userId, title: title.trim(), description: description.trim(),
        video_url: urlData.publicUrl, video_type: 'upload',
      });
      if (error) throw error;
      toast.success('Video uploaded!');
      onDone();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSubmitYoutube = async () => {
    if (!youtubeUrl.trim() || !title.trim()) return;
    const ytId = extractYouTubeId(youtubeUrl);
    if (!ytId) { toast.error('Invalid YouTube URL'); return; }
    setUploading(true);
    try {
      const { error } = await supabase.from('youtube_videos').insert({
        user_id: userId, title: title.trim(), description: description.trim(),
        video_url: youtubeUrl.trim(), video_type: 'youtube',
        thumbnail_url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      });
      if (error) throw error;
      toast.success('Video added!');
      onDone();
    } catch { toast.error('Failed to add video'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1 gap-1.5"><Upload className="h-4 w-4" /> Upload</TabsTrigger>
          <TabsTrigger value="youtube" className="flex-1 gap-1.5"><LinkIcon className="h-4 w-4" /> YouTube URL</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="space-y-3 pt-2">
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            {file ? file.name : 'Select video file'}
          </Button>
          <Button className="w-full" disabled={uploading || !file || !title.trim()} onClick={handleSubmitUpload}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Upload
          </Button>
        </TabsContent>
        <TabsContent value="youtube" className="space-y-3 pt-2">
          <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          <Button className="w-full" disabled={uploading || !youtubeUrl.trim() || !title.trim()} onClick={handleSubmitYoutube}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add Video
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Video Player Page ── */
function VideoPlayer({ video: initialVideo, user, onBack }: { video: YTVideo; user: any; onBack: () => void }) {
  const [video, setVideo] = useState(initialVideo);
  const [liked, setLiked] = useState(initialVideo.liked || false);
  const [likeCount, setLikeCount] = useState(initialVideo.likeCount || 0);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const isSample = video.id.startsWith('sample-');

  // Auto-save sample video to DB so we can comment/like
  const ensureSaved = async (): Promise<string> => {
    if (!isSample) return video.id;
    const { data, error } = await supabase.from('youtube_videos').insert({
      user_id: user.id, title: video.title, description: video.description || '',
      video_url: video.video_url, thumbnail_url: video.thumbnail_url,
      video_type: 'youtube',
    }).select('id').single();
    if (error) throw error;
    setVideo(prev => ({ ...prev, id: data.id }));
    return data.id;
  };

  useEffect(() => { if (!isSample) loadComments(); }, [video.id]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('youtube_comments')
      .select('*')
      .eq('video_id', video.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (data) {
      const uids = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', uids);
      const pMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      setComments(data.map(c => ({ ...c, username: pMap[c.user_id]?.username || 'unknown', avatar_url: pMap[c.user_id]?.avatar_url })));
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    try {
      const videoId = await ensureSaved();
      if (liked) {
        await supabase.from('youtube_likes').delete().eq('video_id', videoId).eq('user_id', user.id);
        setLiked(false); setLikeCount(p => p - 1);
      } else {
        await supabase.from('youtube_likes').insert({ video_id: videoId, user_id: user.id });
        setLiked(true); setLikeCount(p => p + 1);
      }
    } catch { toast.error('Failed'); }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      const videoId = await ensureSaved();

      const { data: prof } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', user.id).maybeSingle();
      if (prof?.is_banned) { toast.error('🚫 Your account has been banned.'); setSubmitting(false); return; }
      if (prof?.is_suspended) { toast.error('⚠️ Your account is suspended.'); setSubmitting(false); return; }

      const resp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'text', content: newComment, userId: user.id },
      });
      if (resp.data?.flagged) {
        toast.error('⚠️ Your comment was detected as cyberbullying and has been removed.', { duration: 5000 });
        setNewComment(''); setSubmitting(false); return;
      }

      const { error } = await supabase.from('youtube_comments').insert({
        video_id: videoId, user_id: user.id, content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment('');
      loadComments();
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('youtube_comments').update({ is_deleted: true }).eq('id', id);
    if (!error) { toast.success('Comment deleted'); loadComments(); }
  };

  const ytId = extractYouTubeId(video.video_url);

  return (
    <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 p-4">
      <div className="flex-1">
        {/* Video embed */}
        <div className="aspect-video bg-foreground rounded-xl overflow-hidden">
          {video.video_type === 'youtube' && ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <video src={video.video_url} controls autoPlay className="w-full h-full" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold mt-4 leading-snug">{video.title || 'Untitled'}</h1>

        {/* Channel + Actions row */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={video.avatar_url || undefined} />
              <AvatarFallback className="bg-muted font-bold">{(video.username || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{video.username}</p>
              <p className="text-xs text-muted-foreground">Content Creator</p>
            </div>
            <Button size="sm" className="rounded-full ml-2 bg-foreground text-background hover:bg-foreground/80">Subscribe</Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-secondary rounded-full overflow-hidden">
              <button onClick={toggleLike} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors ${liked ? 'text-primary' : ''}`}>
                <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {likeCount.toLocaleString()}
              </button>
              <div className="w-px h-6 bg-border" />
              <button className="px-3 py-2 hover:bg-muted transition-colors">
                <ThumbsUp className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <Button variant="secondary" size="sm" className="rounded-full gap-1.5" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>

        {/* Description box */}
        <button onClick={() => setShowDesc(!showDesc)} className="w-full text-left bg-secondary rounded-xl p-3 mt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <span>{likeCount.toLocaleString()} likes</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
          </div>
          <p className={`text-sm ${showDesc ? '' : 'line-clamp-2'}`}>{video.description || 'No description'}</p>
          {!showDesc && <span className="text-xs font-semibold mt-1 block">Show more</span>}
        </button>

        {/* Comments section */}
        <div className="mt-6">
          <h2 className="font-bold text-base mb-4">{comments.length} Comments</h2>

          <form onSubmit={submitComment} className="flex items-start gap-3 mb-6">
            <Avatar className="h-8 w-8 mt-1">
              <AvatarFallback className="text-xs bg-muted">U</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground text-sm"
                disabled={submitting}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewComment('')} className="rounded-full">Cancel</Button>
                <Button type="submit" size="sm" disabled={submitting || !newComment.trim()} className="rounded-full bg-primary text-primary-foreground">
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Comment
                </Button>
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={c.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-muted">{(c.username || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">@{c.username}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm mt-0.5">{c.content}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ThumbsUp className="h-3.5 w-3.5" /></button>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ThumbsUp className="h-3.5 w-3.5 rotate-180" /></button>
                    <button className="text-xs font-medium text-muted-foreground hover:text-foreground">Reply</button>
                  </div>
                </div>
                {user && user.id === c.user_id && (
                  <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>}
          </div>
        </div>

        <Button variant="ghost" onClick={onBack} className="mt-6 gap-2"><ArrowLeft className="h-4 w-4" /> Back to videos</Button>
      </div>
    </div>
  );
}
