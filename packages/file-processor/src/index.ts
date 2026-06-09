/**
 * OPEN MIND AI - File Processor
 * 
 * Process various file types: PDF, documents, images, and more.
 * Extract text content for AI processing.
 */

import type { Readable } from 'stream';

export interface ProcessedFile {
  type: string;
  content: string;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
    pages?: number;
    wordCount?: number;
    extractedAt: number;
  };
}

export interface ImageAnalysis {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  description?: string;
}

// PDF Processor
export async function processPDF(data: Buffer | ArrayBuffer): Promise<ProcessedFile> {
  try {
    // Dynamic import for pdf-parse
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
    const pdfData = await pdfParse(buffer);
    
    const content = pdfData.text
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return {
      type: 'pdf',
      content,
      metadata: {
        filename: 'document.pdf',
        size: buffer.length,
        mimeType: 'application/pdf',
        pages: pdfData.numpages,
        wordCount: content.split(/\s+/).length,
        extractedAt: Date.now(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Word Document Processor
export async function processDocx(data: Buffer | ArrayBuffer): Promise<ProcessedFile> {
  try {
    const mammoth = await import('mammoth');
    const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
    const result = await mammoth.extractRawText({ buffer });
    
    const content = result.value
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return {
      type: 'docx',
      content,
      metadata: {
        filename: 'document.docx',
        size: buffer.length,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        wordCount: content.split(/\s+/).length,
        extractedAt: Date.now(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to process DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Text File Processor
export async function processText(data: Buffer | ArrayBuffer, filename = 'text.txt'): Promise<ProcessedFile> {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  const content = buffer.toString('utf-8')
    .replace(/\r\n/g, '\n')
    .trim();
  
  return {
    type: 'text',
    content,
    metadata: {
      filename,
      size: buffer.length,
      mimeType: 'text/plain',
      wordCount: content.split(/\s+/).filter(Boolean).length,
      extractedAt: Date.now(),
    },
  };
}

// Markdown Processor
export async function processMarkdown(data: Buffer | ArrayBuffer, filename = 'document.md'): Promise<ProcessedFile> {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  const content = buffer.toString('utf-8')
    .replace(/\r\n/g, '\n')
    .trim();
  
  return {
    type: 'markdown',
    content,
    metadata: {
      filename,
      size: buffer.length,
      mimeType: 'text/markdown',
      wordCount: content.split(/\s+/).filter(Boolean).length,
      extractedAt: Date.now(),
    },
  };
}

// Image Processor with Sharp
export async function processImage(data: Buffer | ArrayBuffer): Promise<ProcessedFile & { analysis?: ImageAnalysis }> {
  try {
    const sharp = (await import('sharp')).default;
    const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
    
    const metadata = await sharp(buffer).metadata();
    const description = await this.describeImage(buffer);
    
    const analysis: ImageAnalysis = {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      hasAlpha: metadata.hasAlpha || false,
      description,
    };
    
    // Also extract any EXIF text data
    let extractedText = '';
    try {
      const exif = await sharp(buffer).toBuffer();
      // Basic text extraction from image is limited
      extractedText = `[Image: ${metadata.width}x${metadata.height} ${metadata.format}]`;
    } catch {
      extractedText = `[Image: ${metadata.width}x${metadata.height} ${metadata.format}]`;
    }
    
    return {
      type: 'image',
      content: extractedText,
      metadata: {
        filename: 'image',
        size: buffer.length,
        mimeType: metadata.format ? `image/${metadata.format}` : 'image/unknown',
        extractedAt: Date.now(),
      },
      analysis,
    };
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Simple image description (placeholder - would need vision model for real description)
async function describeImage(_data: Buffer): Promise<string> {
  return 'Image processed. Use vision model for detailed description.';
}

// HTML Processor
export async function processHTML(data: Buffer | ArrayBuffer, filename = 'document.html'): Promise<ProcessedFile> {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  let content = buffer.toString('utf-8');
  
  // Remove script and style tags
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML tags but keep text
  content = content.replace(/<[^>]+>/g, ' ');
  content = content.replace(/\s+/g, ' ').trim();
  
  return {
    type: 'html',
    content,
    metadata: {
      filename,
      size: buffer.length,
      mimeType: 'text/html',
      wordCount: content.split(/\s+/).filter(Boolean).length,
      extractedAt: Date.now(),
    },
  };
}

// JSON Processor
export async function processJSON(data: Buffer | ArrayBuffer, filename = 'data.json'): Promise<ProcessedFile> {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  const content = buffer.toString('utf-8');
  
  // Try to pretty-print if it's valid JSON
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    return {
      type: 'json',
      content: formatted,
      metadata: {
        filename,
        size: buffer.length,
        mimeType: 'application/json',
        extractedAt: Date.now(),
      },
    };
  } catch {
    return {
      type: 'json',
      content,
      metadata: {
        filename,
        size: buffer.length,
        mimeType: 'application/json',
        extractedAt: Date.now(),
      },
    };
  }
}

// CSV Processor
export async function processCSV(data: Buffer | ArrayBuffer, filename = 'data.csv'): Promise<ProcessedFile> {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  const content = buffer.toString('utf-8')
    .replace(/\r\n/g, '\n')
    .trim();
  
  // Parse CSV for word count
  const lines = content.split('\n');
  const wordCount = lines.reduce((count, line) => {
    return count + line.split(',').length;
  }, 0);
  
  return {
    type: 'csv',
    content,
    metadata: {
      filename,
      size: buffer.length,
      mimeType: 'text/csv',
      wordCount,
      extractedAt: Date.now(),
    },
  };
}

// Auto-detect and process based on file type
export async function processFile(
  data: Buffer | ArrayBuffer,
  mimeType?: string,
  filename?: string
): Promise<ProcessedFile> {
  // Detect mime type if not provided
  const detectedMimeType = mimeType || await detectMimeType(data);
  
  switch (detectedMimeType) {
    case 'application/pdf':
      return processPDF(data);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return processDocx(data);
    case 'text/plain':
      return processText(data, filename);
    case 'text/markdown':
      return processMarkdown(data, filename);
    case 'text/html':
      return processHTML(data, filename);
    case 'application/json':
      return processJSON(data, filename);
    case 'text/csv':
      return processCSV(data, filename);
    default:
      if (detectedMimeType.startsWith('image/')) {
        return processImage(data);
      }
      throw new Error(`Unsupported file type: ${detectedMimeType}`);
  }
}

// Detect MIME type from file content
async function detectMimeType(data: Buffer | ArrayBuffer): Promise<string> {
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  const bytes = buffer.slice(0, 8);
  
  // Check magic bytes
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }
  
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // Default to text
  return 'text/plain';
}

// Chunk large documents for processing
export function chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  
  let currentChunk: string[] = [];
  let currentLength = 0;
  
  for (const word of words) {
    currentChunk.push(word);
    currentLength += word.length + 1;
    
    if (currentLength >= chunkSize) {
      chunks.push(currentChunk.join(' '));
      
      // Keep overlap
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords;
      currentLength = overlapWords.join(' ').length;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  return chunks;
}

export default {
  processPDF,
  processDocx,
  processText,
  processMarkdown,
  processImage,
  processHTML,
  processJSON,
  processCSV,
  processFile,
  chunkText,
};