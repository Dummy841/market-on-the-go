import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
}

const PhotoUploadField: React.FC<PhotoUploadFieldProps> = ({ 
  value, 
  onChange, 
  name = 'profile-photo',
  className = 'w-24 h-24' 
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isNative, takePicture, selectFromGallery, vibrate } = useNativeFeatures();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        onChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = async () => {
    if (isNative) {
      try {
        await vibrate();
        const photoUrl = await takePicture();
        if (photoUrl) {
          setPhotoPreview(photoUrl);
          onChange(photoUrl);
          toast({
            title: "Photo captured",
            description: "Photo has been captured successfully"
          });
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        toast({
          title: "Camera error",
          description: "Failed to capture photo. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Fallback to file input for web
      fileInputRef.current?.click();
    }
  };

  const handleSelectFromGallery = async () => {
    if (isNative) {
      try {
        await vibrate();
        const photoUrl = await selectFromGallery();
        if (photoUrl) {
          setPhotoPreview(photoUrl);
          onChange(photoUrl);
          toast({
            title: "Photo selected",
            description: "Photo has been selected from gallery"
          });
        }
      } catch (error) {
        console.error('Error selecting photo:', error);
        toast({
          title: "Gallery error",
          description: "Failed to select photo. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Fallback to file input for web
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Avatar className={className}>
        {photoPreview ? (
          <AvatarImage src={photoPreview} alt="Profile" />
        ) : (
          <AvatarFallback>?</AvatarFallback>
        )}
      </Avatar>
      
      <div className="mt-2 flex space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="text-xs flex items-center"
          onClick={handleTakePhoto}
        >
          <Camera className="mr-1 h-3 w-3" /> 
          {isNative ? 'Take Photo' : 'Upload'}
        </Button>
        
        {isNative && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="text-xs flex items-center"
            onClick={handleSelectFromGallery}
          >
            <Upload className="mr-1 h-3 w-3" /> Gallery
          </Button>
        )}
      </div>
      
      {/* Hidden file input for web fallback */}
      <input
        ref={fileInputRef}
        id={`${name}-file`}
        name={name}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default PhotoUploadField;