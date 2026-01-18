const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const XLSX = require('xlsx');

// Initialize tokenizer for text analysis
const tokenizer = new natural.WordTokenizer();

/**
 * Validate that card content is meaningful (not empty, not just whitespace, not placeholder text)
 */
function hasMeaningfulContent(content, minLength = 10) {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  const trimmed = content.trim();
  
  // Check minimum length
  if (trimmed.length < minLength) {
    return false;
  }
  
  // Check for placeholder text
  const placeholderTexts = ['No content', 'no content', 'N/A', 'n/a', 'NA', 'na', 'None', 'none', 'Null', 'null'];
  if (placeholderTexts.includes(trimmed)) {
    return false;
  }
  
  // Check that it's not just whitespace or special characters
  const meaningfulChars = trimmed.replace(/[\s\-_\.]/g, '');
  if (meaningfulChars.length < minLength / 2) {
    return false;
  }
  
  return true;
}

// Keywords that indicate different card types
const CARD_TYPE_KEYWORDS = {
  concept: ['concept', 'definition', 'theory', 'principle', 'framework', 'model'],
  action: ['action', 'step', 'process', 'procedure', 'method', 'technique', 'strategy'],
  quote: ['quote', 'saying', 'proverb', 'wisdom', 'insight'],
  checklist: ['checklist', 'list', 'items', 'tasks', 'requirements', 'criteria'],
  mindmap: ['relationship', 'connection', 'link', 'network', 'system']
};

