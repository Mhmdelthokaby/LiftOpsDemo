// User utilities for role checking

export interface User {
    name: string;
    email: string;
    roles: string[];
}

export const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr) as User;
    } catch {
        return null;
    }
}

export const hasRole = (role: string): boolean => {
    const user = getUser();
    if (!user) return false;
    return user.roles.includes(role);
}

export const hasAnyRole = (roles: string[]): boolean => {
    const user = getUser();
    if (!user) return false;
    return roles.some(role => user.roles.includes(role));
}

// Manager can access everything
export const isManager = (): boolean => {
    return hasRole('Manager');
}

// Dashboard access - all authenticated users
export const canViewDashboard = (): boolean => {
    return getUser() !== null;
}

// Clients page - Manager and InstallationAdmin
export const canViewClients = (): boolean => {
    return hasAnyRole(['Manager', 'InstallationAdmin']);
}

// Projects page - Manager and InstallationAdmin
export const canViewProjects = (): boolean => {
    return hasAnyRole(['Manager', 'InstallationAdmin']);
}

export const canCreateOrEditProjects = (): boolean => {
    return hasAnyRole(['Manager', 'InstallationAdmin']);
}

// Installation Pipeline - Manager and InstallationAdmin
export const canViewInstallation = (): boolean => {
    return hasAnyRole(['Manager', 'InstallationAdmin']);
}

// Inventory - Manager and InventoryAdmin
export const canManageInventory = (): boolean => {
    return hasAnyRole(['Manager', 'InventoryAdmin']);
}

export const canViewInventory = (): boolean => {
    return hasAnyRole(['Manager', 'InventoryAdmin']);
}

// Technicians - Manager only
export const canManageTechnicians = (): boolean => {
    return hasRole('Manager');
}

// Maintenance - Manager and MaintenanceAdmin
export const canManageMaintenance = (): boolean => {
    return hasAnyRole(['Manager', 'MaintenanceAdmin']);
}

export const canViewMaintenance = (): boolean => {
    return hasAnyRole(['Manager', 'MaintenanceAdmin']);
}

// Emergency Tickets - Manager, FaultsAdmin, and MaintenanceAdmin
export const canViewEmergency = (): boolean => {
    return hasAnyRole(['Manager', 'FaultsAdmin', 'MaintenanceAdmin']);
}

// Finance - Manager and FinanceAdmin
export const canViewFinance = (): boolean => {
    return hasAnyRole(['Manager', 'FinanceAdmin']);
}

// Settings - Manager only
export const canViewSettings = (): boolean => {
    return hasRole('Manager');
}

// Check if user is a Technician
export const isTechnician = (): boolean => {
    return hasRole('Technician');
}

// Technicians can only view their assigned visits
export const canViewTechnicianVisits = (): boolean => {
    return isTechnician();
}
