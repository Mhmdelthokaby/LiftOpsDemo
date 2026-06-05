import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export interface AuthResponse {
    token: string;
    refreshToken: string;
    refreshTokenExpiry: string;
    name: string;
    email: string;
    roles: string[];
}

import { API_BASE_URL } from "./api-config";

export const loginAdmin = async (data: LoginFormData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/Admin/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        let errorMessage = "Login failed";
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    // Login endpoint returns data directly (not wrapped in Result)
    return result;
};

export const saveAuthDocs = (data: AuthResponse) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, roles: data.roles }));
    }
}

export const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}

// Check if JWT token is expired
export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    
    try {
        // JWT tokens have 3 parts separated by dots: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if token has expiration (exp claim)
        if (!payload.exp) return true;
        
        // exp is in seconds, Date.now() is in milliseconds
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        
        // Add 5 minute buffer to refresh before actual expiration
        return currentTime >= (expirationTime - 5 * 60 * 1000);
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true;
    }
}

// Get token expiration time
export const getTokenExpiration = (token: string | null): Date | null => {
    if (!token) return null;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.exp) return null;
        
        return new Date(payload.exp * 1000);
    } catch (error) {
        return null;
    }
}

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    return !isTokenExpired(token);
}

// Refresh token function
export const refreshToken = async (): Promise<AuthResponse | null> => {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('accessToken');
    const refreshTokenValue = localStorage.getItem('refreshToken');
    
    if (!token || !refreshTokenValue) {
        logout();
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/Admin/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: token,
                refreshToken: refreshTokenValue
            }),
        });
        
        if (!response.ok) {
            logout();
            return null;
        }
        
        const data: AuthResponse = await response.json();
        saveAuthDocs(data);
        return data;
    } catch (error) {
        console.error('Error refreshing token:', error);
        logout();
        return null;
    }
}

// Get current token or refresh if needed
export const getValidToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        logout();
        return null;
    }
    
    if (isTokenExpired(token)) {
        // Try to refresh the token
        const refreshed = await refreshToken();
        if (refreshed) {
            return refreshed.token;
        }
        return null;
    }
    
    return token;
}