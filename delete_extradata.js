const fs = require('fs');
const path = require('path');

function processCSV(inputPath, outputPath) {
    try {
      
        const csvData = fs.readFileSync(inputPath, 'utf8');
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        
        
        const handleIndex = headers.indexOf('Handle');
        const imageSrcIndex = headers.indexOf('Image Src');
        
        if (handleIndex === -1 || imageSrcIndex === -1) {
            throw new Error('error');
        }
        
        const seenHandles = new Set();
        const processedLines = [headers.join(',')];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const row = lines[i].split(',');
            const handle = row[handleIndex];
            
            if (!seenHandles.has(handle)) {
             
                processedLines.push(row.join(','));
                seenHandles.add(handle);
            } else {
                const newRow = new Array(headers.length).fill('');
                newRow[handleIndex] = handle;
                newRow[imageSrcIndex] = row[imageSrcIndex];
                processedLines.push(newRow.join(','));
            }
        }
        
        fs.writeFileSync(outputPath, processedLines.join('\n'), 'utf8');
        console.log(`${outputPath}`);
    } catch (error) {
        console.error('error', error.message);
    }
}
const inputFile = path.join(__dirname, 'new1.csv');
const outputFile = path.join(__dirname, 'new5.csv');
processCSV(inputFile, outputFile);