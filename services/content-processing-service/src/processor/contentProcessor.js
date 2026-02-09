const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const XLSX = require('xlsx');
const { getRules } = require('../services/rulesService');

// Initialize tokenizer for text analysis
const tokenizer = new natural.WordTokenizer();

/**
 * Validate that card content is meaningful (not empty, not just whitespace, not placeholder text, not just dates)
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
  
  // Check if it's just a date (common date patterns)
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // MM/DD/YYYY or M/D/YY
    /^\d{4}-\d{2}-\d{2}$/,          // YYYY-MM-DD
    /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/,  // Dec 22, 2025
    /^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}$/,   // Dec 22 2025
    /^\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}$/,  // 22 Dec 2025
    /^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}$/,    // December 22, 2025
    /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,         // DD.MM.YYYY
  ];
  
  if (datePatterns.some(pattern => pattern.test(trimmed))) {
    return false;
  }
  
  // Check if it's just a time (HH:MM or HH:MM:SS)
  if (/^\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM|am|pm))?$/.test(trimmed)) {
    return false;
  }
  
  // Check if it's just numbers or mostly numbers
  const numbersOnly = trimmed.replace(/[\s\.,\-]/g, '');
  if (numbersOnly.length > trimmed.length * 0.7 && /^\d+$/.test(numbersOnly)) {
    return false;
  }
  
  // Check if it's just a single word or very short phrase (less than 3 words with meaningful content)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 2 && trimmed.length < 20) {
    // Allow if it's a meaningful phrase, but reject if it's just a date/time/number
    const isDateOrTime = datePatterns.some(pattern => pattern.test(trimmed)) || 
                        /^\d{1,2}:\d{2}/.test(trimmed);
    if (isDateOrTime) {
      return false;
    }
  }
  
  return true;
}

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
 * Extract raw text from file for AI processing (no card creation)
 * Returns text representation of file content.
 */
async function extractTextOnly(file) {
  const fileExtension = path.extname(file.originalname || '').toLowerCase();
  switch (fileExtension) {
    case '.pdf':
      return await extractFromPDF(file.path);
    case '.docx':
    case '.doc':
      return await extractFromWord(file.path);
    case '.xlsx':
    case '.xls':
      return await extractExcelAsText(file.path);
    case '.txt':
    case '.md':
      return extractFromText(file.path);
    case '.json':
      return extractFromJSON(file.path);
    case '.png':
    case '.jpg':
    case '.jpeg':
      return await extractFromImage(file.path, file.originalname);
    default:
      throw new Error(`Unsupported file type for AI: ${fileExtension}`);
  }
}

/**
 * Extract Excel file as readable text (row per line, columns as Header: value)
 */
