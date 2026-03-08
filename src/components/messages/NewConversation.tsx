import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NewConversationProps {
  onClose: () => void;
  onConversationCreated: (convId: string, otherUser: { user_id: string; username: string; avatar_url: string | null }) => void;
}

export default function NewConversation({ onClose, onConversationCreated }: NewConversationProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<{ user_id: string; username: string; avatar_url: string | null }[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .neq('user_id', user?.id || '')
        .ilike('username', `%${search}%`)
        .limit(20);
      setUsers(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const startConversation = async (otherUser: typeof users[0]) => {
    if (!user || creating) return;
    setCreating(true);

    // Check if conversation already exists
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConvs && myConvs.length > 0) {
      const convIds = myConvs.map(c => c.conversation_id);
      const { data: otherConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUser.user_id)
        .in('conversation_id', convIds);

      if (otherConvs && otherConvs.length > 0) {
        setCreating(false);
        onConversationCreated(otherConvs[0].conversation_id, otherUser);
        return;
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convErr || !conv) {
      setCreating(false);
      return;
    }

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUser.user_id },
    ]);

    setCreating(false);
    onConversationCreated(conv.id, otherUser);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-fade-in">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onClose} className="hover:opacity-60">
          <X className="h-6 w-6" />
        </button>
        <h2 className="font-bold text-lg flex-1">New Message</h2>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">To:</span>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {users.map(u => (
          <button
            key={u.user_id}
            onClick={() => startConversation(u)}
            disabled={creating}
            className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm font-semibold bg-muted">
                {u.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{u.username}</span>
          </button>
        ))}
        {search && users.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No users found</p>
        )}
      </div>
    </div>
  );
}
