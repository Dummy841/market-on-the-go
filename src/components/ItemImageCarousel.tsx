import { useState, useEffect, useRef, useCallback } from 'react';

interface ItemImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

const ItemImageCarousel = ({ images, alt, className = '' }: ItemImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoScroll = useCallback(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 3000);
  }, [images.length]);

  const stopAutoScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [startAutoScroll]);

  const handleTouchStart = (e: React.TouchEvent) => {
    stopAutoScroll();
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
    startAutoScroll();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    stopAutoScroll();
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = startXRef.current - e.clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
    startAutoScroll();
  };

  if (images.length === 0) {
    return (
      <div className={`w-full h-full bg-gradient-subtle flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground">No image</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <img src={images[0]} alt={alt} className={`w-full h-full object-cover ${className}`} />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${alt} ${idx + 1}`}
            className="w-full h-full object-cover flex-shrink-0"
            draggable={false}
          />
        ))}
      </div>
      {/* Dot indicators */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); stopAutoScroll(); startAutoScroll(); }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              idx === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ItemImageCarousel;
