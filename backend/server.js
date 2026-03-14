import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Razorpay from 'razorpay';
import { YoutubeTranscript } from 'youtube-transcript';
import ytdl from '@distube/ytdl-core';
import ytdlp from 'yt-dlp-exec';
import { createReadStream, createWriteStream } from 'fs';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import os from 'os';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

function parsePositiveInt(value, fallback) {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const freeTierDailyLimit = parsePositiveInt(process.env.FREE_TIER_DAILY_LIMIT, 1);
const freeTierIdentityDailyLimit = parsePositiveInt(process.env.FREE_TIER_IDENTITY_DAILY_LIMIT, 1);

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const ownerProEmails = new Set(
  (process.env.OWNER_PRO_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const defaultCurrency = process.env.RAZORPAY_CURRENCY || 'INR';
const paidPlanConfig = {
  pro: {
    tier: 'pro',
    label: 'Pro',
    description: 'StudyTube AI Pro access',
    amount: parsePositiveInt(process.env.RAZORPAY_PRO_AMOUNT, 29900),
    currency: defaultCurrency,
    durationDays: parsePositiveInt(process.env.RAZORPAY_PRO_DURATION_DAYS, 30),
  },
};

const razorpayClient = razorpayKeyId && razorpayKeySecret
  ? new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    })
  : null;

// Initialize Firebase Admin (for free tier limit tracking)
let db = null;
let adminAuth = null;
let firebaseAdminReady = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
    adminAuth = getAuth();
    firebaseAdminReady = true;
  }
} catch (error) {
  console.warn('Firebase Admin not configured. Note limits will not be enforced.');
}

// Middleware
const normalizeOrigin = (value) => value.replace(/\/$/, '');

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
);

[
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
].forEach((domain) => {
  if (domain) {
    allowedOrigins.add(normalizeOrigin(`https://${domain}`));
  }
});

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.size === 0 || allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.post(['/api/payments/razorpay/webhook', '/payments/razorpay/webhook'], express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!firebaseAdminReady || !db) {
      return res.status(503).json({
        error: 'Plan enforcement is unavailable. Configure FIREBASE_SERVICE_ACCOUNT before processing Razorpay webhooks.',
      });
    }

    if (!razorpayWebhookSecret) {
      return res.status(503).json({
        error: 'RAZORPAY_WEBHOOK_SECRET is not configured on the backend.',
      });
    }

    const webhookSignature = req.headers['x-razorpay-signature'];
    if (typeof webhookSignature !== 'string' || !webhookSignature.trim()) {
      return res.status(400).json({ error: 'Missing Razorpay webhook signature.' });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? '');
    const expectedSignature = crypto
      .createHmac('sha256', razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ error: 'Invalid Razorpay webhook signature.' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const details = extractWebhookUpgradeDetails(event);

    if (details) {
      await activatePaidPlan({
        uid: details.uid,
        tier: details.tier,
        email: details.email,
        orderId: details.orderId,
        paymentId: details.paymentId,
        source: `webhook:${event.event}`,
      });
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return res.status(500).json({ error: 'Failed to process Razorpay webhook.' });
  }
});

app.use(express.json());

// Root endpoint for uptime checks and direct browser access
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'StudyTube Backend',
    health: '/health',
    apiHealth: '/api/health',
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyTube Backend is running' });
});

// Vercel function routes are prefixed with /api.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyTube Backend is running' });
});

// Support contact endpoint
app.post(['/api/support/contact', '/support/contact'], async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  console.log(`\n📧 Support Contact`);
  console.log(`  From  : ${name} <${email}>`);
  console.log(`  Subject: ${subject || '(none)'}`);
  console.log(`  Message: ${message}\n`);

  // If Firestore is available, persist the ticket
  if (db) {
    try {
      await db.collection('support_tickets').add({
        name,
        email,
        subject: subject || '',
        message,
        createdAt: new Date().toISOString(),
        status: 'open',
      });
    } catch (err) {
      console.warn('Could not save support ticket to Firestore:', err.message);
    }
  }

  return res.json({ success: true });
});

