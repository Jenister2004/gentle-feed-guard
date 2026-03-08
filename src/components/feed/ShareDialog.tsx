import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Send, Search, Link2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Friend {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  posterUsername: string;
  caption: string | null;
}

export default function ShareDialog({ open, onOpenChange, postId, posterUsername, caption }: ShareDialogProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setSentTo(new Set());
    setSearch('');

    // Fetch people the user follows
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(async ({ data: followData }) => {
        if (!followData || followData.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }
        const ids = followData.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', ids);
        setFriends(profiles || []);
        setLoading(false);
      });
  }, [open, user]);

  const filtered = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase()) ||
    f.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const sendToFriend = async (friend: Friend) => {
    if (!user || sending) return;
    setSending(friend.user_id);

    try {
      // Find or create conversation
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const { data: theirConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', friend.user_id);

      const myIds = new Set((myConvos || []).map(c => c.conversation_id));
      const sharedConvo = (theirConvos || []).find(c => myIds.has(c.conversation_id));

      let conversationId: string;

      if (sharedConvo) {
        conversationId = sharedConvo.conversation_id;
      } else {
        const { data: newConvo, error: convoErr } = await supabase
          .from('conversations')
          .insert({})
          .select('id')
          .single();
        if (convoErr || !newConvo) throw convoErr;
        conversationId = newConvo.id;

        await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: friend.user_id },
        ]);
      }

      // Send the post as a message
      const postUrl = `${window.location.origin}/post/${postId}`;
      const messageContent = `📷 Shared a post by @${posterUsername}: ${postUrl}`;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
      });

      setSentTo(prev => new Set(prev).add(friend.user_id));
      toast.success(`Sent to ${friend.username}`);
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(null);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] px-0">
        <SheetHeader className="px-4 pb-2">
          <SheetTitle className="text-center text-base">Share to</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search friends..."
              className="pl-9 bg-secondary border-0 text-sm"
            />
          </div>
        </div>

        {/* Copy link row */}
        <button
          onClick={copyLink}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
        >
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
            <Link2 className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-medium">Copy link</span>
        </button>

        {/* Friends list */}
        <div className="overflow-y-auto max-h-[40vh] px-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {friends.length === 0 ? 'Follow people to share posts with them' : 'No friends found'}
            </p>
          ) : (
            filtered.map(friend => {
              const isSent = sentTo.has(friend.user_id);
              const isSending = sending === friend.user_id;
              return (
                <div
                  key={friend.user_id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-sm font-semibold">
                      {friend.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{friend.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{friend.full_name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isSent ? 'secondary' : 'default'}
                    className="h-8 px-4 text-xs font-semibold rounded-lg"
                    onClick={() => sendToFriend(friend)}
                    disabled={isSent || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSent ? (
                      <><Check className="h-3.5 w-3.5 mr-1" /> Sent</>
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1" /> Send</>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
