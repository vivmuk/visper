# Deployment Guide - Whisper to Railway

## Why Railway?

Railway is recommended for Whisper because:
- ✅ Full Node.js environment (better for API routes, scraping, AI calls)
- ✅ Easy Postgres integration (for future semantic search with pgvector)
- ✅ Aligns with PRD architecture
- ✅ Simple environment variable management
- ✅ Automatic deployments from GitHub

## Step 1: Prepare for Deployment

### 1.1 Update package.json scripts
Make sure your `package.json` has:
```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 1.2 Create Railway configuration (already created: `railway.json`)

## Step 2: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (already done: https://github.com/vivmuk/visper)

2. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Sign in with GitHub

3. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `vivmuk/visper`

4. **Configure Environment Variables**
   Railway will detect it's a Next.js app. Add these environment variables:
   
   ```
   # Firebase Client (Public - safe to expose)
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAOtJ-mu-DfOkX2lb2_8IFXDMljP4osYCE
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=wisper-vivek.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=wisper-vivek
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=wisper-vivek.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=900654614613
   NEXT_PUBLIC_FIREBASE_APP_ID=1:900654614613:web:8619cb472c087d8139ecdc
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-66YWY2EVEP
   
   # Firebase Admin (Private - use service account JSON content)
   FIREBASE_ADMIN_PROJECT_ID=wisper-vivek
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@wisper-vivek.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDY6n6na+tDfHXW\na55uqQUg830f2jcni8YZsEdbcrrZGka8QknhzkwOp1SifgUBztuiSf9U4g0szBo0\nZV4XFp94Hxoyp4+lpR1/5W6uDy/FPqGrtIBwNK3y2Bc7M/eiJycfc5kYhLEhdtC2\nGn2HDegsIKQHX/NlILXiQ0cdiDang9gIorVMnfIjlbBh/vFuNzK5QCfnJqx/+C12\nCD63jijIisGfnC1eHUXIG9DoppXQU/eu9tFa2AH3ULvVNhCOt82Bc4JQIaFJwIgA\nYcQixKLTjQoR78PXjQm4wnMaIWnBYI4qWNzXd4YWMGHqBFd7/r926DtEPSb01orL\nwOLhSeW3AgMBAAECggEAALzzh2BPoaAnyn39QQUkNlN9xoD4lRLdrrKx23bNefWj\n7foPxEvuaFJbcF4baEEq8CduTfyi7NcY87qwkkWKb18zuJ5nV7nzGr9OHBuDHxmy\ndSIdGcSkHuJrWdE4c33MnUfIapPxAlskJKp8aNw8QQIvbLL/4gU1eTqfYFNZVEKV\n+1jUoS/hZusjndoVy+hcNq9ZuiDDyH2TDX0AmyUfQlCBReAj13LIFzSymD3dy/w+\nNtjA1FnGAlaIZfg8BJXTWVDIG+mJ2gtoJI7Hbn0eTxjJK7aoeyZVi/9jS5YEeCZe\nqP9dJzZmw9sgAD/+VkDpa8iu/ZcsTGm3cpjQVukXSQKBgQD55kUrF41fc95E6cVM\nM0qkaEEWMCjuhJTKYtE2LtB5wVagjWKV6cVeqpK9F7nOukI/U/bC6mdamUROQ9Dv\nJVsoj+NX6i2arKjETKkJz+viWu6qMqrOw9AVI2uYpzVelVhNU2UJ8DBf4pDjBqB+\n0iU6kRhmmsm6v6/Zl8xypI5/nQKBgQDeNhiwEgooJ6IkThecDfkLZQMwKTmKB5sD\nuHYQZp0TjKP1AtO+9VmUeZ34VY+/OHaDcf9HuBIbL4HTKVmqOnlrYepeaKdhyGta\nIN6fnNWKRNnDLGFu+9e1ED+OtktDOyQF3vXyYp+R0QXUjnIYqrZOJNSudsB3A8VG\nFKi+ndD8YwKBgQCsoXccyptd2jQslPU3q6Mfqel0g3ZzNuF2Ygc2j+Zyha3rIWB+\nQUyYFetidzZjaeYDy2QGyFj3jDNUgaKe4cZ0YdniTKKOXEIFwRNw9NJ1vu1qY6/9\nP+XKBHr6rF/A5Bho6ng9AlDYnDIMsvJCSbdwGvWpQ7qhqHO5NBUHCUhrPQKBgQCF\nF5ef1Z45wMtPvWpMsN3KolzPetGYx8dj6hbk6eEI9YK6XFAhHujhkho4xF6NpK7v\nOdcxyKEnoUO8CxdGazGQTJxIoZwnaBhMakWNCi2oXGaljK5q//KJ40p+GtdnVEPW\nNF3RKJr0hmJclljmR1Fb6plsSXorjpmYyQTs7q9eiwKBgQCzwrerx1Bp280H0Rqp\npg8aKVI8likeKFYF243zmgfCyapnUXZr+dVISCbxIRmJobkP6LTy38ZTx0ro/ct6\np1B+33RiUHVPDiAGD/gNsPHh5IbNTJ1eG4QHYs0zx7gOvUkbxfgRc/aNqMN+A2TE\nKogYBxZkOPA+/ZvrwkGhyMJXvA==\n-----END PRIVATE KEY-----
   
   # Venice AI
   VENICE_API_KEY=lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF
   ```

   **Important:** For `FIREBASE_ADMIN_PRIVATE_KEY`, copy the entire private key from your service account JSON file, including the `\n` characters (they represent newlines).

5. **Deploy**
   - Railway will automatically detect Next.js and start building
   - Wait for build to complete (usually 2-3 minutes)
   - Your app will be live at a Railway-provided URL

6. **Custom Domain (Optional)**
   - Go to Settings → Domains
   - Add your custom domain

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## Step 3: Update Firebase Admin Configuration

Since Railway doesn't have a file system for the service account JSON, we need to update the admin config to use environment variables instead.

The code in `lib/firebase/admin.ts` already supports both methods:
- Service account file path (for local dev)
- Environment variables (for production)

Make sure you set these in Railway:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## Step 4: Verify Deployment

1. Visit your Railway URL
2. Test creating an entry
3. Test URL summarization
4. Check the History tab

## Troubleshooting

### Build Fails
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure `package.json` has correct build scripts

### API Routes Not Working
- Check that environment variables are set correctly
- Verify Firebase Admin credentials
- Check Railway logs for errors

### Environment Variables Not Loading
- Make sure variables are set in Railway dashboard
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Alternative: Netlify Deployment

If you prefer Netlify:

1. **Connect GitHub repo** to Netlify
2. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
3. **Environment variables:** Add all the same variables
4. **Note:** Netlify uses serverless functions, which work but Railway is better for this use case

## Next Steps After Deployment

1. Set up custom domain
2. Configure Firebase Auth domains (add your Railway URL)
3. Test all features in production
4. Set up monitoring/analytics
5. Plan for Postgres + pgvector (Railway makes this easy)

## Cost Considerations

- **Railway:** Free tier includes $5 credit/month, then pay-as-you-go
- **Netlify:** Free tier with generous limits for Next.js

For this app, Railway's free tier should be sufficient initially.

