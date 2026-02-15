import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Global overlay stack for back button handling
// Any overlay/modal can register itself here
const overlayStack: Array<() => void> = [];

export const registerOverlayForBackButton = (closeFn: () => void) => {
  overlayStack.push(closeFn);
  return () => {
    const idx = overlayStack.indexOf(closeFn);
    if (idx !== -1) overlayStack.splice(idx, 1);
  };
};

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = App.addListener('backButton', () => {
      console.log('Back button pressed on:', location.pathname);

      // If a full-screen overlay (e.g. location picker) is open, close it first
      if ((window as any).__locationPickerOpen && (window as any).__locationPickerClose) {
        (window as any).__locationPickerClose();
        return;
      }

      // If any overlay/dialog is registered, close the topmost one
      if (overlayStack.length > 0) {
        const closeFn = overlayStack.pop();
        closeFn?.();
        return;
      }
      
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
