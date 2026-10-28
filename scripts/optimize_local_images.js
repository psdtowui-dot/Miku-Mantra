const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processDirectory(dirName) {
  const dirPath = path.join(process.cwd(), dirName);
  if (!fs.existsSync(dirPath)) return { processed: 0, savedBytes: 0 };

  const files = fs.readdirSync(dirPath);
  let processed = 0;
  let savedBytes = 0;
  let totalOrigBytes = 0;
  let totalNewBytes = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const baseName = path.basename(file, ext);
    const webpName = baseName + '.webp';
    const webpPath = path.join(dirPath, webpName);
    const origPath = path.join(dirPath, file);

    const origStat = fs.statSync(origPath);
    totalOrigBytes += origStat.size;

    if (!fs.existsSync(webpPath)) {
      try {
        await sharp(origPath)
          .webp({ quality: 82, effort: 4 })
          .toFile(webpPath);
        
        const webpStat = fs.statSync(webpPath);
        processed++;
        const saved = origStat.size - webpStat.size;
        savedBytes += saved;
        totalNewBytes += webpStat.size;
        console.log(`[Created WebP] ${file} (${(origStat.size/1024).toFixed(1)} KB) -> ${webpName} (${(webpStat.size/1024).toFixed(1)} KB) [Saved ${(saved/1024).toFixed(1)} KB]`);
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err.message);
      }
    } else {
      const webpStat = fs.statSync(webpPath);
      totalNewBytes += webpStat.size;
      savedBytes += (origStat.size - webpStat.size);
    }
  }

  return { processed, savedBytes, totalOrigBytes, totalNewBytes };
}

async function run() {
  console.log('Optimizing local images with sharp...');
  const resImages = await processDirectory('public/images');
  const resUploads = await processDirectory('public/uploads');

  console.log('\n--- Optimization Results ---');
  console.log(`public/images  : ${resImages.processed} newly converted. Total original: ${(resImages.totalOrigBytes/1024/1024).toFixed(2)} MB, WebP: ${(resImages.totalNewBytes/1024/1024).toFixed(2)} MB`);
  console.log(`public/uploads : ${resUploads.processed} newly converted. Total original: ${(resUploads.totalOrigBytes/1024/1024).toFixed(2)} MB, WebP: ${(resUploads.totalNewBytes/1024/1024).toFixed(2)} MB`);
  const totalSaved = (resImages.savedBytes + resUploads.savedBytes) / 1024 / 1024;
  console.log(`Total savings achievable via WebP: ${totalSaved.toFixed(2)} MB!`);
}

run().catch(console.error);
