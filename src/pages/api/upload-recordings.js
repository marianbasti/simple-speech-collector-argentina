// pages/api/upload-recordings.js
import { promises as fs } from 'fs';
import path from 'path';
import formidable from 'formidable';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB max file size
    });

    // Parse the form data
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Create necessary directories
    const datasetDir = path.join(process.cwd(), 'public', 'dataset');
    const wavsDir = path.join(datasetDir, 'wavs');
    await fs.mkdir(datasetDir, { recursive: true });
    await fs.mkdir(wavsDir, { recursive: true });

    // Process audio files
    const audioFiles = Array.isArray(files.audio_files) ? files.audio_files : [files.audio_files];
    for (const file of audioFiles) {
      if (!file) continue;
      const wavPath = path.join(wavsDir, file.originalFilename);
      await fs.copyFile(file.filepath, wavPath);
    }

    // Save metadata
    const metadataPath = path.join(datasetDir, 'metadata.txt');
    const metadata = files.metadata[0];  // Get the first metadata file
    if (metadata) {
      let metadataContent = await fs.readFile(metadata.filepath, 'utf8');
      // Remove .wav extension from filenames in metadata content
      metadataContent = metadataContent.replace(/\.wav/g, '');
      
      // Parse demographics JSON
      const demographics = JSON.parse(fields.demographics);
      
      // Add demographic data to each line
      const metadataLines = metadataContent.split('\n').filter(line => line.trim());
      const enhancedMetadata = metadataLines.map(line => 
        `${line}|${demographics.gender}|${demographics.ageGroup}|${demographics.region}`
      ).join('\n');
      
      await fs.appendFile(metadataPath, enhancedMetadata + '\n', 'utf8');
    }

    // Clean up temporary files
    await Promise.all([
      ...audioFiles.filter(file => file).map(file => fs.unlink(file.filepath)),
    ]);
    res.status(200).json({ message: 'Upload successful' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}