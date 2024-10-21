// Import multer
import multer from 'multer';

// Configure storage to use memory
const storage = multer.memoryStorage();

// Initialize multer with the storage configuration
const upload = multer({ storage: storage });

// Export if needed
export default upload;
