import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Feed from './Feed';
import { Loader2 } from 'lucide-react';

export default function Instagram() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  return <Feed />;
}
