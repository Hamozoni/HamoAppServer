import multer from 'multer';
const storage = multer.memoryStorage();

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = ['image/*', 'audio/*', 'video/*', 'application/pdf'];
//     if (!allowedTypes.includes(file.mimetype)) {
//       return cb(new Error('Invalid file type'), false);
//     }
//     cb(null, true);
//   }
});


export default uploadMiddleware;