function extractYouTubeVideoId(url) {
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

function isValidYouTubeVideoId(videoId) {
  return typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

function normalizeCookieHeader(cookieValue) {
  if (typeof cookieValue !== 'string') {
    return '';
  }

  return cookieValue
    .replace(/[\r\n]+/g, ' ')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('; ');
}

function getYoutubeRequestOptions() {
  const headers = {
    'User-Agent':
      process.env.YOUTUBE_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.youtube.com',
    'Referer': 'https://www.youtube.com/',
  };

  const normalizedCookie = normalizeCookieHeader(process.env.YOUTUBE_COOKIE);
  if (normalizedCookie) {
    headers.Cookie = normalizedCookie;
  }

  return { headers };
}

async function generateNotesWithFirebaseFunction({ url, content }) {
  const functionUrl = (process.env.FIREBASE_NOTES_FUNCTION_URL || '').trim();
  if (!functionUrl) {
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  const sharedSecret = (process.env.FIREBASE_NOTES_SHARED_SECRET || '').trim();
  if (sharedSecret) {
    headers['x-studytube-shared-secret'] = sharedSecret;
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, content }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error || `Firebase notes function failed with status ${response.status}`);
    error.status = payload?.status || response.status || 502;
    throw error;
  }

  if (!payload?.notes) {
    const error = new Error('Firebase notes function returned no notes');
    error.status = 502;
    throw error;
  }

  return payload.notes;
}

async function fetchYouTubeTranscript(videoId) {
  const transcriptCandidates = [
    () => YoutubeTranscript.fetchTranscript(videoId),
    () => YoutubeTranscript.fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`),
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }),
  ];

  let lastError = null;

  for (const candidate of transcriptCandidates) {
    try {
      const transcriptItems = await candidate();
      if (Array.isArray(transcriptItems) && transcriptItems.length > 0) {
        return transcriptItems
          .map((item) => item.text)
          .filter(Boolean)
          .join(' ')
          .trim();
      }
    } catch (error) {
      lastError = error;
    }
  }

  const transcriptError = (lastError && lastError.message) ? lastError.message : '';

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
    throw new Error('No transcript available for this video');
  }

  throw new Error('Could not fetch transcript for this video. Try another video with captions.');
}

function parseVttContent(vttContent) {
  return vttContent
    .replace(/\uFEFF/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (line === 'WEBVTT') return false;
      if (line.startsWith('NOTE')) return false;
      if (line.startsWith('Kind:') || line.startsWith('Language:')) return false;
      if (/^\d+$/.test(line)) return false;
      if (line.includes('-->')) return false;
      return true;
    })
    .map((line) => line.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSrtContent(srtContent) {
  return srtContent
    .replace(/\uFEFF/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^\d+$/.test(line)) return false;
      if (line.includes('-->')) return false;
      return true;
    })
    .map((line) => line.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isYouTubeBotBlockMessage(message) {
  if (!message) return false;
  const normalizedMessage = String(message).toLowerCase();
  return (
    normalizedMessage.includes('sign in to confirm you\'re not a bot') ||
    normalizedMessage.includes('use --cookies') ||
    normalizedMessage.includes('youtube blocked')
  );
}

function isYtdlpMissingBinaryMessage(message) {
  if (!message) return false;
  const normalizedMessage = String(message).toLowerCase();
  return (
    normalizedMessage.includes('spawn') &&
    normalizedMessage.includes('yt-dlp') &&
    normalizedMessage.includes('enoent')
  );
}

async function fetchYouTubeTranscriptWithYtdlpSubs(videoId) {
  const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `studytube-subs-${videoId}-`));

  try {
    const requestOptions = getYoutubeRequestOptions();
    const subtitleTemplate = path.join(tempDir, 'caption.%(ext)s');

    await ytdlp(sourceUrl, {
      skipDownload: true,
      writeSubs: true,
      writeAutoSubs: true,
      subLangs: 'en.*,en-orig,en',
      subFormat: 'vtt/srt/best',
      output: subtitleTemplate,
      noWarnings: true,
      quiet: true,
      addHeader: Object.entries(requestOptions.headers).map(([key, value]) => `${key}:${value}`),
    });

    const subtitleFiles = (await readdir(tempDir))
      .filter((fileName) => /\.((en|en-orig)[^.]*)\.(vtt|srt)$/i.test(fileName) || /\.(vtt|srt)$/i.test(fileName))
      .sort((a, b) => {
        const rank = (name) => {
          const lower = name.toLowerCase();
          if (lower.includes('.en-orig.')) return 0;
          if (lower.includes('.en.')) return 1;
          return 2;
        };
        return rank(a) - rank(b);
      });

    for (const subtitleFile of subtitleFiles) {
      const subtitlePath = path.join(tempDir, subtitleFile);
      const subtitleContent = await readFile(subtitlePath, 'utf8');
      const normalizedFileName = subtitleFile.toLowerCase();
      const transcriptText = normalizedFileName.endsWith('.srt')
        ? parseSrtContent(subtitleContent)
        : parseVttContent(subtitleContent);

      if (transcriptText) {
        return transcriptText;
      }
    }

    throw new Error('No subtitle text could be extracted from this video.');
  } catch (error) {
    if (isYtdlpMissingBinaryMessage(error?.message || error)) {
      throw new Error('Subtitle extraction fallback unavailable: yt-dlp binary is missing on this server.');
    }
    throw new Error(`Subtitle extraction fallback failed: ${error.message || error}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function downloadYouTubeAudioWithNodeFallback(videoId) {
  const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const tempPath = path.join(os.tmpdir(), `studytube-node-${videoId}-${Date.now()}.webm`);

  try {
    const requestOptions = getYoutubeRequestOptions();

    const audioStream = ytdl(sourceUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
      highWaterMark: 1 << 25,
      requestOptions,
    });

    await pipeline(audioStream, createWriteStream(tempPath));
    return tempPath;
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw new Error(`Node audio fallback failed: ${error.message || error}`);
  }
}

async function downloadYouTubeAudio(videoId) {
  const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const tempPath = path.join(os.tmpdir(), `studytube-${videoId}-${Date.now()}.webm`);
  const requestOptions = getYoutubeRequestOptions();

  try {
    await ytdlp(sourceUrl, {
      output: tempPath,
      format: 'bestaudio[ext=webm]/bestaudio',
      noPlaylist: true,
      noWarnings: true,
      quiet: true,
      addHeader: Object.entries(requestOptions.headers).map(([key, value]) => `${key}:${value}`),
    });
    return tempPath;
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});

    try {
      return await downloadYouTubeAudioWithNodeFallback(videoId);
    } catch (fallbackError) {
      throw new Error(
        `Audio download failed: ${error.message || error}. ${fallbackError.message || fallbackError}`
      );
    }
  }
}

