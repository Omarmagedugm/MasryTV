import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Multer setup for memory storage
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Cloudinary Initialization
  const initCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary credentials missing. Uploads will fail.');
      return false;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  };

  initCloudinary();

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Gemini AI Jersey Try-On Endpoint (server-side to keep API key secure)
  app.post('/api/ai/jersey-tryon', async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'AI service not configured' });
      }

      const { userImageBase64, jerseyImageBase64, logoImageBase64, backgroundPrompt } = req.body;
      if (!userImageBase64 || !jerseyImageBase64) {
        return res.status(400).json({ error: 'Missing required images' });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const aiParts: any[] = [
        { text: 'Customer Image (Identity to preserve):' },
        { inlineData: { data: userImageBase64, mimeType: 'image/jpeg' } },
        { text: 'Target Jersey to Wear:' },
        { inlineData: { data: jerseyImageBase64, mimeType: 'image/jpeg' } },
      ];

      if (logoImageBase64) {
        aiParts.push({ text: 'Official Club Logo (Brand Reference):' });
        aiParts.push({ inlineData: { data: logoImageBase64, mimeType: 'image/jpeg' } });
      }

      aiParts.push({ text: backgroundPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: { parts: aiParts },
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      let generatedImageBase64 = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if ((part as any).inlineData?.data) {
            generatedImageBase64 = (part as any).inlineData.data;
            break;
          }
        }
      }

      if (!generatedImageBase64) {
        const textResponse = response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '';
        return res.status(422).json({ error: textResponse || 'No image generated' });
      }

      res.json({ imageBase64: generatedImageBase64 });
    } catch (error: any) {
      console.error('Gemini API error:', error?.message || error);
      const status = error?.message?.includes('429') ? 429 : 500;
      res.status(status).json({ error: error?.message || 'AI processing failed' });
    }
  });

  // Cloudinary Upload Endpoint
  app.post('/api/upload', upload.single('image'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }

      const uploadPreset = process.env.UPLOAD_PRESET || 'jerseys';
      
      // Upload to Cloudinary using buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            upload_preset: uploadPreset,
            folder: 'ittehad-ai'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      res.json(result);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
