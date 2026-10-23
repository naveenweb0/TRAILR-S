import { Response, NextFunction } from 'express';
import { AuthRequest, logAudit } from '../middleware/auth.js';
import { uploadBuffer, uploadImage, getOptimizedUrl, deleteImage, generateUploadSignature, isCloudinaryConfigured } from '../utils/cloudinary.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../prisma.js';
import { Role } from '@prisma/client';

/**
 * Verify destination management authorization (User must be assigned to destination or SUPER_ADMIN).
 */
async function verifyDestinationOwnership(userId: string, role: string, destinationId: string): Promise<boolean> {
  if (role === 'SUPER_ADMIN') return true;
  const staff = await prisma.destinationStaff.findFirst({
    where: { userId, destinationId },
  });
  return Boolean(staff);
}

/**
 * Verify school management authorization (User must be staff of school or SUPER_ADMIN).
 */
async function verifySchoolOwnership(userId: string, role: string, schoolId: string): Promise<boolean> {
  if (role === 'SUPER_ADMIN') return true;
  const staff = await prisma.schoolStaff.findFirst({
    where: { userId, schoolId },
  });
  return Boolean(staff);
}

/**
 * Extract Cloudinary public ID from URL if stored directly
 */
function extractPublicId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  if (!urlOrId.includes('res.cloudinary.com')) return urlOrId;
  try {
    const parts = urlOrId.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1].replace(/^v\d+\//, '');
    const withoutExt = afterUpload.replace(/\.[^/.]+$/, '');
    return withoutExt;
  } catch {
    return null;
  }
}

/**
 * Upload & Replace Destination Cover Image
 */
