import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarUploadProps {
  size?: string;
  editable?: boolean;
  avatarUrl?: string | null;
  username?: string;
  onUploaded?: (url: string) => void;
}

export default function AvatarUpload({ size = 'h-20 w-20', editable = true, avatarUrl, username, onUploaded }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('avatar-images').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatar-images').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      toast.success('Profile picture updated!');
      onUploaded?.(publicUrl);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <Avatar className={size}>
        <AvatarImage src={avatarUrl || undefined} alt={username || 'User'} />
        <AvatarFallback className="instagram-gradient text-primary-foreground text-2xl font-bold">
          {username?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors cursor-pointer"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-background animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </>
      )}
    </div>
  );
}
