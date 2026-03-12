# StudyTube AI - AI-Powered Study Notes SaaS Platform

**StudyTube AI** is a modern, full-featured SaaS platform that transforms YouTube lectures into comprehensive, structured study notes using AI. Designed for students who want to maximize learning efficiency and save time.

## 🚀 SaaS Features

- 🎓 **AI-Powered Notes Generation**: Converts YouTube videos into detailed, well-organized study materials
- 📝 **Smart Formatting**: Auto-generates summaries, key concepts, quiz questions, and terminology
- 🆓 **Freemium Model**: 1 note/day for free tier users
- 💎 **Pro Subscription**: Unlimited notes + priority support (₹299/month)
- 🔐 **Enterprise-Grade Auth**: Firebase authentication with role-based access
- 💳 **Self-Serve Payments**: Razorpay integration for secure online checkout
- 📧 **Customer Support**: In-app support page with FAQ and contact form
- 📱 **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- 🌐 **Production Ready**: Deployed with auto-scaling infrastructure on Render

## 💰 Pricing Plans

| Feature | Free | Pro |
|---------|------|-----|
| Notes per day | 1 | Unlimited |
| Note history | 7 days | Forever |
| Export formats | PDF | PDF, Markdown |
| Priority support | ❌ | ✅ |
| Advanced AI options | ❌ | ✅ |
| **Price** | **Free** | **₹299/month** |

Subscribe to Pro through the in-app checkout powered by Razorpay.

## 🛠 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build & dev server)
- Tailwind CSS (styling)
- shadcn-ui (component library)

**Backend:**
- Node.js + Express.js
- Firebase Admin SDK (auth & database)
- Groq API (AI notes generation)
- Razorpay (payments)

**Deployment:**
- Render (full-stack production hosting)
- Netlify (optional frontend hosting)

## How to Edit This Code

**Using Your IDE**

Clone the repository and start coding:

Requirements: Node.js & npm installed

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## 🚀 Deployment (SaaS)

This project is optimized for production deployment on **Render** with auto-scaling capabilities:

### Deployment Steps:
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New+" → "Blueprint"
4. Connect your GitHub repository
5. Select the `StudyTube-AI` repository
6. Render will auto-deploy both frontend and backend
7. Your SaaS is live! 🎉

### Live URLs:
- **Frontend**: `https://studytubeai.netlify.app`
- **Backend API**: Configured automatically on Render

## 📧 Customer Support

The app includes a **Support** page accessible at `/support` with:
- **FAQ**: Common questions about limits, payments, language support, privacy
- **Contact Form**: Users can send support tickets directly
- **Email Support**: `aakashswain18@gmail.com`

Integrate support tickets into your ticketing system by setting up webhook listeners on the backend.

## 💳 Payment & Subscription System

**Payment Flow:**
1. Free users see upgrade prompts in the app
2. Users click "Upgrade to Pro" → Razorpay checkout
3. After payment, tier is upgraded in Firestore
4. Pro users get unlimited access

**Technical Integration:**
- Frontend initiates Razorpay orders via `/api/payments/razorpay/order`
- Backend verifies payment signature at `/api/payments/razorpay/verify`
- Razorpay webhooks hit `/api/payments/razorpay/webhook` as fallback
- Firestore user document tier field updated to `pro` upon successful payment

**Owner Access:**
- Set `OWNER_PRO_EMAILS` env var to auto-grant Pro tier to specific emails
- Example: `OWNER_PRO_EMAILS=aakashswain18@gmail.com`

## 🔐 Environment Variables (Backend)

Configure these on your Render/deployment dashboard:

**AI & Notes Generation:**
- `GROQ_API_KEY` - Groq AI API key for LLM-powered note generation

**Firebase (Auth & Database):**
- `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin SDK service account JSON
- `OWNER_PRO_EMAILS` - Comma-separated list of emails auto-upgraded to Pro tier

**Razorpay (Payments):**
- `RAZORPAY_KEY_ID` - Razorpay checkout key ID (Live mode)
- `RAZORPAY_KEY_SECRET` - Razorpay secret for order creation & verification  
- `RAZORPAY_WEBHOOK_SECRET` - Webhook signing secret (from Razorpay Dashboard)
- `RAZORPAY_CURRENCY` - Currency code (default: `INR`)
- `RAZORPAY_PRO_AMOUNT` - Pro plan price in smallest currency unit (default: `29900` = ₹299)

**Server:**
- `PORT` - Server port (default: `3000`)

## 📊 Monitoring & Support

- Monitor payment logs in Razorpay Dashboard
- Track user errors in Firebase Console
- View support tickets in Firestore collection `support_tickets`
- Monitor API health via `/health` endpoint

---

Built with ❤️ for students worldwide. Happy note-taking! 📚
