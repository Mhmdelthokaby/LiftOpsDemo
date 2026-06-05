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
    Admin
} from './api';

export const INITIAL_ADMINS: Admin[] = [
    {
        id: "admin-1",
        name: "Demo Manager",
        email: "admin@liftops.com",
        phone: "0501112222",
        roles: ["Manager"],
        isDisabled: false,
        lastLogin: "2026-06-05T12:00:00Z"
    },
    {
        id: "admin-2",
        name: "Installation Admin",
        email: "installation@liftops.com",
        phone: "0503334444",
        roles: ["InstallationAdmin"],
        isDisabled: false
    },
    {
        id: "admin-3",
        name: "Maintenance Admin",
        email: "maintenance@liftops.com",
        phone: "0505556666",
        roles: ["MaintenanceAdmin"],
        isDisabled: false
    },
    {
        id: "admin-4",
        name: "Inventory Admin",
        email: "inventory@liftops.com",
        phone: "0507778888",
        roles: ["InventoryAdmin"],
        isDisabled: false
    }
];

export const INITIAL_CATEGORIES: Category[] = [
    { id: "cat-1", name: "Cables & Ropes", description: "Steel wire ropes and suspension ropes" },
    { id: "cat-2", name: "Motors & Gears", description: "Elevator traction motors, gearboxes and brake units" },
    { id: "cat-3", name: "Control Panels", description: "Inverters, motherboards, electrical switches" },
    { id: "cat-4", name: "Cabin Fittings", description: "Handrails, buttons, doors, sensors" }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
    {
        id: "inv-1",
        name: "Steel Wire Rope 10mm",
        itemNumber: "SKU-RPE-010",
        categoryId: "cat-1",
        categoryName: "Cables & Ropes",
        unitPrice: 15,
        stockQuantity: 120,
        supplierName: "Apex Steel Ltd",
        addedByAdminName: "Demo Manager",
        createdAt: "2026-01-10T08:00:00Z",
        isDisabled: false
    },
    {
        id: "inv-2",
        name: "Traction Motor 7.5kW",
        itemNumber: "SKU-MTR-007",
        categoryId: "cat-2",
        categoryName: "Motors & Gears",
        unitPrice: 1850,
        stockQuantity: 3, // Low stock!
        supplierName: "Torin Drive Corp",
        addedByAdminName: "Demo Manager",
        createdAt: "2026-01-15T09:30:00Z",
        isDisabled: false
    },
    {
        id: "inv-3",
        name: "VVVF Control Cabinet",
        itemNumber: "SKU-CTL-VVV",
        categoryId: "cat-3",
        categoryName: "Control Panels",
        unitPrice: 950,
        stockQuantity: 7,
        supplierName: "Monarch Controls",
        addedByAdminName: "Demo Manager",
        createdAt: "2026-02-01T11:00:00Z",
        isDisabled: false
    },
    {
        id: "inv-4",
        name: "Infrared Door Sensor Curtain",
        itemNumber: "SKU-SEN-IR40",
        categoryId: "cat-4",
        categoryName: "Cabin Fittings",
        unitPrice: 65,
        stockQuantity: 42,
        supplierName: "WECO Sensors",
        addedByAdminName: "Demo Manager",
        createdAt: "2026-02-10T14:00:00Z",
        isDisabled: false
    },
    {
        id: "inv-5",
        name: "Hydraulic Oil ISO VG 46 (20L)",
        itemNumber: "SKU-OIL-VG46",
        categoryId: "cat-2",
        categoryName: "Motors & Gears",
        unitPrice: 110,
        stockQuantity: 15,
        supplierName: "Shell Distributors",
        addedByAdminName: "Demo Manager",
        createdAt: "2026-03-01T10:00:00Z",
        isDisabled: false
    }
];

