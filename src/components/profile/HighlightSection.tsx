import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, X, Loader2, Trash2, ImagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Highlight {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  cover_url: string | null;
  created_at: string;
  items: HighlightItem[];
}

interface HighlightItem {
  id: string;
  highlight_id: string;
  image_url: string;
  created_at: string;
}

const EMOJI_OPTIONS = ['⭐', '✈️', '🍕', '💪', '🎵', '🐾', '📸', '🎉', '💖', '🏠', '🎨', '🌊'];

export default function HighlightSection() {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [creating, setCreating] = useState(false);

  // View dialog
  const [viewHighlight, setViewHighlight] = useState<Highlight | null>(null);
  const [viewIndex, setViewIndex] = useState(0);

  // Add photos
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addingToHighlight, setAddingToHighlight] = useState<string | null>(null);

  const loadHighlights = async () => {
    if (!user) return;
    const { data: hlData } = await supabase
      .from('highlights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (hlData && hlData.length > 0) {
      const hlIds = hlData.map(h => h.id);
      const { data: items } = await supabase
        .from('highlight_items')
        .select('*')
        .in('highlight_id', hlIds)
        .order('created_at', { ascending: true });

      const itemMap: Record<string, HighlightItem[]> = {};
      (items || []).forEach(item => {
        if (!itemMap[item.highlight_id]) itemMap[item.highlight_id] = [];
        itemMap[item.highlight_id].push(item);
      });

      setHighlights(hlData.map(h => ({ ...h, items: itemMap[h.id] || [] })));
    } else {
      setHighlights([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHighlights();
  }, [user]);

  const createHighlight = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('highlights').insert({
        user_id: user.id,
        name: newName.trim(),
        emoji: newEmoji,
      });
      if (error) throw error;
      toast.success('Highlight created!');
      setCreateOpen(false);
      setNewName('');
      setNewEmoji('⭐');
      loadHighlights();
    } catch {
      toast.error('Failed to create highlight');
    } finally {
      setCreating(false);
    }
  };

  const deleteHighlight = async (id: string) => {
    if (!confirm('Delete this highlight?')) return;
    const { error } = await supabase.from('highlights').delete().eq('id', id);
    if (!error) {
      toast.success('Highlight deleted');
      setViewHighlight(null);
      loadHighlights();
    } else {
      toast.error('Failed to delete');
    }
  };

  const handleAddPhotos = (highlightId: string) => {
    setAddingToHighlight(highlightId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !addingToHighlight) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('highlight-images')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('highlight-images')
          .getPublicUrl(path);

        await supabase.from('highlight_items').insert({
          highlight_id: addingToHighlight,
          image_url: urlData.publicUrl,
        });
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} added!`);
      loadHighlights();
    } catch {
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      setAddingToHighlight(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('highlight_items').delete().eq('id', itemId);
    if (!error) {
      toast.success('Photo removed');
      loadHighlights();
      // Update view if open
      if (viewHighlight) {
        const updated = viewHighlight.items.filter(i => i.id !== itemId);
        if (updated.length === 0) {
          setViewHighlight(null);
        } else {
          setViewHighlight({ ...viewHighlight, items: updated });
          setViewIndex(Math.min(viewIndex, updated.length - 1));
        }
      }
    }
  };

  const openHighlight = (hl: Highlight) => {
    if (hl.items.length === 0) {
      // No items - prompt to add
      handleAddPhotos(hl.id);
      return;
    }
    setViewIndex(0);
    setViewHighlight(hl);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mb-6 border-b border-border pb-6">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide px-2">
          {/* Add new highlight */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <div className="w-[64px] h-[64px] md:w-[77px] md:h-[77px] rounded-full border border-dashed border-border flex items-center justify-center bg-background group-hover:bg-secondary transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-[11px] text-foreground font-normal max-w-[64px] md:max-w-[77px] truncate text-center">
              New
            </span>
          </button>

          {/* Existing highlights */}
          {highlights.map(hl => (
            <button
              key={hl.id}
              onClick={() => openHighlight(hl)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
            >
              <div className="w-[64px] h-[64px] md:w-[77px] md:h-[77px] rounded-full border border-border overflow-hidden flex items-center justify-center bg-background group-hover:bg-secondary transition-colors relative">
                {hl.items.length > 0 ? (
                  <img
                    src={hl.items[0].image_url}
                    alt={hl.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{hl.emoji}</span>
                )}
              </div>
              <span className="text-[11px] text-foreground font-normal max-w-[64px] md:max-w-[77px] truncate text-center">
                {hl.name}
              </span>
            </button>
          ))}

          {loading && (
            <div className="flex items-center justify-center w-16 h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Create highlight dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Highlight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Highlight name"
                maxLength={20}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(em => (
                  <button
                    key={em}
                    onClick={() => setNewEmoji(em)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-colors ${
                      newEmoji === em
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={createHighlight}
              disabled={creating || !newName.trim()}
              className="w-full"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Highlight
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View highlight dialog */}
      <Dialog open={!!viewHighlight} onOpenChange={open => !open && setViewHighlight(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {viewHighlight && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{viewHighlight.emoji}</span>
                  <h3 className="font-semibold text-sm">{viewHighlight.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {viewIndex + 1}/{viewHighlight.items.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleAddPhotos(viewHighlight.id)}
                    title="Add photos"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteHighlight(viewHighlight.id)}
                    title="Delete highlight"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Image viewer */}
              {viewHighlight.items.length > 0 && (
                <div className="relative">
                  {/* Progress bars */}
                  <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
                    {viewHighlight.items.map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-full transition-colors ${
                          i <= viewIndex ? 'bg-foreground' : 'bg-foreground/30'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="aspect-square bg-muted relative">
                    <img
                      src={viewHighlight.items[viewIndex]?.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />

                    {/* Navigation areas */}
                    <button
                      className="absolute left-0 top-0 bottom-0 w-1/3"
                      onClick={() => setViewIndex(Math.max(0, viewIndex - 1))}
                    />
                    <button
                      className="absolute right-0 top-0 bottom-0 w-1/3"
                      onClick={() => setViewIndex(Math.min(viewHighlight.items.length - 1, viewIndex + 1))}
                    />
                  </div>

                  {/* Delete photo */}
                  <div className="flex justify-center py-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => deleteItem(viewHighlight.items[viewIndex]?.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove this photo
                    </Button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
