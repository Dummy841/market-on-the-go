import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [visibleLetters, setVisibleLetters] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  
  const welcomeText = "Welcome to";
  const zippyText = "Zippy";

  // Only show splash on Android native app
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  useEffect(() => {
    // Skip splash for non-Android platforms
    if (!isAndroidNative) {
      onComplete();
      return;
    }

    // Animate "Zippy" letters one by one with pop effect
    const letterInterval = setInterval(() => {
      setVisibleLetters((prev) => {
        if (prev >= zippyText.length) {
          clearInterval(letterInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 120); // Slightly faster for snappier feel

    // Fade out after animation completes
    const fadeTimeout = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Complete after fade out
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearInterval(letterInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onComplete, isAndroidNative]);

  // Don't render anything for non-Android
  if (!isAndroidNative) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-primary transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center px-4">
        {/* Welcome to - static text */}
        <h1 className="text-2xl md:text-3xl text-primary-foreground font-medium italic mb-1">
          {welcomeText}
        </h1>
        {/* Zippy - animated letters with pop effect */}
        <div className="text-4xl md:text-5xl text-primary-foreground font-bold italic">
          {zippyText.split('').map((letter, index) => (
            <span
              key={index}
              className={`inline-block transition-all duration-300 ${
                index < visibleLetters 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-50'
              }`}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce effect
              }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
