import { useState, useEffect, useRef } from 'react';
import { getStorageImageUrl } from '../services/firebase';

/**
 * LazyGif - Component for lazy loading GIFs when they come into view
 * 
 * @param {string} imagePath - Firebase storage path to the GIF
 * @param {string} alt - Alt text for the image
 * @param {string} className - CSS classes to apply to the image
 * @param {string} containerClassName - CSS classes to apply to the container
 * @param {React.Ref} forwardRef - Ref to forward to the container
 * @returns {React.ReactElement} Lazy loaded GIF component
 */
const LazyGif = ({ 
  imagePath, 
  alt, 
  className = "w-full h-full object-cover", 
  containerClassName = "w-full h-full",
  forwardRef 
}) => {
  const [gifUrl, setGifUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  // Use intersection observer to detect when component comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsInView(true);
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before the element is visible
        threshold: 0.1
      }
    );

    const currentRef = forwardRef?.current || containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [forwardRef, hasLoaded]);

  // Load the GIF when it comes into view
  useEffect(() => {
    if (isInView && !hasLoaded && !isLoading) {
      const loadGif = async () => {
        setIsLoading(true);
        try {
          const url = await getStorageImageUrl(imagePath);
          setGifUrl(url);
          setHasLoaded(true);
        } catch (error) {
          console.error(`Failed to load GIF: ${imagePath}`, error);
        } finally {
          setIsLoading(false);
        }
      };
      loadGif();
    }
  }, [isInView, hasLoaded, isLoading, imagePath]);

  const containerProps = {
    className: containerClassName,
    ref: forwardRef || containerRef
  };

  if (isLoading) {
    return (
      <div {...containerProps}>
        <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-gray-500">Loading GIF...</span>
        </div>
      </div>
    );
  }

  if (hasLoaded && gifUrl) {
    return (
      <div {...containerProps}>
        <img
          src={gifUrl}
          alt={alt}
          className={className}
        />
      </div>
    );
  }

  // Placeholder when not yet in view or failed to load
  return (
    <div {...containerProps}>
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500">
          {hasLoaded ? 'GIF not available' : 'GIF will load when visible'}
        </span>
      </div>
    </div>
  );
};

export default LazyGif;
