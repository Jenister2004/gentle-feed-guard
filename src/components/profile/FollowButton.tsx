import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUserId: string;
  compact?: boolean;
}

export default function FollowButton({ targetUserId, compact = false }: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.id === targetUserId) { setLoading(false); return; }
    supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', targetUserId).maybeSingle()
      .then(({ data }) => { setFollowing(!!data); setLoading(false); });
  }, [user, targetUserId]);

  if (!user || user.id === targetUserId) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (following) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
        setFollowing(false);
        toast.success('Unfollowed');
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
        setFollowing(true);
        toast.success('Following!');
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={following ? 'outline' : 'default'}
      size={compact ? 'sm' : 'default'}
      className={`transition-all ${following ? '' : 'instagram-gradient text-primary-foreground'}`}
    >
      {following ? <><UserMinus className="h-4 w-4 mr-1" /> Unfollow</> : <><UserPlus className="h-4 w-4 mr-1" /> Follow</>}
    </Button>
  );
}
