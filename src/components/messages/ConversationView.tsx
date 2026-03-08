import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Send, Image, Smile, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import EmojiPicker from '@/components/feed/EmojiPicker';

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  read_at: string | null;
  created_at: string;
}

interface ConversationViewProps {
  conversationId: string;
  otherUser: { user_id: string; username: string; avatar_url: string | null };
  onBack: () => void;
}

export default function ConversationView({ conversationId, otherUser, onBack }: ConversationViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  }, []);

  // Load messages
  useEffect(() => {
    loadMessages();
    markAsRead();
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
        if (newMsg.sender_id !== user?.id) markAsRead();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Typing indicator via presence
  useEffect(() => {
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: user?.id || '' } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const others = Object.keys(state).filter(k => k !== user?.id);
      setOtherTyping(others.length > 0);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    scrollToBottom();
  };

  const markAsRead = async () => {
    if (!user) return;
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  };

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      const channel = supabase.channel(`typing:${conversationId}`, {
        config: { presence: { key: user?.id || '' } },
      });
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: true });
        }
      });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      const channel = supabase.channel(`typing:${conversationId}`);
      channel.untrack();
    }, 2000);
  };

  const sendMessage = async (content: string, type = 'text', mediaUrl?: string) => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: type === 'text' ? content : null,
      message_type: type,
      media_url: mediaUrl || null,
    });
    if (error) toast.error('Failed to send message');
    else {
      setText('');
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    }
    setSending(false);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    const ext = f.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('message-media').upload(path, f);
    if (error) { toast.error('Upload failed'); return; }
    const { data } = supabase.storage.from('message-media').getPublicUrl(path);
    const type = f.type.startsWith('video') ? 'video' : 'image';
    sendMessage('', type, data.publicUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    handleTyping();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        <button onClick={onBack} className="hover:opacity-60 transition-opacity">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs font-semibold bg-muted">
            {otherUser.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{otherUser.username}</p>
          {otherTyping && <p className="text-xs text-primary animate-pulse">typing...</p>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-center text-[10px] text-muted-foreground my-3">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMine ? 'order-1' : ''}`}>
                  {msg.message_type === 'image' && msg.media_url && (
                    <img src={msg.media_url} alt="" className="rounded-2xl max-h-60 object-cover" />
                  )}
                  {msg.message_type === 'video' && msg.media_url && (
                    <video src={msg.media_url} controls className="rounded-2xl max-h-60" />
                  )}
                  {msg.message_type === 'text' && msg.content && (
                    <div className={`px-4 py-2 rounded-3xl text-sm ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {isMine && (
                    <div className="flex justify-end mt-0.5">
                      {msg.read_at ? (
                        <CheckCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 bg-card">
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()} className="text-muted-foreground hover:text-foreground transition-colors">
            <Image className="h-6 w-6" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} />
          <div className="relative flex-1">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="pr-10 rounded-full bg-secondary border-0"
            />
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="text-primary hover:opacity-70 transition-opacity disabled:opacity-30"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
        {showEmoji && (
          <div className="mt-2">
            <EmojiPicker onSelect={(emoji) => { setText(prev => prev + emoji); setShowEmoji(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}
