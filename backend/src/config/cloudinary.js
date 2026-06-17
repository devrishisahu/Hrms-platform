const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer (from multer memoryStorage) to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder e.g. `hrms/<tenantId>/employees`
 * @param {string} resourceType 'image' | 'raw' | 'auto'
 */
const uploadBuffer = (buffer, folder, resourceType = 'auto') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

const deleteFile = (publicId, resourceType = 'image') =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

module.exports = { cloudinary, uploadBuffer, deleteFile };
