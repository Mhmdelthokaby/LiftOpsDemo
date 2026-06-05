/**
 * Centralized API Configuration
 * 
 * All API endpoints use this configuration to get the base URL from environment variables.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_API_URL: The base URL of the API server (default: http://localhost:5295)
 * 
 * Usage:
 *   import { API_BASE_URL } from '@/lib/api-config';
 *   const response = await fetch(`${API_BASE_URL}/api/endpoint`);
 */

/**
 * Get the API base URL from environment variables
 * Falls back to localhost:5295 if not set
 * 
 * IMPORTANT: In Next.js, environment variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
 * - For local development: Set in .env.local and restart dev server
 * - For Vercel: Set in Vercel dashboard and redeploy the application
 * 
 * NOTE: NEXT_PUBLIC_ variables are embedded at BUILD TIME, so you must rebuild/redeploy
 * after changing them in Vercel.
 */
// Updated API base URL handling
// Prefer the environment variable, but fall back to the current origin (useful for dev/proxy setups)
// and finally to a localhost default.
const getApiBaseUrl = (): string => {
  // Prefer explicit env var if set
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (envUrl) {
    return envUrl;
  }

  // If running in the browser, use the origin (e.g., http://localhost:3000)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Fallback for non-browser environments
  return "http://localhost:3000";
};

// Export as a function to ensure we always get the latest value (important for client-side code)
export const getApiBaseUrlValue = (): string => getApiBaseUrl();

// Export constant for backward compatibility (evaluated at module load time)
export const API_BASE_URL = getApiBaseUrl();

/**
 * Validate that API_BASE_URL is set (useful for debugging)
 */
if (typeof window !== 'undefined') {
    const currentUrl = getApiBaseUrl();
    const envValue = process.env.NEXT_PUBLIC_API_URL;
    
    // Always log in development, log warnings in production
    if (process.env.NODE_ENV === 'development') {
        console.log(`[API Config] Using API Base URL: ${currentUrl}`);
        console.log(`[API Config] Environment Variable NEXT_PUBLIC_API_URL:`, envValue || 'NOT SET');
    } else {
        // In production, log to help debug Vercel deployment issues
        console.log(`[API Config] API Base URL: ${currentUrl}`);
    }
    
    // Warn if still using default localhost in production
    if (currentUrl === "http://localhost:5295") {
        if (!envValue) {
            console.warn(`[API Config] ⚠️ WARNING: Using default localhost URL. NEXT_PUBLIC_API_URL is not set.`);
            console.warn(`[API Config] For Vercel: Set NEXT_PUBLIC_API_URL in Vercel dashboard and redeploy.`);
        } else {
            console.warn(`[API Config] ⚠️ WARNING: Environment variable is set but still using localhost.`);
            console.warn(`[API Config] This usually means you need to redeploy after changing the variable.`);
        }
    }
}
