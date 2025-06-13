const XLSX = require('xlsx');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const workbook = XLSX.readFile('output11.xlsx');
const sheetName = workbook.SheetNames[0];
const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);


const tagMappings = {
    'Bath & Wash Care': 'Bath & Wash Care,Personal Care',
    'Feminine Hygiene': 'Feminine Hygiene,Personal Care',
    'Dental & Health Care': 'Dental,Personal Care',
    'Cheese Spreads': 'Cheese',
    'Cheese & Labneh': 'Cheese,Labneh',
    'Chewing Gum': 'Kids',
    'Jams & Spreads': 'Jams,Canned Food,General Item',
    'Cereals': 'Cereals,Kids,Dariy & Breakfast',
    'Oats & Bars': 'Oats,Dariy & Breakfast',
    'Biscuits': 'Biscuits,Kids',
    'Chocolates': 'Chocolates,Biscuits,Kids',
    'Canned Beans': 'Canned Food,General Item',
    'Fabric conditioners': 'Liquid Detergents,detergents',
    'Liquids & Concentrates': 'Liquid Detergents,detergents',
    'Washing powder': 'detergents',
    'Aluminium foil': 'Disposables',
    'Aluminium tray': 'Disposables',
    'Disposables': 'Disposables',
    'Pasta & Noodles': 'Pasta & Noodles,Cooking Item',
    'Rice': 'Rice',
    'Facial tissues': 'Tissues',
    'Kitchen Rolls': 'Tissues',
    'Cooking Sauces': 'Cooking Sauces,Cooking Item',
    'Condinents': 'Condinents,Cardomom',
    'Gravy & Stock': 'Gravy & Stock,Cooking Item',
    'Oils & Vinegar': 'Oil',
    'Pulses, Spices & Herbs': 'Pulses,Spices & Herbs,Cooking Item',
    'Ketchup': 'Ketchup',
    'Mayonnaise': 'Mayonnaise',
    'Pickles': 'Canned Food,General Item',
    'diary & Eggs': 'Eggs',
    'Longlife Milk': 'Longlife Milk',
    'Water' : 'Water',
    'Hot Beverages': 'Hot Beverages,Coffee,Tea'
};


const csvWriter = createCsvWriter({
    path: 'shopify_products13.csv',
    header: [
        { id: 'Handle', title: 'Handle' },
        { id: 'Title', title: 'Title' },
        { id: 'Body_HTML', title: 'Body (HTML)' },
        { id: 'Vendor', title: 'Vendor' },
        { id: 'Product_Type', title: 'Product Type' },
        { id: 'Tags', title: 'Tags' },
        { id: 'Published', title: 'Published' },
        { id: 'Variant_Price', title: 'Variant Price' },
        { id: 'Cost_per_item', title: 'Cost per item' },
        { id: 'Variant_Inventory_Tracker', title: 'Variant Inventory Tracker' },
        { id: 'Variant_Inventory_Qty', title: 'Variant Inventory Qty' },
        { id: 'Variant_Inventory_Policy', title: 'Variant Inventory Policy' },
        { id: 'Image_Src', title: 'Image Src' }
    ]
});


let csvData = [];

jsonData.forEach(row => {
    
    const originalTag = row.subCategory || row.category || '';
    const mappedTags = tagMappings[originalTag] || originalTag;

    const baseRow = {
        Handle: row.handle || '',
        Title: row.name || '',
        Body_HTML: row.description || '',
        Vendor: 'Fakhr Al Shaeb',
        Product_Type: 'Grocery',
        Tags: mappedTags,
        Published: 'TRUE',
        Variant_Price: row.price ? parseFloat(row.price).toFixed(2) : '',
        Cost_per_item: '',
        Variant_Inventory_Tracker: 'shopify',
        Variant_Inventory_Qty: 50,
        Variant_Inventory_Policy: 'deny',
        Image_Src: row.image || ''
    };
    csvData.push(baseRow);

   
    let additionalImages = [];
    
    if (row.additional_images) {
        if (Array.isArray(row.additional_images)) {
            additionalImages = row.additional_images;
        } else if (typeof row.additional_images === 'string') {
            additionalImages = row.additional_images.split(',').map(img => img.trim());
        }
    }

   
    additionalImages.forEach(imageUrl => {
        const imageRow = {
            Handle: row.handle || '',
            Image_Src: imageUrl
        };
        csvData.push(imageRow);
    });
});


csvWriter.writeRecords(csvData)
    .then(() => console.log('✅'));