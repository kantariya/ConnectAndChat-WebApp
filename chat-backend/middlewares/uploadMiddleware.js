// middlewares/uploadMiddleware.js
import multer from 'multer';

// memory storage
const storage = multer.memoryStorage();

// limit file size, e.g., 1MB:
const limits = {
  fileSize: 1 * 1024 * 1024, // 1MB
};

// Filter to accept only images
function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
}

export const upload = multer({ storage, limits, fileFilter });
