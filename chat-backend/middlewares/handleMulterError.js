import multer from "multer";

// Wraps multer.single(field) to handle Multer errors before hitting global error handler
export const handleMulterUpload = (fieldName, uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'Image too large. Max 1MB allowed.' });
        }
        return res.status(400).json({ message: 'Multer error: ' + err.message });
      } else if (err) {
        // Non-Multer error (e.g. invalid mime type)
        return res.status(400).json({ message: err.message });
      }
      next(); // No error, continue to controller
    });
  };
};
