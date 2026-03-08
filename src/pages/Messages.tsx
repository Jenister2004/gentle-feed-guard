import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Search, Edit, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import AppHeader from '@/components/layout/AppHeader';
import ConversationView from '@/components/messages/ConversationView';
import NewConversation from '@/components/messages/NewConversation';

interface ConversationPreview {
  id: string;
  otherUser: { user_id: string; username: string; avatar_url: string | null };
  lastMessage: string | null;
  lastMessageTime: string | null;
  unread: boolean;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<ConversationPreview['otherUser'] | null>(null);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    // Get user's conversations
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map(p => p.conversation_id);

    // Get other participants
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    if (!allParticipants || allParticipants.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherUserIds = [...new Set(allParticipants.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Get last message per conversation
    const previews: ConversationPreview[] = [];
    for (const convId of convIds) {
      const other = allParticipants.find(p => p.conversation_id === convId);
      if (!other) continue;

      const { data: msgs } = await supabase
        .from('messages')
        .select('content, message_type, created_at, sender_id, read_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastMsg = msgs?.[0];
      const profile = profileMap[other.user_id];

      previews.push({
        id: convId,
        otherUser: profile || { user_id: other.user_id, username: 'Unknown', avatar_url: null },
        lastMessage: lastMsg ? (lastMsg.message_type === 'text' ? lastMsg.content : `📎 ${lastMsg.message_type}`) : null,
        lastMessageTime: lastMsg?.created_at || null,
        unread: lastMsg ? lastMsg.sender_id !== user.id && !lastMsg.read_at : false,
      });
    }

    previews.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    setConversations(previews);
    setLoading(false);
  };

  const openConversation = (conv: ConversationPreview) => {
    setActiveConversation(conv.id);
    setActiveOtherUser(conv.otherUser);
  };

  const handleNewConversation = (convId: string, otherUser: ConversationPreview['otherUser']) => {
    setShowNew(false);
    setActiveConversation(convId);
    setActiveOtherUser(otherUser);
    loadConversations();
  };

  const filtered = conversations.filter(c =>
    c.otherUser.username.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return null;

  // Active conversation view
  if (activeConversation && activeOtherUser) {
    return (
      <ConversationView
        conversationId={activeConversation}
        otherUser={activeOtherUser}
        onBack={() => { setActiveConversation(null); setActiveOtherUser(null); loadConversations(); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="pt-14 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => navigate('/')} className="hover:opacity-60 transition-opacity">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-bold text-lg">Messages</h1>
          <button onClick={() => setShowNew(true)} className="hover:opacity-60 transition-opacity">
            <Edit className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0 rounded-lg"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <button onClick={() => setShowNew(true)} className="text-primary text-sm font-semibold mt-2 hover:underline">
                Start a conversation
              </button>
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
              >
                <Avatar className="h-14 w-14 flex-shrink-0">
                  <AvatarFallback className="text-sm font-semibold bg-muted">
                    {conv.otherUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${conv.unread ? 'font-bold' : 'font-semibold'}`}>
                      {conv.otherUser.username}
                    </span>
                    {conv.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className={`text-sm truncate ${conv.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
                {conv.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>

      {showNew && (
        <NewConversation
          onClose={() => setShowNew(false)}
          onConversationCreated={handleNewConversation}
        />
      )}
    </div>
  );
}
