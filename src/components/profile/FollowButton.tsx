import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUserId: string;
  compact?: boolean;
}

type FollowState = 'none' | 'following' | 'requested';

export default function FollowButton({ targetUserId, compact = false }: FollowButtonProps) {
  const { user } = useAuth();
  const [state, setState] = useState<FollowState>('none');
  const [targetIsPrivate, setTargetIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.id === targetUserId) { setLoading(false); return; }

    const load = async () => {
      // Check if already following
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (followData) {
        setState('following');
      } else {
        // Check if there's a pending request
        const { data: reqData } = await supabase
          .from('follow_requests')
          .select('id, status')
          .eq('requester_id', user.id)
          .eq('target_id', targetUserId)
          .eq('status', 'pending')
          .maybeSingle();

        setState(reqData ? 'requested' : 'none');
      }

      // Check if target account is private
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_private')
        .eq('user_id', targetUserId)
        .maybeSingle();

      setTargetIsPrivate(profileData?.is_private ?? false);
      setLoading(false);
    };

    load();
  }, [user, targetUserId]);

  if (!user || user.id === targetUserId) return null;

  const handleAction = async () => {
    setLoading(true);
    try {
      if (state === 'following') {
        // Unfollow
        await supabase.from('follows').delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        setState('none');
        toast.success('Unfollowed');
      } else if (state === 'requested') {
        // Cancel request
        await supabase.from('follow_requests').delete()
          .eq('requester_id', user.id)
          .eq('target_id', targetUserId);
        setState('none');
        toast.success('Request cancelled');
      } else {
        // Follow or send request
        if (targetIsPrivate) {
          // Send follow request
          const { error } = await supabase.from('follow_requests').insert({
            requester_id: user.id,
            target_id: targetUserId,
          });
          if (error) {
            if (error.code === '23505') {
              toast.info('Request already sent');
            } else {
              throw error;
            }
          } else {
            setState('requested');
            toast.success('Follow request sent');
          }
        } else {
          // Direct follow for public accounts
          await supabase.from('follows').insert({
            follower_id: user.id,
            following_id: targetUserId,
          });
          setState('following');
          toast.success('Following!');
        }
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

    switch (state) {
      case 'following':
        return compact
          ? <><UserMinus className="h-3.5 w-3.5 mr-1" /> Following</>
          : <><UserMinus className="h-4 w-4 mr-1" /> Following</>;
      case 'requested':
        return compact
          ? <><Clock className="h-3.5 w-3.5 mr-1" /> Requested</>
          : <><Clock className="h-4 w-4 mr-1" /> Requested</>;
      default:
        return compact
          ? <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>
          : <><UserPlus className="h-4 w-4 mr-1" /> Follow</>;
    }
  };

  const getVariant = () => {
    if (state === 'following') return 'outline' as const;
    if (state === 'requested') return 'secondary' as const;
    return 'default' as const;
  };

  return (
    <Button
      onClick={handleAction}
      disabled={loading}
      variant={getVariant()}
      size={compact ? 'sm' : 'default'}
      className={`transition-all ${
        state === 'none' ? 'instagram-gradient text-primary-foreground' : ''
      } ${state === 'requested' ? 'text-muted-foreground' : ''}`}
    >
      {getButtonContent()}
    </Button>
  );
}
