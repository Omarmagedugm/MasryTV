import React, { useState } from 'react';
import { getOptimizedImage } from '../lib/cloudinary';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  width?: number;
  fallback?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className, 
  width, 
  fallback = '/icon.png',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = getOptimizedImage(src, width);

  return (
    <div className={`relative overflow-hidden ${className} flex items-center justify-center`}>
      {/* Skeleton / Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-800/50 animate-pulse flex items-center justify-center">
            <img 
               src={fallback} 
               className="h-1/2 w-1/2 object-contain opacity-20 grayscale" 
               alt="loading"
            />
        </div>
      )}

      <img
        {...props}
        src={hasError ? fallback : optimizedSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
