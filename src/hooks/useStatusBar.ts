import { useEffect } from 'react';

export const useStatusBar = () => {
  useEffect(() => {
    const configureStatusBar = async () => {
      try {
        // Dynamically import Capacitor StatusBar to avoid errors on web
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          // Show the status bar
          await StatusBar.show();
          
          // Set status bar style (dark icons on light background)
          await StatusBar.setStyle({ style: Style.Light });
          
          // Set status bar background color to match theme
          await StatusBar.setBackgroundColor({ color: '#f97316' });
          
          // Make status bar overlay WebView (optional - for edge-to-edge)
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch (error) {
        // StatusBar plugin not available (web environment)
        console.log('StatusBar plugin not available');
      }
    };

    configureStatusBar();
  }, []);
};
