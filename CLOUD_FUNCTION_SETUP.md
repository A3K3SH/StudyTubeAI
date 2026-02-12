# Firebase Cloud Function Setup Guide

## Overview
This guide will help you deploy the Google Gemini-powered note generation Cloud Function.

## Prerequisites
- Firebase CLI installed (will be installed if not already)
- Google Cloud Project with billing enabled
- Google Gemini API key

## Step 1: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click **Get API Key**
3. Create a new API key or use existing one
4. Copy the API key (keep it safe!)

## Step 2: Install Dependeniesies in Functions Folder

```bash
cd functions
npm install
```

## Step 3: Set Up Firebase Configuration

### For Local Testing:
Update `functions/.env.local` with your Gemini API key:
```
GOOGLE_GEMINI_API_KEY="your-api-key-here"
```

### For Production Deployment:
Set the API key as a Firebase secret:
```bash
firebase functions:secrets:set GOOGLE_GEMINI_API_KEY
# Paste your API key when prompted
```

## Step 4: Build the Cloud Function

```bash
cd functions
npm run build
```

## Step 5: Deploy to Firebase

```bash
firebase deploy --only functions
```

This will:
- ✅ Deploy the `generateNotes` function
- ✅ Enable CORS for your frontend
- ✅ Create the Cloud Function endpoint

## Step 6: Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **studytube-ai-82345**
3. Go to **Build** → **Functions**
4. You should see `generateNotes` function listed

## Step 7: Test the Function

You can test it directly from the Firebase Console or use your app:
1. Open http://localhost:8081/generate
2. Enter a YouTube URL
3. Click "Generate"
4. The function will process and return study notes!

## Troubleshooting

### "API key not configured"
- Make sure you set `GOOGLE_GEMINI_API_KEY` in Firebase secrets
- Run: `firebase functions:secrets:set GOOGLE_GEMINI_API_KEY`

### "Failed to fetch transcript"
- The YouTube video may not have captions
- Try a different video with captions enabled

### "CORS error"
- The deployment might still be in progress
- Wait 2-3 minutes and refresh your browser

### "Function returned 500 error"
- Check the function logs:
  ```bash
  firebase functions:log
  ```

## Cost Considerations

- **Google Gemini API**: Free tier available with usage limits
- **Firebase Cloud Functions**: Pay-as-you-go (free tier includes 2M invocations/month)
- **YouTube Transcript API**: Free

## Next Steps

1. ✅ Install dependencies in functions folder
2. ✅ Get Google Gemini API key
3. ✅ Deploy the function
4. ✅ Test with your app

Questions? Check [Firebase Documentation](https://firebase.google.com/docs/functions) or [Google Gemini Docs](https://ai.google.dev/).
