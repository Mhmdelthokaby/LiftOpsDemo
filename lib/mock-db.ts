import { 
    INITIAL_ADMINS,
    INITIAL_CATEGORIES,
    INITIAL_INVENTORY,
    INITIAL_TECHNICIANS,
    INITIAL_CUSTOMERS,
    INITIAL_INSTALLATION_PROJECTS,
    INITIAL_INSPECTIONS,
    INITIAL_OFFERS,
    INITIAL_TECHNICAL_INSPECTIONS,
    INITIAL_QUOTATIONS,
    INITIAL_EMERGENCIES,
    INITIAL_CHECKLIST,
    INITIAL_MAINTENANCE_CONTRACTS,
    INITIAL_MAINTENANCE_ELEVATORS,
    INITIAL_VISITS,
    INITIAL_ACTIVITIES
} from './mock-data';
import { 
    Customer, 
    InstallationProject, 
    InspectionRequest, 
    Offer, 
    InspectionProject as TechnicalInspectionProject, 
    Quotation, 
    InventoryItem, 
    Category, 
    Technician, 
    EmergencyTicket, 
    MaintenanceChecklistItem, 
    MaintenanceContract, 
    MaintenanceElevator, 
    MaintenanceVisitListDto,
    Admin,
    DashboardSummary,
    MaintenanceStatistics,
    MaintenanceVisitDetails,
    MaintenanceContractDetails
} from './api';

// Helper to generate UUIDs
const generateId = (): string => Math.random().toString(36).substring(2, 9);

// DB Initialization
export const initDb = () => {
    if (typeof window === 'undefined') return;

    const checkAndSet = (key: string, initialData: any) => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(initialData));
        }
    };

    checkAndSet('liftops_admins', INITIAL_ADMINS);
    checkAndSet('liftops_categories', INITIAL_CATEGORIES);
    checkAndSet('liftops_inventory', INITIAL_INVENTORY);
    checkAndSet('liftops_technicians', INITIAL_TECHNICIANS);
    checkAndSet('liftops_customers', INITIAL_CUSTOMERS);
    checkAndSet('liftops_installation_projects', INITIAL_INSTALLATION_PROJECTS);
    checkAndSet('liftops_inspection_requests', INITIAL_INSPECTIONS);
    checkAndSet('liftops_offers', INITIAL_OFFERS);
    checkAndSet('liftops_technical_inspections', INITIAL_TECHNICAL_INSPECTIONS);
    checkAndSet('liftops_quotations', INITIAL_QUOTATIONS);
    checkAndSet('liftops_emergencies', INITIAL_EMERGENCIES);
    checkAndSet('liftops_checklist', INITIAL_CHECKLIST);
    checkAndSet('liftops_maintenance_contracts', INITIAL_MAINTENANCE_CONTRACTS);
    checkAndSet('liftops_maintenance_elevators', INITIAL_MAINTENANCE_ELEVATORS);
    checkAndSet('liftops_visits', INITIAL_VISITS);
    checkAndSet('liftops_activities', INITIAL_ACTIVITIES);
};

