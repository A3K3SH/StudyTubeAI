import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin (for free tier limit tracking)
let db = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
  }
} catch (error) {
  console.warn('Firebase Admin not configured. Note limits will not be enforced.');
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyTube Backend is running' });
});

// Generate notes endpoint
app.post('/api/generate-notes', async (req, res) => {
  try {
    const { url, content, userId } = req.body;

    if (!url && !content) {
      return res.status(400).json({ error: 'YouTube URL or content is required' });
    }

    // Check daily note limit for free users
    if (userId && db) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const userTier = userData.tier || 'free';
      
      // Only apply limits to free tier users
      if (userTier === 'free') {
        const lastReset = userData.lastResetAt ? userData.lastResetAt.toDate() : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let notesGeneratedToday = 0;
        
        // Reset counter if it's a new day
        if (!lastReset || new Date(lastReset).setHours(0, 0, 0, 0) < today.getTime()) {
          notesGeneratedToday = 0;
        } else {
          notesGeneratedToday = userData.notesGeneratedToday || 0;
        }

        if (notesGeneratedToday >= 1) {
          return res.status(403).json({
            error: 'Daily limit reached. Free users can generate 1 note per day. Upgrade to Pro for unlimited notes.',
            notesRemaining: 0,
            limit: 1,
            tier: 'free'
          });
        }

        res.set('X-Notes-Remaining', (1 - notesGeneratedToday).toString());
        res.set('X-User-Tier', 'free');
      } else {
        res.set('X-Notes-Remaining', 'unlimited');
        res.set('X-User-Tier', userTier);
      }
    }

    // For MVP, we'll use provided content or generate sample content
    let textContent = content;

    if (url && !content) {
      // Extract video ID from URL (simple validation)
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (!videoIdMatch) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }
      const videoId = videoIdMatch[1];
      // For MVP, use sample content
      textContent = `[Sample Content for Video: ${videoId}]
This is sample educational content for demonstration. In production, this would be the actual YouTube transcript.
Key Topics: This demonstrates how the StudyTube AI system generates comprehensive study notes from video content.
The system processes educational videos and creates structured study materials to help students learn effectively.`;
    }

    const notes = await generateStudyNotes(textContent);

    // Increment user's daily notes count
    if (userId && db) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const lastReset = userData.lastResetAt ? userData.lastResetAt.toDate() : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let notesGeneratedToday = 0;
      
      // Reset counter if it's a new day
      if (!lastReset || new Date(lastReset).setHours(0, 0, 0, 0) < today.getTime()) {
        notesGeneratedToday = 1;
      } else {
        notesGeneratedToday = (userData.notesGeneratedToday || 0) + 1;
      }
      
      await userRef.set(
        {
          notesGeneratedToday: notesGeneratedToday,
          lastResetAt: new Date(),
          email: userData.email || null,
          tier: userData.tier || 'free'
        },
        { merge: true }
      );
    }

    res.json({ notes });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate notes'
    });
  }
});

// Generate study notes using Google Gemini
async function generateStudyNotes(context) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse study notes response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ StudyTube Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/generate-notes`);
});