async function transcribeAudioWithGroq(audioPath) {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is required for transcription fallback');
  }

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: groqApiKey,
  });

  const transcription = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
    response_format: 'json',
  });

  const text = transcription?.text?.trim();
  if (!text) {
    throw new Error('Transcription fallback returned empty text');
  }

  return text;
}

async function fetchTranscriptWithFallback(videoId) {
  try {
    return await fetchYouTubeTranscript(videoId);
  } catch (transcriptError) {
    try {
      return await fetchYouTubeTranscriptWithYtdlpSubs(videoId);
    } catch (subtitleFallbackError) {
      const subtitleFallbackMessage = subtitleFallbackError?.message || 'Subtitle extraction fallback failed';

      let audioPath = null;
      try {
        audioPath = await downloadYouTubeAudio(videoId);
        return await transcribeAudioWithGroq(audioPath);
      } catch (fallbackError) {
        const transcriptMessage = transcriptError?.message || 'Transcript fetch failed';
        const subtitleMessage = subtitleFallbackMessage;
        const fallbackMessage = fallbackError?.message || 'Audio transcription fallback failed';
        const combinedFailureMessage = `${transcriptMessage} ${subtitleMessage} ${fallbackMessage}`;

        if (isYtdlpMissingBinaryMessage(combinedFailureMessage)) {
          throw new Error(
            'Server is missing yt-dlp binary on this deployment. Rebuild backend with Clear build cache in Render and redeploy.'
          );
        }

        if (isYouTubeBotBlockMessage(combinedFailureMessage)) {
          throw new Error(
            'YouTube blocked this server IP with bot verification, so transcript/subtitle/audio extraction failed. Add YOUTUBE_COOKIE in backend env, or try a different video/server.'
          );
        }

        throw new Error(
          `Could not fetch transcript, subtitle fallback, or transcribe audio. ${transcriptMessage}. ${subtitleMessage}. ${fallbackMessage}`
        );
      } finally {
        if (audioPath) {
          await rm(audioPath, { force: true }).catch(() => {});
        }
      }
    }
  }
}

