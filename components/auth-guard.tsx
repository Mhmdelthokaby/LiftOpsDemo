"use client"

import { useEffect, useState } from "react"
import "@/lib/api-client"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated, getValidToken } from "@/lib/auth"
import { 
    canViewClients, 
    canViewProjects, 
    canViewInstallation, 
    canViewInventory, 
    canManageTechnicians, 
    canViewMaintenance, 
    canViewEmergency, 
    canViewFinance, 
    canViewSettings,
    isManager,
    isTechnician
} from "@/lib/user"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
    children: React.ReactNode
}

// Route to role checker mapping
const routeAccessMap: Record<string, () => boolean> = {
    '/': () => !isTechnician(), // Dashboard - all authenticated users except technicians
    '/technician/visits': () => isTechnician(), // Technician visits - only technicians
    '/clients': canViewClients,
    '/projects': canViewProjects,
    '/installation': canViewInstallation,
    '/inventory': canViewInventory,
    '/technicians': canManageTechnicians,
    '/maintenance': canViewMaintenance,
    '/emergency': canViewEmergency,
    '/finance': canViewFinance,
    '/settings': canViewSettings,
}

// Check if user has access to a route
const canAccessRoute = (pathname: string): boolean => {
    // Allow login page
    if (pathname === '/login') {
        return true
    }

    // Check exact match first
    if (routeAccessMap[pathname]) {
        return routeAccessMap[pathname]()
    }

    // Check if pathname starts with any protected route
    for (const [route, checker] of Object.entries(routeAccessMap)) {
        if (pathname.startsWith(route)) {
            return checker()
        }
    }

    // Default: allow access (for new routes or public routes)
    return true
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isChecking, setIsChecking] = useState(true)
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            // Allow access to login page
            if (pathname === '/login') {
                setIsAuthorized(true)
                setIsChecking(false)
                return
            }

            // Check if user is authenticated
            if (!isAuthenticated()) {
                router.push('/login')
                return
            }

            // Try to get valid token (will refresh if needed)
            const token = await getValidToken()
            if (!token) {
                router.push('/login')
                return
            }

            // Check role-based access
            if (!canAccessRoute(pathname)) {
                // Redirect to dashboard if user doesn't have access
                // Manager can access everything, so redirect others to their default page
                const userStr = localStorage.getItem('user')
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr)
                        const roles = user.roles || []
                        
                        // Redirect based on first available role
                        if (roles.includes('Technician')) {
                            router.push('/technician/visits')
                        } else if (roles.includes('Manager')) {
                            router.push('/')
                        } else if (roles.includes('InstallationAdmin')) {
                            router.push('/installation')
                        } else if (roles.includes('MaintenanceAdmin')) {
                            router.push('/maintenance?view=projects')
                        } else if (roles.includes('InventoryAdmin')) {
                            router.push('/inventory')
                        } else if (roles.includes('FinanceAdmin')) {
                            router.push('/finance')
                        } else if (roles.includes('FaultsAdmin')) {
                            router.push('/emergency')
                        } else {
                            router.push('/')
                        }
                    } catch {
                        router.push('/')
                    }
                } else {
                    router.push('/')
                }
                return
            }

            setIsAuthorized(true)
            setIsChecking(false)
        }

        checkAuth()
    }, [pathname, router])

    // Show loading state while checking authentication
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Checking authentication...</p>
                </div>
            </div>
        )
    }

    // Only render children if authorized
    if (!isAuthorized && pathname !== '/login') {
        return null
    }

    return <>{children}</>
}