export const INITIAL_TECHNICIANS: Technician[] = [
    {
        id: "tech-1",
        name: "Ahmed Mansour",
        phone: "0501234567",
        specialization: "Electrical & Inverters",
        totalElevatorsInstalled: 18,
        currentActiveElevatorsCount: 2,
        overallRating: 4.8,
        isDisabled: false,
        isLeader: true,
        username: "ahmed.m"
    },
    {
        id: "tech-2",
        name: "Youssef Ibrahim",
        phone: "0529876543",
        specialization: "Mechanical & Hydraulics",
        totalElevatorsInstalled: 22,
        currentActiveElevatorsCount: 1,
        overallRating: 4.6,
        isDisabled: false,
        leaderId: "tech-1",
        leaderName: "Ahmed Mansour",
        isLeader: false,
        username: "youssef.i"
    },
    {
        id: "tech-3",
        name: "Saeed Ali",
        phone: "0554433221",
        specialization: "Maintenance & Troubleshooting",
        totalElevatorsInstalled: 5,
        currentActiveElevatorsCount: 4,
        overallRating: 4.9,
        isDisabled: false,
        isLeader: false,
        username: "saeed.a"
    }
];

export const INITIAL_CUSTOMERS: Customer[] = [
    {
        id: "cust-1",
        name: "Standard Real Estate Co.",
        email: "maintenance@standardre.com",
        phone: "0500000001",
        address: "Al-Olaya Street, Block 4",
        city: "Riyadh",
        projectNumber: "PRJ-2026-001",
        status: "Approved",
        createdAt: "2026-01-05T10:00:00Z"
    },
    {
        id: "cust-2",
        name: "Grand Palace Hotel",
        email: "facilities@grandhotel.com",
        phone: "0500000002",
        address: "King Fahd Road, Corniche District",
        city: "Jeddah",
        projectNumber: "PRJ-2026-002",
        status: "Approved",
        createdAt: "2026-01-20T11:30:00Z"
    },
    {
        id: "cust-3",
        name: "Khalid Bin Fahad",
        email: "khalid.f@outlook.com",
        phone: "0500000003",
        address: "Al-Naseem District, Villa 12",
        city: "Riyadh",
        projectNumber: "PRJ-2026-003",
        status: "PendingInspectionQuotation",
        createdAt: "2026-05-15T09:00:00Z"
    },
    {
        id: "cust-4",
        name: "Sarah Al-Ghamdi",
        email: "sarah.gh@gmail.com",
        phone: "0500000004",
        address: "Al-Rawdah District, Street 10",
        city: "Dammam",
        projectNumber: "PRJ-2026-004",
        status: "Approved",
        createdAt: "2026-05-18T14:20:00Z"
    },
    {
        id: "cust-5",
        name: "Elite Towers Union",
        email: "union@elitetowers.com",
        phone: "0500000005",
        address: "King Abdulaziz Rd",
        city: "Riyadh",
        projectNumber: "PRJ-2026-005",
        status: "Rejected",
        createdAt: "2026-05-01T08:15:00Z"
    }
];

