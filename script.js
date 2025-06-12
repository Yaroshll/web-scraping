const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

// دالة لتحويل النص إلى هاندل (استبدال الفراغات بشرطات)
function toHandle(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
}

// دالة لتنظيف السعر (إزالة كل ما ليس رقماً)
function cleanPrice(price) {
    return price.replace(/[^\d.]/g, '').replace(/\.$/, '').replace(/^\./, '');
}

// دالة لاستخراج الفئات من breadcrumb
async function extractCategories(page) {
    const breadcrumbs = await page.$$eval('.wd-breadcrumbs.woocommerce-breadcrumb a', links => 
        links.map(link => link.textContent.trim())
    );
    
    // نتجاهل أول عنصر (Home) وآخر عنصر (اسم المنتج)
    return {
        category: breadcrumbs.length > 1 ? breadcrumbs[1] : '',
        subCategory: breadcrumbs.length > 2 ? breadcrumbs[2] : ''
    };
}

async function scrapeProduct(url, productId = 415) {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // استخراج البيانات الأساسية
    const name = await page.$eval('.product_title.entry-title.wd-entities-title', el => el.textContent.trim());
    const handle = toHandle(name);
    const priceText = await page.$eval('.price', el => el.textContent.trim());
    const { category, subCategory } = await extractCategories(page);
    
    // استخراج جميع الصور
    const images = await page.$$eval('.woocommerce-product-gallery__image a', imgs => 
        imgs.map(img => img.getAttribute('href'))
    );

    // إنشاء المنتج الأساسي (الصف الأول)
    const mainProduct = {
        id: productId,
        handle: `${productId}-${handle}`,
        name: name,
        price: cleanPrice(priceText),
        description: await page.$eval('.woocommerce-product-details__short-description', el => {
            const h3 = el.querySelector('h3');
            return h3 ? h3.textContent.trim() : '';
        }).catch(() => ''),
        category: category,
        subCategory: subCategory,
        image: images[0] || '', // الصورة الأولى
        url: url
    };

    // إنشاء مصفوفة المنتجات
    let products = [mainProduct];

    // إذا كان هناك صور إضافية، ننشئ لها صفوفاً جديدة
    if (images.length > 1) {
        for (let i = 1; i < images.length; i++) {
            products.push({
                id: '',
                handle: `${productId}-${handle}`,
                name: '',
                price: '',
                description: '',
                category: '',
                subCategory: '',
                image: images[i], // الصورة التالية
                url: ''
            });
        }
    }

    await browser.close();
    return products;
}

async function saveToExcel(products, filename) {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, filename);
}

// مثال للاستخدام
const productUrl = 'https://www.fakheralshaab.ae/product/puck-halloumi-cheese-200g/';

scrapeProduct(productUrl).then(products => {
    console.log('تم جمع البيانات:', products);
    saveToExcel(products, 'products.xlsx');
    console.log('تم حفظ البيانات في ملف products.xlsx');
}).catch(console.error);