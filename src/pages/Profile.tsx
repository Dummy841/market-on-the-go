import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useUserAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    if (user) {
      setName(user.name || '');
      setMobile(user.mobile || '');
      fetchProfilePhoto();
    }
  }, [user, isAuthenticated, navigate]);

  const fetchProfilePhoto = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_photo_url')
        .eq('id', user.id)
        .single();
      
      if (!error && data?.profile_photo_url) {
        setProfilePhotoUrl(data.profile_photo_url);
      }
    } catch (error) {
      console.error('Error fetching profile photo:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Use upsert to replace existing photo
      const { error: uploadError } = await supabase.storage
        .from('user-profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-profiles')
        .getPublicUrl(filePath);

      // Add cache-buster to force refresh
      const photoUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setProfilePhotoUrl(photoUrlWithCacheBust);
      
      // Update user record with new photo URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_photo_url: photoUrlWithCacheBust })
        .eq('id', user.id);

      if (updateError) {
        console.error('DB update error:', updateError);
        toast({
          variant: "destructive",
          title: "Database update failed",
          description: updateError.message,
        });
        return;
      }

      // Update local context so header refreshes immediately
      updateUser({ profile_photo_url: photoUrlWithCacheBust });

      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated!",
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error?.message || "Failed to upload profile photo. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name cannot be empty",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Profile</h1>
        </div>
      </div>

      <div className="container max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePhotoUrl} alt={name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {name?.charAt(0)?.toUpperCase() || <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4 text-primary-foreground" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
            {isUploading && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="flex">
                <div className="flex items-center justify-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                  +91
                </div>
                <Input
                  id="mobile"
                  value={mobile}
                  disabled
                  className="rounded-l-none bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mobile number cannot be changed
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