// Generic storage accessors
const getTable = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    initDb();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const saveTable = <T>(key: string, data: T[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
};

const addActivity = (type: string, title: string, description: string, badge?: string) => {
    const activities = getTable<any>('liftops_activities');
    const newAct = {
        id: generateId(),
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        badge
    };
    saveTable('liftops_activities', [newAct, ...activities].slice(0, 50));
};

// Route matching and execution
export const handleMockRequest = async (method: string, urlStr: string, body: any): Promise<{ status: number; body: any }> => {
    const parsedUrl = new URL(urlStr, 'http://localhost');
    const path = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    console.log(`[Mock Server] Intercepted Request: ${method} ${path}`, { query, body });

    // Ensure DB is seeded
    initDb();

    try {
        // --- AUTH & ADMINS ---
        if (path === '/api/Admin/login' && method === 'POST') {
            const admins = getTable<Admin>('liftops_admins');
            const foundAdmin = admins.find(a => a.email === body.email) || admins[0]; // fallback to first admin for convenience
            
            // Create a fake JWT token with an exp claim far in the future
            const payload = {
                exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, // 1 year expiry
                email: foundAdmin.email,
                name: foundAdmin.name,
                roles: foundAdmin.roles
            };
            const token = `mockHeader.${btoa(JSON.stringify(payload))}.mockSignature`;
            
            return {
                status: 200,
                body: {
                    token,
                    refreshToken: `mock-refresh-${generateId()}`,
                    refreshTokenExpiry: new Date(Date.now() + 3600 * 24 * 30 * 1000).toISOString(), // 30 days
                    name: foundAdmin.name,
                    email: foundAdmin.email,
                    roles: foundAdmin.roles
                }
            };
        }

        if (path === '/api/Admin/refresh-token' && method === 'POST') {
            const admins = getTable<Admin>('liftops_admins');
            // Mock refresh payload decryption
            let name = "Demo Manager";
            let email = "admin@liftops.com";
            let roles = ["Manager"];
            try {
                const parts = body.token.split('.');
                const payload = JSON.parse(atob(parts[1]));
                name = payload.name;
                email = payload.email;
                roles = payload.roles;
            } catch {}

            const payload = {
                exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
                email,
                name,
                roles
            };
            const token = `mockHeader.${btoa(JSON.stringify(payload))}.mockSignature`;

            return {
                status: 200,
                body: {
                    token,
                    refreshToken: `mock-refresh-${generateId()}`,
                    refreshTokenExpiry: new Date(Date.now() + 3600 * 24 * 30 * 1000).toISOString(),
                    name,
                    email,
                    roles
                }
            };
        }

        if (path === '/api/Admin/list' && method === 'GET') {
            return { status: 200, body: getTable<Admin>('liftops_admins') };
        }

        if (path === '/api/Admin/register' && method === 'POST') {
            const admins = getTable<Admin>('liftops_admins');
            const newAdmin: Admin = {
                id: `admin-${generateId()}`,
                name: body.name,
                email: body.email,
                phone: body.phone,
                roles: body.roles || ["Manager"],
                isDisabled: false
            };
            admins.push(newAdmin);
            saveTable('liftops_admins', admins);
            addActivity('admin', 'Admin Registered', `New admin ${body.name} was registered.`, 'Admin');
            return { status: 200, body: { succeeded: true } };
        }

        if (path.startsWith('/api/Admin/update/') && method === 'PUT') {
            const id = path.split('/').pop();
            const admins = getTable<Admin>('liftops_admins');
            const index = admins.findIndex(a => a.id === id);
            if (index !== -1) {
                admins[index] = { ...admins[index], ...body };
                saveTable('liftops_admins', admins);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Admin not found"] } };
        }

        if (path.startsWith('/api/Admin/disable/') && method === 'PUT') {
            const id = path.split('/').pop();
            const admins = getTable<Admin>('liftops_admins');
            const index = admins.findIndex(a => a.id === id);
            if (index !== -1) {
                admins[index].isDisabled = body;
                saveTable('liftops_admins', admins);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Admin not found"] } };
        }

        if (path.startsWith('/api/Admin/roles/') && method === 'PUT') {
            const id = path.split('/').pop();
            const admins = getTable<Admin>('liftops_admins');
            const index = admins.findIndex(a => a.id === id);
            if (index !== -1) {
                admins[index].roles = body;
                saveTable('liftops_admins', admins);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Admin not found"] } };
        }

        // --- DASHBOARD SUMMARY ---
        if (path === '/api/dashboard/summary' && method === 'GET') {
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const emergencies = getTable<EmergencyTicket>('liftops_emergencies');
            const inventory = getTable<InventoryItem>('liftops_inventory');
            const activities = getTable<any>('liftops_activities');

            const activeInstallations = projects.filter(p => p.status === 'Active').length;
            const maintenanceDue = visits.filter(v => v.status === 'Scheduled').length;
            const openEmergencies = emergencies.filter(e => e.status !== 'Resolved').length;
            const lowStockItems = inventory.filter(i => i.stockQuantity < 5).length;

            const emergencyOpen = emergencies.filter(e => e.status === 'Open').length;
            const emergencyEnRoute = emergencies.filter(e => e.status === 'EnRoute').length;
            const emergencyInProgress = emergencies.filter(e => e.status === 'InProgress').length;
            const emergencyResolved = emergencies.filter(e => e.status === 'Resolved').length;

            const revenueData = [
                { month: 'Jan', revenue: 45000, expenses: 32000 },
                { month: 'Feb', revenue: 52000, expenses: 34000 },
                { month: 'Mar', revenue: 61000, expenses: 38000 },
                { month: 'Apr', revenue: 58000, expenses: 37000 },
                { month: 'May', revenue: 64000, expenses: 41000 },
                { month: 'Jun', revenue: 72000, expenses: 43000 }
            ];

            const statusCounts: Record<string, number> = {};
            projects.forEach(p => {
                statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
            });
            const projectStatusData = [
                { name: 'Active', value: statusCounts['Active'] || 0, color: '#3b82f6' },
                { name: 'Approved', value: statusCounts['Approved'] || 0, color: '#10b981' },
                { name: 'Under Inspection', value: statusCounts['UnderInspectionAndQuotation'] || 0, color: '#f59e0b' },
                { name: 'Rejected', value: statusCounts['Rejected'] || 0, color: '#ef4444' }
            ].filter(d => d.value > 0);

            const summary: DashboardSummary = {
                totalProjects: projects.length,
                activeInstallations,
                maintenanceDue,
                openEmergencies,
                emergencyOpen,
                emergencyEnRoute,
                emergencyInProgress,
                emergencyResolved,
                lowStockItems,
                revenueData,
                projectStatusData,
                recentActivities: activities
            };

            return { status: 200, body: { succeeded: true, data: summary } };
        }

        // --- CUSTOMERS ---
        if (path === '/api/customers' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<Customer>('liftops_customers') } };
        }

        if (path.startsWith('/api/customers/') && method === 'PUT') {
            const parts = path.split('/');
            const id = parts[3];
            const customers = getTable<Customer>('liftops_customers');
            const index = customers.findIndex(c => c.id === id);
            
            if (parts.length === 5 && parts[4] === 'status') {
                // Update status
                if (index !== -1) {
                    const statusMap: Record<number, string> = { 0: "Approved", 1: "PendingInspectionQuotation", 2: "Rejected" };
                    const statusName = statusMap[body] || "Approved";
                    customers[index].status = statusName;
                    saveTable('liftops_customers', customers);
                    return { status: 200, body: { succeeded: true } };
                }
            } else {
                // Update customer
                if (index !== -1) {
                    customers[index] = { ...customers[index], ...body };
                    saveTable('liftops_customers', customers);
                    addActivity('customer', 'Customer Updated', `Details for customer ${body.name} were updated.`);
                    return { status: 200, body: { succeeded: true } };
                }
            }
            return { status: 404, body: { succeeded: false, errors: ["Customer not found"] } };
        }

        // --- INSTALLATION PROJECTS ---
        if (path === '/api/installation/projects' && method === 'GET') {
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const status = query.status;
            const filtered = status ? projects.filter(p => p.status === status) : projects;
            return { status: 200, body: { succeeded: true, data: filtered } };
        }

        if (path === '/api/installation/check-project-number' && method === 'GET') {
            const projectNumber = query.projectNumber;
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const exists = projects.some(p => p.projectNumber === projectNumber);
            return { status: 200, body: { succeeded: true, data: exists } };
        }

        if (path.startsWith('/api/installation/project/') && method === 'GET') {
            const id = path.split('/').pop();
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const found = projects.find(p => p.id === id);
            if (found) {
                return { status: 200, body: { succeeded: true, data: found } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Project not found"] } };
        }

        if (path === '/api/installation/project/add' && method === 'POST') {
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const newProjId = `proj-${generateId()}`;
            
            // Build default elevators based on standard request format
            const elevators = Array.from({ length: body.numberOfElevators || 1 }, (_, i) => ({
                id: `elv-${generateId()}`,
                elevatorType: body.elevatorType || "Standard Passenger",
                stopsCount: body.stopsCount || 5,
                floorsCount: body.floorsCount || 5,
                numberOfStops: body.stopsCount || 5,
                numberOfFloors: body.floorsCount || 5,
                price: body.installationPricePerUnit || 20000,
                paidAmount: 0,
                remainingAmount: body.installationPricePerUnit || 20000,
                stages: Array.from({ length: 5 }, (_, sIndex) => ({
                    id: `stage-${generateId()}`,
                    stageNumber: sIndex + 1,
                    status: "Pending",
                    stagePrice: (body.installationPricePerUnit || 20000) / 5,
                    isPriceCollected: false
                }))
            }));

            const newProject: InstallationProject = {
                id: newProjId,
                customerId: body.customerId || `cust-${generateId()}`,
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                customerEmail: body.customerEmail,
                customerAddress: body.customerAddress || "",
                customerCity: body.customerCity,
                projectNumber: body.projectNumber,
                projectAddress: body.projectAddress || body.customerAddress,
                city: body.city || body.customerCity,
                googleMapsLink: body.googleMapsLink,
                status: "Approved",
                contractDate: body.contractDate || new Date().toISOString().split('T')[0],
                installationPricePerUnit: body.installationPricePerUnit || 20000,
                totalPrice: (body.installationPricePerUnit || 20000) * (body.numberOfElevators || 1),
                installationStartDate: body.installationStartDate,
                expectedFinishDate: body.expectedFinishDate,
                notes: body.notes,
                elevators
            };

            projects.push(newProject);
            saveTable('liftops_installation_projects', projects);

            // Also check if customer exists, else create customer
            const customers = getTable<Customer>('liftops_customers');
            if (!customers.some(c => c.phone === body.customerPhone)) {
                customers.push({
                    id: newProject.customerId,
                    name: body.customerName,
                    email: body.customerEmail,
                    phone: body.customerPhone,
                    address: body.customerAddress,
                    city: body.customerCity,
                    projectNumber: body.projectNumber,
                    status: "Approved",
                    createdAt: new Date().toISOString()
                });
                saveTable('liftops_customers', customers);
            }

            addActivity('project', 'Project Created', `Project ${body.projectNumber} for ${body.customerName} has been created.`, 'New');
            return { status: 200, body: { succeeded: true, data: newProjId } };
        }

        if (path.startsWith('/api/installation/project/') && method === 'PUT') {
            const id = path.split('/').pop();
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const index = projects.findIndex(p => p.id === id);
            if (index !== -1) {
                // The updateProject function sends a wrapper: { projectId, customer, contract }
                const updatedCustomer = body.customer;
                const updatedContract = body.contract;
                
                projects[index] = {
                    ...projects[index],
                    customerName: updatedCustomer.name,
                    customerPhone: updatedCustomer.phone,
                    customerEmail: updatedCustomer.email,
                    customerAddress: updatedCustomer.address,
                    customerCity: updatedCustomer.city,
                    projectNumber: updatedCustomer.projectNumber,
                    projectAddress: updatedContract.projectAddress,
                    city: updatedContract.city,
                    googleMapsLink: updatedContract.googleMapsLink,
                    installationPricePerUnit: updatedContract.installationPricePerUnit,
                    totalPrice: updatedContract.totalPrice,
                    contractDate: updatedContract.contractDate,
                    installationStartDate: updatedContract.installationStartDate,
                    expectedFinishDate: updatedContract.expectedFinishDate,
                    notes: updatedContract.notes
                };

                saveTable('liftops_installation_projects', projects);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Project not found"] } };
        }

        if (path.startsWith('/api/installation/project/') && path.endsWith('/approve-inspection') && method === 'POST') {
            const id = path.split('/')[4];
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const index = projects.findIndex(p => p.id === id);
            if (index !== -1) {
                projects[index].status = 'Active';
                saveTable('liftops_installation_projects', projects);
                addActivity('project', 'Inspection Approved', `Inspection project ${projects[index].projectNumber} approved and moved to active pipeline.`, 'Approved');
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Project not found"] } };
        }

        if (path.startsWith('/api/installation/project/') && path.endsWith('/reject') && method === 'POST') {
            const id = path.split('/')[4];
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const index = projects.findIndex(p => p.id === id);
            if (index !== -1) {
                projects[index].status = 'Rejected';
                saveTable('liftops_installation_projects', projects);
                addActivity('project', 'Project Rejected', `Project ${projects[index].projectNumber} was rejected.`);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Project not found"] } };
        }

        if (path.startsWith('/api/installation/elevator/') && method === 'PUT') {
            const elevatorId = path.split('/').pop();
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            
            let found = false;
            for (const proj of projects) {
                const elvIndex = proj.elevators.findIndex(e => e.id === elevatorId);
                if (elvIndex !== -1) {
                    proj.elevators[elvIndex] = {
                        ...proj.elevators[elvIndex],
                        elevatorType: body.elevatorType,
                        stopsCount: body.stopsCount,
                        floorsCount: body.floorsCount,
                        numberOfStops: body.stopsCount,
                        numberOfFloors: body.floorsCount,
                        price: body.price,
                        remainingAmount: body.price - proj.elevators[elvIndex].paidAmount
                    };
                    found = true;
                    break;
                }
            }

            if (found) {
                saveTable('liftops_installation_projects', projects);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Elevator not found"] } };
        }

        // --- INSTALLATION STAGES ---
        if (path === '/api/installation/stage/start' && method === 'POST') {
            const { stageId, startDate } = body;
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            let found = false;

            for (const proj of projects) {
                for (const elv of proj.elevators) {
                    const stage = elv.stages.find(s => s.id === stageId);
                    if (stage) {
                        stage.status = 'InProgress';
                        stage.startDate = startDate || new Date().toISOString().split('T')[0];
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (found) {
                saveTable('liftops_installation_projects', projects);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Stage not found"] } };
        }

        if (path === '/api/installation/stage/complete' && method === 'POST') {
            const { stageId, supplyCost, notes, endDate, price, collectPrice, freeMonths, technicianRatings } = body;
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            let foundStage: any = null;
            let foundElevator: any = null;
            let foundProject: any = null;

            for (const proj of projects) {
                for (const elv of proj.elevators) {
                    const stage = elv.stages.find(s => s.id === stageId);
                    if (stage) {
                        stage.status = 'Completed';
                        stage.endDate = endDate || new Date().toISOString().split('T')[0];
                        stage.supplyCost = supplyCost;
                        stage.notes = notes;
                        stage.isPriceCollected = collectPrice ?? false;
                        if (price !== undefined) {
                            stage.stagePrice = price;
                        }
                        
                        foundStage = stage;
                        foundElevator = elv;
                        foundProject = proj;
                        break;
                    }
                }
                if (foundStage) break;
            }

            if (foundStage) {
                // Recalculate elevator financial amounts
                const completedStagesSum = foundElevator.stages
                    .filter((s: any) => s.status === 'Completed')
                    .reduce((sum: number, s: any) => sum + (s.stagePrice || 0), 0);

                foundElevator.paidAmount = completedStagesSum;
                foundElevator.remainingAmount = foundElevator.price - completedStagesSum;

                // If this was the last stage, update project status
                const allCompleted = foundElevator.stages.every((s: any) => s.status === 'Completed');
                if (allCompleted && foundProject.status === 'Active') {
                    // Check if all elevators in project are done
                    const allElvsDone = foundProject.elevators.every((e: any) => e.stages.every((s: any) => s.status === 'Completed'));
                    if (allElvsDone) {
                        foundProject.status = 'Active'; // Keep active or set to completed
                    }
                }

                saveTable('liftops_installation_projects', projects);
                addActivity('project', 'Stage Completed', `Stage ${foundStage.stageNumber} for Elevator in ${foundProject.projectNumber} completed.`);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Stage not found"] } };
        }

        if (path === '/api/installation/stage/parts' && method === 'POST') {
            const { stageId, parts } = body; // parts: { inventoryItemId, quantity }[]
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const inventory = getTable<InventoryItem>('liftops_inventory');
            
            let foundStage: any = null;
            for (const proj of projects) {
                for (const elv of proj.elevators) {
                    const stage = elv.stages.find(s => s.id === stageId);
                    if (stage) {
                        foundStage = stage;
                        break;
                    }
                }
                if (foundStage) break;
            }

            if (!foundStage) {
                return { status: 404, body: { succeeded: false, errors: ["Stage not found"] } };
            }

            // Deduct parts from inventory and build requiredParts array
            if (!foundStage.requiredParts) foundStage.requiredParts = [];

            for (const part of parts) {
                const item = inventory.find(i => i.id === part.inventoryItemId);
                if (item) {
                    item.stockQuantity = Math.max(0, item.stockQuantity - part.quantity);
                    
                    foundStage.requiredParts.push({
                        id: generateId(),
                        inventoryItemId: item.id,
                        inventoryItemName: item.name,
                        inventoryItemNumber: item.itemNumber,
                        quantity: part.quantity,
                        isOutOfStock: item.stockQuantity === 0
                    });
                }
            }

            saveTable('liftops_inventory', inventory);
            saveTable('liftops_installation_projects', projects);
            return { status: 200, body: { succeeded: true } };
        }

        if (path === '/api/Installation/stage/update' && method === 'PUT') {
            const { stageId, parts, notes, supplyCost, stagePrice, endDate, technicianIds } = body;
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            const technicians = getTable<Technician>('liftops_technicians');
            
            let foundStage: any = null;
            let foundElevator: any = null;

            for (const proj of projects) {
                for (const elv of proj.elevators) {
                    const stage = elv.stages.find(s => s.id === stageId);
                    if (stage) {
                        foundStage = stage;
                        foundElevator = elv;
                        break;
                    }
                }
                if (foundStage) break;
            }

            if (foundStage) {
                if (notes !== undefined) foundStage.notes = notes;
                if (supplyCost !== undefined) foundStage.supplyCost = supplyCost;
                if (stagePrice !== undefined) foundStage.stagePrice = stagePrice;
                if (endDate !== undefined) foundStage.endDate = endDate;
                
                if (technicianIds !== undefined) {
                    foundStage.technicians = technicianIds.map((tid: string) => {
                        const tech = technicians.find(t => t.id === tid);
                        return {
                            id: generateId(),
                            technicianId: tid,
                            technicianName: tech ? tech.name : "Unknown Technician"
                        };
                    });
                }

                // If parts provided, update them
                if (parts !== undefined) {
                    const inventory = getTable<InventoryItem>('liftops_inventory');
                    foundStage.requiredParts = parts.map((p: any) => {
                        const item = inventory.find(i => i.id === p.inventoryItemId);
                        return {
                            id: generateId(),
                            inventoryItemId: p.inventoryItemId,
                            inventoryItemName: item ? item.name : "Unknown Part",
                            inventoryItemNumber: item ? item.itemNumber : "",
                            quantity: p.quantity,
                            isOutOfStock: item ? item.stockQuantity < p.quantity : true
                        };
                    });
                }

                // Recalculate paidAmount if completed
                const completedSum = foundElevator.stages
                    .filter((s: any) => s.status === 'Completed')
                    .reduce((sum: number, s: any) => sum + (s.stagePrice || 0), 0);
                foundElevator.paidAmount = completedSum;
                foundElevator.remainingAmount = foundElevator.price - completedSum;

                saveTable('liftops_installation_projects', projects);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Stage not found"] } };
        }

        if (path.startsWith('/api/Installation/stage/') && method === 'GET') {
            const stageId = path.split('/').pop();
            const projects = getTable<InstallationProject>('liftops_installation_projects');
            
            for (const proj of projects) {
                for (const elv of proj.elevators) {
                    const stage = elv.stages.find(s => s.id === stageId);
                    if (stage) {
                        return { status: 200, body: { succeeded: true, data: stage } };
                    }
                }
            }
            return { status: 404, body: { succeeded: false, errors: ["Stage not found"] } };
        }

        // --- INSPECTIONS & OFFERS ---
        if (path === '/api/Installation/inspection/create' && method === 'POST') {
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            const newId = `insp-${generateId()}`;
            const newInsp: InspectionRequest = {
                id: newId,
                clientId: body.clientId,
                clientName: body.clientName,
                clientPhone: body.clientPhone,
                clientEmail: body.clientEmail,
                projectAddress: body.projectAddress,
                googleMapsLink: body.googleMapsLink,
                numberOfElevatorsRequired: body.numberOfElevatorsRequired,
                elevatorType: body.elevatorType,
                status: 'PendingInspection',
                notes: body.notes,
                createdAt: new Date().toISOString()
            };
            inspections.push(newInsp);
            saveTable('liftops_inspection_requests', inspections);
            addActivity('inspection', 'Inspection Requested', `New inspection request for ${body.clientName} created.`, 'New');
            return { status: 200, body: { succeeded: true, data: newId } };
        }

        if (path.startsWith('/api/Installation/inspection/') && path.endsWith('/technical-data') && method === 'PUT') {
            const id = path.split('/')[4];
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            const index = inspections.findIndex(i => i.id === id);
            if (index !== -1) {
                inspections[index] = {
                    ...inspections[index],
                    ...body,
                    status: 'Inspected' // Move to inspected state
                };
                saveTable('liftops_inspection_requests', inspections);
                addActivity('inspection', 'Technical Data Updated', `Technical dimensions for ${inspections[index].clientName} uploaded.`);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Inspection request not found"] } };
        }

        if (path === '/api/Installation/inspections' && method === 'GET') {
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            const status = query.status;
            const filtered = status ? inspections.filter(i => i.status === status) : inspections;
            return { status: 200, body: { succeeded: true, data: filtered } };
        }

        if (path.startsWith('/api/Installation/inspection/') && method === 'GET') {
            const id = path.split('/').pop();
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            const found = inspections.find(i => i.id === id);
            if (found) {
                return { status: 200, body: { succeeded: true, data: found } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Inspection not found"] } };
        }

        if (path === '/api/Installation/offer/create' && method === 'POST') {
            const offers = getTable<Offer>('liftops_offers');
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            
            const offerId = `off-${generateId()}`;
            const newOffer: Offer = {
                id: offerId,
                inspectionRequestId: body.inspectionRequestId,
                installationPricePerUnit: body.installationPricePerUnit,
                totalInstallationPrice: body.totalInstallationPrice,
                estimatedStartDate: body.estimatedStartDate,
                estimatedEndDate: body.estimatedEndDate,
                status: 'WaitingForClientApproval',
                notes: body.notes,
                createdAt: new Date().toISOString(),
                createdBy: "Demo Manager"
            };

            offers.push(newOffer);
            saveTable('liftops_offers', offers);

            const inspIndex = inspections.findIndex(i => i.id === body.inspectionRequestId);
            if (inspIndex !== -1) {
                inspections[inspIndex].status = 'OfferSent';
                inspections[inspIndex].offer = newOffer;
                saveTable('liftops_inspection_requests', inspections);
            }

            addActivity('offer', 'Offer Created', `Financial offer of SAR ${body.totalInstallationPrice} created.`, 'Offer');
            return { status: 200, body: { succeeded: true, data: offerId } };
        }

        if (path.startsWith('/api/Installation/offer/') && method === 'PUT') {
            const offerId = path.split('/').pop();
            const offers = getTable<Offer>('liftops_offers');
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            
            const offIndex = offers.findIndex(o => o.id === offerId);
            if (offIndex !== -1) {
                offers[offIndex] = { ...offers[offIndex], ...body };
                saveTable('liftops_offers', offers);

                // Update inside inspection request if embedded
                const reqId = offers[offIndex].inspectionRequestId;
                const inspIndex = inspections.findIndex(i => i.id === reqId);
                if (inspIndex !== -1) {
                    inspections[inspIndex].offer = offers[offIndex];
                    saveTable('liftops_inspection_requests', inspections);
                }

                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Offer not found"] } };
        }

        if (path.startsWith('/api/Installation/offer/') && path.endsWith('/pdf') && method === 'PUT') {
            const offerId = path.split('/')[4];
            const offers = getTable<Offer>('liftops_offers');
            const index = offers.findIndex(o => o.id === offerId);
            if (index !== -1) {
                offers[index].offerPdfPath = body.offerPdfPath;
                saveTable('liftops_offers', offers);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Offer not found"] } };
        }

        if (path.startsWith('/api/Installation/offer/') && path.endsWith('/approve') && method === 'PUT') {
            const offerId = path.split('/')[4];
            const offers = getTable<Offer>('liftops_offers');
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');

            const offIndex = offers.findIndex(o => o.id === offerId);
            if (offIndex !== -1) {
                const isAccepted = body.isAccepted;
                offers[offIndex].status = isAccepted ? 'Accepted' : 'Rejected';
                offers[offIndex].notes = body.notes;
                saveTable('liftops_offers', offers);

                const reqId = offers[offIndex].inspectionRequestId;
                const inspIndex = inspections.findIndex(i => i.id === reqId);
                if (inspIndex !== -1) {
                    inspections[inspIndex].status = isAccepted ? 'OfferAccepted' : 'OfferRejected';
                    inspections[inspIndex].offer = offers[offIndex];
                    saveTable('liftops_inspection_requests', inspections);
                }

                addActivity('offer', isAccepted ? 'Offer Accepted' : 'Offer Rejected', `Client ${isAccepted ? 'approved' : 'rejected'} the offer.`, isAccepted ? 'Approved' : 'Rejected');
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Offer not found"] } };
        }

        if (path === '/api/Installation/offers' && method === 'GET') {
            const offers = getTable<Offer>('liftops_offers');
            const status = query.status;
            const filtered = status ? offers.filter(o => o.status === status) : offers;
            return { status: 200, body: { succeeded: true, data: filtered } };
        }

        if (path.startsWith('/api/Installation/offer/') && path.endsWith('/convert-to-project') && method === 'POST') {
            const offerId = path.split('/')[4];
            const offers = getTable<Offer>('liftops_offers');
            const inspections = getTable<InspectionRequest>('liftops_inspection_requests');
            const projects = getTable<InstallationProject>('liftops_installation_projects');

            const offer = offers.find(o => o.id === offerId);
            if (!offer) return { status: 404, body: { succeeded: false, errors: ["Offer not found"] } };

            const insp = inspections.find(i => i.id === offer.inspectionRequestId);
            if (!insp) return { status: 404, body: { succeeded: false, errors: ["Inspection request not found"] } };

            const projectNumber = `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
            const newProjId = `proj-${generateId()}`;
            
            const elevators = Array.from({ length: insp.numberOfElevatorsRequired }, (_, i) => ({
                id: `elv-${generateId()}`,
                elevatorType: insp.elevatorType,
                stopsCount: 5,
                floorsCount: 5,
                numberOfStops: 5,
                numberOfFloors: 5,
                price: offer.installationPricePerUnit,
                paidAmount: 0,
                remainingAmount: offer.installationPricePerUnit,
                stages: Array.from({ length: 5 }, (_, sIndex) => ({
                    id: `stage-${generateId()}`,
                    stageNumber: sIndex + 1,
                    status: "Pending",
                    stagePrice: offer.installationPricePerUnit / 5,
                    isPriceCollected: false
                }))
            }));

            const newProject: InstallationProject = {
                id: newProjId,
                customerId: insp.clientId || `cust-${generateId()}`,
                customerName: insp.clientName,
                customerPhone: insp.clientPhone,
                customerEmail: insp.clientEmail,
                customerAddress: insp.projectAddress,
                projectNumber,
                projectAddress: insp.projectAddress,
                status: "Approved",
                contractDate: new Date().toISOString().split('T')[0],
                installationPricePerUnit: offer.installationPricePerUnit,
                totalPrice: offer.totalInstallationPrice,
                notes: offer.notes,
                elevators
            };

            projects.push(newProject);
            saveTable('liftops_installation_projects', projects);

            insp.convertedToProjectId = newProjId;
            saveTable('liftops_inspection_requests', inspections);

            addActivity('project', 'Project Converted', `Offer converted into new project ${projectNumber}.`, 'Converted');
            return { status: 200, body: { succeeded: true, data: newProjId } };
        }

        // --- TECHNICAL INSPECTION PROJECTS ---
        if (path === '/api/Installation/inspection-project/create' && method === 'POST') {
            const list = getTable<TechnicalInspectionProject>('liftops_technical_inspections');
            const newId = `t-insp-${generateId()}`;
            const newItem: TechnicalInspectionProject = {
                id: newId,
                customerId: body.customerId || `cust-${generateId()}`,
                customerName: body.customerName || "Walk-in Customer",
                customerPhone: body.customerPhone || "",
                customerEmail: body.customerEmail || "",
                projectAddress: body.projectAddress,
                googleMapsLink: body.googleMapsLink,
                projectStatus: 'UnderInspectionAndQuotation',
                pitType: body.pitType,
                pitWidth: body.pitWidth,
                pitDepth: body.pitDepth,
                lastFloorHeight: body.lastFloorHeight,
                holeDepth: body.holeDepth,
                travelLength: body.travelLength,
                notes: body.notes,
                createdAt: new Date().toISOString()
            };
            list.push(newItem);
            saveTable('liftops_technical_inspections', list);
            return { status: 200, body: { succeeded: true, data: newId } };
        }

        if (path === '/api/Installation/inspection-projects' && method === 'GET') {
            const list = getTable<TechnicalInspectionProject>('liftops_technical_inspections');
            const status = query.status;
            const filtered = status ? list.filter(p => p.projectStatus === status) : list;
            return { status: 200, body: { succeeded: true, data: filtered } };
        }

        if (path === '/api/Installation/quotation/create' && method === 'POST') {
            const quotes = getTable<Quotation>('liftops_quotations');
            const projects = getTable<TechnicalInspectionProject>('liftops_technical_inspections');
            
            const qid = `q-${generateId()}`;
            const newQuote: Quotation = {
                id: qid,
                projectId: body.projectId,
                price: body.price,
                durationDays: body.durationDays,
                durationNotes: body.durationNotes,
                notes: body.notes,
                status: 'Pending',
                attachments: (body.attachments || []).map((a: any) => ({
                    id: generateId(),
                    fileName: a.fileName,
                    filePath: a.filePath,
                    contentType: a.contentType,
                    fileSize: a.fileSize
                })),
                createdAt: new Date().toISOString()
            };
            
            quotes.push(newQuote);
            saveTable('liftops_quotations', quotes);

            const index = projects.findIndex(p => p.id === body.projectId);
            if (index !== -1) {
                projects[index].quotation = newQuote;
                saveTable('liftops_technical_inspections', projects);
            }

            return { status: 200, body: { succeeded: true, data: qid } };
        }

        if (path.startsWith('/api/Installation/quotation/') && path.endsWith('/approve') && method === 'POST') {
            const qid = path.split('/')[4];
            const quotes = getTable<Quotation>('liftops_quotations');
            const projects = getTable<TechnicalInspectionProject>('liftops_technical_inspections');

            const qIndex = quotes.findIndex(q => q.id === qid);
            if (qIndex !== -1) {
                quotes[qIndex].status = 'Approved';
                quotes[qIndex].notes = body.notes;
                saveTable('liftops_quotations', quotes);

                const pid = quotes[qIndex].projectId;
                const pIndex = projects.findIndex(p => p.id === pid);
                if (pIndex !== -1) {
                    projects[pIndex].projectStatus = 'Approved';
                    projects[pIndex].quotation = quotes[qIndex];
                    saveTable('liftops_technical_inspections', projects);
                }
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Quotation not found"] } };
        }

        if (path.startsWith('/api/Installation/quotation/') && path.endsWith('/reject') && method === 'POST') {
            const qid = path.split('/')[4];
            const quotes = getTable<Quotation>('liftops_quotations');
            const projects = getTable<TechnicalInspectionProject>('liftops_technical_inspections');

            const qIndex = quotes.findIndex(q => q.id === qid);
            if (qIndex !== -1) {
                quotes[qIndex].status = 'Rejected';
                quotes[qIndex].notes = body.notes;
                saveTable('liftops_quotations', quotes);

                const pid = quotes[qIndex].projectId;
                const pIndex = projects.findIndex(p => p.id === pid);
                if (pIndex !== -1) {
                    projects[pIndex].projectStatus = 'Rejected';
                    projects[pIndex].quotation = quotes[qIndex];
                    saveTable('liftops_technical_inspections', projects);
                }
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Quotation not found"] } };
        }

        // --- INVENTORY ---
        if (path === '/api/inventory/all' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<InventoryItem>('liftops_inventory') } };
        }

        if (path === '/api/inventory/active' && method === 'GET') {
            const active = getTable<InventoryItem>('liftops_inventory').filter(i => !i.isDisabled);
            return { status: 200, body: { succeeded: true, data: active } };
        }

        if (path === '/api/inventory/add' && method === 'POST') {
            const items = getTable<InventoryItem>('liftops_inventory');
            const id = `inv-${generateId()}`;
            const categories = getTable<Category>('liftops_categories');
            const cat = categories.find(c => c.id === body.categoryId);

            const newItem: InventoryItem = {
                id,
                name: body.name,
                itemNumber: body.itemNumber,
                categoryId: body.categoryId,
                categoryName: cat ? cat.name : "Unassigned",
                unitPrice: body.unitPrice,
                stockQuantity: body.stockQuantity,
                supplierName: body.supplierName,
                addedByAdminName: "Demo Manager",
                createdAt: new Date().toISOString(),
                isDisabled: false
            };
            items.push(newItem);
            saveTable('liftops_inventory', items);
            addActivity('inventory', 'Inventory Added', `Item ${body.name} was added to inventory.`);
            return { status: 200, body: { succeeded: true, id } };
        }

        if (path.startsWith('/api/inventory/update/') && method === 'PUT') {
            const id = path.split('/').pop();
            const items = getTable<InventoryItem>('liftops_inventory');
            const index = items.findIndex(i => i.id === id);
            if (index !== -1) {
                items[index] = { ...items[index], ...body };
                saveTable('liftops_inventory', items);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Inventory item not found"] } };
        }

        if (path.startsWith('/api/inventory/disable/') && method === 'PUT') {
            const id = path.split('/').pop();
            const items = getTable<InventoryItem>('liftops_inventory');
            const index = items.findIndex(i => i.id === id);
            if (index !== -1) {
                items[index].isDisabled = body; // body is boolean
                saveTable('liftops_inventory', items);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Inventory item not found"] } };
        }

        if (path === '/api/inventory/value' && method === 'GET') {
            const items = getTable<InventoryItem>('liftops_inventory');
            const totalValue = items.reduce((sum, item) => sum + (item.stockQuantity * item.unitPrice), 0);
            return { status: 200, body: { succeeded: true, TotalValue: totalValue } };
        }

        if (path === '/api/category/list' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<Category>('liftops_categories') } };
        }

        if (path === '/api/category/add' && method === 'POST') {
            const list = getTable<Category>('liftops_categories');
            const id = `cat-${generateId()}`;
            list.push({ id, name: body.name, description: body.description });
            saveTable('liftops_categories', list);
            return { status: 200, body: { succeeded: true, id } };
        }

        // --- TECHNICIANS ---
        if (path === '/api/Technician/all' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<Technician>('liftops_technicians') } };
        }

        if (path === '/api/Technician/available' && method === 'GET') {
            const list = getTable<Technician>('liftops_technicians').filter(t => !t.isDisabled);
            return { status: 200, body: { succeeded: true, data: list } };
        }

        if (path === '/api/Technician/add' && method === 'POST') {
            const list = getTable<Technician>('liftops_technicians');
            const id = `tech-${generateId()}`;
            const leaders = list.filter(t => t.isLeader);
            const leader = leaders.find(l => l.id === body.leaderId);

            const newItem: Technician = {
                id,
                name: body.name,
                phone: body.phone,
                specialization: body.specialization,
                totalElevatorsInstalled: 0,
                currentActiveElevatorsCount: 0,
                isDisabled: false,
                isLeader: false,
                leaderId: body.leaderId,
                leaderName: leader ? leader.name : undefined,
                username: body.username
            };
            list.push(newItem);
            saveTable('liftops_technicians', list);
            addActivity('technician', 'Technician Added', `Technician ${body.name} was added.`, 'New');
            return { status: 200, body: { succeeded: true, id } };
        }

        if (path.startsWith('/api/Technician/update/') && method === 'PUT') {
            const id = path.split('/').pop();
            const list = getTable<Technician>('liftops_technicians');
            const index = list.findIndex(t => t.id === id);
            if (index !== -1) {
                list[index] = { ...list[index], ...body };
                saveTable('liftops_technicians', list);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Technician not found"] } };
        }

        if (path.startsWith('/api/Technician/disable/') && method === 'PUT') {
            const id = path.split('/').pop();
            const list = getTable<Technician>('liftops_technicians');
            const index = list.findIndex(t => t.id === id);
            if (index !== -1) {
                list[index].isDisabled = body;
                saveTable('liftops_technicians', list);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Technician not found"] } };
        }

        if (path.startsWith('/api/Technician/delete/') && method === 'DELETE') {
            const id = path.split('/').pop();
            const list = getTable<Technician>('liftops_technicians');
            const filtered = list.filter(t => t.id !== id);
            saveTable('liftops_technicians', filtered);
            return { status: 200, body: { succeeded: true } };
        }

        // --- EMERGENCY ---
        if (path === '/api/Emergency' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<EmergencyTicket>('liftops_emergencies') } };
        }

        if (path === '/api/Emergency/open' && method === 'GET') {
            const open = getTable<EmergencyTicket>('liftops_emergencies').filter(e => e.status !== 'Resolved');
            return { status: 200, body: { succeeded: true, data: open } };
        }

        if (path.startsWith('/api/Emergency/') && method === 'GET') {
            const id = path.split('/').pop();
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            const ticket = list.find(t => t.id === id);
            if (ticket) {
                return { status: 200, body: { succeeded: true, data: ticket } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Ticket not found"] } };
        }

        if (path === '/api/Emergency' && method === 'POST') {
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            const id = `emg-${generateId()}`;
            const maxTicketNumber = list.reduce((max, t) => Math.max(max, t.ticketNumber || 0), 1000);
            
            const newTicket: EmergencyTicket = {
                id,
                ticketNumber: maxTicketNumber + 1,
                project: body.project,
                location: body.location,
                unitId: body.unitId,
                googleMapsLink: body.googleMapsLink,
                priority: body.priority || "Medium",
                status: "Open",
                description: body.description,
                reportedBy: body.reportedBy,
                reportedAt: new Date().toISOString(),
                contact: body.contact
            };

            list.push(newTicket);
            saveTable('liftops_emergencies', list);
            addActivity('emergency', 'Emergency Reported', `Ticket #${newTicket.ticketNumber} opened at ${body.project}.`, 'Emergency');
            return { status: 200, body: { succeeded: true, data: id } };
        }

        if (path.startsWith('/api/Emergency/') && method === 'PUT') {
            const id = path.split('/').pop();
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            const index = list.findIndex(t => t.id === id);
            if (index !== -1) {
                const technicians = getTable<Technician>('liftops_technicians');
                const tech = technicians.find(t => t.id === body.assignedTechnicianId);
                
                list[index] = { 
                    ...list[index], 
                    ...body,
                    assignedTechnicianName: tech ? tech.name : undefined
                };
                saveTable('liftops_emergencies', list);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Ticket not found"] } };
        }

        if (path.startsWith('/api/Emergency/') && method === 'DELETE') {
            const id = path.split('/').pop();
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            const filtered = list.filter(t => t.id !== id);
            saveTable('liftops_emergencies', filtered);
            return { status: 200, body: { succeeded: true } };
        }

        if (path.startsWith('/api/Emergency/') && path.endsWith('/assign-technician') && method === 'PUT') {
            const id = path.split('/')[3];
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            const index = list.findIndex(t => t.id === id);
            if (index !== -1) {
                const technicians = getTable<Technician>('liftops_technicians');
                const tech = technicians.find(t => t.id === body.technicianId);
                
                list[index].assignedTechnicianId = body.technicianId;
                list[index].assignedTechnicianName = tech ? tech.name : "Unknown Technician";
                list[index].status = "EnRoute";
                
                saveTable('liftops_emergencies', list);
                addActivity('emergency', 'Technician Assigned', `Tech ${list[index].assignedTechnicianName} assigned to Emergency Ticket #${list[index].ticketNumber}.`);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Ticket not found"] } };
        }

        if (path.startsWith('/api/Emergency/') && path.endsWith('/resolve') && method === 'POST') {
            const id = path.split('/')[3];
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            const index = list.findIndex(t => t.id === id);
            if (index !== -1) {
                list[index].status = "Resolved";
                list[index].notes = body.notes;
                list[index].resolvedDate = new Date().toISOString();
                
                saveTable('liftops_emergencies', list);
                addActivity('emergency', 'Emergency Resolved', `Ticket #${list[index].ticketNumber} was marked resolved.`);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Ticket not found"] } };
        }

        // --- MAINTENANCE CHECKLIST ---
        if (path === '/api/maintenance/checklist-item/list' && method === 'GET') {
            const list = getTable<MaintenanceChecklistItem>('liftops_checklist');
            const includeInactive = query.includeInactive === 'true';
            const filtered = includeInactive ? list : list.filter(i => i.isActive);
            return { status: 200, body: { succeeded: true, data: filtered } };
        }

        if (path === '/api/technician/checklist-items' && method === 'GET') {
            const list = getTable<MaintenanceChecklistItem>('liftops_checklist').filter(i => i.isActive);
            return { status: 200, body: { succeeded: true, data: list } };
        }

        if (path === '/api/maintenance/checklist-item/add' && method === 'POST') {
            const list = getTable<MaintenanceChecklistItem>('liftops_checklist');
            const id = `chk-${generateId()}`;
            const newItem: MaintenanceChecklistItem = {
                id,
                title: body.title,
                description: body.description,
                order: body.order || list.length + 1,
                isActive: true
            };
            list.push(newItem);
            saveTable('liftops_checklist', list);
            return { status: 200, body: { succeeded: true, id } };
        }

        if (path.startsWith('/api/maintenance/checklist-item/') && method === 'PUT') {
            const id = path.split('/').pop();
            const list = getTable<MaintenanceChecklistItem>('liftops_checklist');
            const index = list.findIndex(i => i.id === id);
            if (index !== -1) {
                list[index] = { ...list[index], ...body };
                saveTable('liftops_checklist', list);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Checklist item not found"] } };
        }

        if (path.startsWith('/api/maintenance/checklist-item/') && method === 'DELETE') {
            const id = path.split('/').pop();
            const list = getTable<MaintenanceChecklistItem>('liftops_checklist');
            const filtered = list.filter(i => i.id !== id);
            saveTable('liftops_checklist', filtered);
            return { status: 200, body: { succeeded: true } };
        }

        // --- MAINTENANCE CONTRACTS ---
        if (path === '/api/maintenance/projects' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<MaintenanceContract>('liftops_maintenance_contracts') } };
        }

        if (path.startsWith('/api/maintenance/projects/') && method === 'GET') {
            const id = path.split('/').pop();
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const c = contracts.find(x => x.id === id);
            
            if (c) {
                const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators').filter(e => e.contractId === id);
                const details: MaintenanceContractDetails = {
                    id: c.id,
                    customerId: c.customerId,
                    customerName: c.customerName,
                    customerPhone: c.customerPhone,
                    customerEmail: c.customerEmail,
                    customerAddress: c.customerAddress,
                    customerCity: c.customerCity,
                    projectNumber: c.projectNumber,
                    projectAddress: c.projectAddress,
                    city: c.city,
                    isFromInstallation: c.isFromInstallation,
                    startDate: c.startDate,
                    endDate: c.endDate,
                    pricePerMonth: c.pricePerMonth,
                    freeMonths: c.freeMonths,
                    status: c.status,
                    technicianId: c.technicianId,
                    technicianName: c.technicianName,
                    createdAt: c.createdAt,
                    elevators: elevators.map(e => ({
                        id: e.id,
                        type: e.type,
                        numberOfStops: e.numberOfStops,
                        numberOfFloors: e.numberOfFloors,
                        nextMaintenanceDate: e.nextMaintenanceDate,
                        status: e.status,
                        createdAt: e.createdAt
                    }))
                };
                return { status: 200, body: { succeeded: true, data: details } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Contract not found"] } };
        }

        if (path.startsWith('/api/maintenance/projects/') && method === 'PUT') {
            const id = path.split('/').pop();
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const index = contracts.findIndex(c => c.id === id);
            if (index !== -1) {
                const technicians = getTable<Technician>('liftops_technicians');
                const tech = technicians.find(t => t.id === body.technicianId);
                
                contracts[index] = { 
                    ...contracts[index], 
                    ...body,
                    technicianName: tech ? tech.name : undefined
                };
                saveTable('liftops_maintenance_contracts', contracts);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false, errors: ["Contract not found"] } };
        }

        if (path === '/api/maintenance/projects/create' && method === 'POST') {
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const technicians = getTable<Technician>('liftops_technicians');
            const cid = `mnt-${generateId()}`;
            
            const tech = technicians.find(t => t.id === body.contract.technicianId);
            
            const newContract: MaintenanceContract = {
                id: cid,
                customerId: `cust-${generateId()}`,
                customerName: body.customer.name,
                customerPhone: body.customer.phone,
                customerEmail: body.customer.email,
                customerAddress: body.customer.address,
                customerCity: body.customer.city,
                projectNumber: body.contract.projectNumber,
                projectAddress: body.contract.projectAddress,
                city: body.contract.city,
                isFromInstallation: false,
                startDate: body.contract.startDate,
                endDate: body.contract.endDate,
                pricePerMonth: body.contract.pricePerMonth,
                freeMonths: body.contract.freeMonths || 0,
                status: "Active",
                elevatorCount: body.elevators.length,
                technicianId: body.contract.technicianId,
                technicianName: tech ? tech.name : undefined,
                createdAt: new Date().toISOString()
            };

            contracts.push(newContract);
            saveTable('liftops_maintenance_contracts', contracts);

            // Create maintenance elevators
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            body.elevators.forEach((e: any, index: number) => {
                elevators.push({
                    id: `mnt-elv-${generateId()}`,
                    elevatorCode: `ELV-${body.contract.projectNumber}-${index + 1}`,
                    contractId: cid,
                    projectNumber: body.contract.projectNumber,
                    customerId: newContract.customerId,
                    customerName: newContract.customerName,
                    customerPhone: newContract.customerPhone,
                    customerEmail: newContract.customerEmail,
                    customerAddress: newContract.customerAddress,
                    customerCity: newContract.customerCity,
                    type: e.type,
                    numberOfStops: e.numberOfStops,
                    numberOfFloors: e.numberOfFloors,
                    status: "Active",
                    contractStatus: "Active",
                    createdAt: new Date().toISOString(),
                    isFromInstallation: false
                });
            });
            saveTable('liftops_maintenance_elevators', elevators);

            // Also create customer
            const customers = getTable<Customer>('liftops_customers');
            customers.push({
                id: newContract.customerId,
                name: body.customer.name,
                email: body.customer.email,
                phone: body.customer.phone,
                address: body.customer.address,
                city: body.customer.city,
                projectNumber: body.contract.projectNumber,
                status: "Approved",
                createdAt: new Date().toISOString()
            });
            saveTable('liftops_customers', customers);

            addActivity('maintenance', 'Maintenance Contract Created', `Contract ${body.contract.projectNumber} signed with ${body.customer.name}.`, 'New');
            return { status: 200, body: { succeeded: true, id: cid } };
        }

        if (path === '/api/maintenance/check-project-number' && method === 'GET') {
            const projectNumber = query.projectNumber;
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const exists = contracts.some(c => c.projectNumber === projectNumber);
            return { status: 200, body: { succeeded: true, exists } };
        }

        if (path.startsWith('/api/maintenance/contract/') && path.endsWith('/freeze') && method === 'POST') {
            const id = path.split('/')[4];
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            
            const index = contracts.findIndex(c => c.id === id);
            if (index !== -1) {
                contracts[index].status = 'Frozen';
                saveTable('liftops_maintenance_contracts', contracts);

                elevators.forEach(e => {
                    if (e.contractId === id) {
                        e.contractStatus = 'Frozen';
                    }
                });
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/contract/') && path.endsWith('/stop') && method === 'POST') {
            const id = path.split('/')[4];
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            
            const index = contracts.findIndex(c => c.id === id);
            if (index !== -1) {
                contracts[index].status = 'Stopped';
                saveTable('liftops_maintenance_contracts', contracts);

                elevators.forEach(e => {
                    if (e.contractId === id) {
                        e.contractStatus = 'Stopped';
                    }
                });
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/contract/') && path.endsWith('/activate') && method === 'POST') {
            const id = path.split('/')[4];
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            
            const index = contracts.findIndex(c => c.id === id);
            if (index !== -1) {
                contracts[index].status = 'Active';
                saveTable('liftops_maintenance_contracts', contracts);

                elevators.forEach(e => {
                    if (e.contractId === id) {
                        e.contractStatus = 'Active';
                    }
                });
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        // --- MAINTENANCE ELEVATORS ---
        if (path === '/api/maintenance/elevators' && method === 'GET') {
            return { status: 200, body: { succeeded: true, data: getTable<MaintenanceElevator>('liftops_maintenance_elevators') } };
        }

        if (path.startsWith('/api/maintenance/elevators/') && method === 'PUT') {
            const id = path.split('/').pop();
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const index = elevators.findIndex(e => e.id === id);
            if (index !== -1) {
                elevators[index] = { ...elevators[index], ...body };
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/elevator/') && path.endsWith('/freeze') && method === 'POST') {
            const id = path.split('/')[4];
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const index = elevators.findIndex(e => e.id === id);
            if (index !== -1) {
                elevators[index].status = 'Frozen';
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/elevator/') && path.endsWith('/stop') && method === 'POST') {
            const id = path.split('/')[4];
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const index = elevators.findIndex(e => e.id === id);
            if (index !== -1) {
                elevators[index].status = 'Stopped';
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/elevator/') && path.endsWith('/activate') && method === 'POST') {
            const id = path.split('/')[4];
            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const index = elevators.findIndex(e => e.id === id);
            if (index !== -1) {
                elevators[index].status = 'Active';
                saveTable('liftops_maintenance_elevators', elevators);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        // --- MAINTENANCE VISITS ---
        if (path.startsWith('/api/maintenance/contract/') && path.endsWith('/visits') && method === 'GET') {
            const contractId = path.split('/')[4];
            const contract = getTable<MaintenanceContract>('liftops_maintenance_contracts').find(c => c.id === contractId);
            if (!contract) return { status: 404, body: { succeeded: false } };

            const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators').filter(e => e.contractId === contractId);
            const elevatorIds = elevators.map(e => e.id);
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits').filter(v => elevatorIds.includes(v.elevatorId));
            
            // Filter by month/year if query present
            const m = query.month ? parseInt(query.month) : null;
            const y = query.year ? parseInt(query.year) : null;
            
            const filtered = visits.filter(v => {
                if (!v.visitDate) return false;
                const d = new Date(v.visitDate);
                const monthMatch = m ? (d.getMonth() + 1) === m : true;
                const yearMatch = y ? d.getFullYear() === y : true;
                return monthMatch && yearMatch;
            });

            return { status: 200, body: { succeeded: true, data: filtered } };
        }

        if (path.startsWith('/api/maintenance/elevator/') && path.endsWith('/visits') && method === 'GET') {
            const elevatorId = path.split('/')[4];
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits').filter(v => v.elevatorId === elevatorId);
            return { status: 200, body: { succeeded: true, data: visits } };
        }

        if (path === '/api/maintenance/visit/schedule' && method === 'POST') {
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const checklist = getTable<MaintenanceChecklistItem>('liftops_checklist');
            const id = `vst-${generateId()}`;
            
            const newVisit: MaintenanceVisitListDto = {
                id,
                visitDate: body.visitDate,
                status: "Scheduled",
                isPaid: false,
                elevatorId: body.elevatorId,
                elevatorCode: body.elevatorId, // default or fetch code
                technicianId: body.technicianId,
                checklistItems: checklist.map(c => ({
                    checklistItemId: c.id,
                    checklistItemTitle: c.title,
                    isCompleted: false
                }))
            };

            // Resolve elevator code
            const elvs = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const elv = elvs.find(e => e.id === body.elevatorId);
            if (elv) {
                newVisit.elevatorCode = elv.elevatorCode;
            }

            visits.push(newVisit);
            saveTable('liftops_visits', visits);
            return { status: 200, body: { succeeded: true, data: id } };
        }

        if ((path.startsWith('/api/maintenance/visit/') || path.startsWith('/api/technician/visits/')) && path.endsWith('/complete') && method === 'POST') {
            const parts = path.split('/');
            const visitId = parts[parts.length - 2];
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const index = visits.findIndex(v => v.id === visitId);

            if (index !== -1) {
                visits[index].status = "Completed";
                visits[index].notes = body.notes;
                visits[index].paymentNotes = body.paymentNotes;
                visits[index].completedDate = new Date().toISOString();
                
                // Update checklists
                if (body.checklistItems) {
                    visits[index].checklistItems = body.checklistItems.map((cli: any) => {
                        return {
                            checklistItemId: cli.checklistItemId,
                            checklistItemTitle: cli.checklistItemTitle || "Checklist Item",
                            isCompleted: cli.isCompleted,
                            notes: cli.notes,
                            count: cli.count,
                            percentage: cli.percentage
                        };
                    });
                }

                // Spare parts deduction from inventory and save to visit
                if (body.partsUsed && body.partsUsed.length > 0) {
                    const inventory = getTable<InventoryItem>('liftops_inventory');
                    const sparePartsUsed = body.partsUsed.map((pu: any) => {
                        const item = inventory.find(i => i.id === pu.itemId);
                        if (item) {
                            item.stockQuantity = Math.max(0, item.stockQuantity - pu.quantity);
                        }
                        return {
                            itemId: pu.itemId,
                            itemName: item ? item.name : "Spare Part",
                            quantity: pu.quantity,
                            priceAtTimeOfUsage: item ? item.unitPrice : 0,
                            totalPrice: (item ? item.unitPrice : 0) * pu.quantity,
                            isPaid: false
                        };
                    });
                    saveTable('liftops_inventory', inventory);
                    // Embed spare parts into local visit details record
                    (visits[index] as any).spareParts = sparePartsUsed;
                }

                saveTable('liftops_visits', visits);
                addActivity('maintenance', 'Maintenance Visit Completed', `Elevator ${visits[index].elevatorCode} was serviced.`);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if ((path.startsWith('/api/maintenance/visit/') || path.startsWith('/api/technician/visits/')) && method === 'GET') {
            const visitId = path.split('/').pop();
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const visit = visits.find(v => v.id === visitId);

            if (visit) {
                // Compile full visit details
                const elevators = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
                const elv = elevators.find(e => e.id === visit.elevatorId);
                const technicians = getTable<Technician>('liftops_technicians');
                const tech = technicians.find(t => t.id === visit.technicianId);

                const details: MaintenanceVisitDetails = {
                    id: visit.id,
                    visitDate: visit.visitDate,
                    status: visit.status,
                    notes: visit.notes,
                    paymentNotes: visit.paymentNotes,
                    isPaid: visit.isPaid,
                    completedDate: visit.completedDate,
                    elevatorId: visit.elevatorId,
                    elevatorCode: visit.elevatorCode,
                    technicianId: visit.technicianId,
                    technicianName: tech ? tech.name : "Unassigned",
                    projectNumber: elv ? elv.projectNumber : undefined,
                    customerName: elv ? elv.customerName : undefined,
                    customerAddress: elv ? elv.customerAddress : undefined,
                    checklistItems: visit.checklistItems.map(c => ({
                        checklistItemId: c.checklistItemId,
                        checklistItemTitle: c.checklistItemTitle,
                        isCompleted: c.isCompleted,
                        notes: (c as any).notes,
                        count: (c as any).count,
                        percentage: (c as any).percentage,
                        status: c.isCompleted ? "good" : "bad"
                    })),
                    spareParts: (visit as any).spareParts || []
                };
                return { status: 200, body: { succeeded: true, data: details } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/visit/') && path.endsWith('/mark-paid') && method === 'POST') {
            const visitId = path.split('/')[4];
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const index = visits.findIndex(v => v.id === visitId);
            if (index !== -1) {
                visits[index].isPaid = true;
                saveTable('liftops_visits', visits);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path.startsWith('/api/maintenance/visit/') && path.endsWith('/pdf') && method === 'GET') {
            // Return a dummy PDF blob
            const dummyPdf = "%PDF-1.4\n%...\nmock pdf file content for LiftOps Maintenance Visit";
            const bytes = new TextEncoder().encode(dummyPdf);
            return { status: 200, body: bytes };
        }

        if (path === '/api/maintenance/statistics' && method === 'GET') {
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            
            const m = query.month ? parseInt(query.month) : null;
            const y = query.year ? parseInt(query.year) : null;

            const filteredVisits = visits.filter(v => {
                if (!v.visitDate) return false;
                const d = new Date(v.visitDate);
                const monthMatch = m ? (d.getMonth() + 1) === m : true;
                const yearMatch = y ? d.getFullYear() === y : true;
                return monthMatch && yearMatch;
            });

            const totalMaintenanceTasks = filteredVisits.length;
            const completedMaintenanceTasks = filteredVisits.filter(v => v.status === 'Completed').length;
            
            // Financial estimations
            const totalContractsActiveCount = contracts.filter(c => c.status === 'Active').length;
            const totalFreeProjects = contracts.filter(c => c.status === 'Active' && c.freeMonths > 0).length;
            const totalPaidProjects = totalContractsActiveCount - totalFreeProjects;

            const basePrice = contracts.reduce((sum, c) => sum + (c.pricePerMonth || 0), 0);
            const totalMustCollect = basePrice;
            const totalCollected = filteredVisits.filter(v => v.isPaid).length * 150 + (totalPaidProjects * 250); // mock calculation
            const totalNotCollected = Math.max(0, totalMustCollect - totalCollected);

            const stats: MaintenanceStatistics = {
                totalMaintenanceTasks,
                completedMaintenanceTasks,
                totalMustCollect,
                totalCollected,
                totalNotCollected,
                totalFreeProjects,
                totalPaidProjects
            };

            return { status: 200, body: { succeeded: true, data: stats } };
        }

        if (path === '/api/maintenance/schedule/monthly' && method === 'GET') {
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const elvs = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const technicians = getTable<Technician>('liftops_technicians');

            const m = query.month ? parseInt(query.month) : new Date().getMonth() + 1;
            const y = query.year ? parseInt(query.year) : new Date().getFullYear();

            const monthlySchedule = visits.filter(v => {
                if (!v.visitDate) return false;
                const d = new Date(v.visitDate);
                return (d.getMonth() + 1) === m && d.getFullYear() === y;
            }).map(v => {
                const elv = elvs.find(e => e.id === v.elevatorId);
                const tech = technicians.find(t => t.id === v.technicianId);
                return {
                    id: v.id,
                    visitDate: v.visitDate,
                    status: v.status,
                    notes: v.notes,
                    isPaid: v.isPaid,
                    technicianId: v.technicianId,
                    technicianName: tech ? tech.name : "Unassigned",
                    elevatorId: v.elevatorId,
                    elevatorCode: v.elevatorCode,
                    elevatorType: elv ? elv.type : "Passenger",
                    elevatorStops: elv ? elv.numberOfStops : 5,
                    elevatorFloors: elv ? elv.numberOfFloors : 5,
                    projectNumber: elv ? elv.projectNumber : "MNT-UNK",
                    customerName: elv ? elv.customerName : "Walk-in",
                    customerAddress: elv ? elv.customerAddress : "N/A"
                };
            });

            return { status: 200, body: { succeeded: true, data: monthlySchedule } };
        }

        if (path === '/api/maintenance/contract/assign-technicians' && method === 'POST') {
            const { contractId, technicianIds, assignmentDate, notes } = body;
            const contracts = getTable<MaintenanceContract>('liftops_maintenance_contracts');
            const elvs = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const technicians = getTable<Technician>('liftops_technicians');

            const cIndex = contracts.findIndex(c => c.id === contractId);
            if (cIndex !== -1) {
                const primaryTech = technicians.find(t => t.id === technicianIds[0]);
                contracts[cIndex].technicianId = technicianIds[0];
                contracts[cIndex].technicianName = primaryTech ? primaryTech.name : undefined;
                saveTable('liftops_maintenance_contracts', contracts);

                // Schedule new visits for all elevators in this contract
                const contractElvs = elvs.filter(e => e.contractId === contractId);
                const checklist = getTable<MaintenanceChecklistItem>('liftops_checklist');

                contractElvs.forEach(e => {
                    visits.push({
                        id: `vst-${generateId()}`,
                        visitDate: assignmentDate,
                        status: "Scheduled",
                        isPaid: false,
                        elevatorId: e.id,
                        elevatorCode: e.elevatorCode,
                        technicianId: technicianIds[0],
                        checklistItems: checklist.map(c => ({
                            checklistItemId: c.id,
                            checklistItemTitle: c.title,
                            isCompleted: false
                        }))
                    });
                });
                saveTable('liftops_visits', visits);

                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path === '/api/maintenance/visit/assign-technician' && method === 'POST') {
            const { visitId, technicianId } = body;
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const index = visits.findIndex(v => v.id === visitId);
            if (index !== -1) {
                visits[index].technicianId = technicianId;
                saveTable('liftops_visits', visits);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        if (path === '/api/maintenance/visits/cancel-incomplete-by-date' && method === 'POST') {
            const { date } = body; // format YYYY-MM-DD
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            
            let count = 0;
            visits.forEach(v => {
                if (v.visitDate === date && v.status !== 'Completed') {
                    v.status = 'Cancelled';
                    count++;
                }
            });
            saveTable('liftops_visits', visits);
            return { status: 200, body: { succeeded: true, data: { message: "Visits cancelled successfully", count } } };
        }

        if (path === '/api/maintenance/visits/update-order' && method === 'POST') {
            // Update scheduling order logic, since in mock we don't have explicit order properties,
            // we can just succeed
            return { status: 200, body: { succeeded: true } };
        }

        if (path.startsWith('/api/maintenance/visit/') && path.endsWith('/status') && method === 'PUT') {
            const visitId = path.split('/')[4];
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const index = visits.findIndex(v => v.id === visitId);
            if (index !== -1) {
                visits[index].status = body.status;
                saveTable('liftops_visits', visits);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

        // --- TECHNICIAN VIEW (MOBILE/OFFLINE VIEWS) ---
        if (path === '/api/technician/visits/today' && method === 'GET') {
            // Find visits assigned to tech-3 or any active visit
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const elvs = getTable<MaintenanceElevator>('liftops_maintenance_elevators');
            
            const techVisits = visits.map(v => {
                const elv = elvs.find(e => e.id === v.elevatorId);
                return {
                    visitId: v.id,
                    elevatorId: v.elevatorId,
                    elevatorCode: v.elevatorCode,
                    contractId: elv ? elv.contractId : "N/A",
                    projectNumber: elv ? elv.projectNumber : "N/A",
                    projectName: elv ? elv.customerName : "Walk-in",
                    customerId: elv ? elv.customerId : "N/A",
                    customerName: elv ? elv.customerName : "Walk-in",
                    customerPhone: elv ? elv.customerPhone : "",
                    customerAddress: elv ? elv.customerAddress : "N/A",
                    city: elv ? elv.customerCity || "Riyadh" : "Riyadh",
                    visitDate: v.visitDate,
                    status: v.status,
                    notes: v.notes,
                    paymentNotes: v.paymentNotes,
                    isPaid: v.isPaid,
                    completedDate: v.completedDate
                };
            });
            return { status: 200, body: { succeeded: true, data: techVisits } };
        }

        if (path === '/api/technician/emergency-tickets' && method === 'GET') {
            const list = getTable<EmergencyTicket>('liftops_emergencies');
            return { status: 200, body: { succeeded: true, data: list } };
        }

        if (path.startsWith('/api/technician/visits/') && path.endsWith('/status') && method === 'PUT') {
            const visitId = path.split('/')[4];
            const visits = getTable<MaintenanceVisitListDto>('liftops_visits');
            const index = visits.findIndex(v => v.id === visitId);
            if (index !== -1) {
                visits[index].status = body.status;
                saveTable('liftops_visits', visits);
                return { status: 200, body: { succeeded: true } };
            }
            return { status: 404, body: { succeeded: false } };
        }

    } catch (err: any) {
        console.error("[Mock Server] Error handling request:", err);
        return { status: 500, body: { succeeded: false, errors: [err.message] } };
    }

    console.warn(`[Mock Server] Route not implemented: ${method} ${path}`);
    return { status: 404, body: { succeeded: false, errors: [`Route ${method} ${path} not implemented on Mock Server.`] } };
};