export async function handleDestinationCoverUpload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new AppError('Cloudinary storage is not configured in server environment.', 500);
    }
    const destinationId = Array.isArray(req.params.destinationId) ? req.params.destinationId[0] : req.params.destinationId;
    if (!destinationId) throw new AppError('Destination ID is required.', 400);

    const isAuthorized = await verifyDestinationOwnership(req.user!.userId, req.user!.role, destinationId);
    if (!isAuthorized) {
      throw new AppError('Unauthorized: You do not have permission to manage this destination.', 403);
    }

    const destination = await prisma.destination.findUnique({
      where: { id: destinationId },
      select: { id: true, name: true, coverImage: true },
    });
    if (!destination) throw new AppError('Destination not found.', 404);

    let result;
    const folder = `schooldest/destinations/${destinationId}`;
    const publicId = `cover_${Date.now()}`;

    if (req.file) {
      result = await uploadBuffer(req.file.buffer, {
        folder,
        publicId,
        tags: ['schooldest', 'destination-cover', destinationId],
      });
    } else if (req.body?.imageUrl) {
      result = await uploadImage(req.body.imageUrl, {
        folder,
        publicId,
        tags: ['schooldest', 'destination-cover', destinationId],
      });
    } else {
      throw new AppError('No image file or imageUrl provided.', 400);
    }

    const previousCover = destination.coverImage;

    // 1. Update database record first
    const updated = await prisma.destination.update({
      where: { id: destinationId },
      data: { coverImage: result.secure_url },
    });

    // 2. Safely clean up old asset only after database succeeds
    if (previousCover) {
      const oldPublicId = extractPublicId(previousCover);
      if (oldPublicId && oldPublicId !== result.public_id) {
        deleteImage(oldPublicId).catch((err) => console.warn('Failed to delete old cover asset:', err));
      }
    }

    await logAudit(
      req.user!.userId,
      'DESTINATION_COVER_UPDATED',
      'Destination',
      destinationId,
      `Cover image updated for ${destination.name} to Cloudinary asset ${result.public_id}`
    );

    res.json({
      success: true,
      message: 'Destination cover image updated successfully.',
      data: {
        destinationId: updated.id,
        coverImage: updated.coverImage,
        publicId: result.public_id,
        optimizedUrl: getOptimizedUrl(result.public_id, { width: 1200 }),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Image to Destination Gallery
 */
export async function handleDestinationGalleryUpload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new AppError('Cloudinary storage is not configured in server environment.', 500);
    }
    const destinationId = Array.isArray(req.params.destinationId) ? req.params.destinationId[0] : req.params.destinationId;
    if (!destinationId) throw new AppError('Destination ID is required.', 400);

    const isAuthorized = await verifyDestinationOwnership(req.user!.userId, req.user!.role, destinationId);
    if (!isAuthorized) {
      throw new AppError('Unauthorized: You do not have permission to manage this destination.', 403);
    }

    const destination = await prisma.destination.findUnique({ where: { id: destinationId } });
    if (!destination) throw new AppError('Destination not found.', 404);

    let result;
    const folder = `schooldest/destinations/${destinationId}/gallery`;
    const publicId = `gallery_${Date.now()}`;

    if (req.file) {
      result = await uploadBuffer(req.file.buffer, {
        folder,
        publicId,
        tags: ['schooldest', 'destination-gallery', destinationId],
      });
    } else if (req.body?.imageUrl) {
      result = await uploadImage(req.body.imageUrl, {
        folder,
        publicId,
        tags: ['schooldest', 'destination-gallery', destinationId],
      });
    } else {
      throw new AppError('No image file or imageUrl provided.', 400);
    }

    const imageRecord = await prisma.destinationImage.create({
      data: {
        destinationId,
        url: result.secure_url,
        publicId: result.public_id,
        caption: req.body?.caption || '',
        sortOrder: req.body?.sortOrder ? parseInt(req.body.sortOrder, 10) : 0,
        isCover: req.body?.isCover === 'true' || req.body?.isCover === true,
      },
    });

    await logAudit(
      req.user!.userId,
      'DESTINATION_GALLERY_IMAGE_ADDED',
      'DestinationImage',
      imageRecord.id,
      `Gallery image added to destination ${destination.name}`
    );

    res.status(201).json({
      success: true,
      message: 'Gallery image uploaded and saved successfully.',
      data: {
        ...imageRecord,
        optimizedUrl: getOptimizedUrl(result.public_id, { width: 1000 }),
        thumbnailUrl: getOptimizedUrl(result.public_id, { width: 300, height: 200, crop: 'fill' }),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove Image from Destination Gallery
 */
export async function handleDeleteDestinationGalleryImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = Array.isArray(req.params.destinationId) ? req.params.destinationId[0] : req.params.destinationId;
    const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;

    if (!destinationId || !imageId) {
      throw new AppError('Destination ID and Image ID are required.', 400);
    }

    const isAuthorized = await verifyDestinationOwnership(req.user!.userId, req.user!.role, destinationId);
    if (!isAuthorized) {
      throw new AppError('Unauthorized: You do not have permission to manage this destination.', 403);
    }

    const image = await prisma.destinationImage.findFirst({
      where: { id: imageId, destinationId },
    });
    if (!image) throw new AppError('Gallery image not found.', 404);

    // Delete database record first
    await prisma.destinationImage.delete({ where: { id: imageId } });

    // Clean up Cloudinary asset
    const publicId = image.publicId || extractPublicId(image.url);
    if (publicId && isCloudinaryConfigured()) {
      deleteImage(publicId).catch((err) => console.warn('Failed to delete Cloudinary gallery asset:', err));
    }

    await logAudit(
      req.user!.userId,
      'DESTINATION_GALLERY_IMAGE_REMOVED',
      'DestinationImage',
      imageId,
      `Removed gallery image from destination ${destinationId}`
    );

    res.json({
      success: true,
      message: 'Gallery image removed successfully.',
      data: { id: imageId },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload & Replace School Logo
 */
export async function handleSchoolLogoUpload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new AppError('Cloudinary storage is not configured in server environment.', 500);
    }
    const schoolId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;
    if (!schoolId) throw new AppError('School ID is required.', 400);

    const isAuthorized = await verifySchoolOwnership(req.user!.userId, req.user!.role, schoolId);
    if (!isAuthorized) {
      throw new AppError('Unauthorized: You do not have permission to manage this school.', 403);
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, logo: true },
    });
    if (!school) throw new AppError('School not found.', 404);

    let result;
    const folder = `schooldest/schools/${schoolId}`;
    const publicId = `logo_${Date.now()}`;

    if (req.file) {
      result = await uploadBuffer(req.file.buffer, {
        folder,
        publicId,
        tags: ['schooldest', 'school-logo', schoolId],
      });
    } else if (req.body?.imageUrl) {
      result = await uploadImage(req.body.imageUrl, {
        folder,
        publicId,
        tags: ['schooldest', 'school-logo', schoolId],
      });
    } else {
      throw new AppError('No image file or imageUrl provided.', 400);
    }

    const previousLogo = school.logo;

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: { logo: result.secure_url },
    });

    if (previousLogo) {
      const oldPublicId = extractPublicId(previousLogo);
      if (oldPublicId && oldPublicId !== result.public_id) {
        deleteImage(oldPublicId).catch((err) => console.warn('Failed to delete old school logo asset:', err));
      }
    }

    await logAudit(
      req.user!.userId,
      'SCHOOL_LOGO_UPDATED',
      'School',
      schoolId,
      `Logo updated for ${school.name}`
    );

    res.json({
      success: true,
      message: 'School logo updated successfully.',
      data: {
        schoolId: updated.id,
        logo: updated.logo,
        publicId: result.public_id,
        thumbnailUrl: getOptimizedUrl(result.public_id, { width: 200, height: 200, crop: 'fit' }),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate Upload Signature for Direct Client-to-Cloudinary Uploads
 */
export async function handleGenerateSignature(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new AppError('Cloudinary storage is not configured in server environment.', 500);
    }

    const { entityType, entityId } = req.body;
    if (!entityType || !entityId) {
      throw new AppError('entityType (destination | school) and entityId are required.', 400);
    }

    let folder = '';
    if (entityType === 'destination') {
      const isAuthorized = await verifyDestinationOwnership(req.user!.userId, req.user!.role, entityId);
      if (!isAuthorized) throw new AppError('Unauthorized for this destination.', 403);
      folder = `schooldest/destinations/${entityId}`;
    } else if (entityType === 'school') {
      const isAuthorized = await verifySchoolOwnership(req.user!.userId, req.user!.role, entityId);
      if (!isAuthorized) throw new AppError('Unauthorized for this school.', 403);
      folder = `schooldest/schools/${entityId}`;
    } else {
      throw new AppError('Invalid entityType. Allowed: destination, school.', 400);
    }

    const publicId = `${req.body.category || 'media'}_${Date.now()}`;
    const signatureData = generateUploadSignature(folder, publicId);

    res.json({
      success: true,
      data: signatureData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * General Authenticated Image Upload (Backwards compatibility)
 */
export async function handleImageUpload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new AppError('Cloudinary storage is not configured in server environment.', 500);
    }

    const folder = (req.body?.folder as string) || (req.user?.role === 'SUPER_ADMIN' ? 'schooldest/admin' : req.schoolId ? 'schooldest/schools' : 'schooldest/destinations');

    let result;

    if (req.file) {
      result = await uploadBuffer(req.file.buffer, {
        folder,
        tags: ['schooldest', req.user?.role || 'user'],
      });
    } else if (req.body?.imageUrl) {
      result = await uploadImage(req.body.imageUrl, {
        folder,
        tags: ['schooldest', req.user?.role || 'user'],
      });
    } else {
      throw new AppError('No image file or imageUrl provided in request.', 400);
    }

    const optimizedUrl = getOptimizedUrl(result.public_id, { width: 1200 });
    const thumbnailUrl = getOptimizedUrl(result.public_id, { width: 400, height: 300, crop: 'fill' });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully to Cloudinary.',
      data: {
        publicId: result.public_id,
        url: result.secure_url || result.url,
        secureUrl: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        optimizedUrl,
        thumbnailUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authorized Image Deletion
 */
export async function handleDeleteImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;
    if (!publicId) {
      throw new AppError('Public ID is required for image deletion.', 400);
    }

    // Role check: Only SUPER_ADMIN, DESTINATION_MANAGER, or SCHOOL_ADMIN
    if (req.user!.role === Role.SCHOOL_STAFF || req.user!.role === Role.DESTINATION_STAFF) {
      throw new AppError('Unauthorized: Staff roles cannot delete media assets.', 403);
    }

    const result = await deleteImage(publicId);

    res.json({
      success: true,
      message: 'Image deleted from Cloudinary successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
