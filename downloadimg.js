// 
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');
const { promisify } = require('util');
const stream = require('stream');

const pipeline = promisify(stream.pipeline);

// إعدادات المجلد الرئيسي للصور
const IMAGES_DIR = path.join(__dirname, 'downloaded_images6');
const MAX_CONCURRENT_DOWNLOADS = 5; // عدد الصور التي يتم تحميلها في نفس الوقت
const downloadQueue = [];
let activeDownloads = 0;

// دالة محسنة لتحميل الصور
async function downloadImage(url, folderPath, imageName) {
  try {
    const response = await axios.get(url, { responseType: 'stream' });
    const imagePath = path.join(folderPath, `${imageName}.jpg`);
    
    await pipeline(
      response.data,
      fs.createWriteStream(imagePath)
    );
    
    return true;
  } catch (error) {
    console.error(`فشل تحميل الصورة: ${url}`, error.message);
    return false;
  }
}

// دالة لإدارة قائمة الانتظار
async function processDownloadQueue() {
  while (downloadQueue.length > 0 && activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
    const { url, folderPath, imageName, handle } = downloadQueue.shift();
    activeDownloads++;
    
    try {
      await downloadImage(url, folderPath, imageName);
      console.log(`تم تحميل الصورة للمنتج: ${handle}`);
    } catch (error) {
      console.error(`خطأ في تحميل صورة المنتج: ${handle}`, error);
    } finally {
      activeDownloads--;
      process.nextTick(processDownloadQueue);
    }
  }
}

// دالة رئيسية محسنة لمعالجة CSV
async function processCSV(filePath) {
  // إنشاء المجلد الرئيسي إذا لم يكن موجوداً
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const rows = [];

  // قراءة كل الصفوف أولاً
  await new Promise((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  // معالجة كل صف مع دعم لصور متعددة
  for (const row of rows) {
    try {
      const handle = row['Handle'];
      if (!handle) continue;

      // إنشاء مجلد لكل هاندل
      const folderPath = path.join(IMAGES_DIR, handle);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // استخراج كل روابط الصور (كل الأعمدة ما عدا الهاندل)
      const imageUrls = Object.entries(row)
        .filter(([key, value]) => key !== 'Handle' && value && value.startsWith('http'))
        .map(([_, value]) => value);

      // إضافة كل الصور إلى قائمة الانتظار
      for (let i = 0; i < imageUrls.length; i++) {
        const imageName = `image_${i}_${Date.now()}`;
        downloadQueue.push({
          url: imageUrls[i],
          folderPath,
          imageName,
          handle
        });
      }
    } catch (error) {
      console.error('خطأ في معالجة الصف:', error);
    }
  }

  // بدء عملية التحميل
  for (let i = 0; i < MAX_CONCURRENT_DOWNLOADS; i++) {
    processDownloadQueue();
  }
}

// طريقة الاستخدام
const csvFilePath = path.join(__dirname, 'new6.csv');
processCSV(csvFilePath);