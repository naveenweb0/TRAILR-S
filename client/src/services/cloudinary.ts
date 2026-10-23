import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';

export const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'fzwn0nve';

export const cld = new Cloudinary({
  cloud: { cloudName },
  url: { secure: true },
});

export function getOptimizedCloudinaryImage(publicId: string, options: { width?: number; height?: number } = {}) {
  const cleanId = publicId.replace(/^v\d+\//, '');
  const img = cld.image(cleanId).format('auto').quality('auto');
  if (options.width || options.height) {
    img.resize(fill().gravity(autoGravity()).width(options.width || 500).height(options.height || 500));
  }
  return img;
}
