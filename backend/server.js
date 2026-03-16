import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { fetchTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const PLAN_PRICING = {
  pro: { amount: 29900, tier: 'pro', name: 'StudyTube Pro Monthly' },
  team: { amount: 99900, tier: 'team', name: 'StudyTube Team Monthly' },
};

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const ownerProEmails = new Set(
  (process.env.OWNER_PRO_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const supportEmail = process.env.SUPPORT_EMAIL || 'aakashswain18@gmail.com';

const razorpay =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      })
    : null;

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

app.post('/api/payments/create-order', async (req, res) => {
  try {
    if (!razorpay || !razorpayKeyId) {
      return res.status(500).json({ error: 'Razorpay is not configured on the server' });
    }

    const { plan } = req.body;
    const selectedPlan = PLAN_PRICING[String(plan || '').toLowerCase()];

    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const order = await razorpay.orders.create({
      amount: selectedPlan.amount,
      currency: 'INR',
      receipt: `st_${Date.now()}`,
      notes: {
        plan: String(plan).toLowerCase(),
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
      planName: selectedPlan.name,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  try {
    if (!razorpayKeySecret) {
      return res.status(500).json({ error: 'Razorpay is not configured on the server' });
    }

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      userId,
      plan,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const selectedPlan = PLAN_PRICING[String(plan || '').toLowerCase()];

    if (db && userId && selectedPlan) {
      const userRef = db.collection('users').doc(userId);
      
      // Get existing user data to preserve email
      const existingDoc = await userRef.get();
      const existingData = existingDoc.exists ? existingDoc.data() : {};
      
      await userRef.set(
        {
          tier: selectedPlan.tier,
          plan: String(plan).toLowerCase(),
          paymentStatus: 'paid',
          razorpayPaymentId: paymentId,
          email: existingData.email || null,
          updatedAt: new Date(),
          notesGeneratedToday: 0, // Reset counter on new plan
          lastResetAt: new Date(),
        },
        { merge: true }
      );
      console.log(`✅ Payment verified - User ${userId} upgraded to ${selectedPlan.tier} tier`);
    }

    return res.json({ success: true, tier: selectedPlan?.tier || null });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
});

function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/
  );
  return match?.[1] || null;
}

async function getYouTubeTranscriptText(videoId) {
  const transcriptItems = await fetchTranscript(videoId);
  const transcriptText = transcriptItems
    .map((item) => item?.text)
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!transcriptText) {
    throw new Error('Transcript is empty for this video');
  }

  // Keep prompt payload bounded for model stability and cost.
  return transcriptText.slice(0, 14000);
}

// Generate notes endpoint
app.post('/api/generate-notes', async (req, res) => {
  try {
    const { url, content, userId } = req.body;
    let effectiveTier = 'free';

    if (!url && !content) {
      return res.status(400).json({ error: 'YouTube URL or content is required' });
    }

    // Check daily note limit for free users
    if (userId && db) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() : {};
      let userEmail = (userData.email || '').toLowerCase();

      if (!userEmail) {
        try {
          const authUser = await getAuth().getUser(userId);
          userEmail = (authUser.email || '').toLowerCase();
        } catch (authError) {
          console.warn('Unable to resolve user email from Firebase Auth:', authError.message);
        }
      }

      const hasPermanentProAccess = !!userEmail && ownerProEmails.has(userEmail);
      effectiveTier = hasPermanentProAccess ? 'pro' : userData.tier || 'free';

      if (hasPermanentProAccess && userData.tier !== 'pro') {
        await userRef.set(
          {
            email: userEmail,
            tier: 'pro',
            plan: 'owner-pro',
            paymentStatus: 'owner-granted',
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
      
      // Apply limits based on tier
      if (effectiveTier === 'free') {
        // Free tier: 1 note per day
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
      } else if (effectiveTier === 'pro' || effectiveTier === 'team') {
        // Pro & Team: Unlimited
        res.set('X-Notes-Remaining', 'unlimited');
        res.set('X-User-Tier', effectiveTier);
      } else {
        // Unknown tier: Treat as free
        res.set('X-Notes-Remaining', 'unlimited');
        res.set('X-User-Tier', 'free');
      }
    }

    // Use provided content or fetch transcript from YouTube URL.
    let textContent = content;

    if (url && !content) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }

      try {
        textContent = await getYouTubeTranscriptText(videoId);
      } catch (transcriptError) {
        console.error('Transcript fetch error:', transcriptError);
        return res.status(422).json({
          error:
            'Could not fetch transcript for this video. Ensure captions are available, or paste content manually.',
        });
      }
    }

    const notes = await generateStudyNotes(textContent);

    // Increment user's daily notes count
    if (userId && db && effectiveTier === 'free') {
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
      
      console.log(`📊 User ${userId} on ${effectiveTier} tier - Generated ${notesGeneratedToday} note(s) today`);
      
      await userRef.set(
        {
          notesGeneratedToday: notesGeneratedToday,
          lastResetAt: new Date(),
          email: userEmail || userData.email || null,
          tier: 'free'
        },
        { merge: true }
      );
    }

    res.json({ notes });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message || `Failed to generate notes. Contact support: ${supportEmail}`
    });
  }
});

// Generate study notes using Groq
async function generateStudyNotes(context) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  if (!apiKey) {
    throw new Error('Groq API key not configured');
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
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You generate high-quality study notes and must return valid JSON only, with no markdown fences or extra text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const responseText = data?.choices?.[0]?.message?.content;

    if (!responseText || typeof responseText !== 'string') {
      throw new Error('Groq response did not contain text output');
    }

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse study notes response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Groq API error: ${error.message}`);
  }
}

// Support contact endpoint
app.post('/api/support/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In production: send email via SendGrid/EmailJS/similar service
    // For now: log to console and return success
    console.log(`📧 Support Message from ${name} (${email}):`);
    console.log(`Subject: ${subject || 'No subject'}`);
    console.log(`Message: ${message}`);
    console.log('---');

    // Optional: Send email via external service
    // In production, integrate with SendGrid, Resend, or similar

    return res.json({
      success: true,
      message: 'Message received. We will respond within 24 hours.'
    });
  } catch (error) {
    console.error('Support contact error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ StudyTube Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/generate-notes`);
});
