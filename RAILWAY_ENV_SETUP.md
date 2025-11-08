# Railway Environment Variables Setup Guide

## Quick Fix: Set Firebase Admin Environment Variables

Your app is deployed but can't save entries because Firebase Admin credentials are missing. Follow these steps:

### Step 1: Go to Railway Dashboard

1. Visit: https://railway.app
2. Sign in and open your **Wisper** project
3. Click on your **service** (the deployed app)

### Step 2: Add Environment Variables

1. Click on the **"Variables"** tab (or go to **Settings** → **Variables**)
2. Add these **required** environment variables:

#### Firebase Admin Credentials (Required for saving entries)

```
FIREBASE_ADMIN_PROJECT_ID=wisper-vivek
```

```
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@wisper-vivek.iam.gserviceaccount.com
```

```
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDY6n6na+tDfHXW
a55uqQUg830f2jcni8YZsEdbcrrZGka8QknhzkwOp1SifgUBztuiSf9U4g0szBo0
ZV4XFp94Hxoyp4+lpR1/5W6uDy/FPqGrtIBwNK3y2Bc7M/eiJycfc5kYhLEhdtC2
Gn2HDegsIKQHX/NlILXiQ0cdiDang9gIorVMnfIjlbBh/vFuNzK5QCfnJqx/+C12
CD63jijIisGfnC1eHUXIG9DoppXQU/eu9tFa2AH3ULvVNhCOt82Bc4JQIaFJwIgA
YcQixKLTjQoR78PXjQm4wnMaIWnBYI4qWNzXd4YWMGHqBFd7/r926DtEPSb01orL
wOLhSeW3AgMBAAECggEAALzzh2BPoaAnyn39QQUkNlN9xoD4lRLdrrKx23bNefWj
7foPxEvuaFJbcF4baEEq8CduTfyi7NcY87qwkkWKb18zuJ5nV7nzGr9OHBuDHxmy
dSIdGcSkHuJrWdE4c33MnUfIapPxAlskJKp8aNw8QQIvbLL/4gU1eTqfYFNZVEKV
+1jUoS/hZusjndoVy+hcNq9ZuiDDyH2TDX0AmyUfQlCBReAj13LIFzSymD3dy/w+
NtjA1FnGAlaIZfg8BJXTWVDIG+mJ2gtoJI7Hbn0eTxjJK7aoeyZVi/9jS5YEeCZe
qP9dJzZmw9sgAD/+VkDpa8iu/ZcsTGm3cpjQVukXSQKBgQD55kUrF41fc95E6cVM
M0qkaEEWMCjuhJTKYtE2LtB5wVagjWKV6cVeqpK9F7nOukI/U/bC6mdamUROQ9Dv
JVsoj+NX6i2arKjETKkJz+viWu6qMqrOw9AVI2uYpzVelVhNU2UJ8DBf4pDjBqB+
0iU6kRhmmsm6v6/Zl8xypI5/nQKBgQDeNhiwEgooJ6IkThecDfkLZQMwKTmKB5sD
uHYQZp0TjKP1AtO+9VmUeZ34VY+/OHaDcf9HuBIbL4HTKVmqOnlrYepeaKdhyGta
IN6fnNWKRNnDLGFu+9e1ED+OtktDOyQF3vXyYp+R0QXUjnIYqrZOJNSudsB3A8VG
FKi+ndD8YwKBgQCsoXccyptd2jQslPU3q6Mfqel0g3ZzNuF2Ygc2j+Zyha3rIWB+
QUyYFetidzZjaeYDy2QGyFj3jDNUgaKe4cZ0YdniTKKOXEIFwRNw9NJ1vu1qY6/9
P+XKBHr6rF/A5Bho6ng9AlDYnDIMsvJCSbdwGvWpQ7qhqHO5NBUHCUhrPQKBgQCF
F5ef1Z45wMtPvWpMsN3KolzPetGYx8dj6hbk6eEI9YK6XFAhHujhkho4xF6NpK7v
OdcxyKEnoUO8CxdGazGQTJxIoZwnaBhMakWNCi2oXGaljK5q//KJ40p+GtdnVEPW
NF3RKJr0hmJclljmR1Fb6plsSXorjpmYyQTs7q9eiwKBgQCzwrerx1Bp280H0Rqp
pg8aKVI8likeKFYF243zmgfCyapnUXZr+dVISCbxIRmJobkP6LTy38ZTx0ro/ct6
p1B+33RiUHVPDiAGD/gNsPHh5IbNTJ1eG4QHYs0zx7gOvUkbxfgRc/aNqMN+A2TE
KogYBxZkOPA+/ZvrwkGhyMJXvA==
-----END PRIVATE KEY-----
```

**Important:** For `FIREBASE_ADMIN_PRIVATE_KEY`, you need to:
- Copy the ENTIRE private key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Keep the newlines (`\n`) - Railway will handle them automatically
- Make sure there are no extra spaces

#### Firebase Client (Public - Already set, but verify)

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAOtJ-mu-DfOkX2lb2_8IFXDMljP4osYCE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=wisper-vivek.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wisper-vivek
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=wisper-vivek.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=900654614613
NEXT_PUBLIC_FIREBASE_APP_ID=1:900654614613:web:8619cb472c087d8139ecdc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-66YWY2EVEP
```

#### Venice AI (Required for "Improve" feature)

```
VENICE_API_KEY=lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF
```

### Step 3: Redeploy

After adding the environment variables:

1. Railway will **automatically redeploy** when you save variables
2. Wait for the deployment to complete (check the **Deployments** tab)
3. Once deployed, try saving an entry again

### Step 4: Verify It's Working

1. Go to your deployed site: `https://visper.up.railway.app`
2. Try creating a journal entry
3. Click "Save Raw" or "Improve" then save
4. Check the browser console (F12) for any errors
5. Check Railway logs (Deployments → Latest → Logs) if there are still issues

### Troubleshooting

#### Still getting "Failed to save entry" error?

1. **Check Railway Logs:**
   - Go to Railway Dashboard → Your Service → Deployments
   - Click on the latest deployment
   - Check the logs for error messages
   - Look for "Firebase Admin initialization error" or similar

2. **Verify Environment Variables:**
   - Make sure all three Firebase Admin variables are set
   - Check that `FIREBASE_ADMIN_PRIVATE_KEY` includes the BEGIN/END lines
   - Ensure there are no extra spaces or quotes

3. **Check Firestore Rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Make sure rules allow writes (or that Admin SDK can bypass them)
   - Admin SDK should bypass rules, but verify your rules are published

4. **Test the API directly:**
   - Open browser console on your site
   - Try: `fetch('/api/entries', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId: 'test', type: 'note', rawText: 'test'})})`
   - Check the response for error details

### Need Help?

If you're still having issues:
1. Check Railway deployment logs for specific error messages
2. Check browser console (F12) for client-side errors
3. Verify all environment variables are set correctly in Railway

