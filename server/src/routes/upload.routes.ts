import { Router } from 'express';
import multer from 'multer';
import {
  handleImageUpload,
  handleDeleteImage,
  handleDestinationCoverUpload,
  handleDestinationGalleryUpload,
  handleDeleteDestinationGalleryImage,
  handleSchoolLogoUpload,
  handleGenerateSignature,
} from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only valid image files (JPEG, PNG, WebP, AVIF, SVG) up to 10MB are permitted.', 400));
    }
  },
});

const router = Router();

// 1. Destination cover image upload & replace
router.post('/destination/:destinationId/cover', authenticate, upload.single('file'), handleDestinationCoverUpload);

// 2. Destination gallery image upload
router.post('/destination/:destinationId/gallery', authenticate, upload.single('file'), handleDestinationGalleryUpload);

// 3. Destination gallery image deletion
router.delete('/destination/:destinationId/gallery/:imageId', authenticate, handleDeleteDestinationGalleryImage);

// 4. School logo upload & replace
router.post('/school/:schoolId/logo', authenticate, upload.single('file'), handleSchoolLogoUpload);

// 5. Generate client upload signature for direct uploads
router.post('/sign', authenticate, handleGenerateSignature);

// 6. General authenticated image upload (backwards compatibility)
router.post('/image', authenticate, upload.single('file'), handleImageUpload);

// 7. General authenticated image deletion
router.delete('/:publicId', authenticate, handleDeleteImage);

export default router;
