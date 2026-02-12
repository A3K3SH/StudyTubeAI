# Firebase Migration Guide

Your application has been successfully migrated from Supabase to Firebase! Here's what you need to do to complete the setup:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Analytics (optional)
4. Create the project

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** authentication method
4. Enable **Google** OAuth provider (required for social login)

## Step 3: Create Cloud Firestore (Optional for user profiles)

1. Go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (or test mode for development)
4. Select your preferred location

## Step 4: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to your apps section
3. Select your web app (or create one if needed)
4. Copy the Firebase config object

## Step 5: Configure Environment Variables

Update your `.env` file with the Firebase config values:

```env
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```

## Step 6: Update Backend Functions

The `generate-notes` backend function needs to be migrated to Firebase Cloud Functions. Currently, it's configured to call a Firebase Cloud Function:

### Option A: Use Firebase Cloud Functions (Recommended)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize Firebase: `firebase init functions`
3. Deploy your function: `firebase deploy --only functions`

Function should be named: `generateNotes` (matches the call in Generate.tsx)

### Option B: Use a Backend Service

Keep your existing backend service and update the frontend to call it via HTTP instead of Firebase Cloud Functions.

## Step 7: Test the Application

1. Start the dev server: `npm run dev`
2. Navigate to http://localhost:8080
3. Test authentication (sign up, sign in, Google OAuth)
4. Test note generation functionality

## Migration Summary

### Files Changed:
- ✅ `src/integrations/firebase/client.ts` - New Firebase client
- ✅ `src/pages/Auth.tsx` - Firebase authentication
- ✅ `src/pages/Generate.tsx` - Firebase Cloud Functions
- ✅ `src/components/Navbar.tsx` - Firebase user management
- ✅ `src/integrations/lovable/index.ts` - Firebase OAuth integration
- ✅ `.env` - Firebase configuration

### Files Removed:
- ❌ Supabase client (no longer needed)
- ❌ Supabase types

## Troubleshooting

- **"Firebase config is missing"**: Ensure all environment variables are set correctly in `.env`
- **"signOut is not a function"**: Make sure you're calling Firebase's `signOut(auth)`
- **"Cloud Function not found"**: Ensure the `generateNotes` function is deployed to Firebase

## Next Steps

1. Set up Firebase project and configure environment variables
2. Deploy Cloud Functions for note generation
3. Test the application thoroughly
4. Deploy to production

For more information, visit the [Firebase Documentation](https://firebase.google.com/docs).
