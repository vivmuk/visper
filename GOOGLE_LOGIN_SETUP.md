# Google Sign-In Setup Guide for Whisper

This guide will help you enable Google Sign-In in your Firebase project so users can authenticate with their Google accounts.

## Step 1: Enable Google Sign-In in Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project: **wisper-vivek**

2. **Navigate to Authentication**
   - In the left sidebar, click **"Authentication"** (or "Build" → "Authentication")
   - If you haven't set up Authentication yet, click **"Get started"**

3. **Enable Google Sign-In Provider**
   - Click on the **"Sign-in method"** tab (if not already selected)
   - Find **"Google"** in the list of providers
   - Click on **"Google"**

4. **Configure Google Sign-In**
   - Toggle **"Enable"** to **ON**
   - **Project support email**: Select your email address from the dropdown
     - This is the email that will receive important notifications about your Firebase project
   - **Project public-facing name**: This can be "Whisper" or "Wisper"
   - Click **"Save"**

**✅ Google Sign-In is now enabled!**

---

## Step 2: Add Authorized Domains

Firebase needs to know which domains are allowed to use Google Sign-In.

1. **Still in Authentication → Sign-in method**
2. Scroll down to **"Authorized domains"**
3. You should see these domains by default:
   - `localhost` (for local development)
   - `wisper-vivek.firebaseapp.com`
   - `wisper-vivek.web.app`

4. **Add your Railway domain:**
   - Click **"Add domain"**
   - Enter: `visper.up.railway.app` (or your actual Railway domain)
   - Click **"Add"**

**✅ Your Railway domain is now authorized!**

---

## Step 3: Verify Everything is Working

### Test Locally

1. **Run your app locally:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - Go to: http://localhost:3001 (or your configured port)
   - You should see a "Sign in with Google" button
   - Click it and complete the Google sign-in flow
   - After signing in, you should see your profile picture/name in the top right

### Test on Railway

1. **Deploy your changes** (they should auto-deploy from GitHub)
2. **Visit your Railway URL:**
   - Go to: `https://visper.up.railway.app`
   - You should see the "Sign in with Google" button
   - Sign in and verify it works

---

## Step 4: Troubleshooting

### "Error: auth/unauthorized-domain"

**Problem:** Firebase is blocking sign-in from your domain.

**Solution:**
1. Go to Firebase Console → Authentication → Sign-in method
2. Scroll to "Authorized domains"
3. Make sure your Railway domain is listed
4. If not, add it (see Step 2 above)

### "Error: auth/popup-blocked"

**Problem:** Browser is blocking the Google sign-in popup.

**Solution:**
1. Check if popups are blocked in your browser
2. Allow popups for your site
3. Try signing in again

### "Error: auth/popup-closed-by-user"

**Problem:** User closed the sign-in popup window.

**Solution:**
- This is normal - just try signing in again

### Sign-In Button Not Showing

**Problem:** The login button doesn't appear or the page shows an error.

**Solution:**
1. Check browser console (F12) for errors
2. Verify Firebase environment variables are set in Railway:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - etc.
3. Make sure all Firebase client env vars start with `NEXT_PUBLIC_`

### Can't Save Entries After Signing In

**Problem:** You can sign in, but saving entries fails.

**Solution:**
1. Check Railway logs for errors
2. Verify Firebase Admin environment variables are set:
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
3. See `RAILWAY_ENV_SETUP.md` for details

---

## How It Works

### User Flow

1. **User visits your site** → Sees "Sign in with Google" button
2. **User clicks button** → Google sign-in popup appears
3. **User signs in with Google** → Firebase creates/updates user account
4. **User is authenticated** → Can now save entries, view history, etc.
5. **User signs out** → Click "Sign Out" button in top right

### Technical Details

- **Client-side:** Uses Firebase Auth SDK with Google provider
- **Server-side:** API routes verify Firebase ID tokens using Firebase Admin SDK
- **Security:** Each user can only access their own entries (enforced by Firestore rules)

---

## Next Steps

After setting up Google Sign-In:

1. ✅ **Test sign-in locally and on Railway**
2. ✅ **Verify entries save correctly after sign-in**
3. ✅ **Check that History shows only your entries**
4. ✅ **Test sign-out and sign-in again**

Your app now has secure, user-specific authentication! 🎉

---

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Sign-In Setup](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Auth with Next.js](https://firebase.google.com/docs/auth/web/start)

