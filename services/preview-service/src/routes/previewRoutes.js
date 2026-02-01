const express = require('express');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

const router = express.Router();

const getUploadDir = () => {
  const dir = process.env.UPLOAD_DIR;
  if (dir && path.isAbsolute(dir)) return dir;
  if (dir) return path.resolve(process.cwd(), dir);
  return path.resolve(process.cwd(), '../../server/uploads');
};

router.get('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, filename);

    // Sanitize path - prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileExtension = path.extname(filename).toLowerCase();
    const stats = fs.statSync(filePath);

    switch (fileExtension) {
      case '.docx':
      case '.doc': {
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
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
                  pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
                  code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
                  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                  table td, table th { border: 1px solid #ddd; padding: 8px; }
                  table th { background-color: #f2f2f2; font-weight: bold; }
                </style>
              </head>
              <body>${result.value}</body>
            </html>
          `;
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        } catch (error) {
          console.error('Error converting DOCX:', error);
          return res.status(500).json({ error: 'Failed to convert document to HTML' });
        }
        break;
      }

      case '.xlsx':
      case '.xls': {
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
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
                  h2 { margin-top: 30px; }
                  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                  table td, table th { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  table th { background-color: #4CAF50; color: white; font-weight: bold; }
                  table tr:nth-child(even) { background-color: #f2f2f2; }
                </style>
              </head>
              <body>
                <h1>${filename}</h1>
          `;
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            html += `<h2>${sheetName}</h2>`;
            html += XLSX.utils.sheet_to_html(worksheet);
          });
          html += `</body></html>`;
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        } catch (error) {
          console.error('Error converting Excel:', error);
          return res.status(500).json({ error: 'Failed to convert spreadsheet to HTML' });
        }
        break;
      }

      case '.pdf': {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        fs.createReadStream(filePath).pipe(res);
        break;
      }

      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif': {
        const mimeType = fileExtension === '.png' ? 'image/png' :
          fileExtension === '.jpg' || fileExtension === '.jpeg' ? 'image/jpeg' : 'image/gif';
        res.setHeader('Content-Type', mimeType);
        fs.createReadStream(filePath).pipe(res);
        break;
      }

      case '.txt':
      case '.md':
      case '.json': {
        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(content);
        break;
      }

      default: {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fs.createReadStream(filePath).pipe(res);
      }
    }
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Error generating preview' });
  }
});

module.exports = router;