// Comprehensive category keywords for better categorization
const CATEGORY_KEYWORDS = {
  'AI': [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network',
    'algorithm', 'automation', 'chatbot', 'gpt', 'llm', 'large language model', 'nlp',
    'natural language processing', 'computer vision', 'robotics', 'predictive analytics',
    'data science', 'intelligent', 'smart', 'automated', 'cognitive', 'intelligence'
  ],
  'Leadership': [
    'leadership', 'leader', 'vision', 'inspire', 'motivate', 'empower', 'mentor',
    'coach', 'guide', 'direct', 'influence', 'authority', 'executive', 'ceo', 'manager'
  ],
  'Management': [
    'management', 'manager', 'supervisor', 'administrator', 'director', 'head',
    'oversight', 'coordination', 'supervision', 'administration', 'governance'
  ],
  'Team Management': [
    'team', 'collaboration', 'cooperation', 'group', 'member', 'colleague',
    'partnership', 'alliance', 'unity', 'together', 'collective', 'synergy'
  ],
  'People': [
    'people', 'personnel', 'staff', 'employee', 'individual', 'human', 'person',
    'workforce', 'talent', 'colleague', 'team member', 'stakeholder', 'user'
  ],
  'Organization': [
    'organization', 'org', 'organizational', 'institution', 'company', 'corporation',
    'enterprise', 'business', 'firm', 'agency', 'department', 'division', 'unit'
  ],
  'Operating Principles': [
    'operating principles', 'principles', 'values', 'ethics', 'standards', 'guidelines',
    'policies', 'procedures', 'best practices', 'methodology', 'framework', 'approach'
  ],
  'Process': [
    'process', 'workflow', 'procedure', 'method', 'system', 'approach', 'methodology',
    'technique', 'strategy', 'tactic', 'protocol', 'routine', 'operation'
  ],
  'Architecture': [
    'architecture', 'architectural', 'design', 'structure', 'framework', 'blueprint',
    'model', 'pattern', 'layout', 'configuration', 'infrastructure', 'system design'
  ],
  'Data': [
    'data', 'information', 'analytics', 'metrics', 'statistics', 'insights', 'intelligence',
    'reporting', 'analysis', 'measurement', 'kpi', 'dashboard', 'database', 'dataset'
  ],
  'Technology': [
    'technology', 'digital', 'software', 'hardware', 'system', 'platform',
    'application', 'tool', 'automation', 'innovation', 'development',
    'implementation', 'integration', 'maintenance', 'upgrade'
  ],
  'Communication': [
    'communication', 'presentation', 'speech', 'talk', 'discussion', 'meeting',
    'conversation', 'dialogue', 'message', 'feedback', 'listen', 'speak', 'write',
    'email', 'report', 'documentation', 'storytelling', 'public speaking'
  ],
  'Strategic Planning': [
    'strategy', 'planning', 'plan', 'goal', 'objective', 'target', 'mission',
    'vision', 'roadmap', 'blueprint', 'framework', 'approach', 'methodology',
    'tactics', 'initiative', 'project', 'program'
  ],
  'Performance Management': [
    'performance', 'evaluation', 'assessment', 'review', 'feedback', 'metrics',
    'kpi', 'measurement', 'analysis', 'improvement', 'optimization', 'efficiency',
    'productivity', 'quality', 'excellence', 'achievement', 'results'
  ],
  'Change Management': [
    'change', 'transformation', 'transition', 'evolution', 'adaptation',
    'innovation', 'disruption', 'modernization', 'digitalization', 'restructure',
    'reorganization', 'improvement', 'development', 'growth'
  ],
  'Decision Making': [
    'decision', 'choice', 'option', 'alternative', 'solution', 'problem-solving',
    'analysis', 'evaluation', 'judgment', 'conclusion', 'determination',
    'resolve', 'decide', 'choose', 'select', 'prioritize'
  ],
  'Conflict Resolution': [
    'conflict', 'dispute', 'disagreement', 'resolution', 'mediation', 'negotiation',
    'compromise', 'consensus', 'agreement', 'harmony', 'reconciliation',
    'peace', 'understanding', 'tolerance', 'respect'
  ],
  'Time Management': [
    'time', 'schedule', 'deadline', 'timeline', 'prioritization', 'organization',
    'efficiency', 'productivity', 'planning', 'coordination', 'management',
    'allocation', 'optimization', 'balance', 'work-life'
  ],
  'Financial Management': [
    'finance', 'budget', 'cost', 'expense', 'revenue', 'profit', 'investment',
    'financial', 'economic', 'monetary', 'fiscal', 'accounting', 'audit',
    'forecasting', 'planning', 'analysis', 'reporting'
  ],
  'Customer Service': [
    'customer', 'client', 'service', 'support', 'satisfaction', 'experience',
    'relationship', 'engagement', 'loyalty', 'retention', 'acquisition',
    'feedback', 'complaint', 'resolution', 'excellence'
  ],
  'Marketing': [
    'marketing', 'brand', 'advertising', 'promotion', 'campaign', 'strategy',
    'market', 'customer', 'audience', 'target', 'message', 'communication',
    'social media', 'content', 'analytics', 'conversion'
  ],
  'Human Resources': [
    'hr', 'human resources', 'recruitment', 'hiring', 'training', 'development',
    'employee', 'staff', 'personnel', 'workforce', 'talent', 'culture',
    'benefits', 'compensation', 'retention', 'engagement'
  ],
  'Operations': [
    'operations', 'process', 'workflow', 'procedure', 'system', 'efficiency',
    'optimization', 'streamline', 'automation', 'quality', 'standards',
    'compliance', 'safety', 'risk', 'management'
  ],
  'Sales': [
    'sales', 'revenue', 'deal', 'prospect', 'client', 'customer', 'pitch',
    'negotiation', 'closing', 'relationship', 'pipeline', 'target',
    'quota', 'commission', 'performance', 'growth'
  ]
};

/**
 * Process uploaded file and extract content for card creation
 */
