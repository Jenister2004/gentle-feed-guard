import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smile } from 'lucide-react';

// Expanded GIF dataset with cyberbullying and non-cyberbullying categories
const GIF_DATASET: GifData[] = [
  // Safe / positive GIFs
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDd2Z3Bna2RlMjFpNHRkOGt0Y2V6ZmRneG5jbTR1dW4yOXFhZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7abldj0b3rxrZUxW/giphy.gif', label: 'Thumbs Up' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaW44NXR6NjAzOWl4M3l4cHVhbmVuMnZmcjZhOGF0dGUzaHlsMnJsYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYt5jPR6QX5pnqM/giphy.gif', label: 'Clapping' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzlvenZyemExNzFyN3g3cXBsMWZlcTVrZjE1Nm83czBxZHBtNWR6ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjI6SIIHBdRxXI40/giphy.gif', label: 'Heart' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGI5OTl3dmdkN2k4OGhxcTB6ZjMwbWRqOWRqeGpxbXcyNHF2aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif', label: 'Laughing' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXh3d3FuZm9hNzEya2FlZ3cyZDR3dGx0MnI0dHk5dXB5cGZxZ3JuZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3q2K5jinAlChoCLS/giphy.gif', label: 'High Five' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWttcnhyaTN3Ym15dmx6NWVqcXB4cXN3bjk2d2ZlcHAxYTdqd2Q5ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oz8xIsloV5zOkeDE4/giphy.gif', label: 'Dancing' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzJpbjk4cHpya2p6OGRzZjhwNnBhcjQ1aGZtMGw1Z3VpNjM2cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjHFOscgNwdSRRDy/giphy.gif', label: 'Cool' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2V4MGdlcGRzOGRiYWNpNWxuamJkMDRxYm11dDJseWFpdzk4czV1ciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlBO7eyXzSZkJri/giphy.gif', label: 'Peace' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjk5ZTQ3NWFkOTk2MzJkMjgyNGI2ZTNhNmJmMmYzZGQ5MjcxNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEdv6sy3ulljPMGdy/giphy.gif', label: 'Celebration' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzBhNjY4MjEwODJmN2M5MzI0OGFiZmNhODQ4MTI0MTNiYjM1NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xUPGGDNsLvqsBOhuU0/giphy.gif', label: 'Love It' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjI1MDIxZTQ1OTUzYjZhMjExZjUyYjcwZDM4OTIyOTk5ZTUzNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYAs5YlN1QJbp4I/giphy.gif', label: 'Wow' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGUzODQ5YTllOWUyMzUzOWRiNjQ2N2E4MDJjODY1YTJkYjYyMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3ohzdIuqJoo8QdKlnW/giphy.gif', label: 'Thank You' },

  // Cyberbullying test GIFs — Mocking / Body shaming / Racial / Mean
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWE2OGZjbjNqcHdtOGJ3Y2Z4d3AybGkzcTNha2d1eGdrMWpzNGZ5aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l1J9u3TZfpmeDLkD6/giphy.gif', label: '🚫 Mocking', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjVwc3ViZnVraXlzeTk2NDNqaGNzN2s0MXR3d3FlNGZqcG4yYmdoZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7btT1T9qpQZWhNlK/giphy.gif', label: '🚫 Mean Look', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTJ4d2R6NmZhOGJnOXV2Z3V2dHd5emJ6cGJ0ZXdocmMyaGt2OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjHKvjqt5pssL99e/giphy.gif', label: '🚫 Loser Sign', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWt5bHV5MjV4Y2Z4OXRuOXQ2b2Rja2V6cWJ6djVlYWY1NW1pdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYrLAFex1R71l0A/giphy.gif', label: '🚫 Body Shame', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHl4dDV6YmR3ZWo0cWQ5OGo4YXhwbm9iM2Q3NjBsaXJrYTRxciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT1XGWbE0XiBDX2T8Q/giphy.gif', label: '🚫 Ugly Insult', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXVncjF5NXNudGVrNnNqY3A2cXpucGFmYnRhZHN4NXhiZGlvZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKMt1VVNkHV2PaE/giphy.gif', label: '🚫 Racial Mock', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc290cGx5bnFpczRsbWVkY2s2ZHc0dXd0eGVoZndlcmFoeGVhMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l4FGuhL4U2WSOlSli/giphy.gif', label: '🚫 Color Shame', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnhiNmVhZmc5ajN3OWllanVlZzNhcGJ4ejF4d2p4cWltbGhwdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6Zt4HU9uwXmXSAuI/giphy.gif', label: '🚫 Fat Shame', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHB2YjRtN2J2MnRyZzdhbHNkbGJwYmR0c2l5eGhieTI0cHJzeiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlvtIPdJRr0/giphy.gif', label: '🚫 Bully Push', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG9hNjRzOHNmbjRiYXZxODBlZzR0cjVza2RiZ2s3bGM1NWNnbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xUPGcJ9pOikPnc44YU/giphy.gif', label: '🚫 Skinny Shame', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaDI5amFtc3JrMnZ1NnRhcXV6NmRsOGZhaTRlcGlhazJtcHRxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjHGnY8oB4BHVTQ4/giphy.gif', label: '🚫 Hate Speech', flagged: true },
  // More cyberbullying GIFs — Exclusion / Threat / Intimidation
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTVjYzQ3ZjExMjI0N2MzMzIyNjA5ZWJhMzBjMDRkNzA5ZTZmNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l2JehQ2GitHGdVG9Y/giphy.gif', label: '🚫 Go Away', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2JiODViOGMzNjk1NThjM2M1NzljOGM0NjIxNDJhMGE4NTFjZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AC1PtbdsJZyOQ/giphy.gif', label: '🚫 Eye Roll', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjE0YmUxNTQ3MDhhYjNhNjY4MjIzOGRjMGIxYzI3NDFhMjA2MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6ZtpzSCmlYjIeyjm/giphy.gif', label: '🚫 Shut Up', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ4YjkyNGYxNjM5N2VkNGMxOGMzNjI0Mjk2ZTQwOWI0MmE1ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oAt2dA6LxMkRrGc0g/giphy.gif', label: '🚫 Cringe', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWJlN2I2ZTg4NzJlMDlhZmE0OGJmNTk5OWE5ZDZkYjVhMjk5ZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT5LMHxhOfscxPfIfm/giphy.gif', label: '🚫 Laughing At', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODE1MzhmMTJiNjFlNzc2NmQwNjJiMGI3ZjdhMTg5NjI2YjUyZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26FPy3QZQqGtDcrja/giphy.gif', label: '🚫 Pointing', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWY0ZjBjY2JhMDE4NWQ2OGVhOTZkOGI1OGI2NTIzYjQ3MDg5YyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlR3kHjpUWHn5Mk/giphy.gif', label: '🚫 Disgust', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWEzOWIxYmU1N2M0YjA0NzE3MjZlNTY3ZTZlYjRmMDQ4YjRlNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYEqEzwMKhJe3UQ/giphy.gif', label: '🚫 Dismissive', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzE1MTcxZTRhMDA3NWQ5NWRhYWNhMTk1ZjY4YTUzY2Y1NzFkOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKTDn976rzVgky4/giphy.gif', label: '🚫 You Suck', flagged: true },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmM3ZDgzMmQ4NTBiOGI0Njk4NjY3NjM3NjM3NjI2Y2FhZjA0MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjHCWdU7r4WoACtO/giphy.gif', label: '🚫 Toxic', flagged: true },
];

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

  const filtered = search
    ? GIF_DATASET.filter(g => g.label.toLowerCase().includes(search.toLowerCase()))
    : GIF_DATASET;

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
        <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
          {filtered.map((gif, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(gif)}
              className="relative rounded overflow-hidden hover:ring-2 ring-primary transition-all aspect-square"
            >
              <img src={gif.url} alt={gif.label} className="w-full h-full object-cover" loading="lazy" />
              {gif.flagged && (
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
