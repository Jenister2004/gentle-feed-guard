import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CreateStory from './CreateStory';
import StoryViewer from './StoryViewer';

interface StoryGroup {
  userId: string;
  username: string;
  stories: { id: string; image_url: string; created_at: string }[];
}

export default function StoryBar() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);

  const loadStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('is_flagged', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.username]));

      const groups: StoryGroup[] = [];
      const seen = new Set<string>();

      // Show current user's stories first
      if (user) {
        const userStories = data.filter(s => s.user_id === user.id);
        if (userStories.length > 0) {
          groups.push({
            userId: user.id,
            username: profileMap[user.id] || 'You',
            stories: userStories.map(s => ({ id: s.id, image_url: s.image_url, created_at: s.created_at })),
          });
          seen.add(user.id);
        }
      }

      for (const story of data) {
        if (seen.has(story.user_id)) continue;
        seen.add(story.user_id);
        const userStories = data.filter(s => s.user_id === story.user_id);
        groups.push({
          userId: story.user_id,
          username: profileMap[story.user_id] || 'unknown',
          stories: userStories.map(s => ({ id: s.id, image_url: s.image_url, created_at: s.created_at })),
        });
      }

      setStoryGroups(groups);
    } else {
      setStoryGroups([]);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 mb-4 animate-fade-in">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          <CreateStory onCreated={loadStories} />
          {storyGroups.map(group => (
            <button
              key={group.userId}
              onClick={() => setViewingGroup(group)}
              className="flex flex-col items-center gap-1 flex-shrink-0 icon-click"
            >
              <div className="w-16 h-16 rounded-full p-[2px] instagram-gradient">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center p-[2px]">
                  <Avatar className="w-full h-full">
                    <AvatarFallback className="text-xs font-semibold bg-muted">
                      {group.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-[10px] text-foreground max-w-[64px] truncate">
                {group.userId === user?.id ? 'Your story' : group.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      {viewingGroup && (
        <StoryViewer
          group={viewingGroup}
          onClose={() => setViewingGroup(null)}
        />
      )}
    </>
  );
}