async function processContent(file) {
  try {
    console.log('Processing file:', file.originalname, 'at path:', file.path);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    console.log('File extension:', fileExtension);
    
    let extractedText = '';
    let cards = [];

    // Extract text based on file type
    switch (fileExtension) {
      case '.pdf':
        console.log('Processing PDF file');
        extractedText = await extractFromPDF(file.path);
        cards = await createCardsFromText(extractedText, file.originalname, file.path);
        break;
      case '.docx':
      case '.doc':
        console.log('Processing Word document');
        extractedText = await extractFromWord(file.path);
        cards = await createCardsFromText(extractedText, file.originalname, file.path);
        break;
      case '.xlsx':
      case '.xls':
        console.log('Processing Excel file');
        cards = await extractFromExcel(file.path, file.originalname);
        break;
      case '.txt':
      case '.md':
        console.log('Processing text file');
        extractedText = await extractFromText(file.path);
        cards = await createCardsFromText(extractedText, file.originalname, file.path);
        break;
      case '.json':
        console.log('Processing JSON file');
        extractedText = await extractFromJSON(file.path);
        cards = await createCardsFromText(extractedText, file.originalname, file.path);
        break;
      case '.png':
      case '.jpg':
      case '.jpeg':
        console.log('Processing image file');
        extractedText = await extractFromImage(file.path, file.originalname);
        cards = await createCardsFromText(extractedText, file.originalname, file.path);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    console.log('Processing complete. Cards created:', cards.length);

    if (cards.length === 0) {
      throw new Error('No cards could be created from the file');
    }

    return cards;

  } catch (error) {
    console.error('Content processing error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Extract text from PDF file
 */
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from Word document
 */
async function extractFromWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Word document extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from Excel file and create cards from each row
 */
async function extractFromExcel(filePath, fileName = null) {
  try {
    console.log('Starting Excel file processing:', filePath);
    const workbook = XLSX.readFile(filePath);
    console.log('Excel workbook loaded, sheets:', workbook.SheetNames);
    const allCards = [];

    // Process each worksheet
    for (const sheetName of workbook.SheetNames) {
      console.log('Processing sheet:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log('Sheet data rows:', jsonData.length);

      if (jsonData.length === 0) {
        console.log('Skipping empty sheet:', sheetName);
        continue;
      }

      // Get the header row (first row) as schema
      const headerRow = jsonData[0];
      console.log('Header row:', headerRow);
      const schema = headerRow.map((header, index) => ({
        name: header || `Column_${index + 1}`,
        index: index
      }));

      console.log('Schema created:', schema);

      // Process each data row (starting from row 2)
      for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex];
        
        console.log(`Checking row ${rowIndex + 1}:`, row);
        
        if (row && row.length > 0) {
          console.log(`Processing row ${rowIndex + 1}:`, row);
          // Create card from row data using the schema
          const card = await createCardFromExcelRowWithSchema(row, rowIndex + 1, sheetName, schema, filePath);
          if (card) {
            allCards.push(card);
            console.log(`Card created for row ${rowIndex + 1}:`, card.title);
          } else {
            console.log(`No card created for row ${rowIndex + 1} (empty content)`);
          }
        } else {
          console.log(`Row ${rowIndex + 1} is empty or null, skipping`);
        }
      }
    }

    console.log('Excel processing complete. Total cards created:', allCards.length);
    return allCards;
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Excel file extraction failed: ${error.message}`);
  }
}

/**
 * Create a card from an Excel row using the original schema
 */
async function createCardFromExcelRowWithSchema(rowData, rowNumber, sheetName, schema, filePath = null) {
  try {
    console.log(`Creating card for row ${rowNumber}, data:`, rowData);
    
    // Create structured content based on schema
    const structuredContent = {};
    let column2Content = '';

    // Map row data to schema columns
    for (let i = 0; i < schema.length; i++) {
      const columnName = schema[i].name;
      const cellValue = rowData[i] || '';
      
      // Store in structured format
      structuredContent[columnName] = cellValue;
      
      // Get column 2 content (index 1) for direct display
      if (i === 1) {
        column2Content = cellValue.toString().trim();
      }
    }

    // If column 2 is empty, try to find content in other columns
    if (!column2Content) {
      for (let i = 0; i < rowData.length; i++) {
        const cellValue = rowData[i];
        if (cellValue && cellValue.toString().trim() !== '') {
          column2Content = cellValue.toString().trim();
          console.log(`Found content in column ${i + 1}:`, column2Content);
          break;
        }
      }
    }

    // Truncate content if it's too long (keep it under 9500 chars to be safe)
    if (column2Content && column2Content.length > 9500) {
      console.log(`Content too long (${column2Content.length} chars), truncating to 9500 chars`);
      column2Content = column2Content.substring(0, 9500) + '... [Content truncated]';
    }

    console.log('Structured content:', structuredContent);
    console.log('Column 2 content:', column2Content);

    // Skip rows with no meaningful content
    const hasContent = Object.values(structuredContent).some(val => val && val.toString().trim() !== '');
    if (!hasContent) {
      console.log(`Row ${rowNumber} has no meaningful content, skipping`);
      return null;
    }

    // Validate that we have meaningful content (not just empty or "No content")
    if (!hasMeaningfulContent(column2Content, 10)) {
      console.log(`Row ${rowNumber} has no meaningful content, skipping`);
      return null;
    }

    // Generate title from the first non-empty cell or use row number
    let title = '';
    for (let i = 0; i < rowData.length; i++) {
      if (rowData[i] && rowData[i].toString().trim().length > 0) {
        const cellValue = rowData[i].toString().trim();
        // If the cell value is short enough, use it directly as title
        if (cellValue.length < 100) {
          title = cellValue;
        } else {
          title = generateTitle(cellValue, 'concept');
        }
        console.log(`Generated title from column ${i + 1}:`, title);
        break;
      }
    }
    if (!title) {
      title = `${sheetName} - Row ${rowNumber}`;
      console.log(`Using default title:`, title);
    }

    console.log('Generated title:', title);

    // Create tags from schema column names and non-empty values
    const tags = [];
    schema.forEach(column => {
      if (column.name && column.name !== `Column_${column.index + 1}`) {
        tags.push(column.name.toLowerCase().replace(/\s+/g, '-'));
      }
    });

    // Add sheet name and row number as tags
    tags.push(sheetName.toLowerCase(), `row-${rowNumber}`);

    // Create snippet from row data
    const rowDataString = JSON.stringify(structuredContent).substring(0, 500);
    const snippet = rowDataString + (JSON.stringify(structuredContent).length > 500 ? '...' : '');
    
    // Location information (cell range)
    const cellRange = `${sheetName}!Row ${rowNumber}`;
    
    const card = {
      title: title,
      content: column2Content, // Store only column 2 value directly
      type: 'concept', // Default type for Excel data
      category: 'Data', // Default category for structured data
      tags: tags.slice(0, 10), // Limit to 10 tags
      source: `Excel: ${sheetName}`,
      metadata: {
        excelRow: rowNumber,
        excelSheet: sheetName,
        excelColumns: schema.length,
        schema: schema.map(col => col.name),
        structuredData: structuredContent
      },
      provenance: {
        location: cellRange,
        snippet: snippet
      }
    };

    console.log('Card created successfully:', card);
    return card;
    
  } catch (error) {
    console.error('Error creating card from Excel row:', error);
    return null;
  }
}

/**
 * Extract text from plain text file
 */
async function extractFromText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Text file extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from JSON file
 */
async function extractFromJSON(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Convert JSON to readable text format
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`JSON file extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from image file
 */
async function extractFromImage(filePath, fileName) {
  try {
    // For images, we can't extract text content directly
    // Instead, we'll create a descriptive card based on the filename and image properties
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Create a descriptive text based on the image
    const imageName = path.basename(fileName, path.extname(fileName));
    const imageType = path.extname(fileName).toUpperCase().substring(1);
    
    return `Image: ${imageName}
File Type: ${imageType}
File Size: ${(fileSize / 1024).toFixed(2)} KB
Description: This is an image file that may contain visual information, charts, diagrams, or other visual content that could be relevant for learning and reference purposes.`;
  } catch (error) {
    throw new Error(`Image file processing failed: ${error.message}`);
  }
}

/**
 * Create cards from extracted text
 */
async function createCardsFromText(text, sourceFileName, filePath = null) {
  const cards = [];
  
  // Split text into sections (paragraphs, sections, etc.)
  const sections = splitTextIntoSections(text);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.trim().length < 10) continue; // Skip very short sections
    
    const card = await createCardFromSection(section, sourceFileName, filePath, i + 1, sections.length);
    if (card) {
      cards.push(card);
    }
  }
  
  return cards;
}

/**
 * Split text into meaningful sections
 */
function splitTextIntoSections(text) {
  // Split by double newlines, headers, or bullet points
  const sections = text.split(/\n\s*\n|\r\n\s*\r\n/);
  
  // Further split long sections
  const processedSections = [];
  for (const section of sections) {
    if (section.length > 500) {
      // Split long sections by sentences or bullet points
      const subSections = section.split(/(?<=[.!?])\s+/);
      processedSections.push(...subSections);
    } else {
      processedSections.push(section);
    }
  }
  
  return processedSections.filter(section => section.trim().length > 0);
}

/**
 * Create a card from a text section
 */
async function createCardFromSection(section, sourceFileName, filePath = null, sectionIndex = 1, totalSections = 1) {
  try {
    // Clean the text
    const cleanText = section.trim().replace(/\s+/g, ' ');
    
    // Validate content is meaningful
    if (!hasMeaningfulContent(cleanText, 10)) {
      console.log(`Section ${sectionIndex} has no meaningful content, skipping`);
      return null;
    }
    
    // Determine card type based on content
    const cardType = determineCardType(cleanText);
    
    // Generate title from content
    const title = generateTitle(cleanText, cardType);
    
    // Determine category based on content
    const category = determineCategory(cleanText);
    
    // Extract tags
    const tags = extractTags(cleanText);
    
    // Create snippet (first 500 chars of original section)
    const snippet = section.trim().substring(0, 500) + (section.trim().length > 500 ? '...' : '');
    
    // Location information (paragraph/section range)
    const location = `Paragraph ${sectionIndex} of ${totalSections}`;
    
    return {
      title: title || 'Untitled Card',
      content: cleanText,
      type: cardType,
      category: category,
      tags: tags,
      source: sourceFileName,
      provenance: {
        location: location,
        snippet: snippet
      }
    };
    
  } catch (error) {
    console.error('Error creating card from section:', error);
    return null;
  }
}

/**
 * Determine card type based on content analysis
 */
function determineCardType(text) {
  const lowerText = text.toLowerCase();
  const words = tokenizer.tokenize(lowerText);
  
  // Count keyword matches for each card type
  const typeScores = {};
  
  for (const [type, keywords] of Object.entries(CARD_TYPE_KEYWORDS)) {
    typeScores[type] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        typeScores[type]++;
      }
    }
  }
  
  // Check for specific patterns
  if (text.match(/^\s*[-•*]\s+/m)) {
    typeScores.checklist += 2;
  }
  
  if (text.match(/["""].*["""]/)) {
    typeScores.quote += 3;
  }
  
  if (text.match(/\b(step|process|procedure)\b/i)) {
    typeScores.action += 2;
  }
  
  // Return the type with highest score, default to concept
  const maxScore = Math.max(...Object.values(typeScores));
  if (maxScore === 0) return 'concept';
  
  for (const [type, score] of Object.entries(typeScores)) {
    if (score === maxScore) return type;
  }
  
  return 'concept';
}

/**
 * Generate a title from content
 */
function generateTitle(text, cardType) {
  // Try to find a good title from the first sentence or line
  const lines = text.split('\n');
  const firstLine = lines[0].trim();
  
  if (firstLine.length > 0 && firstLine.length < 100) {
    // Clean up the title
    let title = firstLine.replace(/^[-•*]\s*/, ''); // Remove bullet points
    title = title.replace(/^["""]\s*/, '').replace(/\s*["""]$/, ''); // Remove quotes
    
    if (title.length > 0 && title.length < 100) {
      return title;
    }
  }
  
  // Generate a title based on card type and content
  const words = tokenizer.tokenize(text.toLowerCase());
  const importantWords = words.filter(word => 
    word.length > 3 && 
    !['the', 'and', 'for', 'with', 'this', 'that', 'have', 'will', 'from'].includes(word)
  );
  
  if (importantWords.length > 0) {
    const titleWords = importantWords.slice(0, 3);
    return titleWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
  
  return `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card`;
}

/**
 * Determine category based on content with improved analysis
 */
function determineCategory(text) {
  const lowerText = text.toLowerCase();
  const words = tokenizer.tokenize(lowerText);
  
  // Calculate category scores based on keyword matches
  const categoryScores = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categoryScores[category] = 0;
    
    for (const keyword of keywords) {
      // Check for exact matches and partial matches
      if (lowerText.includes(keyword.toLowerCase())) {
        categoryScores[category]++;
        
        // Bonus points for multiple occurrences
        const regex = new RegExp(keyword.toLowerCase(), 'g');
        const matches = lowerText.match(regex);
        if (matches && matches.length > 1) {
          categoryScores[category] += matches.length - 1;
        }
      }
    }
  }
  
  // Find the category with the highest score
  const maxScore = Math.max(...Object.values(categoryScores));
  
  if (maxScore === 0) {
    // If no clear category, try to infer from context
    return inferCategoryFromContext(text);
  }
  
  // Return the category with the highest score
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score === maxScore) {
      return category;
    }
  }
  
  return 'General';
}

