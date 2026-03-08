import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Home, LogOut, User, AlertTriangle } from 'lucide-react';
import CreatePost from '@/components/feed/CreatePost';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import InstagramLogo from '@/components/icons/InstagramLogo';
import CreateStory from '@/components/stories/CreateStory';

export default function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <InstagramLogo className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold instagram-gradient-text">Insta Lite</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="icon-click hover:opacity-60 transition-opacity">
            <Home className="h-6 w-6" />
          </Link>
          <CreatePost onCreated={() => navigate('/')} />
          <Link to="/admin-login" className="icon-click hover:opacity-60 transition-opacity text-warning" title="Admin Panel">
            <AlertTriangle className="h-6 w-6" />
          </Link>
          <Link to="/profile" className="icon-click hover:opacity-60 transition-opacity">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs font-semibold bg-muted">
                {profile?.username?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button onClick={signOut} className="icon-click hover:opacity-60 transition-opacity text-muted-foreground" title="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
