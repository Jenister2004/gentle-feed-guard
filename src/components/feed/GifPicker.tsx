import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smile } from 'lucide-react';

// Sample GIF dataset with cyberbullying and non-cyberbullying categories
const GIF_DATASET = {
  safe: [
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDd2Z3Bna2RlMjFpNHRkOGt0Y2V6ZmRneG5jbTR1dW4yOXFhZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7abldj0b3rxrZUxW/giphy.gif', label: 'Thumbs Up' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaW44NXR6NjAzOWl4M3l4cHVhbmVuMnZmcjZhOGF0dGUzaHlsMnJsYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYt5jPR6QX5pnqM/giphy.gif', label: 'Clapping' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzlvenZyemExNzFyN3g3cXBsMWZlcTVrZjE1Nm83czBxZHBtNWR6ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjI6SIIHBdRxXI40/giphy.gif', label: 'Heart' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGI5OTl3dmdkN2k4OGhxcTB6ZjMwbWRqOWRqeGpxbXcyNHF2aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif', label: 'Laughing' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXh3d3FuZm9hNzEya2FlZ3cyZDR3dGx0MnI0dHk5dXB5cGZxZ3JuZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3q2K5jinAlChoCLS/giphy.gif', label: 'High Five' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWttcnhyaTN3Ym15dmx6NWVqcXB4cXN3bjk2d2ZlcHAxYTdqd2Q5ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oz8xIsloV5zOkeDE4/giphy.gif', label: 'Dancing' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzJpbjk4cHpya2p6OGRzZjhwNnBhcjQ1aGZtMGw1Z3VpNjM2cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjHFOscgNwdSRRDy/giphy.gif', label: 'Cool' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2V4MGdlcGRzOGRiYWNpNWxuamJkMDRxYm11dDJseWFpdzk4czV1ciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlBO7eyXzSZkJri/giphy.gif', label: 'Peace' },
  ],
  cyberbullying: [
    // These GIFs are intentionally labeled as cyberbullying for detection testing
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWE2OGZjbjNqcHdtOGJ3Y2Z4d3AybGkzcTNha2d1eGdrMWpzNGZ5aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l1J9u3TZfpmeDLkD6/giphy.gif', label: '🚫 Mocking', flagged: true },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjVwc3ViZnVraXlzeTk2NDNqaGNzN2s0MXR3d3FlNGZqcG4yYmdoZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7btT1T9qpQZWhNlK/giphy.gif', label: '🚫 Mean Look', flagged: true },
  ],
};

interface GifData {
  url: string;
  label: string;
  flagged?: boolean;
}

interface GifPickerProps {
  onSelect: (gifUrl: string, isFlaggedInDataset: boolean) => void;
  disabled?: boolean;
}

export default function GifPicker({ onSelect, disabled }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'safe' | 'all'>('safe');

  const allGifs = tab === 'all'
    ? [...GIF_DATASET.safe, ...GIF_DATASET.cyberbullying]
    : GIF_DATASET.safe;

  const filtered = search
    ? allGifs.filter(g => g.label.toLowerCase().includes(search.toLowerCase()))
    : allGifs;

  const handleSelect = (gif: GifData) => {
    onSelect(gif.url, !!gif.flagged);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={disabled} title="Send GIF">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Search GIFs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2 text-sm h-8"
        />
        <div className="flex gap-1 mb-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 'safe' ? 'default' : 'outline'}
            className="text-xs h-6 px-2"
            onClick={() => setTab('safe')}
          >
            Safe GIFs
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'all' ? 'default' : 'outline'}
            className="text-xs h-6 px-2"
            onClick={() => setTab('all')}
          >
            All (incl. test)
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
          {filtered.map((gif, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(gif)}
              className="relative rounded overflow-hidden hover:ring-2 ring-primary transition-all aspect-square"
            >
              <img src={gif.url} alt={gif.label} className="w-full h-full object-cover" loading="lazy" />
              {'flagged' in gif && gif.flagged && (
                <span className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground text-[10px] px-1 rounded">⚠️</span>
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-[10px] text-center py-0.5">{gif.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No GIFs found</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
