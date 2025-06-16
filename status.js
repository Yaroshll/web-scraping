const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');


const csvFilePath = path.join(__dirname, '250_pro.csv');


const rows = [];
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
   
    row['STATUS'] = 'draft'; 
    rows.push(row);
  })
  .on('end', () => {
   
    const outputCsv = convertToCsv(rows);
    fs.writeFileSync(csvFilePath, outputCsv, 'utf8');
    console.log('✅');
  })
  .on('error', (error) => {
    console.error(error);
  });


function convertToCsv(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  let csv = headers.join(',') + '\n';

  data.forEach(row => {
    const values = headers.map(header => {
    
      const value = row[header] || '';
      return value.includes(',') ? `"${value}"` : value;
    });
    csv += values.join(',') + '\n';
  });

  return csv;
}