function formatAiError(error) {
  const message = error?.message || 'Failed to generate notes';

  if (message.includes('API key expired') || message.includes('API_KEY_INVALID')) {
    return {
      status: 401,
      error: 'The configured Google Gemini API key is expired or invalid. Add a new key and restart the backend.',
    };
  }

  if (message.includes('Invalid auth credentials') || message.includes('Unauthorized') || message.includes('401')) {
    return {
      status: 401,
      error: 'The configured AI API key is invalid. Add a valid key and restart the backend.',
    };
  }

  if (message.includes('quota') || message.includes('Too Many Requests') || message.includes('429')) {
    return {
      status: 429,
      error: 'The AI provider quota has been exceeded. Use a key with available quota or try again later.',
    };
  }

  return {
    status: 500,
    error: message,
  };
}

function getPaidPlan(planId) {
  if (typeof planId !== 'string') {
    return null;
  }

  return paidPlanConfig[planId.toLowerCase()] || null;
}

function buildReceipt(uid, tier) {
  return `st_${tier}_${uid.slice(0, 10)}_${Date.now().toString(36)}`.slice(0, 40);
}

function isPaymentGatewayReady() {
  return Boolean(razorpayClient && razorpayKeyId && razorpayKeySecret);
}

function isOwnerProEmail(email) {
  return typeof email === 'string' && ownerProEmails.has(email.trim().toLowerCase());
}

function extractWebhookUpgradeDetails(event) {
  if (!event || !['payment.captured', 'order.paid'].includes(event.event)) {
    return null;
  }

  const paymentEntity = event.payload?.payment?.entity || null;
  const orderEntity = event.payload?.order?.entity || null;
  const notes = paymentEntity?.notes || orderEntity?.notes || {};
  const plan = getPaidPlan(notes.tier);

  if (!plan || typeof notes.uid !== 'string' || !notes.uid.trim()) {
    return null;
  }

  return {
    uid: notes.uid,
    tier: plan.tier,
    email: notes.email || paymentEntity?.email || null,
    orderId: paymentEntity?.order_id || orderEntity?.id || null,
    paymentId: paymentEntity?.id || null,
  };
}

