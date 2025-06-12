const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const { PromisePool } = require('@supercharge/promise-pool');

// 1. دالة لتحويل النص إلى هاندل
function toHandle(name) {
    return name.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^\w-]/g, '');
}

// 2. دالة لتنظيف السعر (إزالة AED وإرجاع الرقم فقط)
function formatPrice(priceText) {
    const priceMatch = priceText.match(/(\d+[\.,]?\d*)/);
    const priceValue = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
    return priceValue.toFixed(2); // إرجاع السعر بدون AED
}

// 3. دالة لاستخراج الفئات من breadcrumb
async function extractCategories(page) {
    try {
        const breadcrumbs = await page.$$eval('.wd-breadcrumbs.woocommerce-breadcrumb a', links => 
            links.map(link => link.textContent.trim())
        );
        return {
            category: breadcrumbs.length > 1 ? breadcrumbs[1] : '',
            subCategory: breadcrumbs.length > 2 ? breadcrumbs[2] : ''
        };
    } catch (error) {
        return { category: '', subCategory: '' };
    }
}

// 4. دالة لمعالجة منتج واحد (مع التعديلات المطلوبة)
async function processProduct(url, productId, browser) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    try {
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // استخراج البيانات الأساسية
        const name = await page.$eval('.product_title.entry-title.wd-entities-title', el => el.textContent.trim());
        const handle = toHandle(name);

        // استخراج السعر (الغير مشطوب فقط)
        const priceText = await page.$eval('.price', el => {
            // البحث عن السعر الغير مشطوب (غير محذوف)
            const regularPrice = el.querySelector('bdi:not(del bdi)');
            if (regularPrice) return regularPrice.textContent.trim();
            
            // إذا لم يوجد سعر غير مشطوب، نأخذ أول سعر موجود
            const firstPrice = el.querySelector('bdi');
            return firstPrice ? firstPrice.textContent.trim() : el.textContent.trim();
        }).catch(() => '0');

        const { category, subCategory } = await extractCategories(page);
        const formattedPrice = formatPrice(priceText);

        // استخراج الصور
        const images = await page.$$eval('.woocommerce-product-gallery__image a', imgs => 
            imgs.map(img => img.getAttribute('href'))
        ).catch(() => []);

        // استخراج الوصف
        const description = await page.$eval('.woocommerce-product-details__short-description', el => {
            const h3 = el.querySelector('h3');
            return h3 ? h3.textContent.trim() : el.textContent.trim();
        }).catch(() => '');

        // إنشاء كائن المنتج الرئيسي
        const products = [{
            id: productId,
            handle: `${productId}-${handle}`,
            name,
            price: formattedPrice, // سيحتوي على الرقم فقط بدون AED
            description,
            category,
            subCategory,
            image: images[0] || '',
            url
        }];

        // إضافة صفوف للصور الإضافية
        for (let i = 1; i < images.length; i++) {
            products.push({
                id: '',
                handle: `${productId}-${handle}`,
                name: '',
                price: '',
                description: '',
                category: '',
                subCategory: '',
                image: images[i],
                url: ''
            });
        }

        return products;
    } catch (error) {
        console.error(`❌ خطأ في معالجة المنتج ${url}:`, error.message);
        return [];
    } finally {
        await page.close();
    }
}

// ... [بقية الدوال تبقى كما هي بدون تغيير]
// scrapeProducts, saveToExcel, readProductUrls, والدالة الرئيسية

// 5. دالة رئيسية لمعالجة جميع المنتجات
async function scrapeProducts(productUrls, startingId = 415, concurrency = 3) {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const { results } = await PromisePool
            .withConcurrency(concurrency)
            .for(productUrls)
            .process(async (url, index) => {
                console.log(`⏳ جاري معالجة المنتج ${index + 1}/${productUrls.length}: ${url}`);
                const products = await processProduct(url, startingId + index, browser);
                return products;
            });

        return results.flat();
    } finally {
        await browser.close();
    }
}

// 6. دالة لحفظ البيانات في Excel
async function saveToExcel(products, filename = 'output.xlsx') {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, filename);
}

// 7. دالة لقراءة الروابط من ملف الإدخال
function readProductUrls(filename = 'input.xlsx') {
    try {
        const workbook = XLSX.readFile(filename);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        const urls = data.map(row => {
            const firstColumn = Object.keys(row)[0];
            return row[firstColumn]?.toString().trim();
        }).filter(url => url && url.startsWith('http'));
        
        return urls;
    } catch (error) {
        console.error('❌ خطأ في قراءة ملف الإدخال:', error.message);
        return [];
    }
}

// 8. الدالة الرئيسية
(async () => {
    try {
        console.log('🚀 بدء عملية جمع البيانات...');
        
        // قراءة الروابط من ملف الإدخال
        const productUrls = readProductUrls();
        if (productUrls.length === 0) {
            throw new Error('لم يتم العثور على روابط منتجات صالحة في ملف input.xlsx');
        }
        
        console.log(`🔍 تم العثور على ${productUrls.length} رابط منتج`);
        
        // معالجة المنتجات
        const allProducts = await scrapeProducts(productUrls);
        
        if (allProducts.length === 0) {
            throw new Error('لم يتم جمع أي بيانات منتجات');
        }
        
        console.log(`✅ تم جمع بيانات ${allProducts.length} منتج بنجاح`);
        
        // حفظ النتائج
        await saveToExcel(allProducts);
        console.log('💾 تم حفظ البيانات في ملف output.xlsx');
        
    } catch (error) {
        console.error('❌ حدث خطأ جسيم:', error.message);
        process.exit(1);
    }
})();
