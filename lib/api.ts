export interface DashboardSummary {
    totalProjects: number;
    activeInstallations: number;
    maintenanceDue: number;
    openEmergencies: number;
    emergencyOpen?: number;
    emergencyEnRoute?: number;
    emergencyInProgress?: number;
    emergencyResolved?: number;
    lowStockItems: number;
    revenueData: RevenueDataPoint[];
    projectStatusData: ProjectStatusDataPoint[];
    recentActivities: ActivityItemDto[];
}

export interface RevenueDataPoint {
    month: string;
    revenue: number;
    expenses: number;
}

export interface ProjectStatusDataPoint {
    name: string;
    value: number;
    color: string;
}

export interface ActivityItemDto {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    badge?: string;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    projectNumber?: string;
    status: string;
    createdAt?: string;
}

export interface InstallationProject {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerCity?: string;
    projectNumber: string;
    projectAddress?: string; // Project-specific address (can differ from customer address)
    city?: string;
    googleMapsLink?: string;
    status: string;
    contractDate: string;
    installationPricePerUnit: number;
    totalPrice: number;
    installationStartDate?: string;
    expectedFinishDate?: string;
    notes?: string;
    elevators: Elevator[];
}

export interface Elevator {
    id: string;
    elevatorType: string;
    floorsCount?: number;
    stopsCount?: number;
    numberOfFloors?: number;
    numberOfStops?: number;
    price: number; // Total fixed price of the elevator (never changes)
    paidAmount: number; // Sum of completed stage prices
    remainingAmount: number; // price - paidAmount
    stages: InstallationStage[];
}

export interface StageRequiredPart {
    id: string;
    inventoryItemId: string;
    inventoryItemName: string;
    inventoryItemNumber: string;
    quantity: number;
    isOutOfStock: boolean;
}

export interface StageTechnician {
    id: string;
    technicianId: string;
    technicianName: string;
}

export interface InstallationStage {
    id: string;
    stageNumber: number;
    status: string;
    startDate?: string;
    endDate?: string;
    stagePrice?: number;
    isPriceCollected: boolean;
    pdfPath?: string;
    notes?: string;
    supplyCost?: number;
    stageAdminId?: string; // Legacy field (kept for backward compatibility)
    requiredParts?: StageRequiredPart[];
    technicians?: StageTechnician[];
}

import { apiClient, parseResponse } from "./api-client";

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const response = await apiClient('/api/dashboard/summary', {
        method: "GET",
    });

    return parseResponse<DashboardSummary>(response);
};

export const getCustomers = async (): Promise<Customer[]> => {
    const response = await apiClient('/api/customers', {
        method: "GET",
    });

    return parseResponse<Customer[]>(response);
};

export interface UpdateCustomerDto {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    projectNumber?: string;
    googleMapsLink?: string;
}

