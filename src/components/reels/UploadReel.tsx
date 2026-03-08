import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface UploadReelProps {
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadReel({ onClose, onUploaded }: UploadReelProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    if (f.size > 100 * 1024 * 1024) { toast.error('Video must be under 100MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('reel-videos').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('reel-videos').getPublicUrl(path);

      const { error } = await supabase.from('reels').insert({
        user_id: user.id,
        video_url: urlData.publicUrl,
        caption: caption.trim() || null,
      });
      if (error) throw error;

      toast.success('Reel uploaded!');
      onUploaded();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onClose}><X className="h-6 w-6" /></button>
        <h2 className="font-bold text-lg">New Reel</h2>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[500px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-secondary/50 transition-colors"
          >
            <Upload className="h-12 w-12 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Select a video</span>
          </button>
        ) : (
          <div className="relative">
            <video src={preview} className="w-full aspect-[9/16] max-h-[500px] object-cover rounded-xl" controls />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1.5 hover:bg-foreground/90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

        <Input
          placeholder="Write a caption..."
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className="bg-secondary border-0"
        />

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full instagram-gradient text-primary-foreground font-semibold"
        >
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : 'Share Reel'}
        </Button>
      </div>
    </div>
  );
}
