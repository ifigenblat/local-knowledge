const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const { processContent } = require('../utils/contentProcessor');

// Helper function to generate content hash
function generateContentHash(title, content) {
  const contentToHash = `${title.toLowerCase().trim()}-${content.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(contentToHash).digest('hex');
}

// Helper function to generate file hash
function generateFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error('Error generating file hash:', error);
    return null;
  }
}

// Helper function to create or update card with duplicate detection
async function createOrUpdateCard(cardData, userId, file, fileHash, fileId = null) {
  const contentHash = generateContentHash(cardData.title, cardData.content);
  
  // Check for existing card with same content hash
  const existingCard = contentHash ? await Card.findDuplicate(contentHash, userId) : null;
  
  // Prepare provenance information
  const provenance = {
    source_file_id: fileId || file.filename,
    source_path: file.path,
    file_hash: fileHash,
    location: cardData.provenance?.location || null,
    snippet: cardData.provenance?.snippet || null,
    model_name: cardData.provenance?.model_name || null,
    prompt_version: cardData.provenance?.prompt_version || '1.0',
    confidence_score: cardData.provenance?.confidence_score || null
  };
  
  if (existingCard) {
    // Update existing card with new file attachment
    existingCard.attachments.push({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });
    
    // Update source to include new file
    if (!existingCard.source.includes(file.originalname)) {
      existingCard.source = `${existingCard.source}, ${file.originalname}`;
    }
    
    // Update provenance if not already set
    if (!existingCard.provenance.source_file_id) {
      existingCard.provenance = provenance;
    }
    
    await existingCard.save();
    return { card: existingCard, isDuplicate: true };
  } else {
    // Create new card
    const card = new Card({
      title: cardData.title,
      content: cardData.content,
      contentHash: contentHash,
      type: cardData.type || 'concept',
      category: cardData.category || 'General',
      tags: cardData.tags || [],
      source: file.originalname,
      user: userId,
      attachments: [{
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      }],
      provenance: provenance
    });

    await card.save();
    return { card, isDuplicate: false };
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/json'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload and process file
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const { category, tags, model_name, prompt_version, confidence_score } = req.body;

    // Generate file hash for provenance tracking
    const fileHash = generateFileHash(file.path);
    const fileId = file.filename;

    // Process the uploaded file
    console.log('Starting file processing for:', file.originalname);
    const processedContent = await processContent(file);
    console.log('File processing completed. Content items:', processedContent ? processedContent.length : 0);

    if (!processedContent || processedContent.length === 0) {
      console.log('No content extracted from file');
      return res.status(400).json({ error: 'No content could be extracted from the file' });
    }

    // Create or update cards from processed content
    const createdCards = [];
    const updatedCards = [];
    
    console.log('Creating/updating cards from processed content...');
    
    for (let i = 0; i < processedContent.length; i++) {
      const item = processedContent[i];
      console.log(`Processing item ${i + 1}/${processedContent.length}:`, item.title);
      
      try {
        // Merge provenance from content processor with additional metadata
        const provenance = {
          ...(item.provenance || {}),
          model_name: model_name || item.provenance?.model_name || null,
          prompt_version: prompt_version || item.provenance?.prompt_version || '1.0',
          confidence_score: confidence_score ? parseFloat(confidence_score) : item.provenance?.confidence_score || null
        };
        
        const cardData = {
          title: item.title,
          content: item.content,
          type: item.type || 'concept',
          category: category || item.category || 'General',
          tags: tags ? tags.split(',').map(tag => tag.trim()) : item.tags || [],
          provenance: provenance
        };

        const result = await createOrUpdateCard(cardData, req.user.id, file, fileHash, fileId);
        
        if (result.isDuplicate) {
          updatedCards.push(result.card);
          console.log(`Updated existing card: ${item.title}`);
        } else {
          createdCards.push(result.card);
          console.log(`Created new card: ${item.title}`);
        }
      } catch (error) {
        console.error(`Error processing item ${i + 1}:`, error);
        console.error('Item data:', item);
        // Continue with other items instead of failing completely
      }
    }

    const totalProcessed = createdCards.length + updatedCards.length;
    
    res.status(201).json({
      message: `Successfully processed ${totalProcessed} cards`,
      details: {
        created: createdCards.length,
        updated: updatedCards.length
      },
      cards: [...createdCards, ...updatedCards],
      file: {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Error processing file',
      message: error.message 
    });
  }
});

// Upload multiple files
router.post('/multiple', auth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { category, tags, model_name, prompt_version, confidence_score } = req.body;
    const results = [];

    for (const file of req.files) {
      try {
        // Generate file hash for provenance tracking
        const fileHash = generateFileHash(file.path);
        const fileId = file.filename;
        
        const processedContent = await processContent(file);
        
        if (processedContent && processedContent.length > 0) {
          const createdCards = [];
          const updatedCards = [];
          
          for (const item of processedContent) {
            // Merge provenance from content processor with additional metadata
            const provenance = {
              ...(item.provenance || {}),
              model_name: model_name || item.provenance?.model_name || null,
              prompt_version: prompt_version || item.provenance?.prompt_version || '1.0',
              confidence_score: confidence_score ? parseFloat(confidence_score) : item.provenance?.confidence_score || null
            };
            
            const cardData = {
              title: item.title,
              content: item.content,
              type: item.type || 'concept',
              category: category || item.category || 'General',
              tags: tags ? tags.split(',').map(tag => tag.trim()) : item.tags || [],
              provenance: provenance
            };

            const result = await createOrUpdateCard(cardData, req.user.id, file, fileHash, fileId);
            
            if (result.isDuplicate) {
              updatedCards.push(result.card);
            } else {
              createdCards.push(result.card);
            }
          }

          results.push({
            file: file.originalname,
            success: true,
            created: createdCards.length,
            updated: updatedCards.length,
            total: createdCards.length + updatedCards.length,
            cards: [...createdCards, ...updatedCards]
          });
        } else {
          results.push({
            file: file.originalname,
            success: false,
            error: 'No content extracted'
          });
        }
      } catch (error) {
        results.push({
          file: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: 'Batch upload completed',
      results
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ 
      error: 'Error processing files',
      message: error.message 
    });
  }
});

// Get upload progress (for future implementation)
router.get('/progress/:id', auth, (req, res) => {
  // This would be implemented with WebSockets or Server-Sent Events
  res.json({ progress: 0, status: 'not implemented' });
});

module.exports = router;