export const updateCustomer = async (id: string, data: UpdateCustomerDto): Promise<void> => {
    const response = await apiClient(`/api/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    });

    await parseResponse(response);
};

export type CustomerStatus = "Approved" | "PendingInspectionQuotation" | "Rejected";

export const updateCustomerStatus = async (id: string, status: CustomerStatus): Promise<void> => {
    // Map frontend status to backend enum value
    const statusMap: Record<CustomerStatus, number> = {
        "Approved": 0,
        "PendingInspectionQuotation": 1,
        "Rejected": 2
    };

    const response = await apiClient(`/api/customers/${id}/status`, {
        method: "PUT",
        body: JSON.stringify(statusMap[status])
    });

    await parseResponse(response);
};

// Normalize phone number for comparison (remove spaces, dashes, parentheses)
const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    return phone.trim().replace(/\s+/g, '').replace(/[-()]/g, '');
};

// Search for customer by phone (required, unique) or email (optional, unique if provided)
export const searchCustomer = async (email?: string, phone?: string): Promise<Customer | null> => {
    if (!phone && !email) return null;

    try {
        const customers = await getCustomers();

        // Normalize search inputs
        const normalizedSearchPhone = phone ? normalizePhone(phone) : null;
        const normalizedSearchEmail = email ? email.trim().toLowerCase() : null;

        // Priority 1: Search by phone (required, unique)
        if (normalizedSearchPhone) {
            const foundByPhone = customers.find(c => {
                if (!c.phone) return false;
                const normalizedDbPhone = normalizePhone(c.phone);
                return normalizedDbPhone === normalizedSearchPhone;
            });
            if (foundByPhone) {
                console.log('Found customer by phone:', foundByPhone);
                return foundByPhone;
            }
        }

        // Priority 2: Search by email (optional, but unique if provided)
        if (normalizedSearchEmail) {
            const foundByEmail = customers.find(c => {
                if (!c.email) return false;
                const normalizedDbEmail = c.email.trim().toLowerCase();
                return normalizedDbEmail === normalizedSearchEmail;
            });
            if (foundByEmail) {
                console.log('Found customer by email:', foundByEmail);
                return foundByEmail;
            }
        }

        console.log('Customer not found. Search phone:', normalizedSearchPhone, 'Search email:', normalizedSearchEmail);
        console.log('Available customers:', customers.map(c => ({ phone: c.phone, email: c.email, name: c.name })));
        return null;
    } catch (error) {
        console.error('Error searching for customer:', error);
        return null;
    }
};

export const getProjects = async (status?: 'UnderInspectionAndQuotation' | 'Approved' | 'Rejected' | 'Active'): Promise<InstallationProject[]> => {
    const url = status
        ? `/api/installation/projects?status=${status}`
        : '/api/installation/projects';
    const response = await apiClient(url, {
        method: "GET",
    });

    const result = await parseResponse<{ data: InstallationProject[] } | InstallationProject[]>(response);

    // Handle both response formats: wrapped in Result or direct array
    if (Array.isArray(result)) {
        return result;
    }

    // If wrapped in Result format
    if (result && typeof result === 'object' && 'data' in result) {
        return (result as any).data || [];
    }

    return [];
};

export const checkProjectNumberExists = async (projectNumber: string): Promise<boolean> => {
    if (!projectNumber || projectNumber.trim() === "") {
        return false;
    }

    const response = await apiClient(`/api/installation/check-project-number?projectNumber=${encodeURIComponent(projectNumber)}`, {
        method: "GET",
    });

    const result = await parseResponse<{ data: boolean } | boolean>(response);

    // Handle both response formats
    if (typeof result === 'boolean') {
        return result;
    }

    // If wrapped in Result format
    if (result && typeof result === 'object' && 'data' in result) {
        return (result as any).data || false;
    }

    return false;
};

export const getProjectDetails = async (id: string): Promise<InstallationProject> => {
    const response = await apiClient(`/api/installation/project/${id}`, {
        method: "GET",
    });

    // Backend returns Result<InstallationProjectDto> which parseResponse handles
    // parseResponse will extract data.data and throw error if succeeded === false
    const result = await parseResponse<InstallationProject>(response);

    // Additional validation
    if (!result || !result.id) {
        throw new Error("Project not found");
    }

    return result;
};

export const createProject = async (data: any) => {
    const response = await apiClient('/api/installation/project/add', {
        method: "POST",
        body: JSON.stringify(data)
    });

    return parseResponse(response);
};

export const approveInspection = async (projectId: string): Promise<void> => {
    await apiClient(`/api/installation/project/${projectId}/approve-inspection`, {
        method: "POST",
    });
};

export const rejectProject = async (projectId: string): Promise<void> => {
    await apiClient(`/api/installation/project/${projectId}/reject`, {
        method: "POST",
    });
};

export const startStage = async (stageId: string, startDate?: string) => {
    const response = await apiClient('/api/installation/stage/start', {
        method: "POST",
        body: JSON.stringify({ stageId, startDate })
    });

    return parseResponse(response);
};

export interface TechnicianRating {
    technicianId: string;
    rating: number;
}

export const completeStage = async (
    stageId: string,
    supplyCost?: number,
    notes?: string,
    endDate?: string,
    price?: number,
    collectPrice?: boolean,
    freeMonths?: number,
    technicianRatings?: TechnicianRating[]
) => {
    const response = await apiClient('/api/installation/stage/complete', {
        method: "POST",
        body: JSON.stringify({
            stageId,
            supplyCost,
            notes,
            endDate,
            price,
            collectPrice: collectPrice ?? false,
            freeMonths,
            technicianRatings: technicianRatings ? technicianRatings.map(r => ({ technicianId: r.technicianId, rating: r.rating })) : undefined
        })
    });

    return parseResponse(response);
};

export const addStageParts = async (stageId: string, parts: { inventoryItemId: string, quantity: number }[]) => {
    const response = await apiClient('/api/installation/stage/parts', {
        method: "POST",
        body: JSON.stringify({ stageId, parts })
    });

    return parseResponse(response);
};

export interface UpdateStageDto {
    stageId: string;
    parts?: { inventoryItemId: string; quantity: number }[];
    notes?: string;
    supplyCost?: number;
    stagePrice?: number;
    endDate?: string;
    technicianIds?: string[];
}

export const updateStage = async (data: UpdateStageDto): Promise<void> => {
    const response = await apiClient('/api/Installation/stage/update', {
        method: 'PUT',
        body: JSON.stringify({
            stageId: data.stageId,
            parts: data.parts?.map(p => ({
                inventoryItemId: p.inventoryItemId,
                quantity: p.quantity
            })),
            notes: data.notes,
            supplyCost: data.supplyCost,
            stagePrice: data.stagePrice,
            endDate: data.endDate,
            technicianIds: data.technicianIds
        })
    });
    await parseResponse(response);
};

export const getStageDetails = async (stageId: string): Promise<InstallationStage> => {
    const response = await apiClient(`/api/Installation/stage/${stageId}`, {
        method: 'GET'
    });
    const result = await parseResponse<{ data: InstallationStage } | InstallationStage>(response);
    return (result as any).data || result;
};

// Inspection & Offer API functions
export interface InspectionRequest {
    id: string;
    clientId?: string; // Optional: Link to existing client
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    projectAddress: string;
    googleMapsLink?: string;
    numberOfElevatorsRequired: number;
    elevatorType: string;
    status: 'PendingInspection' | 'Inspected' | 'OfferSent' | 'OfferAccepted' | 'OfferRejected';
    notes?: string;
    createdAt: string;
    createdBy?: string;
    shaftType?: string;
    shaftWidth?: number;
    shaftDepth?: number;
    lastFloorHeight?: number;
    pitDepth?: number;
    travelHeight?: number;
    technicalNotes?: string;
    offer?: Offer;
    convertedToProjectId?: string;
}

export interface Offer {
    id: string;
    inspectionRequestId: string;
    installationPricePerUnit: number;
    totalInstallationPrice: number;
    estimatedStartDate: string;
    estimatedEndDate: string;
    status: 'WaitingForClientApproval' | 'Accepted' | 'Rejected';
    notes?: string;
    offerPdfPath?: string;
    createdAt: string;
    createdBy?: string;
}

export interface CreateInspectionRequestDto {
    clientId?: string; // Optional: Link to existing client
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    projectAddress: string;
    googleMapsLink?: string;
    numberOfElevatorsRequired: number;
    elevatorType: string;
    notes?: string;
}

export interface UpdateInspectionTechnicalDataDto {
    shaftType?: string;
    shaftWidth?: number;
    shaftDepth?: number;
    lastFloorHeight?: number;
    pitDepth?: number;
    travelHeight?: number;
    technicalNotes?: string;
}

export interface CreateOfferDto {
    inspectionRequestId: string;
    installationPricePerUnit: number;
    totalInstallationPrice: number;
    estimatedStartDate: string;
    estimatedEndDate: string;
    notes?: string;
}

export interface UpdateOfferDto {
    installationPricePerUnit?: number;
    totalInstallationPrice?: number;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    notes?: string;
}

export interface ApproveOfferDto {
    offerId: string;
    isAccepted: boolean;
    notes?: string;
}

export interface UpdateOfferPdfDto {
    offerId: string;
    offerPdfPath: string;
}

// Inspection API functions
export const createInspectionRequest = async (data: CreateInspectionRequestDto): Promise<string> => {
    const response = await apiClient('/api/Installation/inspection/create', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    const result = await parseResponse<{ data: string } | string>(response);
    return typeof result === 'string' ? result : (result as any).data || result;
};

export const updateInspectionTechnicalData = async (
    inspectionId: string,
    data: UpdateInspectionTechnicalDataDto
): Promise<void> => {
    const response = await apiClient(`/api/Installation/inspection/${inspectionId}/technical-data`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    await parseResponse(response);
};

export const getInspectionRequests = async (
    status?: 'PendingInspection' | 'Inspected' | 'OfferSent' | 'OfferAccepted' | 'OfferRejected'
): Promise<InspectionRequest[]> => {
    const url = status
        ? `/api/Installation/inspections?status=${status}`
        : '/api/Installation/inspections';
    const response = await apiClient(url, {
        method: 'GET'
    });
    const result = await parseResponse<{ data: InspectionRequest[] } | InspectionRequest[]>(response);
    return Array.isArray(result) ? result : (result as any).data || [];
};

export const getInspectionRequestDetails = async (id: string): Promise<InspectionRequest> => {
    const response = await apiClient(`/api/Installation/inspection/${id}`, {
        method: 'GET'
    });
    const result = await parseResponse<{ data: InspectionRequest } | InspectionRequest>(response);
    return (result as any).data || result;
};

// Offer API functions
export const createOffer = async (data: CreateOfferDto): Promise<string> => {
    const response = await apiClient('/api/Installation/offer/create', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    const result = await parseResponse<{ data: string } | string>(response);
    return typeof result === 'string' ? result : (result as any).data || result;
};

export const updateOffer = async (offerId: string, data: UpdateOfferDto): Promise<void> => {
    const response = await apiClient(`/api/Installation/offer/${offerId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    await parseResponse(response);
};

export const updateOfferPdf = async (offerId: string, offerPdfPath: string): Promise<void> => {
    const response = await apiClient(`/api/Installation/offer/${offerId}/pdf`, {
        method: 'PUT',
        body: JSON.stringify({ offerId, offerPdfPath })
    });
    await parseResponse(response);
};

export const approveOffer = async (offerId: string, data: ApproveOfferDto): Promise<void> => {
    data.offerId = offerId;
    const response = await apiClient(`/api/Installation/offer/${offerId}/approve`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    await parseResponse(response);
};

export const getOffers = async (
    status?: 'WaitingForClientApproval' | 'Accepted' | 'Rejected'
): Promise<Offer[]> => {
    const url = status
        ? `/api/Installation/offers?status=${status}`
        : '/api/Installation/offers';
    const response = await apiClient(url, {
        method: 'GET'
    });
    const result = await parseResponse<{ data: Offer[] } | Offer[]>(response);
    return Array.isArray(result) ? result : (result as any).data || [];
};

export const convertOfferToProject = async (offerId: string): Promise<string> => {
    const response = await apiClient(`/api/Installation/offer/${offerId}/convert-to-project`, {
        method: 'POST'
    });
    const result = await parseResponse<{ data: string } | string>(response);
    return typeof result === 'string' ? result : (result as any).data || result;
};

// Inventory API functions
export interface InventoryItem {
    id: string;
    name: string;
    itemNumber: string;
    categoryId: string;
    categoryName: string;
    unitPrice: number;
    stockQuantity: number;
    supplierName: string;
    addedByAdminName: string;
    createdAt: string;
    isDisabled: boolean;
}

export interface CreateInventoryItemDto {
    name: string;
    itemNumber: string;
    categoryId: string;
    unitPrice: number;
    stockQuantity: number;
    supplierName: string;
}

export interface UpdateInventoryItemDto {
    name: string;
    itemNumber: string;
    categoryId: string;
    unitPrice: number;
    stockQuantity: number;
    supplierName: string;
}

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    const response = await apiClient('/api/inventory/all', {
        method: "GET",
    });
    return await parseResponse<InventoryItem[]>(response);
};

export const getActiveInventoryItems = async (): Promise<InventoryItem[]> => {
    const response = await apiClient('/api/inventory/active', {
        method: "GET",
    });
    return await parseResponse<InventoryItem[]>(response);
};

export const createInventoryItem = async (data: CreateInventoryItemDto): Promise<string> => {
    const response = await apiClient('/api/inventory/add', {
        method: "POST",
        body: JSON.stringify(data),
    });
    const result = await parseResponse<{ id: string }>(response);
    return result.id;
};

export const updateInventoryItem = async (id: string, data: UpdateInventoryItemDto): Promise<void> => {
    const response = await apiClient(`/api/inventory/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export const disableInventoryItem = async (id: string, disable: boolean): Promise<void> => {
    const response = await apiClient(`/api/inventory/disable/${id}`, {
        method: "PUT",
        body: JSON.stringify(disable),
    });
    await parseResponse(response);
};

export const getInventoryTotalValue = async (): Promise<number> => {
    try {
        const response = await apiClient('/api/inventory/value', {
            method: "GET",
        });
        const result = await parseResponse<{ TotalValue: number }>(response);
        console.log("Inventory total value API response:", result);
        const value = result?.TotalValue ?? 0;
        console.log("Parsed inventory value:", value);
        return value;
    } catch (error: any) {
        console.error("Failed to fetch inventory total value:", error);
        console.error("Error details:", {
            message: error?.message,
            status: error?.status,
            data: error?.data
        });
        return 0;
    }
};

// Category API functions
export interface Category {
    id: string;
    name: string;
    description?: string;
}

export interface CreateCategoryDto {
    name: string;
    description?: string;
}

export const getCategories = async (): Promise<Category[]> => {
    const response = await apiClient('/api/category/list', {
        method: "GET",
    });
    return await parseResponse<Category[]>(response);
};

export const createCategory = async (data: CreateCategoryDto): Promise<string> => {
    const response = await apiClient('/api/category/add', {
        method: "POST",
        body: JSON.stringify(data),
    });
    const result = await parseResponse<{ id: string }>(response);
    return result.id;
};

export interface UpdateProjectData {
    customer: {
        name: string;
        phone: string;
        email: string;
        address: string;
        city: string;
        projectNumber: string;
        googleMapsLink?: string;
    };
    contract: {
        projectAddress?: string;
        city: string;
        googleMapsLink?: string;
        installationPricePerUnit: number;
        totalPrice: number;
        contractDate: string;
        installationStartDate?: string;
        expectedFinishDate?: string;
        notes?: string;
    };
}

export const updateProject = async (projectId: string, data: UpdateProjectData): Promise<void> => {
    const requestBody = {
        projectId,
        customer: data.customer,
        contract: data.contract
    };

    console.log('=== API CALL: updateProject ===')
    console.log('Project ID:', projectId)
    console.log('Request Body:', JSON.stringify(requestBody, null, 2))
    console.log('Request URL:', `/api/installation/project/${projectId}`)

    const response = await apiClient(`/api/installation/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status, response.statusText)

    await parseResponse(response);

    console.log('✅ API call completed successfully')
};

export interface UpdateElevatorData {
    elevatorType: string;
    floorsCount: number;
    stopsCount: number;
    numberOfFloors: number;
    numberOfStops: number;
    numberOfElevators: number;
    pitType: string;
    pitWidth: number;
    pitDepth: number;
    lastFloorHeight: number;
    holeDepth: number;
    travelLength: number;
    notes?: string;
    price: number;
}

export const updateElevator = async (elevatorId: string, data: UpdateElevatorData): Promise<void> => {
    console.log('=== API CALL: updateElevator ===')
    console.log('Elevator ID:', elevatorId)
    console.log('Request Body:', JSON.stringify(data, null, 2))
    console.log('Request URL:', `/api/installation/elevator/${elevatorId}`)

    const response = await apiClient(`/api/installation/elevator/${elevatorId}`, {
        method: "PUT",
        body: JSON.stringify(data)
    });

    console.log('Response status:', response.status, response.statusText)

    await parseResponse(response);

    console.log('✅ Elevator updated successfully')
};

// Technician API functions
export interface Technician {
    id: string;
    name: string;
    phone: string;
    specialization?: string;
    totalElevatorsInstalled: number;
    currentActiveElevatorsCount: number;
    overallRating?: number;
    isDisabled: boolean;
    leaderId?: string;
    leaderName?: string;
    isLeader: boolean;
    username?: string;
}

export interface CreateTechnicianDto {
    name: string;
    phone: string;
    specialization?: string;
    leaderId?: string;
    username?: string;
    password?: string;
}

export interface UpdateTechnicianDto {
    name: string;
    phone: string;
    specialization?: string;
    leaderId?: string;
    username?: string;
    password?: string;
}

export const getTechnicians = async (): Promise<Technician[]> => {
    const response = await apiClient('/api/Technician/all', {
        method: "GET",
    });
    return parseResponse<Technician[]>(response);
};

export const getAvailableTechnicians = async (): Promise<Technician[]> => {
    const response = await apiClient('/api/Technician/available', {
        method: "GET",
    });
    return parseResponse<Technician[]>(response);
};

export const createTechnician = async (data: CreateTechnicianDto): Promise<string> => {
    const response = await apiClient('/api/Technician/add', {
        method: "POST",
        body: JSON.stringify(data)
    });
    const result = await parseResponse<{ data: string } | { id: string }>(response);

    // Handle both response formats
    if (typeof result === 'string') {
        return result;
    }
    if (result && typeof result === 'object') {
        if ('data' in result) {
            return (result as any).data;
        }
        if ('id' in result) {
            return (result as any).id;
        }
    }
    throw new Error("Failed to get technician ID from response");
};

export const updateTechnician = async (id: string, data: UpdateTechnicianDto): Promise<void> => {
    const response = await apiClient(`/api/Technician/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    });
    await parseResponse(response);
};

export const disableTechnician = async (id: string, disable: boolean): Promise<void> => {
    const response = await apiClient(`/api/Technician/disable/${id}`, {
        method: "PUT",
        body: JSON.stringify(disable)
    });
    await parseResponse(response);
};

export const deleteTechnician = async (id: string): Promise<void> => {
    const response = await apiClient(`/api/Technician/delete/${id}`, {
        method: "DELETE"
    });
    await parseResponse(response);
};

// Emergency API functions
export interface EmergencyTicket {
    id: string;
    ticketNumber: number;
    project: string;
    location: string;
    unitId: string;
    googleMapsLink?: string;
    priority: "Low" | "Medium" | "High";
    status: "Open" | "EnRoute" | "InProgress" | "Resolved";
    description: string;
    reportedBy: string;
    reportedAt: string;
    contact: string;
    assignedTechnicianId?: string;
    assignedTechnicianName?: string;
    notes?: string;
    resolvedDate?: string;
}

export interface CreateEmergencyTicketDto {
    project: string;
    location: string;
    unitId: string;
    googleMapsLink?: string;
    priority: "Low" | "Medium" | "High";
    description: string;
    reportedBy: string;
    contact: string;
}

export interface UpdateEmergencyTicketDto {
    project: string;
    location: string;
    unitId: string;
    googleMapsLink?: string;
    priority: "Low" | "Medium" | "High";
    status: "Open" | "EnRoute" | "InProgress" | "Resolved";
    description: string;
    reportedBy: string;
    contact: string;
    assignedTechnicianId?: string;
    notes?: string;
}

export interface AssignEmergencyTechnicianDto {
    technicianId: string;
}

export const getEmergencyTickets = async (): Promise<EmergencyTicket[]> => {
    const response = await apiClient('/api/Emergency', {
        method: "GET",
    });
    return parseResponse<EmergencyTicket[]>(response);
};

export const getEmergencyTicketById = async (id: string): Promise<EmergencyTicket> => {
    const response = await apiClient(`/api/Emergency/${id}`, {
        method: "GET",
    });
    return parseResponse<EmergencyTicket>(response);
};

export const getOpenEmergencyTickets = async (): Promise<EmergencyTicket[]> => {
    const response = await apiClient('/api/Emergency/open', {
        method: "GET",
    });
    return parseResponse<EmergencyTicket[]>(response);
};

export const createEmergencyTicket = async (data: CreateEmergencyTicketDto): Promise<string> => {
    const response = await apiClient('/api/Emergency', {
        method: "POST",
        body: JSON.stringify(data),
    });
    const result = await parseResponse<{ data: string }>(response);
    return result.data || result as unknown as string;
};

export const updateEmergencyTicket = async (id: string, data: UpdateEmergencyTicketDto): Promise<void> => {
    const response = await apiClient(`/api/Emergency/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export const deleteEmergencyTicket = async (id: string): Promise<void> => {
    const response = await apiClient(`/api/Emergency/${id}`, {
        method: "DELETE",
    });
    await parseResponse(response);
};

export const assignEmergencyTechnician = async (id: string, technicianId: string): Promise<void> => {
    const response = await apiClient(`/api/Emergency/${id}/assign-technician`, {
        method: "PUT",
        body: JSON.stringify({ technicianId }),
    });
    await parseResponse(response);
};

export const resolveEmergencyTicket = async (id: string, notes?: string): Promise<void> => {
    const response = await apiClient(`/api/Emergency/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ notes }),
    });
    await parseResponse(response);
};

// ========== New Inspection Project Flow API Functions ==========

export interface InspectionProject {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    projectAddress: string;
    googleMapsLink?: string;
    projectStatus: 'UnderInspectionAndQuotation' | 'Approved' | 'Rejected' | 'Active';
    pitType: string;
    pitWidth: number;
    pitDepth: number;
    lastFloorHeight: number;
    holeDepth: number;
    travelLength: number;
    notes?: string;
    createdAt: string;
    quotation?: Quotation;
}

export interface Quotation {
    id: string;
    projectId: string;
    price: number;
    durationDays: number;
    durationNotes?: string;
    notes?: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
    attachments: QuotationAttachment[];
    createdAt: string;
}

export interface QuotationAttachment {
    id: string;
    fileName: string;
    filePath: string;
    contentType: string;
    fileSize: number;
}

export interface CreateInspectionProjectDto {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    projectAddress: string;
    googleMapsLink?: string;
    pitType: string;
    pitWidth: number;
    pitDepth: number;
    lastFloorHeight: number;
    holeDepth: number;
    travelLength: number;
    notes?: string;
}

export interface CreateQuotationDto {
    projectId: string;
    price: number;
    durationDays: number;
    durationNotes?: string;
    notes?: string;
    attachments?: QuotationAttachmentDto[];
}

export interface QuotationAttachmentDto {
    fileName: string;
    filePath: string;
    contentType: string;
    fileSize: number;
}

export interface ApproveRejectQuotationDto {
    quotationId: string;
    notes?: string;
}

export const createInspectionProject = async (data: CreateInspectionProjectDto): Promise<string> => {
    const response = await apiClient('/api/Installation/inspection-project/create', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    const result = await parseResponse<{ data: string } | string>(response);
    return typeof result === 'string' ? result : (result as any).data || result;
};

export const getInspectionProjects = async (
    status?: 'UnderInspectionAndQuotation' | 'Approved' | 'Rejected' | 'Active'
): Promise<InspectionProject[]> => {
    const url = status
        ? `/api/Installation/inspection-projects?status=${status}`
        : '/api/Installation/inspection-projects';
    const response = await apiClient(url, {
        method: 'GET'
    });
    const result = await parseResponse<{ data: InspectionProject[] } | InspectionProject[]>(response);
    return Array.isArray(result) ? result : (result as any).data || [];
};

export const createQuotation = async (data: CreateQuotationDto): Promise<string> => {
    const response = await apiClient('/api/Installation/quotation/create', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    const result = await parseResponse<{ data: string } | string>(response);
    return typeof result === 'string' ? result : (result as any).data || result;
};

export const approveQuotation = async (quotationId: string, notes?: string): Promise<void> => {
    const response = await apiClient(`/api/Installation/quotation/${quotationId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ quotationId, notes })
    });
    await parseResponse(response);
};

export const rejectQuotation = async (quotationId: string, notes?: string): Promise<void> => {
    const response = await apiClient(`/api/Installation/quotation/${quotationId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ quotationId, notes })
    });
    await parseResponse(response);
};

// ========== Maintenance Checklist Items API Functions ==========

export interface MaintenanceChecklistItem {
    id: string;
    title: string;
    description?: string;
    order: number;
    isActive: boolean;
}

export interface CreateMaintenanceChecklistItemDto {
    title: string;
    description?: string;
    order: number;
}

export interface UpdateMaintenanceChecklistItemDto {
    title: string;
    description?: string;
    order: number;
    isActive: boolean;
}

export const getMaintenanceChecklistItems = async (includeInactive: boolean = false): Promise<MaintenanceChecklistItem[]> => {
    const response = await apiClient(`/api/maintenance/checklist-item/list?includeInactive=${includeInactive}`, {
        method: "GET",
    });
    return await parseResponse<MaintenanceChecklistItem[]>(response);
};

// Get checklist items for technicians (uses technician endpoint)
export const getTechnicianChecklistItems = async (includeInactive: boolean = false): Promise<MaintenanceChecklistItem[]> => {
    const response = await apiClient(`/api/technician/checklist-items?includeInactive=${includeInactive}`, {
        method: "GET",
    });
    return await parseResponse<MaintenanceChecklistItem[]>(response);
};

export const createMaintenanceChecklistItem = async (data: CreateMaintenanceChecklistItemDto): Promise<string> => {
    const response = await apiClient('/api/maintenance/checklist-item/add', {
        method: "POST",
        body: JSON.stringify(data),
    });
    const result = await parseResponse<{ id: string }>(response);
    return result.id;
};

export const updateMaintenanceChecklistItem = async (id: string, data: UpdateMaintenanceChecklistItemDto): Promise<void> => {
    const response = await apiClient(`/api/maintenance/checklist-item/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export const deleteMaintenanceChecklistItem = async (id: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/checklist-item/${id}`, {
        method: "DELETE",
    });
    await parseResponse(response);
};

// ========== Maintenance Projects API Functions ==========

export interface MaintenanceContract {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerCity?: string;
    projectNumber: string;
    projectAddress?: string; // Project-specific address (can differ from customer address)
    city?: string;
    isFromInstallation: boolean;
    startDate: string;
    endDate: string;
    pricePerMonth: number;
    freeMonths: number;
    status: string;
    elevatorCount: number;
    technicianId?: string;
    technicianName?: string;
    createdAt: string;
}

export interface CreateMaintenanceProjectDto {
    customer: {
        name: string;
        phone: string;
        email: string;
        address: string;
        city?: string;
        projectNumber: string;
        googleMapsLink?: string;
    };
    contract: {
        projectNumber: string;
        projectAddress?: string;
        city?: string;
        startDate: string;
        endDate: string;
        pricePerMonth: number;
        freeMonths: number;
        notes?: string;
        technicianId?: string;
    };
    elevators: Array<{
        type: string;
        numberOfStops: number;
        numberOfFloors: number;
        notes?: string;
    }>;
}

export const getMaintenanceProjects = async (): Promise<MaintenanceContract[]> => {
    const response = await apiClient('/api/maintenance/projects', {
        method: "GET",
    });
    return await parseResponse<MaintenanceContract[]>(response);
};

export interface MaintenanceContractDetails {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerCity?: string;
    projectNumber: string;
    projectAddress?: string; // Project-specific address (can differ from customer address)
    city?: string; // Project city
    googleMapsLink?: string;
    isFromInstallation: boolean;
    startDate: string;
    endDate: string;
    pricePerMonth: number;
    freeMonths: number;
    status: string;
    frozenReason?: string;
    freezeEndDate?: string;
    technicianId?: string;
    technicianName?: string;
    createdAt: string;
    lastModifiedAt?: string;
    elevators: Array<{
        id: string;
        type: string;
        numberOfStops: number;
        numberOfFloors: number;
        nextMaintenanceDate?: string;
        status: string;
        installationElevatorId?: string;
        createdAt: string;
    }>;
}

export const getMaintenanceContractDetails = async (contractId: string): Promise<MaintenanceContractDetails> => {
    const response = await apiClient(`/api/maintenance/projects/${contractId}`, {
        method: "GET",
    });
    return await parseResponse<MaintenanceContractDetails>(response);
};

export interface UpdateMaintenanceContractDto {
    projectNumber: string;
    projectAddress?: string; // Project-specific address (can differ from customer address)
    city?: string; // Project city
    googleMapsLink?: string;
    startDate: string;
    endDate: string;
    pricePerMonth: number;
    freeMonths: number;
    technicianId?: string;
}

export const updateMaintenanceContract = async (contractId: string, data: UpdateMaintenanceContractDto): Promise<void> => {
    const response = await apiClient(`/api/maintenance/projects/${contractId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export interface UpdateMaintenanceElevatorDto {
    type: string;
    numberOfStops: number;
    numberOfFloors: number;
    nextMaintenanceDate?: string;
}

export const updateMaintenanceElevator = async (elevatorId: string, data: UpdateMaintenanceElevatorDto): Promise<void> => {
    const response = await apiClient(`/api/maintenance/elevators/${elevatorId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export interface MaintenanceVisitListDto {
    id: string;
    visitDate: string;
    status: string;
    notes?: string;
    paymentNotes?: string;
    isPaid: boolean;
    completedDate?: string;
    elevatorId: string;
    elevatorCode: string;
    technicianId?: string;
    checklistItems: Array<{
        checklistItemId: string;
        checklistItemTitle: string;
        isCompleted: boolean;
        notes?: string;
    }>;
}

export const getVisitsByContractAndMonth = async (contractId: string, month: number, year: number): Promise<MaintenanceVisitListDto[]> => {
    const response = await apiClient(`/api/maintenance/contract/${contractId}/visits?month=${month}&year=${year}`, {
        method: "GET",
    });
    return await parseResponse<MaintenanceVisitListDto[]>(response);
};

export interface MaintenanceStatistics {
    totalMaintenanceTasks: number;
    completedMaintenanceTasks: number;
    totalMustCollect: number;
    totalCollected: number;
    totalNotCollected: number;
    totalFreeProjects: number;
    totalPaidProjects: number;
}

export const getMaintenanceStatistics = async (month: number, year: number): Promise<MaintenanceStatistics> => {
    const response = await apiClient(`/api/maintenance/statistics?month=${month}&year=${year}`, {
        method: "GET",
    });
    return await parseResponse<MaintenanceStatistics>(response);
};

export interface MaintenanceElevator {
    id: string;
    elevatorCode: string;
    contractId: string;
    projectNumber: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerCity?: string;
    type: string;
    numberOfStops: number;
    numberOfFloors: number;
    nextMaintenanceDate?: string;
    status: string;
    contractStatus: string;
    createdAt: string;
    isFromInstallation: boolean;
}

export const getMaintenanceElevators = async (): Promise<MaintenanceElevator[]> => {
    const response = await apiClient('/api/maintenance/elevators', {
        method: "GET",
    });
    return await parseResponse<MaintenanceElevator[]>(response);
};

// Elevator Status Management
export const freezeElevator = async (elevatorId: string, reason?: string, freezeEndDate?: string): Promise<void> => {
    const body: { reason?: string; freezeEndDate?: string } = {};
    if (reason) body.reason = reason;
    if (freezeEndDate) body.freezeEndDate = freezeEndDate;

    const response = await apiClient(`/api/maintenance/elevator/${elevatorId}/freeze`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return await parseResponse<void>(response);
};

export const stopElevator = async (elevatorId: string, reason?: string): Promise<void> => {
    const body: { reason?: string } = {};
    if (reason) body.reason = reason;

    const response = await apiClient(`/api/maintenance/elevator/${elevatorId}/stop`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return await parseResponse<void>(response);
};

export const activateElevator = async (elevatorId: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/elevator/${elevatorId}/activate`, {
        method: "POST",
    });
    return await parseResponse<void>(response);
};

// Contract Status Management
export const freezeContract = async (contractId: string, reason?: string, freezeEndDate?: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/contract/${contractId}/freeze`, {
        method: "POST",
        body: JSON.stringify({ reason, freezeEndDate }),
    });
    return await parseResponse<void>(response);
};

export const stopContract = async (contractId: string, reason?: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/contract/${contractId}/stop`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });
    return await parseResponse<void>(response);
};

export const activateContract = async (contractId: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/contract/${contractId}/activate`, {
        method: "POST",
    });
    return await parseResponse<void>(response);
};

export const checkMaintenanceProjectNumber = async (projectNumber: string): Promise<boolean> => {
    const response = await apiClient(`/api/maintenance/check-project-number?projectNumber=${encodeURIComponent(projectNumber)}`, {
        method: "GET",
    });
    const result = await parseResponse<{ exists: boolean }>(response);
    return result.exists;
};

export const createMaintenanceProject = async (data: CreateMaintenanceProjectDto): Promise<string> => {
    const response = await apiClient('/api/maintenance/projects/create', {
        method: "POST",
        body: JSON.stringify(data),
    });
    const result = await parseResponse<{ data: string } | { id: string }>(response);

    if (typeof result === 'string') {
        return result;
    }
    if (result && typeof result === 'object') {
        if ('data' in result) {
            return (result as any).data;
        }
        if ('id' in result) {
            return (result as any).id;
        }
    }
    throw new Error("Failed to get project ID from response");
};

export const markVisitAsPaid = async (visitId: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/visit/${visitId}/mark-paid`, {
        method: "POST",
    });
    await parseResponse(response);
};

export interface ScheduleVisitDto {
    elevatorId: string;
    visitDate: string;
    technicianId?: string;
}

export interface CompleteVisitDto {
    visitId: string;
    notes: string;
    paymentNotes?: string;
    partsUsed: Array<{ itemId: string; quantity: number }>;
    checklistItems: Array<{
        checklistItemId: string;
        isCompleted: boolean; // true = good, false = medium/bad
        notes?: string;
        count?: number; // Count of items (e.g., 4 wires, 1 motor)
        percentage?: number; // Percentage value (e.g., 75%, 50%)
    }>;
}

export const scheduleVisit = async (dto: ScheduleVisitDto): Promise<string> => {
    const response = await apiClient('/api/maintenance/visit/schedule', {
        method: "POST",
        body: JSON.stringify(dto),
    });
    const result = await parseResponse<{ data: string } | { succeeded: boolean; data: string }>(response);
    // Handle different response formats
    if (typeof result === 'object' && 'data' in result) {
        return result.data;
    }
    if (typeof result === 'string') {
        return result;
    }
    throw new Error("Failed to get visit ID from response");
};

export const completeVisit = async (visitId: string, dto: CompleteVisitDto): Promise<void> => {
    const response = await apiClient(`/api/maintenance/visit/${visitId}/complete`, {
        method: "POST",
        body: JSON.stringify(dto),
    });
    await parseResponse(response);
};

// Complete visit using technician endpoint (for technicians)
export const completeVisitAsTechnician = async (visitId: string, dto: CompleteVisitDto): Promise<void> => {
    const response = await apiClient(`/api/technician/visits/${visitId}/complete`, {
        method: "POST",
        body: JSON.stringify(dto),
    });
    await parseResponse(response);
};

export interface MaintenanceVisitListItem {
    id: string;
    visitDate: string;
    status: string;
    notes?: string;
    paymentNotes?: string;
    isPaid: boolean;
    completedDate?: string;
    elevatorId: string;
    elevatorCode: string;
    technicianId?: string;
    checklistItems: Array<{
        checklistItemId: string;
        checklistItemTitle: string;
        isCompleted: boolean; // true = good, false = medium/bad
        notes?: string;
        count?: number; // Count of items (e.g., 4 wires, 1 motor)
        percentage?: number; // Percentage value (e.g., 75%, 50%)
    }>;
}

export const getVisitsByElevator = async (elevatorId: string, month?: number, year?: number): Promise<MaintenanceVisitListItem[]> => {
    let url = `/api/maintenance/elevator/${elevatorId}/visits`;
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const response = await apiClient(url, {
        method: "GET",
    });
    return await parseResponse<MaintenanceVisitListItem[]>(response);
};

export interface MaintenanceVisitDetails {
    id: string;
    visitDate: string;
    status: string;
    notes?: string;
    paymentNotes?: string;
    isPaid: boolean;
    completedDate?: string;
    elevatorId: string;
    elevatorCode: string;
    technicianId?: string;
    technicianName?: string;
    projectNumber?: string;
    customerName?: string;
    customerAddress?: string;
    checklistItems: Array<{
        checklistItemId: string;
        checklistItemTitle: string;
        isCompleted: boolean;
        notes?: string;
        count?: number;
        percentage?: number;
        status?: "good" | "medium" | "bad";
    }>;
    spareParts: Array<{
        itemId: string;
        itemName: string;
        quantity: number;
        priceAtTimeOfUsage: number;
        totalPrice: number;
        isPaid: boolean;
    }>;
}

export const getVisitDetails = async (visitId: string): Promise<MaintenanceVisitDetails> => {
    const response = await apiClient(`/api/maintenance/visit/${visitId}`, {
        method: "GET",
    });
    return await parseResponse<MaintenanceVisitDetails>(response);
};

export const downloadMaintenanceVisitPdf = async (visitId: string): Promise<Blob> => {
    const response = await apiClient(`/api/maintenance/visit/${visitId}/pdf`, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error("Failed to download PDF");
    }

    return await response.blob();
};

// ========== Admin Management API Functions ==========

export interface Admin {
    id: string;
    name: string;
    email: string;
    phone: string;
    roles: string[];
    isDisabled: boolean;
    lastLogin?: string;
}

export interface RegisterAdminDto {
    name: string;
    email: string;
    phone: string;
    password: string;
    roles: string[];
}

export interface UpdateAdminDto {
    name: string;
    email: string;
    phone: string;
    password?: string;
}

export const getAdmins = async (): Promise<Admin[]> => {
    const response = await apiClient('/api/Admin/list', {
        method: "GET",
    });
    return await parseResponse<Admin[]>(response);
};

export const registerAdmin = async (data: RegisterAdminDto): Promise<void> => {
    const response = await apiClient('/api/Admin/register', {
        method: "POST",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export const updateAdmin = async (id: string, data: UpdateAdminDto): Promise<void> => {
    const response = await apiClient(`/api/Admin/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

export const disableAdmin = async (id: string, disable: boolean): Promise<void> => {
    const response = await apiClient(`/api/Admin/disable/${id}`, {
        method: "PUT",
        body: JSON.stringify(disable),
    });
    await parseResponse(response);
};

export const assignRoles = async (id: string, roles: string[]): Promise<void> => {
    const response = await apiClient(`/api/Admin/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(roles),
    });
    await parseResponse(response);
};

// ========== Technician API Functions ==========

export interface TechnicianVisit {
    visitId: string;
    elevatorId: string;
    elevatorCode: string;
    contractId: string;
    projectNumber: string;
    projectName: string;
    projectNotes?: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    city: string;
    googleMapsLink?: string;
    visitDate: string;
    status: string;
    notes?: string;
    paymentNotes?: string;
    isPaid: boolean;
    completedDate?: string;
}

export interface AssignVisitToTechnicianDto {
    visitId: string;
    technicianId: string | null;
    assignmentDate: string;
    notes?: string;
}

export interface UpdateVisitStatusDto {
    visitId: string;
    status: string; // "InProgress" or "Done"
}

// Get technician's assigned visits for today
export const getTechnicianVisitsForToday = async (date?: string): Promise<TechnicianVisit[]> => {
    let url = '/api/technician/visits/today';
    if (date) {
        url += `?date=${date}`;
    }
    const response = await apiClient(url, {
        method: "GET",
    });
    return await parseResponse<TechnicianVisit[]>(response);
};

// Get technician's assigned emergency tickets
export const getTechnicianEmergencyTickets = async (): Promise<EmergencyTicket[]> => {
    const response = await apiClient('/api/technician/emergency-tickets', {
        method: "GET",
    });
    const result = await parseResponse<{ data: EmergencyTicket[] }>(response);
    return result.data || result as unknown as EmergencyTicket[];
};

// Get visit details for technician
export const getTechnicianVisitDetails = async (visitId: string): Promise<TechnicianVisit> => {
    const response = await apiClient(`/api/technician/visits/${visitId}`, {
        method: "GET",
    });
    return await parseResponse<TechnicianVisit>(response);
};

// Update visit status (InProgress, Done)
export const updateVisitStatus = async (visitId: string, status: string): Promise<void> => {
    const response = await apiClient(`/api/technician/visits/${visitId}/status`, {
        method: "PUT",
        body: JSON.stringify({ visitId, status }),
    });
    await parseResponse(response);
};

// Update visit status (for admins/maintenance admins)
export const updateVisitStatusAdmin = async (visitId: string, status: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/visit/${visitId}/status`, {
        method: "PUT",
        body: JSON.stringify({ visitId, status }),
    });
    await parseResponse(response);
};

// Assign visit to technician (admin only)
export const assignVisitToTechnician = async (data: AssignVisitToTechnicianDto): Promise<void> => {
    const response = await apiClient('/api/maintenance/visit/assign-technician', {
        method: "POST",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};

// Cancel/delete visit (set status to Cancelled)
export const cancelVisit = async (visitId: string): Promise<void> => {
    const response = await apiClient(`/api/maintenance/visit/${visitId}/status`, {
        method: "PUT",
        body: JSON.stringify({ visitId, status: "Cancelled" }),
    });
    await parseResponse(response);
};

// Cancel all incomplete visits for a specific date
export const cancelIncompleteVisitsByDate = async (date: Date): Promise<{ message: string; count: number }> => {
    const response = await apiClient('/api/maintenance/visits/cancel-incomplete-by-date', {
        method: "POST",
        body: JSON.stringify({ date: date.toISOString().split('T')[0] }),
    });
    return await parseResponse<{ message: string; count: number }>(response);
};

// Update visit order for a specific date
export const updateVisitOrder = async (date: Date, visitIds: string[]): Promise<void> => {
    // Format date as YYYY-MM-DD
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    console.log("Calling updateVisitOrder API:", { date: dateStr, visitIds })
    const response = await apiClient('/api/maintenance/visits/update-order', {
        method: "POST",
        body: JSON.stringify({
            date: dateStr,
            visitIds: visitIds
        }),
    });
    const result = await parseResponse(response);
    console.log("Update visit order response:", result)
};

// Get monthly schedule
export interface MonthlyScheduleVisit {
    id: string;
    visitDate: string;
    status: string;
    notes?: string;
    isPaid: boolean;
    technicianId?: string;
    technicianName: string;
    elevatorId: string;
    elevatorCode: string;
    elevatorType: string;
    elevatorStops: number;
    elevatorFloors: number;
    projectNumber: string;
    customerName: string;
    customerAddress: string;
}

export const getMonthlySchedule = async (month: number, year: number): Promise<MonthlyScheduleVisit[]> => {
    const response = await apiClient(`/api/maintenance/schedule/monthly?month=${month}&year=${year}`, {
        method: "GET",
    });
    return await parseResponse<MonthlyScheduleVisit[]>(response);
};

// Assign technicians to contract visits for a specific date
export interface AssignTechniciansToContractVisitsDto {
    contractId: string;
    technicianIds: string[];
    assignmentDate: string;
    notes?: string;
}

export const assignTechniciansToContractVisits = async (data: AssignTechniciansToContractVisitsDto): Promise<void> => {
    const response = await apiClient('/api/maintenance/contract/assign-technicians', {
        method: "POST",
        body: JSON.stringify(data),
    });
    await parseResponse(response);
};