async function activatePaidPlan({ uid, tier, email, orderId, paymentId, source }) {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const plan = getPaidPlan(tier);
  if (!plan) {
    throw new Error(`Unsupported plan activation request: ${tier}`);
  }

  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const userRef = db.collection('users').doc(uid);
  const userSnapshot = await userRef.get();
  const existingData = userSnapshot.exists ? userSnapshot.data() : {};

  await userRef.set(
    {
      email: email || existingData.email || null,
      tier: plan.tier,
      currentPlan: plan.tier,
      subscriptionStatus: 'active',
      planActivatedAt: activatedAt,
      planExpiresAt: expiresAt,
      notesGeneratedToday: 0,
      lastResetAt: activatedAt,
      paymentProvider: 'razorpay',
      razorpay: {
        lastOrderId: orderId || null,
        lastPaymentId: paymentId || null,
        lastEventSource: source,
        lastUpdatedAt: activatedAt,
      },
    },
    { merge: true }
  );
}

async function getAuthenticatedUserFromRequest(req) {
  if (!firebaseAdminReady || !adminAuth) {
    return null;
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const authenticatedUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
    };

    if (db && isOwnerProEmail(authenticatedUser.email)) {
      await db.collection('users').doc(authenticatedUser.uid).set(
        {
          email: authenticatedUser.email,
          tier: 'pro',
          currentPlan: 'pro',
          subscriptionStatus: 'active',
          paymentProvider: 'owner-whitelist',
          notesGeneratedToday: 0,
          lastResetAt: new Date(),
        },
        { merge: true }
      );
    }

    return authenticatedUser;
  } catch {
    return null;
  }
}

async function getAuthenticatedUidFromRequest(req) {
  const authenticatedUser = await getAuthenticatedUserFromRequest(req);
  return authenticatedUser?.uid || null;
}

function getDayStart(date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function getDayKey(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return (forwardedFor[0] || '').trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getFreeTierIdentityHash(req) {
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : 'unknown';
  const ip = getClientIp(req);
  return crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

function getFreeTierIdentityDocId(req, date = new Date()) {
  return `${getDayKey(date)}:${getFreeTierIdentityHash(req)}`;
}

app.post(['/api/payments/razorpay/order', '/payments/razorpay/order'], async (req, res) => {
  try {
    if (!firebaseAdminReady || !db) {
      return res.status(503).json({
        error: 'Plan enforcement is unavailable. Configure FIREBASE_SERVICE_ACCOUNT before starting checkout.',
      });
    }

    if (!isPaymentGatewayReady()) {
      return res.status(503).json({
        error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the backend.',
      });
    }

    const authenticatedUser = await getAuthenticatedUserFromRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in again and retry.',
      });
    }

    const plan = getPaidPlan(req.body?.plan);
    if (!plan) {
      return res.status(400).json({ error: 'Unsupported paid plan.' });
    }

    const userRef = db.collection('users').doc(authenticatedUser.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : {};

    if ((userData.tier || 'free') === plan.tier) {
      return res.status(409).json({ error: `Your ${plan.label} plan is already active.` });
    }

    const order = await razorpayClient.orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt: buildReceipt(authenticatedUser.uid, plan.tier),
      notes: {
        uid: authenticatedUser.uid,
        tier: plan.tier,
        email: authenticatedUser.email || userData.email || '',
        app: 'StudyTube AI',
      },
    });

    return res.json({
      keyId: razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'StudyTube AI',
      description: plan.description,
      plan: {
        tier: plan.tier,
        label: plan.label,
        durationDays: plan.durationDays,
      },
      prefill: {
        email: authenticatedUser.email || userData.email || '',
        name: authenticatedUser.name || userData.name || '',
      },
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order.' });
  }
});

app.post(['/api/payments/razorpay/verify', '/payments/razorpay/verify'], async (req, res) => {
  try {
    if (!firebaseAdminReady || !db) {
      return res.status(503).json({
        error: 'Plan enforcement is unavailable. Configure FIREBASE_SERVICE_ACCOUNT before verifying payments.',
      });
    }

    if (!isPaymentGatewayReady()) {
      return res.status(503).json({
        error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the backend.',
      });
    }

    const authenticatedUser = await getAuthenticatedUserFromRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in again and retry.',
      });
    }

    const plan = getPaidPlan(req.body?.plan);
    const razorpayOrderId = req.body?.razorpay_order_id;
    const razorpayPaymentId = req.body?.razorpay_payment_id;
    const razorpaySignature = req.body?.razorpay_signature;

    if (!plan) {
      return res.status(400).json({ error: 'Unsupported paid plan.' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing Razorpay payment verification fields.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid Razorpay payment signature.' });
    }

    const payment = await razorpayClient.payments.fetch(razorpayPaymentId);
    if (payment.order_id !== razorpayOrderId) {
      return res.status(400).json({ error: 'Razorpay payment does not match the created order.' });
    }

    if (payment.notes?.uid && payment.notes.uid !== authenticatedUser.uid) {
      return res.status(403).json({ error: 'This payment was created for a different user account.' });
    }

    if (!['authorized', 'captured'].includes(payment.status)) {
      return res.status(409).json({ error: `Payment is not complete yet. Current status: ${payment.status}.` });
    }

    await activatePaidPlan({
      uid: authenticatedUser.uid,
      tier: plan.tier,
      email: authenticatedUser.email || payment.email || null,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      source: 'checkout-verify',
    });

    return res.json({
      success: true,
      tier: plan.tier,
      currentPlan: plan.label,
      expiresInDays: plan.durationDays,
    });
  } catch (error) {
    console.error('Razorpay payment verification error:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify Razorpay payment.' });
  }
});

