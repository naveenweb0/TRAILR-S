import React, { useState } from 'react';
import { AdvancedImage } from '@cloudinary/react';
import { getOptimizedCloudinaryImage } from '../../services/cloudinary.js';

interface CldImageProps {
  src?: string | null;
  publicId?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80';

export const CldImage: React.FC<CldImageProps> = ({
  src,
  publicId,
  alt = 'Destination visual',
  className = 'w-full h-full object-cover',
  width,
  height,
  fallbackSrc = DEFAULT_FALLBACK,
}) => {
  const [hasError, setHasError] = useState(false);

  // If a publicId is directly passed, or if src is a publicId (does not start with http)
  const resolvedPublicId = publicId || (src && !src.startsWith('http') ? src : null);

  if (hasError) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading="lazy"
      />
    );
  }

  if (resolvedPublicId) {
    try {
      const cldImg = getOptimizedCloudinaryImage(resolvedPublicId, { width, height });
      return (
        <AdvancedImage
          cldImg={cldImg}
          alt={alt}
          className={className}
          onError={() => setHasError(true)}
        />
      );
    } catch {
      // Fallback on unexpected url-gen error
    }
  }

  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};
