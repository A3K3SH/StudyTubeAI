import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';

if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHandler = cors({ origin: true });

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      return parsedUrl.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }

      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
        return pathParts[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function isValidYouTubeVideoId(videoId: string | null): videoId is string {
  return typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

function getSharedSecretHeader(req: functions.https.Request): string {
  const headerValue = req.get('x-studytube-shared-secret');
  return typeof headerValue === 'string' ? headerValue.trim() : '';
}

function verifySharedSecret(req: functions.https.Request): boolean {
  const configuredSecret = (process.env.FIREBASE_NOTES_SHARED_SECRET || '').trim();
  if (!configuredSecret) {
    return true;
  }

  return getSharedSecretHeader(req) === configuredSecret;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  const transcriptCandidates = [
    () => YoutubeTranscript.fetchTranscript(videoId),
    () => YoutubeTranscript.fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`),
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }),
  ];

  let lastError: unknown = null;

  for (const candidate of transcriptCandidates) {
    try {
      const transcriptItems = await candidate();
      if (Array.isArray(transcriptItems) && transcriptItems.length > 0) {
        return transcriptItems
          .map((item: { text?: string }) => item.text)
          .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
          .join(' ')
          .trim();
      }
    } catch (error) {
      lastError = error;
    }
  }

  const transcriptError = lastError instanceof Error ? lastError.message : '';

  if (transcriptError.includes('Impossible to retrieve Youtube video ID')) {
    throw new Error('Invalid YouTube URL. Please use a full video URL.');
  }
  if (transcriptError.includes('Transcript is disabled on this video')) {
    throw new Error('Transcript is disabled for this video. Try another video with captions enabled.');
  }
  if (transcriptError.includes('YouTube is receiving too many requests')) {
    throw new Error('YouTube temporarily blocked transcript requests from this IP. Please try again later.');
  }
  if (transcriptError.includes('No transcripts are available')) {
    throw new Error('No transcript available for this video.');
  }

  throw new Error('Could not fetch transcript for this video. Try another video with captions.');
}

async function generateStudyNotes(context: string): Promise<Record<string, unknown>> {
  const googleApiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!googleApiKey && !groqApiKey) {
    throw new Error('No supported AI API key is configured');
  }

  const prompt = `You are an expert study notes generator. Create comprehensive study notes based on this content:

Content:
${context}

Provide the study notes in this JSON format ONLY (no other text):
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
    let responseText = '';

    if (googleApiKey) {
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } else {
      const client = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqApiKey,
      });

      const completion = await client.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      });

      responseText = completion.choices[0]?.message?.content ?? '';
    }

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse study notes response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getFunctionErrorStatus(message: string): number {
  if (
    message.includes('Invalid YouTube URL') ||
    message.includes('YouTube URL or content is required')
  ) {
    return 400;
  }

  if (
    message.includes('Transcript is disabled') ||
    message.includes('No transcript available') ||
    message.includes('Could not fetch transcript') ||
    message.includes('temporarily blocked transcript requests')
  ) {
    return 422;
  }

  return 500;
}

export const generateNotes = functions
  .runWith({ secrets: ['GROQ_API_KEY'] })
  .https.onRequest((req: any, res: any) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      if (!verifySharedSecret(req)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { url, content } = req.body;

      if (!url && !content) {
        res.status(400).json({ error: 'YouTube URL or content is required' });
        return;
      }

      let textContent = typeof content === 'string' ? content.trim() : '';

      if (url && !textContent) {
        const videoId = extractYouTubeVideoId(url);
        if (!isValidYouTubeVideoId(videoId)) {
          res.status(400).json({ error: 'Invalid YouTube URL' });
          return;
        }

        textContent = await fetchYouTubeTranscript(videoId);
      }

      if (!textContent) {
        res.status(400).json({ error: 'Transcript content could not be prepared.' });
        return;
      }

      functions.logger.info('Generating study notes in Firebase Function');
      const notes = await generateStudyNotes(textContent);

      res.status(200).json({ notes });
    } catch (error) {
      functions.logger.error('Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate notes';
      const status = getFunctionErrorStatus(message);
      res.status(status).json({ 
        error: message,
        status,
      });
    }
  });
});
