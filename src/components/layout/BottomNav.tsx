import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Film, User, PlusSquare, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreatePost from '@/components/feed/CreatePost';
import { useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-12">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center p-2 transition-opacity ${isActive('/') ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
        >
          <Home className="h-6 w-6" strokeWidth={isActive('/') ? 2.5 : 1.5} />
        </Link>

        {/* Search / Explore */}
        <Link
          to="/explore"
          className={`flex flex-col items-center justify-center p-2 transition-opacity ${isActive('/explore') ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
        >
          <Search className="h-6 w-6" strokeWidth={isActive('/explore') ? 2.5 : 1.5} />
        </Link>

        {/* Create Post (center) */}
        <CreatePost onCreated={() => navigate('/')} />

        {/* Reels */}
        <Link
          to="/reels"
          className={`flex flex-col items-center justify-center p-2 transition-opacity ${isActive('/reels') ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
        >
          <Film className="h-6 w-6" strokeWidth={isActive('/reels') ? 2.5 : 1.5} />
        </Link>

        {/* YouTube */}
        <Link
          to="/youtube"
          className={`flex flex-col items-center justify-center p-2 transition-opacity ${isActive('/youtube') ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
        >
          <Play className="h-6 w-6" strokeWidth={isActive('/youtube') ? 2.5 : 1.5} />
        </Link>

        {/* Profile */}
        <Link
          to="/profile"
          className={`flex flex-col items-center justify-center p-2 transition-opacity ${isActive('/profile') ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
        >
          <Avatar className={`h-7 w-7 ${isActive('/profile') ? 'ring-2 ring-foreground' : ''}`}>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] font-semibold bg-muted">
              {profile?.username?.[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </nav>
  );
}
