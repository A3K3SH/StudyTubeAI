# StudyTube AI - Deployment Guide

## Option 1: Frontend on Netlify / Vercel + Backend on Render (RECOMMENDED)

### Backend Deployment (Render.com)

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub or email

2. **Deploy Backend Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repo (or upload code)
   - Fill in:
     - **Name**: `studytube-ai-backend`
     - **Environment**: `Node`
     - **Build Command**: `cd backend && npm install`
     - **Start Command**: `cd backend && node server.js`
     - **Region**: Choose closest to your users

3. **Set Environment Variables**
   - Go to Environment tab
   - Add: `GOOGLE_GEMINI_API_KEY=AIzaSyBK6O7Fu2_4TF-VJnoJArffhAOicKQL8uQ`
   - Add: `FIREBASE_SERVICE_ACCOUNT=<your-firebase-service-account-json>`
   - Deploy

4. **Get Backend URL**
   - Render will assign: `https://studytube-ai-backend.onrender.com`
   - Copy this URL

### Frontend Deployment (Netlify)

1. **Prepare Frontend**
   ```bash
   cd f:\code\study-buddy-ai-main\study-buddy-ai-main
   ```

2. **Update .env for Production**
   ```env
   VITE_BACKEND_URL=https://studytube-ai-backend.onrender.com
   VITE_FIREBASE_API_KEY=AIzaSyBYM1XdXXNqOqOEueigNtF03GJUhoMmz2E
   VITE_FIREBASE_AUTH_DOMAIN=studytube-ai-82345.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=studytube-ai-82345
   VITE_FIREBASE_STORAGE_BUCKET=studytube-ai-82345.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=413543712470
   VITE_FIREBASE_APP_ID=1:413543712470:web:550e60d4be02a722286b77
   ```

3. **Deploy to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repo
   - Build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Deploy

4. **Update Backend URL if Needed**
   - If deployed frontend URL is `https://studytube-ai.netlify.app`
   - Netlify automatically handles environment variables
   - Configure CORS in backend to accept your Netlify domain

### Frontend Deployment (Vercel)

1. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Configure Environment Variables in Vercel Dashboard**
   - Add all `VITE_*` environment variables
   - Set `VITE_BACKEND_URL=https://studytube-ai-backend.onrender.com`

---

## Option 2: Everything on Render (All-in-One)

### Create Render Services

**Service 1: Backend**
- Same as above

**Service 2: Frontend**
- Create new "Static Site" on Render
- Build command: `npm run build`
- Publish directory: `dist`
- Environment: Add all VITE_ variables
- Add `VITE_BACKEND_URL=https://your-backend-service.onrender.com`

---

## Post-Deployment Checklist

- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend loads without errors
- [ ] Firebase authentication works
- [ ] Can generate notes (uses Render backend)
- [ ] CORS errors? Update backend to accept your frontend domain:
  ```javascript
  app.use(cors({
    origin: 'https://your-frontend-url.netlify.app'
  }));
  ```

---

## Environment Variables Summary

**Backend (.env)**
```
PORT=3000
GOOGLE_GEMINI_API_KEY=AIzaSyBK6O7Fu2_4TF-VJnoJArffhAOicKQL8uQ
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

**Frontend (.env)**
```
VITE_BACKEND_URL=https://your-render-backend.onrender.com
VITE_FIREBASE_API_KEY=AIzaSyBYM1XdXXNqOqOEueigNtF03GJUhoMmz2E
VITE_FIREBASE_AUTH_DOMAIN=studytube-ai-82345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studytube-ai-82345
VITE_FIREBASE_STORAGE_BUCKET=studytube-ai-82345.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=413543712470
VITE_FIREBASE_APP_ID=1:413543712470:web:550e60d4be02a722286b77
```

---

## Free Tier Limits

**Render (Backend)**
- ✅ Free tier available
- ⚠️ Spins down after 15 min inactivity (takes 30s to wake up)
- ✅ Free SSL certificate

**Netlify (Frontend)**
- ✅ Free tier with 300 minutes build/month
- ✅ Auto HTTPS
- ✅ Drag-and-drop deployment

**Vercel (Frontend)**
- ✅ Free tier with generous limits
- ✅ Better performance for Next.js apps
- ⚠️ This is React + Vite, not optimized for Vercel

---

## My Recommendation

**Best Setup**: 
- **Frontend**: Netlify (easiest, fastest for Vite apps)
- **Backend**: Render (free, reliable, already set up here)
- **Result**: Full production deployment under $0/month