/**
 * Infer category from context when no clear keywords are found
 */
function inferCategoryFromContext(text) {
  const lowerText = text.toLowerCase();
  
  // Check for specific patterns and contexts
  if (lowerText.includes('$') || lowerText.includes('dollar') || lowerText.includes('cost') || lowerText.includes('budget')) {
    return 'Financial Management';
  }
  
  if (lowerText.includes('meeting') || lowerText.includes('presentation') || lowerText.includes('speak')) {
    return 'Communication';
  }
  
  if (lowerText.includes('goal') || lowerText.includes('objective') || lowerText.includes('target')) {
    return 'Strategic Planning';
  }
  
  if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('challenge')) {
    return 'Problem Solving';
  }
  
  if (lowerText.includes('learn') || lowerText.includes('study') || lowerText.includes('research')) {
    return 'Learning & Development';
  }
  
  if (lowerText.includes('customer') || lowerText.includes('client') || lowerText.includes('user')) {
    return 'Customer Service';
  }
  
  if (lowerText.includes('employee') || lowerText.includes('staff') || lowerText.includes('hire')) {
    return 'Human Resources';
  }
  
  if (lowerText.includes('sale') || lowerText.includes('deal') || lowerText.includes('revenue')) {
    return 'Sales';
  }
  
  if (lowerText.includes('market') || lowerText.includes('brand') || lowerText.includes('promotion')) {
    return 'Marketing';
  }
  
  if (lowerText.includes('system') || lowerText.includes('process') || lowerText.includes('workflow')) {
    return 'Operations';
  }
  
  if (lowerText.includes('technology') || lowerText.includes('digital') || lowerText.includes('software')) {
    return 'Technology';
  }
  
  return 'General';
}

/**
 * Extract relevant tags from content
 */
function extractTags(text) {
  const lowerText = text.toLowerCase();
  const words = tokenizer.tokenize(lowerText);
  const tags = new Set();
  
  // Add category keywords as tags
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        tags.add(keyword.toLowerCase());
      }
    }
  }
  
  // Add other relevant words as tags
  const relevantWords = words.filter(word => 
    word.length > 4 && 
    !['about', 'their', 'there', 'these', 'those', 'which', 'where', 'would', 'could', 'should'].includes(word)
  );
  
  // Add up to 5 most relevant words as tags
  const uniqueWords = [...new Set(relevantWords)];
  for (let i = 0; i < Math.min(5, uniqueWords.length); i++) {
    tags.add(uniqueWords[i]);
  }
  
  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

module.exports = {
  processContent,
  createCardsFromText,
  createCardFromSection,
  determineCardType,
  generateTitle,
  determineCategory,
  extractTags
};
