const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

async function extractTextFromFile(filePath, originalName) {
    const ext = originalName.split('.').pop().toLowerCase();
    
    try {
        // Gambar
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return { type: 'image', path: filePath };
        }
        
        // PDF
        if (ext === 'pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return { type: 'text', content: data.text };
        }
        
        // Word
        if (ext === 'docx') {
            const dataBuffer = fs.readFileSync(filePath);
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            return { type: 'text', content: result.value };
        }
        
        // Excel
        if (['xlsx', 'xls', 'csv'].includes(ext)) {
            const workbook = XLSX.readFile(filePath);
            let content = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet);
                content += `\n--- Sheet: ${sheetName} ---\n`;
                content += JSON.stringify(data, null, 2);
            });
            return { type: 'text', content: content };
        }
        
        // Text biasa
        if (ext === 'txt') {
            const content = fs.readFileSync(filePath, 'utf8');
            return { type: 'text', content: content };
        }
        
        return { type: 'text', content: 'Format file tidak didukung' };
        
    } catch (error) {
        console.error('Error extracting file:', error);
        return { type: 'text', content: 'Gagal membaca file' };
    }
}

module.exports = { extractTextFromFile };