export const INITIAL_INSTALLATION_PROJECTS: InstallationProject[] = [
    {
        id: "proj-1",
        customerId: "cust-1",
        customerName: "Standard Real Estate Co.",
        customerPhone: "0500000001",
        customerEmail: "maintenance@standardre.com",
        customerAddress: "Al-Olaya Street, Block 4",
        customerCity: "Riyadh",
        projectNumber: "PRJ-2026-001",
        projectAddress: "Olaya Tower B, Riyadh",
        city: "Riyadh",
        googleMapsLink: "https://maps.google.com/?q=24.7136,46.6753",
        status: "Active",
        contractDate: "2026-01-15",
        installationPricePerUnit: 18000,
        totalPrice: 36000,
        installationStartDate: "2026-02-01",
        expectedFinishDate: "2026-08-30",
        notes: "Dual passenger traction elevator system.",
        elevators: [
            {
                id: "elv-1",
                elevatorType: "Passenger Traction (Machine Room-Less)",
                stopsCount: 8,
                floorsCount: 8,
                numberOfStops: 8,
                numberOfFloors: 8,
                price: 18000,
                paidAmount: 7200,
                remainingAmount: 10800,
                stages: [
                    {
                        id: "stage-1-1",
                        stageNumber: 1,
                        status: "Completed",
                        startDate: "2026-02-01",
                        endDate: "2026-02-15",
                        stagePrice: 3600,
                        isPriceCollected: true,
                        notes: "Pit construction and brackets alignment completed.",
                        supplyCost: 1200,
                        requiredParts: [
                            { id: "sp-1", inventoryItemId: "inv-1", inventoryItemName: "Steel Wire Rope 10mm", inventoryItemNumber: "SKU-RPE-010", quantity: 2, isOutOfStock: false }
                        ],
                        technicians: [
                            { id: "st-1", technicianId: "tech-1", technicianName: "Ahmed Mansour" }
                        ]
                    },
                    {
                        id: "stage-1-2",
                        stageNumber: 2,
                        status: "Completed",
                        startDate: "2026-02-18",
                        endDate: "2026-03-10",
                        stagePrice: 3600,
                        isPriceCollected: true,
                        notes: "Guide rails and counterweight structure installed.",
                        supplyCost: 800,
                        technicians: [
                            { id: "st-2", technicianId: "tech-2", technicianName: "Youssef Ibrahim" }
                        ]
                    },
                    {
                        id: "stage-1-3",
                        stageNumber: 3,
                        status: "InProgress",
                        startDate: "2026-05-15",
                        stagePrice: 3600,
                        isPriceCollected: false,
                        notes: "Currently assembling cabin frame and doors.",
                        technicians: [
                            { id: "st-3", technicianId: "tech-1", technicianName: "Ahmed Mansour" },
                            { id: "st-4", technicianId: "tech-2", technicianName: "Youssef Ibrahim" }
                        ]
                    },
                    {
                        id: "stage-1-4",
                        stageNumber: 4,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    },
                    {
                        id: "stage-1-5",
                        stageNumber: 5,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    }
                ]
            },
            {
                id: "elv-2",
                elevatorType: "Passenger Traction (Machine Room-Less)",
                stopsCount: 8,
                floorsCount: 8,
                numberOfStops: 8,
                numberOfFloors: 8,
                price: 18000,
                paidAmount: 0,
                remainingAmount: 18000,
                stages: [
                    {
                        id: "stage-2-1",
                        stageNumber: 1,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    },
                    {
                        id: "stage-2-2",
                        stageNumber: 2,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    },
                    {
                        id: "stage-2-3",
                        stageNumber: 3,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    },
                    {
                        id: "stage-2-4",
                        stageNumber: 4,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    },
                    {
                        id: "stage-2-5",
                        stageNumber: 5,
                        status: "Pending",
                        stagePrice: 3600,
                        isPriceCollected: false
                    }
                ]
            }
        ]
    },
    {
        id: "proj-2",
        customerId: "cust-2",
        customerName: "Grand Palace Hotel",
        customerPhone: "0500000002",
        customerEmail: "facilities@grandhotel.com",
        customerAddress: "King Fahd Road, Corniche District",
        customerCity: "Jeddah",
        projectNumber: "PRJ-2026-002",
        projectAddress: "Grand Palace Annex, Jeddah",
        city: "Jeddah",
        googleMapsLink: "https://maps.google.com/?q=21.5433,39.1728",
        status: "Approved",
        contractDate: "2026-01-22",
        installationPricePerUnit: 25000,
        totalPrice: 25000,
        notes: "Heavy-duty panoramic elevator.",
        elevators: [
            {
                id: "elv-3",
                elevatorType: "Panoramic Traction",
                stopsCount: 5,
                floorsCount: 5,
                numberOfStops: 5,
                numberOfFloors: 5,
                price: 25000,
                paidAmount: 0,
                remainingAmount: 25000,
                stages: [
                    { id: "stage-3-1", stageNumber: 1, status: "Pending", stagePrice: 5000, isPriceCollected: false },
                    { id: "stage-3-2", stageNumber: 2, status: "Pending", stagePrice: 5000, isPriceCollected: false },
                    { id: "stage-3-3", stageNumber: 3, status: "Pending", stagePrice: 5000, isPriceCollected: false },
                    { id: "stage-3-4", stageNumber: 4, status: "Pending", stagePrice: 5000, isPriceCollected: false },
                    { id: "stage-3-5", stageNumber: 5, status: "Pending", stagePrice: 5000, isPriceCollected: false }
                ]
            }
        ]
    }
];

