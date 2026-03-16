# StudyTube AI - AI-Powered Study Notes Generator

StudyTube AI is an intelligent platform that transforms YouTube lectures into comprehensive, structured study notes using AI. Perfect for students who want to save time studying and learn more effectively.

## Features

- 🎓 **AI-Powered Notes**: Converts YouTube videos into detailed study materials
- 📝 **Structured Format**: Summaries, key points, quiz questions, and key terms
- 🆓 **Free Tier**: 1 note per day for free users
- 💰 **Pro Plans**: Unlimited notes with advanced features
- 🔐 **Secure Authentication**: Firebase-powered user accounts
- 📱 **Responsive Design**: Works on desktop and mobile

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

## Deployment

Deploy to Render using the provided `render.yaml` configuration:

1. Push to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New+" → "Blueprint"
4. Connect your GitHub repository
5. Select `StudyTube-AI` repository
6. Render will auto-deploy both frontend and backend
7. Get your live URLs!

## Environment Variables

Set these on your deployment platform:
- `GOOGLE_GEMINI_API_KEY` - Google Generative AI API key
- `VITE_BACKEND_URL` - Backend URL (auto-set on Render)
- All `VITE_FIREBASE_*` - Firebase configuration
