import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
}

export const HomeBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  // Auto-scroll every 2 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('id, title, subtitle, image_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold) {
      nextSlide();
    } else if (diff < -threshold) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (loading) {
    return (
      <div className="h-[33vh] mx-4 mt-2 bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse rounded-2xl" />
    );
  }

  if (banners.length === 0) {
    return (
      <div className="h-[33vh] mx-4 mt-2 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center rounded-2xl">
        <div className="text-center text-primary-foreground">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Welcome to Zippy</h1>
          <p className="text-base md:text-lg opacity-90">Delivery in minutes at your doorstep</p>
        </div>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <div 
      className="relative h-[33vh] overflow-hidden mx-4 mt-2 rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Content */}
      <div
        className="h-full w-full flex items-center justify-center transition-all duration-500"
        style={{
          backgroundImage: currentBanner.image_url ? `url(${currentBanner.image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient overlay for readability */}
        <div className={`absolute inset-0 ${currentBanner.image_url ? 'bg-black/40' : 'bg-gradient-to-br from-primary to-primary/80'}`} />
        
        {/* Text content - only show if title exists */}
        {currentBanner.title && (
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-3xl md:text-5xl font-bold mb-2">{currentBanner.title}</h1>
            {currentBanner.subtitle && (
              <p className="text-lg md:text-xl opacity-90">{currentBanner.subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Dots indicator - only show if multiple banners */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
