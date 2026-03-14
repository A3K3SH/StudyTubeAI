# Deploy Backend to Render.com

## Step 1: Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub or email
3. Connect your GitHub account

## Step 2: Create a New Web Service
1. Go to Dashboard → New +
2. Click **Web Service**
3. Select **Deploy an existing repository**
   - If your code is on GitHub, connect it
   - Or paste a GitHub repo URL

## Step 3: Configure the Service

**Name:** `studytube-ai-backend`

**Environment:** `Node`

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node backend/server.js
```

OR if your `backend` folder is at root:
```bash
cd backend && npm install && node server.js
```

**Environment Variables:** Add these in Render dashboard:
```
GOOGLE_GEMINI_API_KEY=your-google-gemini-api-key
```

## Step 4: Deploy
Click **Create Web Service** and wait for deployment (~2-3 minutes)

## Step 5: Get Your Backend URL
Once deployed, Render will give you a URL like:
```
https://studytube-ai-backend.onrender.com
```

This will be your `VITE_BACKEND_URL`!

## Step 6: Update Frontend
Update your frontend `.env` file:
```env
VITE_BACKEND_URL="https://studytube-ai-backend.onrender.com"
```

## Step 7: Test
1. Make sure backend is running
2. Open your frontend app
3. Try generating notes from a YouTube URL
4. It should now call your backend on Render!

## Troubleshooting

**Backend not responding?**
- Check Render logs: Dashboard → Your Service → Logs
- Ensure `GOOGLE_GEMINI_API_KEY` is set correctly
- Verify backend is listening on correct port

**CORS errors?**
- Backend has CORS enabled (see `server.js`)
- Check if `VITE_BACKEND_URL` is correct

**Cold start delays?**
- Free tier services sleep after 15 mins
- First request may take 30 seconds to wake up
- Paid tier keeps services always on

## Free Tier Limits
- ✅ 750 hours/month free
- ✅ Shared CPU/RAM
- ✅ Sufficient for testing/MVP
- ⚠️ Service sleeps after 15 mins of inactivity

Perfect! Now follow these steps to deploy on Render! 🚀
