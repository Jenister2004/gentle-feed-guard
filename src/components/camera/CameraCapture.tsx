import { useRef, useState } from 'react';
import { Camera, Loader2, X, ImagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function CameraCapture() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [target, setTarget] = useState<'post' | 'story' | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please capture an image');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOpen(true);
  };

  const upload = async (type: 'post' | 'story') => {
    if (!file || !user) return;
    setTarget(type);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const bucket = type === 'story' ? 'story-images' : 'post-images';
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

      // Moderate
      const modResp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'image', content: urlData.publicUrl, userId: user.id, checkEmbeddedText: true },
      });
      if (modResp.data?.flagged) {
        await supabase.storage.from(bucket).remove([path]);
        toast.error('⚠️ Image was detected as containing harmful content and has been blocked.', { duration: 5000 });
        reset();
        return;
      }

      if (type === 'story') {
        const { error } = await supabase.from('stories').insert({ user_id: user.id, image_url: urlData.publicUrl });
        if (error) throw error;
        toast.success('Story shared!');
      } else {
        const { error } = await supabase.from('posts').insert({ user_id: user.id, image_url: urlData.publicUrl });
        if (error) throw error;
        toast.success('Post created!');
      }
      reset();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTarget(null);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setOpen(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="icon-click hover:opacity-60 transition-opacity"
        title="Take Photo"
      >
        <Camera className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Share Photo</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="relative">
              <img src={preview} alt="Captured" className="w-full aspect-square object-cover rounded-lg" />
              <button onClick={reset} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1 hover:bg-foreground/90">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => upload('post')}
              disabled={uploading}
              className="flex-1 instagram-gradient text-primary-foreground font-semibold"
            >
              {uploading && target === 'post' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
              Post
            </Button>
            <Button
              onClick={() => upload('story')}
              disabled={uploading}
              variant="outline"
              className="flex-1 font-semibold"
            >
              {uploading && target === 'story' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Story
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
