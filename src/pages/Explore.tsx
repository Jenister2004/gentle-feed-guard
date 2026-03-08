import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';

interface ExplorePost {
  id: string;
  image_url: string;
}

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ user_id: string; username: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadPosts();
  }, [user]);

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${search}%`)
        .limit(10);
      setUsers(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, image_url')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .limit(30);
    setPosts(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="pt-12 pb-16 max-w-lg mx-auto">
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0 rounded-lg h-9"
            />
          </div>
        </div>

        {/* Search results */}
        {search.trim() && users.length > 0 && (
          <div className="px-3 pb-3 space-y-1">
            {users.map(u => (
              <button
                key={u.user_id}
                onClick={() => navigate(`/profile?id=${u.user_id}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-semibold">{u.username[0]?.toUpperCase()}</span>
                </div>
                <span className="font-semibold text-sm">{u.username}</span>
              </button>
            ))}
          </div>
        )}

        {/* Explore grid */}
        {!search.trim() && (
          loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map(p => (
                <button key={p.id} className="aspect-square overflow-hidden">
                  <img src={p.image_url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" loading="lazy" />
                </button>
              ))}
            </div>
          )
        )}
      </div>
      <BottomNav />
    </div>
  );
}
