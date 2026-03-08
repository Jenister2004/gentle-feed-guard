import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import InstagramLogo from '@/components/icons/InstagramLogo';
import CameraCapture from '@/components/camera/CameraCapture';

export default function AppHeader() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-1.5">
          <InstagramLogo className="h-6 w-6 text-foreground" />
          <span className="text-xl font-bold instagram-gradient-text tracking-tight">Insta Lite</span>
        </Link>

        {/* Right: Action icons */}
        <div className="flex items-center gap-4">
          <CameraCapture />
          <Link to="/messages" className="relative hover:opacity-60 transition-opacity" title="Messages">
            <MessageCircle className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
