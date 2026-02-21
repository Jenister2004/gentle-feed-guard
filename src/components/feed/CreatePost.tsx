import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusSquare, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePost({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);

      // Moderate image
      const moderationResp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'image', content: urlData.publicUrl, userId: user.id, checkEmbeddedText: true },
      });

      if (moderationResp.data?.flagged) {
        // Delete the uploaded image
        await supabase.storage.from('post-images').remove([path]);
        toast.error('⚠️ Your image was detected as containing harmful content and has been removed.', { duration: 5000 });
        reset();
        return;
      }

      const { error: postErr } = await supabase.from('posts').insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        caption,
      });
      if (postErr) throw postErr;

      toast.success('Post created!');
      reset();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="hover:opacity-60 transition-opacity">
          <PlusSquare className="h-6 w-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Create New Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!preview ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-secondary/50 transition-colors"
            >
              <ImagePlus className="h-12 w-12 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">Click to select an image</span>
            </button>
          ) : (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full aspect-square object-cover rounded-lg" />
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1 text-xs hover:bg-foreground/90">✕</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <Textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="resize-none bg-secondary border-0"
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="w-full instagram-gradient text-primary-foreground font-semibold"
          >
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting...</> : 'Share Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
