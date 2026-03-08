import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateStory({ onCreated, triggerMode = 'bar' }: { onCreated: () => void; triggerMode?: 'bar' | 'icon' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
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
      const { error: uploadErr } = await supabase.storage.from('story-images').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('story-images').getPublicUrl(path);

      // Moderate the image (checks for harmful content + embedded text)
      const moderationResp = await supabase.functions.invoke('moderate-content', {
        body: { type: 'image', content: urlData.publicUrl, userId: user.id, checkEmbeddedText: true },
      });

      if (moderationResp.data?.flagged) {
        await supabase.storage.from('story-images').remove([path]);
        toast.error('⚠️ Your story image was detected as containing harmful content and has been blocked.', { duration: 5000 });
        reset();
        return;
      }

      const { error: storyErr } = await supabase.from('stories').insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
      });
      if (storyErr) throw storyErr;

      toast.success('Story shared!');
      reset();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1 flex-shrink-0"
      >
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary transition-colors icon-click">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <span className="text-[10px] text-muted-foreground">Your story</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-center">Add to Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!preview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-[9/16] max-h-[400px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-secondary/50 transition-colors"
              >
                <ImagePlus className="h-12 w-12 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Select an image for your story</span>
              </button>
            ) : (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full aspect-[9/16] max-h-[400px] object-cover rounded-lg" />
                <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1 text-xs hover:bg-foreground/90">✕</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <Button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="w-full instagram-gradient text-primary-foreground font-semibold"
            >
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sharing...</> : 'Share to Story'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
