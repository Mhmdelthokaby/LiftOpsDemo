# Environment Setup Guide

## Setting Up API Domain

All API endpoints in the frontend use the `NEXT_PUBLIC_API_URL` environment variable from `.env.local` file.

### Steps to Configure:

1. **Create `.env.local` file** in the `liftops-frontend` directory (same level as `package.json`)

2. **Add your API URL**:
   ```env
   NEXT_PUBLIC_API_URL=https://liftops-management.runasp.net
   ```
   
   Or for local development:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5295
   ```

3. **Important**: 
   - **Restart your Next.js dev server** after creating or modifying `.env.local`
   - The environment variable must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
   - Do NOT include trailing slash in the URL

4. **Verify Configuration**:
   - Check browser console (F12) - you should see: `[API Config] Using API Base URL: <your-url>`
   - If you see warnings, check that `.env.local` exists and has the correct variable name

### Troubleshooting

**Problem**: Still using old URL (e.g., localhost:7241)

**Solutions**:
1. ✅ Make sure `.env.local` file exists in `liftops-frontend` directory
2. ✅ Check variable name is exactly `NEXT_PUBLIC_API_URL` (case-sensitive)
3. ✅ Restart Next.js dev server (`npm run dev` or `yarn dev`)
4. ✅ Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
5. ✅ Check browser console for the actual API URL being used
6. ✅ Verify `.env.local` is not in `.gitignore` (it should be ignored, but make sure it exists locally)

**Problem**: Environment variable not being read

**Solutions**:
1. ✅ Ensure file is named `.env.local` (not `.env` or `.env.local.example`)
2. ✅ Ensure file is in the root of `liftops-frontend` directory
3. ✅ Restart the dev server completely (stop and start again)
4. ✅ Check for typos in variable name: `NEXT_PUBLIC_API_URL`

### File Structure

```
liftops-frontend/
├── .env.local          ← Create this file
├── env.example        ← Example file (copy to .env.local)
├── lib/
│   ├── api-config.ts  ← Centralized API config
│   ├── api-client.ts  ← Uses API_BASE_URL
│   └── api.ts         ← All API functions
└── package.json
```

### Example `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://liftops-management.runasp.net

# For local development:
# NEXT_PUBLIC_API_URL=http://localhost:5295

# For production:
# NEXT_PUBLIC_API_URL=https://liftops-management.runasp.net
```

### Verification

After setting up, you can verify by:

1. Opening browser console (F12)
2. Looking for: `[API Config] Using API Base URL: <your-url>`
3. Making an API call and checking Network tab - requests should go to your configured domain

### All Files Using Environment Variable

All API calls go through these centralized files:
- `lib/api-config.ts` - Exports `API_BASE_URL` constant
- `lib/api-client.ts` - Uses `API_BASE_URL` for all fetch calls
- `lib/auth.ts` - Uses `API_BASE_URL` for login/refresh token
- `lib/api.ts` - All API functions use `apiClient` which uses `API_BASE_URL`

No hardcoded URLs exist in the codebase - everything uses the environment variable.