export const INITIAL_INSPECTIONS: InspectionRequest[] = [
    {
        id: "insp-1",
        clientName: "Khalid Bin Fahad",
        clientPhone: "0500000003",
        clientEmail: "khalid.f@outlook.com",
        projectAddress: "Naseem District Villa 12, Riyadh",
        googleMapsLink: "https://maps.google.com/?q=24.723,46.812",
        numberOfElevatorsRequired: 1,
        elevatorType: "Residential Hydraulic",
        status: "PendingInspection",
        createdAt: "2026-05-15T09:00:00Z",
        notes: "Requires a quiet hydraulic elevator for a 3-floor villa."
    },
    {
        id: "insp-2",
        clientName: "Sarah Al-Ghamdi",
        clientPhone: "0500000004",
        clientEmail: "sarah.gh@gmail.com",
        projectAddress: "Rawdah St 10, Dammam",
        googleMapsLink: "https://maps.google.com/?q=26.434,50.111",
        numberOfElevatorsRequired: 1,
        elevatorType: "Home Traction Elevator",
        status: "OfferSent",
        createdAt: "2026-05-18T14:20:00Z",
        shaftType: "Concrete",
        shaftWidth: 1600,
        shaftDepth: 1600,
        lastFloorHeight: 3200,
        pitDepth: 1200,
        travelHeight: 9000,
        technicalNotes: "Standard concrete shaft, matches our traction layout.",
        offer: {
            id: "off-1",
            inspectionRequestId: "insp-2",
            installationPricePerUnit: 22000,
            totalInstallationPrice: 22000,
            estimatedStartDate: "2026-07-01",
            estimatedEndDate: "2026-09-15",
            status: "WaitingForClientApproval",
            notes: "Discount applied for single unit home traction elevator.",
            createdAt: "2026-05-20T10:00:00Z",
            createdBy: "Demo Manager"
        }
    }
];

export const INITIAL_OFFERS: Offer[] = [
    {
        id: "off-1",
        inspectionRequestId: "insp-2",
        installationPricePerUnit: 22000,
        totalInstallationPrice: 22000,
        estimatedStartDate: "2026-07-01",
        estimatedEndDate: "2026-09-15",
        status: "WaitingForClientApproval",
        notes: "Discount applied for single unit home traction elevator.",
        createdAt: "2026-05-20T10:00:00Z",
        createdBy: "Demo Manager"
    }
];

export const INITIAL_TECHNICAL_INSPECTIONS: TechnicalInspectionProject[] = [
    {
        id: "t-insp-1",
        customerId: "cust-3",
        customerName: "Khalid Bin Fahad",
        customerPhone: "0500000003",
        customerEmail: "khalid.f@outlook.com",
        projectAddress: "Naseem District Villa 12, Riyadh",
        googleMapsLink: "https://maps.google.com/?q=24.723,46.812",
        projectStatus: "UnderInspectionAndQuotation",
        pitType: "Concrete",
        pitWidth: 1500,
        pitDepth: 1400,
        lastFloorHeight: 3300,
        holeDepth: 0,
        travelLength: 6800,
        notes: "Shaft needs cleaning. Minor water seepage in pit needs patching.",
        createdAt: "2026-05-16T10:00:00Z"
    }
];

export const INITIAL_QUOTATIONS: Quotation[] = [];

export const INITIAL_EMERGENCIES: EmergencyTicket[] = [
    {
        id: "emg-1",
        ticketNumber: 1001,
        project: "Olaya Tower B",
        location: "Al-Olaya Street, Block 4, Riyadh",
        unitId: "ELV-001 (Elevator A)",
        googleMapsLink: "https://maps.google.com/?q=24.7136,46.6753",
        priority: "High",
        status: "Open",
        description: "Elevator stuck between 4th and 5th floors with two passengers inside. Intercom is working.",
        reportedBy: "Building Security (Abu Fahad)",
        reportedAt: "2026-06-05T14:30:00Z",
        contact: "0500000001",
        notes: "Technician dispatched message broadcasted."
    },
    {
        id: "emg-2",
        ticketNumber: 1002,
        project: "Grand Palace Hotel",
        location: "King Fahd Road, Corniche District, Jeddah",
        unitId: "ELV-003 (Panoramic Elevator)",
        googleMapsLink: "https://maps.google.com/?q=21.5433,39.1728",
        priority: "Medium",
        status: "InProgress",
        description: "Elevator doors are making a loud grinding sound and fail to close on the lobby floor.",
        reportedBy: "Hotel Receptionist",
        reportedAt: "2026-06-05T13:00:00Z",
        contact: "0500000002",
        assignedTechnicianId: "tech-2",
        assignedTechnicianName: "Youssef Ibrahim",
        notes: "Youssef is currently on-site investigating door motor tracks."
    },
    {
        id: "emg-3",
        ticketNumber: 1003,
        project: "Local Plaza",
        location: "Exit 10, King Abdullah Rd, Riyadh",
        unitId: "ELV-LP-01",
        priority: "Low",
        status: "Resolved",
        description: "Indicators inside cabin are displaying wrong floor numbers.",
        reportedBy: "Tenant",
        reportedAt: "2026-06-04T09:00:00Z",
        contact: "0509998887",
        assignedTechnicianId: "tech-3",
        assignedTechnicianName: "Saeed Ali",
        resolvedDate: "2026-06-04T11:45:00Z",
        notes: "Replaced segment indicator board and calibrated sensor logic."
    }
];

