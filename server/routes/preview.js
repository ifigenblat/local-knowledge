const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const auth = require('../middleware/auth');

// Preview file content (converts Office docs to HTML, serves PDFs, images, etc.)
router.get('/:filename', auth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileExtension = path.extname(filename).toLowerCase();
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Handle different file types
    switch (fileExtension) {
      case '.docx':
      case '.doc': {
        // Convert DOCX to HTML using mammoth
        try {
          const result = await mammoth.convertToHtml({ path: filePath });
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview: ${filename}</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                    color: #333;
                  }
                  pre {
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                  }
                  code {
                    background: #f5f5f5;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                  }
                  table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 10px 0;
                  }
                  table td, table th {
                    border: 1px solid #ddd;
                    padding: 8px;
                  }
                  table th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                  }
                </style>
              </head>
              <body>
                ${result.value}
              </body>
            </html>
          `;
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        } catch (error) {
          console.error('Error converting DOCX to HTML:', error);
          return res.status(500).json({ error: 'Failed to convert document to HTML' });
        }
        break;
      }

      case '.xlsx':
      case '.xls': {
        // Convert Excel to HTML table
        try {
          const workbook = XLSX.readFile(filePath);
          let html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview: ${filename}</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                  }
                  h2 { margin-top: 30px; }
                  table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 10px 0;
                  }
                  table td, table th {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                  }
                  table th {
                    background-color: #4CAF50;
                    color: white;
                    font-weight: bold;
                  }
                  table tr:nth-child(even) {
                    background-color: #f2f2f2;
                  }
                </style>
              </head>
              <body>
                <h1>${filename}</h1>
          `;

          // Convert each sheet to HTML table
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            html += `<h2>${sheetName}</h2>`;
            html += XLSX.utils.sheet_to_html(worksheet);
          });

          html += `</body></html>`;
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        } catch (error) {
          console.error('Error converting Excel to HTML:', error);
          return res.status(500).json({ error: 'Failed to convert spreadsheet to HTML' });
        }
        break;
      }

      case '.pdf': {
        // Serve PDF directly
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        break;
      }

      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif': {
        // Serve image directly
        const mimeType = fileExtension === '.png' ? 'image/png' :
                        fileExtension === '.jpg' || fileExtension === '.jpeg' ? 'image/jpeg' :
                        'image/gif';
        res.setHeader('Content-Type', mimeType);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        break;
      }

      case '.txt':
      case '.md':
      case '.json': {
        // Serve text files
        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(content);
        break;
      }

      default: {
        // For other file types, try to serve as download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      }
    }
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Error generating preview' });
  }
});

module.exports = router;
