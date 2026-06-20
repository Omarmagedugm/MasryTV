/**
 * Cloudinary image optimization utility
 */
export const getOptimizedImage = (url: string | undefined | null, width?: number) => {
  if (!url) return '';
  const isPng = url.toLowerCase().includes('.png');
  const isLogo = url.toLowerCase().includes('logo') || url.toLowerCase().includes('favicon');

  // Double/triple requested width for high-DPI screens (Retina) to prevent pixelated/small quality images
  const targetWidth = width ? Math.round(width * 2.5) : undefined;

  if (!url.includes('cloudinary.com')) {
    // If it's a social/login avatar or simple placeholder, don't bother
    if (url.includes('ui-avatars.com') || url.includes('lh3.googleusercontent.com')) return url;
    
    // Use Cloudinary "fetch" for external URLs (like Firebase Storage or Unsplash)
    const transformations = ['q_auto'];
    if (!isPng && !isLogo) transformations.push('f_auto');
    if (targetWidth && !isLogo) transformations.push(`w_${targetWidth}`, 'c_limit');
    
    return `https://res.cloudinary.com/dqj6gzwfg/image/fetch/${transformations.join(',')}/${encodeURIComponent(url)}`;
  }
  
  // Check if it's already optimized by our code
  if (url.includes('q_auto')) {
     if (!targetWidth || url.includes(',w_')) return url;
  }

  // Don't use f_auto or resizing for PNGs or logos to ensure transparency and quality are never lost
  if (isPng || isLogo) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
       return `${parts[0]}/upload/q_auto/${parts[1]}`;
    }
    return url;
  }

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  // Build transformations
  const transformations = ['f_auto', 'q_auto'];
  
  if (targetWidth) {
    transformations.push(`w_${targetWidth}`, 'c_scale');
  }
  
  return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
};
