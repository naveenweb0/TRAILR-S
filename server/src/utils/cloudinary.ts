import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Strictly configure Cloudinary from environment variables only (No hardcoded credentials)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: any;
}

/**
 * Upload an image from a local file path, remote URL, or base64 data URI to Cloudinary.
 */
export async function uploadImage(
  source: string,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      source,
      {
        folder: options.folder || 'schooldest',
        public_id: options.publicId,
        tags: options.tags || ['schooldest'],
        resource_type: 'image',
        transformation: options.transformation,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload returned empty response'));
        }
        resolve(result);
      }
    );
  });
}

/**
 * Upload an in-memory buffer (e.g. from multer memoryStorage) to Cloudinary.
 */
export async function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables are not configured in environment.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'schooldest',
        public_id: options.publicId,
        tags: options.tags || ['schooldest'],
        resource_type: 'image',
        transformation: options.transformation,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary stream upload returned empty response'));
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Generate an optimized delivery URL with auto-format and auto-quality.
 */
export function getOptimizedUrl(publicId: string, options: { width?: number; height?: number; crop?: string } = {}): string {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    crop: options.crop || 'auto',
    gravity: 'auto',
    width: options.width,
    height: options.height,
    secure: true,
  });
}

/**
 * Delete an image by public ID.
 */
export async function deleteImage(publicId: string): Promise<any> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables are not configured.');
  }
  return cloudinary.uploader.destroy(publicId);
}

/**
 * Generate a server-signed payload for direct-to-Cloudinary authenticated uploads.
 * Never exposes the API secret to the client.
 */
export function generateUploadSignature(folder: string, publicId?: string) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables are not configured.');
  }
  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign: Record<string, any> = {
    folder,
    timestamp,
  };
  if (publicId) {
    paramsToSign.public_id = publicId;
  }
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    publicId,
  };
}

export { cloudinary };

