// --- HELPER: SMART IMAGE PROCESSOR (Supports GIF, Multiple, and Center-Crop) ---
export const processFile = (file) => {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/gif') {
      if (file.size > 1024 * 1024) { 
        return reject("GIF is too large! Max 1MB allowed.");
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const targetSize = 600; 
        canvas.width = targetSize;
        canvas.height = targetSize;

        let sourceX = 0, sourceY = 0, sourceSize = 0;
        if (img.width > img.height) {
          sourceSize = img.height;
          sourceX = (img.width - img.height) / 2;
        } else {
          sourceSize = img.width;
          sourceY = (img.height - img.width) / 2;
        }

        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize);

        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        const MAX_SIZE_CHARS = 340000; 

        while (dataUrl.length > MAX_SIZE_CHARS && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- HELPER: PARSE IMAGES FOR DISPLAY ---
export const parseImages = (imageString) => {
  if (!imageString) return [];
  try {
    const parsed = JSON.parse(imageString);
    if (Array.isArray(parsed)) return parsed;
    return [imageString];
  } catch (e) {
    return [imageString];
  }
};