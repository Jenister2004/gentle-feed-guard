import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  ThumbsUp, ThumbsDown, MessageSquare, Share2, Upload, Link, Play,
  Loader2, ArrowLeft, Trash2, Send, Search, Menu, Bell, Video
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

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function YouTube() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YTVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadVideos();
  }, [user]);

  const loadVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false });

    if (data) {
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
    }
    setLoading(false);
  };

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* YouTube-style header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1 hover:opacity-70">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <div className="bg-destructive rounded-lg p-1">
            <Play className="h-4 w-4 text-destructive-foreground fill-destructive-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">YouTube</span>
        </div>
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="pl-9 h-9 bg-secondary border-0 rounded-full text-sm"
            />
          </div>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Upload Video</DialogTitle></DialogHeader>
            <UploadForm userId={user.id} onDone={() => { setUploadOpen(false); loadVideos(); }} />
          </DialogContent>
        </Dialog>
      </header>

      {selectedVideo ? (
        <VideoPlayer video={selectedVideo} user={user} onBack={() => { setSelectedVideo(null); loadVideos(); }} />
      ) : (
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No videos yet</p>
              <p className="text-sm mt-1">Be the first to upload!</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {filteredVideos.map(v => (
                <button key={v.id} onClick={() => setSelectedVideo(v)} className="w-full text-left group">
                  <div className="rounded-xl overflow-hidden bg-muted aspect-video relative">
                    {v.video_type === 'youtube' ? (
                      <img
                        src={v.thumbnail_url || `https://img.youtube.com/vi/${extractYouTubeId(v.video_url)}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video src={v.video_url} className="w-full h-full object-cover" muted preload="metadata" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-12 w-12 text-card fill-card drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Avatar className="h-9 w-9 mt-0.5">
                      <AvatarImage src={v.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">{(v.username || 'U')[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{v.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.username} · {v.likeCount} likes · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title *" />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1 gap-1"><Upload className="h-4 w-4" /> Upload</TabsTrigger>
          <TabsTrigger value="youtube" className="flex-1 gap-1"><Link className="h-4 w-4" /> YouTube URL</TabsTrigger>
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

/* ── Video Player ── */
function VideoPlayer({ video, user, onBack }: { video: YTVideo; user: any; onBack: () => void }) {
  const [liked, setLiked] = useState(video.liked || false);
  const [likeCount, setLikeCount] = useState(video.likeCount || 0);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDesc, setShowDesc] = useState(false);

  useEffect(() => { loadComments(); }, [video.id]);

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
    if (liked) {
      await supabase.from('youtube_likes').delete().eq('video_id', video.id).eq('user_id', user.id);
      setLiked(false); setLikeCount(p => p - 1);
    } else {
      await supabase.from('youtube_likes').insert({ video_id: video.id, user_id: user.id });
      setLiked(true); setLikeCount(p => p + 1);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      // Check user status
      const { data: prof } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', user.id).maybeSingle();
      if (prof?.is_banned) { toast.error('🚫 Your account has been banned.'); setSubmitting(false); return; }
      if (prof?.is_suspended) { toast.error('⚠️ Your account is suspended.'); setSubmitting(false); return; }

      // Moderate comment
      const resp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'text', content: newComment, userId: user.id },
      });
      if (resp.data?.flagged) {
        toast.error('⚠️ Your comment was detected as cyberbullying and has been removed.', { duration: 5000 });
        setNewComment('');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('youtube_comments').insert({
        video_id: video.id, user_id: user.id, content: newComment.trim(),
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
    <div className="max-w-4xl mx-auto">
      {/* Video */}
      <div className="aspect-video bg-foreground">
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

      <div className="p-4 space-y-3">
        {/* Title */}
        <h1 className="text-lg font-semibold leading-snug">{video.title || 'Untitled'}</h1>

        {/* Channel + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={video.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-muted">{(video.username || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{video.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={liked ? 'default' : 'secondary'} size="sm" onClick={toggleLike} className="gap-1.5 rounded-full">
              <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {likeCount}
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5 rounded-full" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <button onClick={() => setShowDesc(!showDesc)} className="w-full text-left bg-secondary rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</p>
            <p className={`text-sm ${showDesc ? '' : 'line-clamp-2'}`}>{video.description}</p>
          </button>
        )}

        {/* Comments */}
        <div className="pt-2 border-t border-border">
          <h2 className="font-semibold text-sm mb-3">{comments.length} Comments</h2>

          <form onSubmit={submitComment} className="flex gap-2 mb-4">
            <Input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-secondary border-0 text-sm"
              disabled={submitting}
            />
            <Button type="submit" size="icon" variant="ghost" disabled={submitting || !newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5 group">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarImage src={c.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted">{(c.username || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">@{c.username}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm mt-0.5">{c.content}</p>
                </div>
                {user && user.id === c.user_id && (
                  <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>}
          </div>
        </div>

        <Button variant="outline" onClick={onBack} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to videos</Button>
      </div>
    </div>
  );
}
