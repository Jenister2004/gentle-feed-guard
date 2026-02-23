import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';

const EMOJI_LIST = [
  '😀', '😂', '🤣', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😭',
  '😤', '😡', '🤬', '😱', '🤮', '💀', '☠️', '🔥', '❤️', '💔',
  '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '🙏', '👀',
  '💯', '⭐', '🌟', '✨', '🎉', '🎊', '💐', '🌹', '🦋', '🐐',
  '😊', '😇', '🥺', '😢', '😅', '🤗', '🤔', '🫡', '🫶', '💅',
  '🤡', '💀', '😈', '👻', '🤓', '😏', '🙄', '😬', '🫠', '🥱',
  '🍑', '🍆', '💦', '🌶️', '🥒', '🌭', '🍌', '👅', '🫦', '😜',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={disabled} title="Add emoji">
          <SmilePlus className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_LIST.map((emoji, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(emoji); setOpen(false); }}
              className="text-xl h-8 w-8 flex items-center justify-center rounded hover:bg-secondary transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
