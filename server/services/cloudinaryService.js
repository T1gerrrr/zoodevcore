const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dv4y7cdpi';
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars';
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/**
 * Upload a base64 image to Cloudinary using SDK or direct Unsigned Upload API
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadImage = async (base64Image, folder = 'attendance') => {
  try {
    // If API key & secret are provided, use signed SDK upload
    if (apiKey && apiSecret) {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: `zooworkshop/${folder}`,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
        ],
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // Otherwise, use direct Unsigned Upload REST API (requires only cloudName & uploadPreset)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64Image,
        upload_preset: uploadPreset,
        folder: `zooworkshop/${folder}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary API error:', data);
      throw new Error(data.error?.message || 'Lỗi khi upload ảnh lên Cloudinary');
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error.message || error);
    throw new Error('Không thể upload ảnh. Vui lòng thử lại.');
  }
};

module.exports = { cloudinary, uploadImage };