async function extractExcelAsText(filePath) {
  const workbook = XLSX.readFile(filePath);
  const lines = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length === 0) continue;
    const headerRow = jsonData[0] || [];
    const schema = headerRow.map((h, i) => h && String(h).trim() ? String(h).trim() : `Column_${i + 1}`);
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      const parts = schema.map((col, j) => `${col}: ${row[j] != null ? String(row[j]).trim() : ''}`).filter((p) => p.endsWith(': ') === false);
      if (parts.some((p) => p.split(': ')[1])) {
        lines.push(parts.join(' | '));
      }
    }
  }
  return lines.join('\n\n');
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

      // Process each data row (starting from row 2, skipping header row 0)
      for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex];

        if (row && row.length > 0) {
          const card = await createCardFromExcelRowWithSchema(
            row,
            rowIndex + 1,
            sheetName,
            schema,
            filePath,
            headerRow
          );
          if (card) {
            allCards.push(card);
          }
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
 * Check if a row looks like a header row (values match or closely match column names)
 */
function isExcelHeaderLikeRow(rowData, schema, headerRow) {
  if (!rowData || !schema) return false;
  const headerCells = headerRow ? headerRow.map((h) => String(h || '').trim().toLowerCase()) : [];
  let matchCount = 0;
  let nonEmptyCount = 0;
  for (let i = 0; i < Math.min(rowData.length, schema.length); i++) {
    const cellVal = String(rowData[i] || '').trim().toLowerCase();
    const colName = String(schema[i]?.name || '').trim().toLowerCase();
    const headerCell = headerCells[i] || '';
    if (cellVal) {
      nonEmptyCount++;
      if (colName && cellVal === colName) matchCount++;
      if (headerCell && cellVal === headerCell) matchCount++;
      if (colName && colName.length > 2 && cellVal.includes(colName)) matchCount += 0.5;
    }
  }
  if (nonEmptyCount === 0) return false;
  return matchCount >= Math.min(2, nonEmptyCount);
}

/**
 * Check if content looks like a column header (short, matches schema names)
 */
function looksLikeColumnHeader(value, schema) {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  if (v.length < 2 || v.length > 60) return false;
  for (const col of schema || []) {
    const name = String(col?.name || '').trim().toLowerCase();
    if (name && (v === name || v.replace(/[\s_-]/g, '') === name.replace(/[\s_-]/g, ''))) return true;
  }
  return false;
}

/**
 * Build meaningful content from an Excel row: "Label: Value" pairs
 */
function buildExcelRowContent(structuredContent, schema) {
  const parts = [];
  for (let i = 0; i < schema.length; i++) {
    const colName = schema[i]?.name;
    const val = structuredContent[colName];
    const str = val != null ? String(val).trim() : '';
    if (!str) continue;
    const isGenericCol = !colName || colName === `Column_${i + 1}`;
    if (isGenericCol) {
      parts.push(str);
    } else {
      parts.push(`${colName}: ${str}`);
    }
  }
  return parts.join('\n\n').trim();
}

/**
 * Validate that an Excel row is meaningful (not header-like, not just numbers, etc.)
 */
function isMeaningfulExcelRow(structuredContent, schema, primaryContent) {
  const values = Object.values(structuredContent || {}).filter((v) => v != null && String(v).trim() !== '');
  if (values.length === 0) return false;
  const nonEmptyRatio = values.length / Math.max(1, Object.keys(structuredContent || {}).length);
  if (nonEmptyRatio < 0.2) return false;
  if (!primaryContent || primaryContent.length < 10) return false;
  if (looksLikeColumnHeader(primaryContent, schema)) return false;
  if (!hasMeaningfulContent(primaryContent, 10)) return false;
  const numericOnly = values.filter((v) => /^[\d\s.,\-+%$]+$/.test(String(v).trim()));
  if (values.length <= 2 && numericOnly.length === values.length) return false;
  return true;
}

/**
 * Create a card from an Excel row using the original schema
 */
async function createCardFromExcelRowWithSchema(rowData, rowNumber, sheetName, schema, filePath = null, headerRow = null) {
  try {
    const structuredContent = {};
    for (let i = 0; i < schema.length; i++) {
      const columnName = schema[i].name;
      structuredContent[columnName] = rowData[i] != null ? rowData[i] : '';
    }

    if (isExcelHeaderLikeRow(rowData, schema, headerRow)) {
      return null;
    }

    const contentText = buildExcelRowContent(structuredContent, schema);

    if (!contentText) {
      return null;
    }

    const truncatedContent =
      contentText.length > 9500 ? contentText.substring(0, 9500) + '... [Content truncated]' : contentText;

    if (!isMeaningfulExcelRow(structuredContent, schema, contentText)) {
      return null;
    }

    let title = '';
    const firstCol = schema[0]?.name;
    const firstVal = structuredContent[firstCol];
    const firstStr = firstVal != null ? String(firstVal).trim() : '';
    if (firstStr && firstStr.length <= 120 && !looksLikeColumnHeader(firstStr, schema)) {
      title = firstStr;
    } else {
      const parts = [];
      for (let i = 0; i < Math.min(2, schema.length); i++) {
        const v = structuredContent[schema[i]?.name];
        if (v != null && String(v).trim()) {
          const s = String(v).trim();
          if (s.length <= 80 && !looksLikeColumnHeader(s, schema)) {
            parts.push(s);
            if (parts.length >= 2) break;
          }
        }
      }
      title = parts.length ? parts.join(' – ') : `${sheetName} – Row ${rowNumber}`;
    }

    const tags = [];
    schema.forEach((column) => {
      if (column.name && column.name !== `Column_${column.index + 1}`) {
        tags.push(column.name.toLowerCase().replace(/\s+/g, '-'));
      }
    });
    tags.push(sheetName.toLowerCase(), `row-${rowNumber}`);

    const rowDataString = JSON.stringify(structuredContent).substring(0, 500);
    const snippet = rowDataString + (JSON.stringify(structuredContent).length > 500 ? '...' : '');

    return {
      title: title || `${sheetName} – Row ${rowNumber}`,
      content: truncatedContent,
      type: 'concept',
      category: 'Data',
      tags: tags.slice(0, 10),
      source: `Excel: ${sheetName}`,
      metadata: {
        excelRow: rowNumber,
        excelSheet: sheetName,
        excelColumns: schema.length,
        schema: schema.map((col) => col.name),
        structuredData: structuredContent,
      },
      provenance: {
        location: `${sheetName}!Row ${rowNumber}`,
        snippet: snippet,
      },
    };
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
  const rules = await getRules();

  // Split text into sections (paragraphs, sections, etc.)
  const sections = splitTextIntoSections(text);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.trim().length < 10) continue; // Skip very short sections

    const card = await createCardFromSection(section, sourceFileName, filePath, i + 1, sections.length, rules);
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
async function createCardFromSection(section, sourceFileName, filePath = null, sectionIndex = 1, totalSections = 1, rulesParam = null) {
  try {
    const rules = rulesParam || await getRules();

    // Clean the text
    const cleanText = section.trim().replace(/\s+/g, ' ');

    // Validate content is meaningful
    if (!hasMeaningfulContent(cleanText, 10)) {
      console.log(`Section ${sectionIndex} has no meaningful content, skipping`);
      return null;
    }

    // Determine card type based on content
    const cardType = determineCardType(cleanText, rules);

    // Generate title from content
    const title = generateTitle(cleanText, cardType);

    // Determine category based on content
    const category = determineCategory(cleanText, rules);

    // Extract tags
    const tags = extractTags(cleanText, rules);
    
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
      generatedBy: 'rule-based',
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
function determineCardType(text, rules) {
  if (!rules?.cardTypeKeywords) return 'concept';
  const actionVerbsList = rules.actionVerbs || [];
  const lowerText = text.toLowerCase();
  const words = tokenizer.tokenize(lowerText);

  // Count keyword matches for each card type
  const typeScores = {};

  for (const [type, keywords] of Object.entries(rules.cardTypeKeywords)) {
    typeScores[type] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        typeScores[type]++;
      }
    }
  }
  
  // Check for specific patterns
  
  // Checklist patterns (bullet points, numbered lists)
  if (text.match(/^\s*[-•*]\s+/m)) {
    typeScores.checklist += 2;
  }
  
  // Quote patterns (quotation marks)
  if (text.match(/["""].*["""]/)) {
    typeScores.quote += 3;
  }
  
  // Action item patterns - check for common action item prefixes
  const actionItemPatterns = [
    /^(action|actions|action item|action items):\s*/i,
    /^(to do|todo|to-do):\s*/i,
    /^(task|tasks):\s*/i,
    /^(next step|next steps):\s*/i,
    /^(follow up|follow-up|followup):\s*/i,
    /^(deliverable|deliverables):\s*/i,
    /^(milestone|milestones):\s*/i,
    /^(assign|assignment|owner|responsible):\s*/i,
    /^(deadline|due date|timeline):\s*/i
  ];
  
  for (const pattern of actionItemPatterns) {
    if (text.match(pattern)) {
      typeScores.action += 3; // Strong indicator
    }
  }
  
  // Check for imperative verbs at the start of sentences/lines
  const lines = text.split(/\n|\./);
  let imperativeCount = 0;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) {
      const firstWord = trimmedLine.split(/\s+/)[0].toLowerCase();
      if (actionVerbsList.includes(firstWord)) {
        imperativeCount++;
      }
    }
  }
  if (imperativeCount > 0) {
    typeScores.action += Math.min(imperativeCount, 3); // Cap at 3 points
  }

  // Check for numbered action items (e.g., "1. Do this", "2. Do that")
  if (text.match(/^\s*\d+[\.\)]\s+[A-Z]/m)) {
    typeScores.action += 2;
  }

  // Check for action verbs in the text (not just at start)
  for (const verb of actionVerbsList) {
    const regex = new RegExp(`\\b${verb}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      typeScores.action += Math.min(matches.length, 2); // Cap at 2 points per verb type
    }
  }
  
  // Check for common action phrases
  const actionPhrases = [
    /\bneed to\b/i,
    /\bshould\b/i,
    /\bmust\b/i,
    /\bwill\b/i,
    /\bgoing to\b/i,
    /\bplan to\b/i,
    /\bintend to\b/i
  ];
  
  for (const phrase of actionPhrases) {
    if (text.match(phrase)) {
      typeScores.action += 1;
    }
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
function determineCategory(text, rules) {
  if (!rules?.categoryKeywords) return 'General';
  const lowerText = text.toLowerCase();
  const words = tokenizer.tokenize(lowerText);

  // Calculate category scores based on keyword matches
  const categoryScores = {};

  for (const [category, keywords] of Object.entries(rules.categoryKeywords)) {
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
function extractTags(text, rules) {
  if (!rules?.categoryKeywords) return [];
  const lowerText = text.toLowerCase();
  const words = tokenizer.tokenize(lowerText);
  const tags = new Set();

  // Add category keywords as tags
  for (const [category, keywords] of Object.entries(rules.categoryKeywords)) {
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
  extractTextOnly,
  createCardsFromText,
  createCardFromSection,
  determineCardType,
  generateTitle,
  determineCategory,
  extractTags,
};
