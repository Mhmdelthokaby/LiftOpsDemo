# Vercel Deployment Guide - Environment Variables

## ⚠️ IMPORTANT: Why It's Still Using localhost:5295

If you changed `NEXT_PUBLIC_API_URL` in Vercel but still see `localhost:5295` in requests, **you need to redeploy** the application.

### Why This Happens

In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are **embedded at BUILD TIME** into the JavaScript bundle. This means:

1. ✅ Changing the variable in Vercel dashboard updates the value
2. ❌ But the **old value is still in the deployed code** until you redeploy
3. ✅ You **MUST trigger a new deployment** for changes to take effect

---

## Steps to Fix in Vercel

### Option 1: Redeploy via Dashboard (Recommended)

1. **Go to Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. **Verify** `NEXT_PUBLIC_API_URL` is set correctly:
   ```
   NEXT_PUBLIC_API_URL=https://liftops-management.runasp.net
   ```
4. **Go to Deployments tab**
5. **Click the three dots** (⋯) on the latest deployment
6. **Select "Redeploy"**
7. **Wait for deployment to complete**

### Option 2: Push a New Commit

1. Make any small change (add a comment, update a file)
2. Commit and push to your repository
3. Vercel will automatically deploy with the new environment variables

### Option 3: Force Redeploy via CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Deploy
vercel --prod
```

---

## Setting Environment Variables in Vercel

### Step-by-Step:

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Go to Settings** → **Environment Variables**
4. **Add/Edit Variable**:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://liftops-management.runasp.net`
   - **Environment**: Select all (Production, Preview, Development)
5. **Save**
6. **Redeploy** (see options above)

### Environment Variable Settings:

```
Variable Name: NEXT_PUBLIC_API_URL
Value: https://liftops-management.runasp.net
Environments: ☑ Production ☑ Preview ☑ Development
```

---

## Verification After Deployment

### 1. Check Browser Console

After redeploying, open your deployed app and check the browser console (F12):

**Expected Output:**
```
[API Config] API Base URL: https://liftops-management.runasp.net
```

**If you see:**
```
[API Config] API Base URL: http://localhost:5295
⚠️ WARNING: Using default localhost URL...
```

This means the environment variable is not set or the deployment didn't pick it up.

### 2. Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Check the login request URL - it should be:
   ```
   https://liftops-management.runasp.net/api/Admin/login
   ```
   NOT:
   ```
   http://localhost:5295/api/Admin/login
   ```

### 3. Check Vercel Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check **Build Logs**
4. Look for environment variables being loaded (they won't show the value for security)

---

## Troubleshooting

### Problem: Still using localhost after redeploy

**Solutions:**
1. ✅ Verify variable name is exactly `NEXT_PUBLIC_API_URL` (case-sensitive)
2. ✅ Check that variable is set for the correct environment (Production/Preview)
3. ✅ Make sure there are no spaces or quotes in the value
4. ✅ Clear browser cache and hard refresh (Ctrl+Shift+R)
5. ✅ Check Vercel build logs for any errors
6. ✅ Try redeploying again

### Problem: Variable not showing in build

**Solutions:**
1. ✅ Ensure variable is set for **all environments** (Production, Preview, Development)
2. ✅ Check that variable name starts with `NEXT_PUBLIC_` (required for client-side access)
3. ✅ Verify no typos in variable name
4. ✅ Make sure you're looking at the correct project in Vercel

### Problem: Works locally but not in Vercel

**Solutions:**
1. ✅ Check `.env.local` is NOT committed to git (it shouldn't be)
2. ✅ Set the variable in Vercel dashboard (don't rely on `.env.local` for production)
3. ✅ Verify the Vercel variable value matches your local `.env.local` value
4. ✅ Redeploy after setting the variable

---

## Quick Checklist

- [ ] Environment variable `NEXT_PUBLIC_API_URL` is set in Vercel dashboard
- [ ] Variable is set for Production environment (and Preview/Development if needed)
- [ ] Value is correct: `https://liftops-management.runasp.net` (no trailing slash)
- [ ] Application has been redeployed after setting/changing the variable
- [ ] Browser console shows correct API URL
- [ ] Network tab shows requests going to correct domain

---

## Example: Complete Setup

### 1. Vercel Dashboard Setup

```
Project: liftops-frontend
Settings → Environment Variables

Variable: NEXT_PUBLIC_API_URL
Value: https://liftops-management.runasp.net
Environments: ☑ Production ☑ Preview ☑ Development
```

### 2. Redeploy

- Go to Deployments → Click "Redeploy" on latest deployment

### 3. Verify

- Open deployed app → F12 → Console
- Should see: `[API Config] API Base URL: https://liftops-management.runasp.net`
- Try login → Network tab → Should see requests to `https://liftops-management.runasp.net/api/Admin/login`

---

## Important Notes

1. **Build Time vs Runtime**: `NEXT_PUBLIC_` variables are embedded at build time, not runtime
2. **Redeploy Required**: Always redeploy after changing environment variables
3. **No Trailing Slash**: Don't include trailing slash in the URL
4. **Case Sensitive**: Variable name must be exactly `NEXT_PUBLIC_API_URL`
5. **All Environments**: Set for Production, Preview, and Development if needed

---

## Still Having Issues?

If you've followed all steps and it's still not working:

1. Check Vercel build logs for errors
2. Verify the API URL is accessible (try opening `https://liftops-management.runasp.net/api/dashboard/summary` in browser)
3. Check CORS settings on your backend API
4. Contact Vercel support if deployment issues persist
