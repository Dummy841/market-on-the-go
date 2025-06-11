import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';

export const useNativeFeatures = () => {
  const [isNative, setIsNative] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    
    // Get device info
    const getDeviceInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        const info = await Device.getInfo();
        setDeviceInfo(info);
      }
    };

    // Monitor network status
    const initNetwork = async () => {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setNetworkStatus(status);

        Network.addListener('networkStatusChange', (status) => {
          setNetworkStatus(status);
        });
      }
    };

    getDeviceInfo();
    initNetwork();
  }, []);

  const takePicture = async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Camera not available on web platform');
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return image.dataUrl;
    } catch (error) {
      console.error('Error taking picture:', error);
      throw error;
    }
  };

  const selectFromGallery = async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Gallery not available on web platform');
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return image.dataUrl;
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      throw error;
    }
  };

  const vibrate = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.error('Error with haptic feedback:', error);
      }
    }
  };

  return {
    isNative,
    networkStatus,
    deviceInfo,
    takePicture,
    selectFromGallery,
    vibrate
  };
};