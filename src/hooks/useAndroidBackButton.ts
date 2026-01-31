import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = App.addListener('backButton', () => {
      console.log('Back button pressed on:', location.pathname);
      
      // If we're on the home page, exit the app
      if (location.pathname === '/') {
        App.exitApp();
        return;
      }
      
      // For all other pages, use window.history.back() which is more reliable
      // in Capacitor WebViews than React Router's navigate(-1)
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // No history, navigate to home
        navigate('/', { replace: true });
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate, location.pathname]);
};
