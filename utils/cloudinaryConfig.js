import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Remplacez par votre cloud name
    api_key: process.env.CLOUDINARY_API_KEY,       // Remplacez par votre API key
    api_secret: process.env.CLOUDINARY_API_SECRET, // Remplacez par votre API secret
});

export default cloudinary;
