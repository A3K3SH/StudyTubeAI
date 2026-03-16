import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Generate study notes using Google Gemini
async function generateStudyNotes(context: string): Promise<any> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `You are an expert study notes generator. Create comprehensive study notes based on this content:

Content:
${context}

Provide the study notes in this JSON format:
{
  "title": "Topic title",
  "summary": "Brief overview (2-3 sentences)",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed content"
    }
  ],
  "keyTerms": ["term1: definition", "term2: definition"],
  "quizQuestions": [
    {
      "question": "Question?",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}

Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse study notes response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cloud Function
export const generateNotes = functions.https.onRequest((req: any, res: any) => {
  corsHandler(req, res, async () => {
    try {
      // Validate request
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { url, content } = req.body;
      
      // Accept either URL or direct content for testing
      if (!url && !content) {
        res.status(400).json({ error: 'YouTube URL or content is required' });
        return;
      }

      let textContent = content;

      if (url) {
        // Extract video ID
        const videoId = extractVideoId(url);
        if (!videoId) {
          res.status(400).json({ error: 'Invalid YouTube URL' });
          return;
        }
        
        // For MVP, we'll use a sample transcript
        // In production, integrate with YouTube Transcript API
        textContent = `[Sample Content for Video ${videoId}]
This is sample content for demonstration. In production, this would be the actual YouTube transcript.
The Cloud Function is working correctly and ready to process real video transcripts.`;
      }

      // Generate notes
      functions.logger.info('Generating study notes using Gemini...');
      const notes = await generateStudyNotes(textContent);

      res.status(200).json({ notes });
    } catch (error) {
      functions.logger.error('Error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate notes'
      });
    }
  });
});
