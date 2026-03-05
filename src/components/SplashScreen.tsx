import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import zippyLogo from '@/assets/zippy-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (!isAndroidNative) { onComplete(); return; }

    // Show logo with animation
    setTimeout(() => setShowLogo(true), 100);

    const fadeTimeout = setTimeout(() => setFadeOut(true), 2000);
    const completeTimeout = setTimeout(() => onComplete(), 2500);

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onComplete, isAndroidNative]);

  if (!isAndroidNative) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-primary transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center px-4">
        <img 
          src={zippyLogo} 
          alt="Zippy" 
          className={`h-28 w-auto mx-auto mb-4 transition-all duration-500 ${
            showLogo ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <h1 className={`text-4xl md:text-5xl text-primary-foreground font-medium italic mb-2 transition-all duration-300 delay-200 ${
          showLogo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          Welcome to
        </h1>
        <div className={`text-6xl md:text-7xl text-primary-foreground font-bold italic transition-all duration-300 delay-500 ${
          showLogo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          Zippy
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