// Generate notes endpoint
app.post(['/api/generate-notes', '/generate-notes'], async (req, res) => {
  try {
    const { url, content } = req.body;

    if (!firebaseAdminReady || !db) {
      return res.status(503).json({
        error: 'Plan enforcement is unavailable. Configure FIREBASE_SERVICE_ACCOUNT on backend before generating notes.',
      });
    }

    const authenticatedUid = await getAuthenticatedUidFromRequest(req);
    if (!authenticatedUid) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in again and retry.',
      });
    }

    // Always trust only server-verified uid.
    const effectiveUserId = authenticatedUid;

    if (!url && !content) {
      return res.status(400).json({ error: 'YouTube URL or content is required' });
    }

    // Check daily note limit for free users
    if (effectiveUserId) {
      const userRef = db.collection('users').doc(effectiveUserId);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const userTier = userData.tier || 'free';
      
      // Only apply limits to free tier users
      if (userTier === 'free') {
        const now = new Date();
        const lastReset = userData.lastResetAt ? userData.lastResetAt.toDate() : null;
        const today = getDayStart(now);
        
        let notesGeneratedToday = 0;
        
        // Reset counter if it's a new day
        if (!lastReset || new Date(lastReset).setHours(0, 0, 0, 0) < today.getTime()) {
          notesGeneratedToday = 0;
        } else {
          notesGeneratedToday = userData.notesGeneratedToday || 0;
        }

        if (notesGeneratedToday >= freeTierDailyLimit) {
          return res.status(403).json({
            error: `Daily limit reached. Free users can generate ${freeTierDailyLimit} note${freeTierDailyLimit === 1 ? '' : 's'} per day. Upgrade to Pro for unlimited notes.`,
            notesRemaining: 0,
            limit: freeTierDailyLimit,
            tier: 'free'
          });
        }

        // Anti-abuse guard: prevent bypassing free limits via multiple email accounts.
        const freeTierIdentityRef = db.collection('daily_free_identity_limits').doc(getFreeTierIdentityDocId(req, now));
        const freeTierIdentityDoc = await freeTierIdentityRef.get();
        const freeTierIdentityData = freeTierIdentityDoc.exists ? freeTierIdentityDoc.data() : {};
        const identityUsageCount = Number.parseInt(freeTierIdentityData.count ?? '0', 10) || 0;
        const identityLastUid = typeof freeTierIdentityData.lastUid === 'string' ? freeTierIdentityData.lastUid : null;

        if (identityUsageCount >= freeTierIdentityDailyLimit && identityLastUid !== effectiveUserId) {
          return res.status(403).json({
            error: 'Daily free limit reached for this device/network. Creating multiple accounts to bypass limits is not allowed. Upgrade to Pro for unlimited notes.',
            notesRemaining: 0,
            limit: freeTierIdentityDailyLimit,
            tier: 'free',
          });
        }

        res.set('X-Notes-Remaining', Math.max(freeTierDailyLimit - notesGeneratedToday, 0).toString());
        res.set('X-User-Tier', 'free');
      } else {
        res.set('X-Notes-Remaining', 'unlimited');
        res.set('X-User-Tier', userTier);
      }
    }

    let notes;

    try {
      notes = await generateNotesWithFirebaseFunction({ url, content });
    } catch (functionError) {
      return res.status(functionError.status || 502).json({
        error: functionError.message || 'Firebase notes function failed.',
      });
    }

    if (!notes) {
      // Use provided content or fetch transcript from YouTube URL.
      let textContent = content;

      if (url && !content) {
        const videoId = extractYouTubeVideoId(url);
        if (!videoId || !isValidYouTubeVideoId(videoId)) {
          return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        try {
          textContent = await fetchTranscriptWithFallback(videoId);
        } catch (transcriptError) {
          return res.status(422).json({
            error: transcriptError.message || 'Could not fetch transcript for this video. Try another video with captions.',
          });
        }
      }

      notes = await generateStudyNotes(textContent);
    }

    // Increment user's daily notes count
    if (effectiveUserId) {
      const now = new Date();
      const userRef = db.collection('users').doc(effectiveUserId);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const userTier = userData.tier || 'free';
      const lastReset = userData.lastResetAt ? userData.lastResetAt.toDate() : null;
      const today = getDayStart(now);
      
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
          lastResetAt: now,
          email: userData.email || null,
          tier: userTier
        },
        { merge: true }
      );

      if (userTier === 'free') {
        const freeTierIdentityRef = db.collection('daily_free_identity_limits').doc(getFreeTierIdentityDocId(req, now));
        const freeTierIdentityDoc = await freeTierIdentityRef.get();
        const freeTierIdentityData = freeTierIdentityDoc.exists ? freeTierIdentityDoc.data() : {};
        const currentIdentityCount = Number.parseInt(freeTierIdentityData.count ?? '0', 10) || 0;

        await freeTierIdentityRef.set(
          {
            count: currentIdentityCount + 1,
            lastUid: effectiveUserId,
            updatedAt: now,
            createdAt: freeTierIdentityData.createdAt || now,
          },
          { merge: true }
        );
      }
    }

    res.json({ notes });
  } catch (error) {
    console.error('Error:', error);
    const formattedError = formatAiError(error);
    res.status(formattedError.status).json({
      error: formattedError.error,
    });
  }
});

// Generate study notes using Google Gemini, Groq, OpenRouter, or NVIDIA DeepSeek
async function generateStudyNotes(context) {
  const googleApiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;

  if (!googleApiKey && !groqApiKey && !openRouterApiKey && !nvidiaApiKey) {
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } else if (groqApiKey) {
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

      responseText = completion.choices[0].message.content ?? '';
    } else if (openRouterApiKey) {
      const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
      });

      const completion = await client.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      });

      responseText = completion.choices[0].message.content ?? '';
    } else {
      const client = new OpenAI({
        baseURL: 'https://integrate.api.nvidia.com/v1',
        apiKey: nvidiaApiKey,
      });

      const completion = await client.chat.completions.create({
        model: 'deepseek-ai/deepseek-v3.2',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 8192,
      });

      responseText = completion.choices[0].message.content ?? '';
    }

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse study notes response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`AI API error: ${error.message}`);
  }
}

// Start a local server only outside Vercel serverless runtime.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ StudyTube Backend running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API endpoint: http://localhost:${PORT}/api/generate-notes`);
  });
}

export default app;
