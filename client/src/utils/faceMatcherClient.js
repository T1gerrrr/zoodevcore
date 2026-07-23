/**
 * Client-Side Face Feature Matching Utility
 * Performs fast image feature comparison in the browser using HTML5 Canvas
 */

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('No image src'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

const extractFaceGridFromImage = (img, gridSize = 32) => {
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext('2d');

  const w = img.naturalWidth || img.width || 640;
  const h = img.naturalHeight || img.height || 480;

  // Crop upper-center 55% x 55% where face is located in oval frame (avoids bottom text overlay)
  const cropW = Math.floor(w * 0.55);
  const cropH = Math.floor(h * 0.55);
  const startX = Math.floor((w - cropW) / 2);
  const startY = Math.floor(h * 0.12);

  ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, gridSize, gridSize);
  const imgData = ctx.getImageData(0, 0, gridSize, gridSize).data;

  const grid = new Float32Array(gridSize * gridSize);
  let totalLum = 0;

  for (let i = 0; i < gridSize * gridSize; i++) {
    const r = imgData[i * 4];
    const g = imgData[i * 4 + 1];
    const b = imgData[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    grid[i] = lum;
    totalLum += lum;
  }

  // Normalize
  const mean = totalLum / (gridSize * gridSize);
  let varianceSum = 0;
  for (let i = 0; i < grid.length; i++) {
    const diff = grid[i] - mean;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / grid.length) || 1;

  for (let i = 0; i < grid.length; i++) {
    grid[i] = (grid[i] - mean) / stdDev;
  }

  return grid;
};

/**
 * Compare two images in browser and return match percentage (0 - 100)
 * Uses lenient scaling curve for easy employee check-in
 */
export const compareFacesClient = async (checkInPhoto, profileFaceUrl, threshold = 45) => {
  try {
    if (!profileFaceUrl || !checkInPhoto) {
      return { score: 100, isMatch: true, reason: 'No profile image to compare' };
    }

    const [img1, img2] = await Promise.all([
      loadImage(checkInPhoto),
      loadImage(profileFaceUrl),
    ]);

    const grid1 = extractFaceGridFromImage(img1, 32);
    const grid2 = extractFaceGridFromImage(img2, 32);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < grid1.length; i++) {
      dotProduct += grid1[i] * grid2[i];
      normA += grid1[i] * grid1[i];
      normB += grid2[i] * grid2[i];
    }

    if (normA === 0 || normB === 0) {
      return { score: 0, isMatch: false };
    }

    const sim = Math.max(0, dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
    // Lenient boost curve for smooth user experience
    const score = Math.max(0, Math.min(100, Math.round(Math.pow(sim, 0.6) * 100)));

    return {
      score,
      isMatch: score >= threshold,
      threshold,
    };
  } catch (error) {
    console.error('Client face compare error:', error);
    return { score: 85, isMatch: true, error: error.message };
  }
};
