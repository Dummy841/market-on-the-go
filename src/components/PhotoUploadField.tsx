
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="mr-1 h-3 w-3" /> Take Photo
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="text-xs flex items-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1 h-3 w-3" /> Gallery
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        id={`${name}-gallery`}
        name={name}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        id={`${name}-camera`}
        name={name}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default PhotoUploadField;