export const INITIAL_CHECKLIST: MaintenanceChecklistItem[] = [
    { id: "chk-1", title: "Verify brake functionality and clearance", order: 1, isActive: true, description: "Check magnetic coils and manual brake release mechanism" },
    { id: "chk-2", title: "Inspect motor oil levels and gear wear", order: 2, isActive: true, description: "Lubricate moving parts and check for gear oil leaks" },
    { id: "chk-3", title: "Test safety gear and overspeed governor", order: 3, isActive: true, description: "Simulate trip and ensure visual electrical contact check" },
    { id: "chk-4", title: "Check rope wear and tension equalization", order: 4, isActive: true, description: "Count broken wires in worst lay length" },
    { id: "chk-5", title: "Inspect door operator and safety sensors", order: 5, isActive: true, description: "Check safety edge retracting force and IR curtain sensitivity" },
    { id: "chk-6", title: "Test cabin emergency phone, bell and backup light", order: 6, isActive: true, description: "Check backup 12V battery output and signal tone" }
];

export const INITIAL_MAINTENANCE_CONTRACTS: MaintenanceContract[] = [
    {
        id: "mnt-1",
        customerId: "cust-1",
        customerName: "Standard Real Estate Co.",
        customerPhone: "0500000001",
        customerEmail: "maintenance@standardre.com",
        customerAddress: "Al-Olaya Street, Block 4",
        customerCity: "Riyadh",
        projectNumber: "MNT-2026-001",
        projectAddress: "Olaya Tower B, Riyadh",
        city: "Riyadh",
        isFromInstallation: true,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        pricePerMonth: 450,
        freeMonths: 2,
        status: "Active",
        elevatorCount: 2,
        technicianId: "tech-3",
        technicianName: "Saeed Ali",
        createdAt: "2026-01-01T08:00:00Z"
    }
];

export const INITIAL_MAINTENANCE_ELEVATORS: MaintenanceElevator[] = [
    {
        id: "mnt-elv-1",
        elevatorCode: "ELV-MNT-001A",
        contractId: "mnt-1",
        projectNumber: "MNT-2026-001",
        customerId: "cust-1",
        customerName: "Standard Real Estate Co.",
        customerPhone: "0500000001",
        customerEmail: "maintenance@standardre.com",
        customerAddress: "Al-Olaya Street, Block 4",
        customerCity: "Riyadh",
        type: "Passenger Traction",
        numberOfStops: 8,
        numberOfFloors: 8,
        nextMaintenanceDate: "2026-06-12",
        status: "Active",
        contractStatus: "Active",
        createdAt: "2026-01-01T08:00:00Z",
        isFromInstallation: true
    },
    {
        id: "mnt-elv-2",
        elevatorCode: "ELV-MNT-001B",
        contractId: "mnt-1",
        projectNumber: "MNT-2026-001",
        customerId: "cust-1",
        customerName: "Standard Real Estate Co.",
        customerPhone: "0500000001",
        customerEmail: "maintenance@standardre.com",
        customerAddress: "Al-Olaya Street, Block 4",
        customerCity: "Riyadh",
        type: "Passenger Traction",
        numberOfStops: 8,
        numberOfFloors: 8,
        nextMaintenanceDate: "2026-06-12",
        status: "Active",
        contractStatus: "Active",
        createdAt: "2026-01-01T08:00:00Z",
        isFromInstallation: true
    }
];

