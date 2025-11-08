# Railway Build Troubleshooting Guide

## Common Build Issues and Solutions

### Issue 1: Build Fails at "npm run build"

**Symptoms:**
- Build fails during the build phase
- Error messages about missing dependencies or TypeScript errors

**Solutions:**

1. **Check Environment Variables:**
   - Make sure all required environment variables are set in Railway
   - Go to your Railway service → Variables tab
   - Add all Firebase and Venice API keys

2. **Node Version:**
   - Railway should auto-detect Node.js version
   - If issues persist, create `.nvmrc` file with: `18` or `20`

3. **Build Command:**
   - Railway should use: `npm ci && npm run build`
   - This ensures clean install before build

### Issue 2: "Module not found" Errors

**Solution:**
- Make sure `package.json` has all dependencies listed
- Check that devDependencies are included (TypeScript, etc.)
- Railway installs both dependencies and devDependencies during build

### Issue 3: TypeScript Errors

**Solution:**
- Make sure `tsconfig.json` is properly configured
- Check for any TypeScript errors locally first: `npm run build`
- Fix any linting errors before deploying

### Issue 4: Firebase Admin SDK Errors

**Symptoms:**
- "Firebase Admin credentials not found"
- Service account errors

**Solution:**
- Make sure you've set these environment variables in Railway:
  - `FIREBASE_ADMIN_PROJECT_ID`
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY` (with `\n` characters preserved)
- OR set `FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH` (but this won't work on Railway - use env vars instead)

### Issue 5: Build Succeeds but App Crashes

**Symptoms:**
- Build completes but service fails to start

**Solutions:**

1. **Check Start Command:**
   - Should be: `npm start`
   - Railway should auto-detect this

2. **Check Port:**
   - Next.js uses port 3000 by default
   - Railway automatically sets `PORT` environment variable
   - Make sure your app uses `process.env.PORT || 3000`

3. **Check Logs:**
   - Go to Railway → Deployments → View logs
   - Look for runtime errors

### Issue 6: Environment Variables Not Loading

**Solution:**
- Environment variables starting with `NEXT_PUBLIC_` are available at build time
- Other variables are only available at runtime
- Make sure all variables are set in Railway dashboard

## Required Environment Variables for Railway

Make sure these are set in Railway (Service → Variables):

```
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# Firebase Admin (Private - use env vars, not file path)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=... (with \n preserved)

# Venice AI
VENICE_API_KEY=...
```

## Build Configuration Files

- `railway.json` - Railway-specific configuration
- `nixpacks.toml` - Nixpacks build configuration (optional)
- `next.config.js` - Next.js configuration (should NOT have `output: 'standalone'` for Railway)

## Testing Build Locally

Before deploying, test the build locally:

```bash
# Clean install
npm ci

# Build
npm run build

# Test production build
npm start
```

If this works locally, it should work on Railway.

## Railway-Specific Notes

1. **No Dockerfile needed** - Railway uses Nixpacks to auto-detect Next.js
2. **Port is auto-set** - Railway sets `PORT` environment variable automatically
3. **Build cache** - Railway caches `node_modules` between builds
4. **Auto-deploy** - Railway auto-deploys on git push if connected to GitHub

## Getting Help

1. Check Railway logs: Service → Deployments → View logs
2. Check build logs: Service → Deployments → Build logs
3. Test locally first: `npm run build && npm start`
4. Check Railway status page: https://status.railway.app