export const INITIAL_VISITS: MaintenanceVisitListDto[] = [
    {
        id: "vst-1",
        visitDate: "2026-06-12",
        status: "Scheduled",
        isPaid: false,
        elevatorId: "mnt-elv-1",
        elevatorCode: "ELV-MNT-001A",
        technicianId: "tech-3",
        checklistItems: [
            { checklistItemId: "chk-1", checklistItemTitle: "Verify brake functionality and clearance", isCompleted: false },
            { checklistItemId: "chk-2", checklistItemTitle: "Inspect motor oil levels and gear wear", isCompleted: false },
            { checklistItemId: "chk-3", checklistItemTitle: "Test safety gear and overspeed governor", isCompleted: false },
            { checklistItemId: "chk-4", checklistItemTitle: "Check rope wear and tension equalization", isCompleted: false },
            { checklistItemId: "chk-5", checklistItemTitle: "Inspect door operator and safety sensors", isCompleted: false },
            { checklistItemId: "chk-6", checklistItemTitle: "Test cabin emergency phone, bell and backup light", isCompleted: false }
        ]
    },
    {
        id: "vst-2",
        visitDate: "2026-06-12",
        status: "Scheduled",
        isPaid: false,
        elevatorId: "mnt-elv-2",
        elevatorCode: "ELV-MNT-001B",
        technicianId: "tech-3",
        checklistItems: [
            { checklistItemId: "chk-1", checklistItemTitle: "Verify brake functionality and clearance", isCompleted: false },
            { checklistItemId: "chk-2", checklistItemTitle: "Inspect motor oil levels and gear wear", isCompleted: false },
            { checklistItemId: "chk-3", checklistItemTitle: "Test safety gear and overspeed governor", isCompleted: false },
            { checklistItemId: "chk-4", checklistItemTitle: "Check rope wear and tension equalization", isCompleted: false },
            { checklistItemId: "chk-5", checklistItemTitle: "Inspect door operator and safety sensors", isCompleted: false },
            { checklistItemId: "chk-6", checklistItemTitle: "Test cabin emergency phone, bell and backup light", isCompleted: false }
        ]
    },
    {
        id: "vst-3",
        visitDate: "2026-05-12",
        status: "Completed",
        isPaid: true,
        completedDate: "2026-05-12T11:00:00Z",
        elevatorId: "mnt-elv-1",
        elevatorCode: "ELV-MNT-001A",
        technicianId: "tech-3",
        notes: "Everything checked out fine. Re-tensioned car safety switch slightly.",
        checklistItems: [
            { checklistItemId: "chk-1", checklistItemTitle: "Verify brake functionality and clearance", isCompleted: true },
            { checklistItemId: "chk-2", checklistItemTitle: "Inspect motor oil levels and gear wear", isCompleted: true },
            { checklistItemId: "chk-3", checklistItemTitle: "Test safety gear and overspeed governor", isCompleted: true },
            { checklistItemId: "chk-4", checklistItemTitle: "Check rope wear and tension equalization", isCompleted: true },
            { checklistItemId: "chk-5", checklistItemTitle: "Inspect door operator and safety sensors", isCompleted: true },
            { checklistItemId: "chk-6", checklistItemTitle: "Test cabin emergency phone, bell and backup light", isCompleted: true }
        ]
    }
];

export const INITIAL_ACTIVITIES = [
    { id: "act-1", type: "project", title: "New Project Signed", description: "Standard Real Estate project PRJ-2026-001 contract was signed.", timestamp: "2026-06-05T12:00:00Z", badge: "New" },
    { id: "act-2", type: "emergency", title: "Emergency Ticket Resolved", description: "Saeed Ali resolved emergency ticket #1003 at Local Plaza.", timestamp: "2026-06-04T11:45:00Z" },
    { id: "act-3", type: "maintenance", title: "Maintenance Completed", description: "Scheduled visit Completed for Olaya Tower B (ELV-MNT-001A).", timestamp: "2026-05-12T11:00:00Z" }
];
