# API Endpoints Documentation

This document lists all API endpoints used in the LiftOps Frontend application. All endpoints use the centralized API configuration from `lib/api-config.ts` which reads from `NEXT_PUBLIC_API_URL` environment variable.

## Environment Configuration

Set the API base URL in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5295
```

All endpoints are prefixed with the base URL from environment variables.

---

## Authentication Endpoints

### Admin Login
- **Endpoint**: `POST /api/Admin/login`
- **File**: `lib/auth.ts`
- **Description**: Authenticate admin user
- **Auth Required**: No

### Refresh Token
- **Endpoint**: `POST /api/Admin/refresh-token`
- **File**: `lib/auth.ts`
- **Description**: Refresh access token
- **Auth Required**: No

---

## Dashboard Endpoints

### Get Dashboard Summary
- **Endpoint**: `GET /api/dashboard/summary`
- **File**: `lib/api.ts`
- **Function**: `getDashboardSummary()`
- **Description**: Get dashboard statistics and summary data

---

## Customer Endpoints

### Get All Customers
- **Endpoint**: `GET /api/customers`
- **File**: `lib/api.ts`
- **Function**: `getCustomers()`

### Update Customer
- **Endpoint**: `PUT /api/customers/{id}`
- **File**: `lib/api.ts`
- **Function**: `updateCustomer(id, data)`

### Update Customer Status
- **Endpoint**: `PUT /api/customers/{id}/status`
- **File**: `lib/api.ts`
- **Function**: `updateCustomerStatus(id, status)`

---

## Installation Project Endpoints

### Get Projects
- **Endpoint**: `GET /api/installation/projects` or `GET /api/installation/projects?status={status}`
- **File**: `lib/api.ts`
- **Function**: `getProjects(status?)`

### Check Project Number Exists
- **Endpoint**: `GET /api/installation/check-project-number?projectNumber={projectNumber}`
- **File**: `lib/api.ts`
- **Function**: `checkProjectNumberExists(projectNumber)`

### Get Project Details
- **Endpoint**: `GET /api/installation/project/{id}`
- **File**: `lib/api.ts`
- **Function**: `getProjectDetails(id)`

### Create Project
- **Endpoint**: `POST /api/installation/project/add`
- **File**: `lib/api.ts`
- **Function**: `createProject(data)`

### Update Project
- **Endpoint**: `PUT /api/installation/project/{projectId}`
- **File**: `lib/api.ts`
- **Function**: `updateProject(projectId, data)`

### Approve Inspection
- **Endpoint**: `POST /api/installation/project/{projectId}/approve-inspection`
- **File**: `lib/api.ts`
- **Function**: `approveInspection(projectId)`

### Reject Project
- **Endpoint**: `POST /api/installation/project/{projectId}/reject`
- **File**: `lib/api.ts`
- **Function**: `rejectProject(projectId)`

### Update Elevator
- **Endpoint**: `PUT /api/installation/elevator/{elevatorId}`
- **File**: `lib/api.ts`
- **Function**: `updateElevator(elevatorId, data)`

---

## Installation Stage Endpoints

### Start Stage
- **Endpoint**: `POST /api/installation/stage/start`
- **File**: `lib/api.ts`
- **Function**: `startStage(stageId, startDate?)`

### Complete Stage
- **Endpoint**: `POST /api/installation/stage/complete`
- **File**: `lib/api.ts`
- **Function**: `completeStage(stageId, supplyCost?, notes?, endDate?, price?, collectPrice?, freeMonths?, technicianRatings?)`

### Add Stage Parts
- **Endpoint**: `POST /api/installation/stage/parts`
- **File**: `lib/api.ts`
- **Function**: `addStageParts(stageId, parts)`

### Update Stage
- **Endpoint**: `PUT /api/Installation/stage/update`
- **File**: `lib/api.ts`
- **Function**: `updateStage(data)`

### Get Stage Details
- **Endpoint**: `GET /api/Installation/stage/{stageId}`
- **File**: `lib/api.ts`
- **Function**: `getStageDetails(stageId)`

---

## Inspection & Offer Endpoints

### Create Inspection Request
- **Endpoint**: `POST /api/Installation/inspection/create`
- **File**: `lib/api.ts`
- **Function**: `createInspectionRequest(data)`

### Update Inspection Technical Data
- **Endpoint**: `PUT /api/Installation/inspection/{inspectionId}/technical-data`
- **File**: `lib/api.ts`
- **Function**: `updateInspectionTechnicalData(inspectionId, data)`

### Get Inspection Requests
- **Endpoint**: `GET /api/Installation/inspections` or `GET /api/Installation/inspections?status={status}`
- **File**: `lib/api.ts`
- **Function**: `getInspectionRequests(status?)`

### Get Inspection Request Details
- **Endpoint**: `GET /api/Installation/inspection/{id}`
- **File**: `lib/api.ts`
- **Function**: `getInspectionRequestDetails(id)`

### Create Offer
- **Endpoint**: `POST /api/Installation/offer/create`
- **File**: `lib/api.ts`
- **Function**: `createOffer(data)`

### Update Offer
- **Endpoint**: `PUT /api/Installation/offer/{offerId}`
- **File**: `lib/api.ts`
- **Function**: `updateOffer(offerId, data)`

### Update Offer PDF
- **Endpoint**: `PUT /api/Installation/offer/{offerId}/pdf`
- **File**: `lib/api.ts`
- **Function**: `updateOfferPdf(offerId, offerPdfPath)`

### Approve Offer
- **Endpoint**: `PUT /api/Installation/offer/{offerId}/approve`
- **File**: `lib/api.ts`
- **Function**: `approveOffer(offerId, data)`

### Get Offers
- **Endpoint**: `GET /api/Installation/offers` or `GET /api/Installation/offers?status={status}`
- **File**: `lib/api.ts`
- **Function**: `getOffers(status?)`

### Convert Offer to Project
- **Endpoint**: `POST /api/Installation/offer/{offerId}/convert-to-project`
- **File**: `lib/api.ts`
- **Function**: `convertOfferToProject(offerId)`

---

## Inspection Project Flow Endpoints

### Create Inspection Project
- **Endpoint**: `POST /api/Installation/inspection-project/create`
- **File**: `lib/api.ts`
- **Function**: `createInspectionProject(data)`

### Get Inspection Projects
- **Endpoint**: `GET /api/Installation/inspection-projects` or `GET /api/Installation/inspection-projects?status={status}`
- **File**: `lib/api.ts`
- **Function**: `getInspectionProjects(status?)`

### Create Quotation
- **Endpoint**: `POST /api/Installation/quotation/create`
- **File**: `lib/api.ts`
- **Function**: `createQuotation(data)`

### Approve Quotation
- **Endpoint**: `POST /api/Installation/quotation/{quotationId}/approve`
- **File**: `lib/api.ts`
- **Function**: `approveQuotation(quotationId, notes?)`

### Reject Quotation
- **Endpoint**: `POST /api/Installation/quotation/{quotationId}/reject`
- **File**: `lib/api.ts`
- **Function**: `rejectQuotation(quotationId, notes?)`

---

## Inventory Endpoints

### Get All Inventory Items
- **Endpoint**: `GET /api/inventory/all`
- **File**: `lib/api.ts`
- **Function**: `getInventoryItems()`

### Get Active Inventory Items
- **Endpoint**: `GET /api/inventory/active`
- **File**: `lib/api.ts`
- **Function**: `getActiveInventoryItems()`

### Create Inventory Item
- **Endpoint**: `POST /api/inventory/add`
- **File**: `lib/api.ts`
- **Function**: `createInventoryItem(data)`

### Update Inventory Item
- **Endpoint**: `PUT /api/inventory/update/{id}`
- **File**: `lib/api.ts`
- **Function**: `updateInventoryItem(id, data)`

### Disable/Enable Inventory Item
- **Endpoint**: `PUT /api/inventory/disable/{id}`
- **File**: `lib/api.ts`
- **Function**: `disableInventoryItem(id, disable)`

### Get Inventory Total Value
- **Endpoint**: `GET /api/inventory/value`
- **File**: `lib/api.ts`
- **Function**: `getInventoryTotalValue()`

---

## Category Endpoints

### Get Categories
- **Endpoint**: `GET /api/category/list`
- **File**: `lib/api.ts`
- **Function**: `getCategories()`

### Create Category
- **Endpoint**: `POST /api/category/add`
- **File**: `lib/api.ts`
- **Function**: `createCategory(data)`

---

## Technician Endpoints

### Get All Technicians
- **Endpoint**: `GET /api/Technician/all`
- **File**: `lib/api.ts`
- **Function**: `getTechnicians()`

### Get Available Technicians
- **Endpoint**: `GET /api/Technician/available`
- **File**: `lib/api.ts`
- **Function**: `getAvailableTechnicians()`

### Create Technician
- **Endpoint**: `POST /api/Technician/add`
- **File**: `lib/api.ts`
- **Function**: `createTechnician(data)`

### Update Technician
- **Endpoint**: `PUT /api/Technician/update/{id}`
- **File**: `lib/api.ts`
- **Function**: `updateTechnician(id, data)`

### Disable/Enable Technician
- **Endpoint**: `PUT /api/Technician/disable/{id}`
- **File**: `lib/api.ts`
- **Function**: `disableTechnician(id, disable)`

---

## Emergency Endpoints

### Get All Emergency Tickets
- **Endpoint**: `GET /api/Emergency`
- **File**: `lib/api.ts`
- **Function**: `getEmergencyTickets()`

### Get Emergency Ticket by ID
- **Endpoint**: `GET /api/Emergency/{id}`
- **File**: `lib/api.ts`
- **Function**: `getEmergencyTicketById(id)`

### Get Open Emergency Tickets
- **Endpoint**: `GET /api/Emergency/open`
- **File**: `lib/api.ts`
- **Function**: `getOpenEmergencyTickets()`

### Create Emergency Ticket
- **Endpoint**: `POST /api/Emergency`
- **File**: `lib/api.ts`
- **Function**: `createEmergencyTicket(data)`

### Update Emergency Ticket
- **Endpoint**: `PUT /api/Emergency/{id}`
- **File**: `lib/api.ts`
- **Function**: `updateEmergencyTicket(id, data)`

### Delete Emergency Ticket
- **Endpoint**: `DELETE /api/Emergency/{id}`
- **File**: `lib/api.ts`
- **Function**: `deleteEmergencyTicket(id)`

### Assign Technician to Emergency
- **Endpoint**: `PUT /api/Emergency/{id}/assign-technician`
- **File**: `lib/api.ts`
- **Function**: `assignEmergencyTechnician(id, technicianId)`

### Resolve Emergency Ticket
- **Endpoint**: `POST /api/Emergency/{id}/resolve`
- **File**: `lib/api.ts`
- **Function**: `resolveEmergencyTicket(id, notes?)`

---

## Maintenance Checklist Endpoints

### Get Checklist Items
- **Endpoint**: `GET /api/maintenance/checklist-item/list?includeInactive={includeInactive}`
- **File**: `lib/api.ts`
- **Function**: `getMaintenanceChecklistItems(includeInactive?)`

### Create Checklist Item
- **Endpoint**: `POST /api/maintenance/checklist-item/add`
- **File**: `lib/api.ts`
- **Function**: `createMaintenanceChecklistItem(data)`

### Update Checklist Item
- **Endpoint**: `PUT /api/maintenance/checklist-item/{id}`
- **File**: `lib/api.ts`
- **Function**: `updateMaintenanceChecklistItem(id, data)`

### Delete Checklist Item
- **Endpoint**: `DELETE /api/maintenance/checklist-item/{id}`
- **File**: `lib/api.ts`
- **Function**: `deleteMaintenanceChecklistItem(id)`

---

## Maintenance Project Endpoints

### Get Maintenance Projects
- **Endpoint**: `GET /api/maintenance/projects`
- **File**: `lib/api.ts`
- **Function**: `getMaintenanceProjects()`

### Get Maintenance Contract Details
- **Endpoint**: `GET /api/maintenance/projects/{contractId}`
- **File**: `lib/api.ts`
- **Function**: `getMaintenanceContractDetails(contractId)`

### Update Maintenance Contract
- **Endpoint**: `PUT /api/maintenance/projects/{contractId}`
- **File**: `lib/api.ts`
- **Function**: `updateMaintenanceContract(contractId, data)`

### Create Maintenance Project
- **Endpoint**: `POST /api/maintenance/projects/create`
- **File**: `lib/api.ts`
- **Function**: `createMaintenanceProject(data)`

### Check Maintenance Project Number
- **Endpoint**: `GET /api/maintenance/check-project-number?projectNumber={projectNumber}`
- **File**: `lib/api.ts`
- **Function**: `checkMaintenanceProjectNumber(projectNumber)`

### Freeze Contract
- **Endpoint**: `POST /api/maintenance/contract/{contractId}/freeze`
- **File**: `lib/api.ts`
- **Function**: `freezeContract(contractId, reason?, freezeEndDate?)`

### Stop Contract
- **Endpoint**: `POST /api/maintenance/contract/{contractId}/stop`
- **File**: `lib/api.ts`
- **Function**: `stopContract(contractId, reason?)`

### Activate Contract
- **Endpoint**: `POST /api/maintenance/contract/{contractId}/activate`
- **File**: `lib/api.ts`
- **Function**: `activateContract(contractId)`

---

## Maintenance Elevator Endpoints

### Get Maintenance Elevators
- **Endpoint**: `GET /api/maintenance/elevators`
- **File**: `lib/api.ts`
- **Function**: `getMaintenanceElevators()`

### Update Maintenance Elevator
- **Endpoint**: `PUT /api/maintenance/elevators/{elevatorId}`
- **File**: `lib/api.ts`
- **Function**: `updateMaintenanceElevator(elevatorId, data)`

### Freeze Elevator
- **Endpoint**: `POST /api/maintenance/elevator/{elevatorId}/freeze`
- **File**: `lib/api.ts`
- **Function**: `freezeElevator(elevatorId, reason?, freezeEndDate?)`

### Stop Elevator
- **Endpoint**: `POST /api/maintenance/elevator/{elevatorId}/stop`
- **File**: `lib/api.ts`
- **Function**: `stopElevator(elevatorId, reason?)`

### Activate Elevator
- **Endpoint**: `POST /api/maintenance/elevator/{elevatorId}/activate`
- **File**: `lib/api.ts`
- **Function**: `activateElevator(elevatorId)`

---

## Maintenance Visit Endpoints

### Get Visits by Contract and Month
- **Endpoint**: `GET /api/maintenance/contract/{contractId}/visits?month={month}&year={year}`
- **File**: `lib/api.ts`
- **Function**: `getVisitsByContractAndMonth(contractId, month, year)`

### Get Visits by Elevator
- **Endpoint**: `GET /api/maintenance/elevator/{elevatorId}/visits` or `GET /api/maintenance/elevator/{elevatorId}/visits?month={month}&year={year}`
- **File**: `lib/api.ts`
- **Function**: `getVisitsByElevator(elevatorId, month?, year?)`

### Schedule Visit
- **Endpoint**: `POST /api/maintenance/visit/schedule`
- **File**: `lib/api.ts`
- **Function**: `scheduleVisit(dto)`

### Complete Visit
- **Endpoint**: `POST /api/maintenance/visit/{visitId}/complete`
- **File**: `lib/api.ts`
- **Function**: `completeVisit(visitId, dto)`

### Get Visit Details
- **Endpoint**: `GET /api/maintenance/visit/{visitId}`
- **File**: `lib/api.ts`
- **Function**: `getVisitDetails(visitId)`

### Mark Visit as Paid
- **Endpoint**: `POST /api/maintenance/visit/{visitId}/mark-paid`
- **File**: `lib/api.ts`
- **Function**: `markVisitAsPaid(visitId)`

### Download Visit PDF
- **Endpoint**: `GET /api/maintenance/visit/{visitId}/pdf`
- **File**: `lib/api.ts`
- **Function**: `downloadMaintenanceVisitPdf(visitId)`
- **Returns**: Blob (PDF file)

---

## Admin Management Endpoints

### Get All Admins
- **Endpoint**: `GET /api/Admin/list`
- **File**: `lib/api.ts`
- **Function**: `getAdmins()`

### Register Admin
- **Endpoint**: `POST /api/Admin/register`
- **File**: `lib/api.ts`
- **Function**: `registerAdmin(data)`

### Update Admin
- **Endpoint**: `PUT /api/Admin/update/{id}`
- **File**: `lib/api.ts`
- **Function**: `updateAdmin(id, data)`

### Disable/Enable Admin
- **Endpoint**: `PUT /api/Admin/disable/{id}`
- **File**: `lib/api.ts`
- **Function**: `disableAdmin(id, disable)`

### Assign Roles
- **Endpoint**: `PUT /api/Admin/roles/{id}`
- **File**: `lib/api.ts`
- **Function**: `assignRoles(id, roles)`

---

## Summary

**Total Endpoints**: 82+ API endpoints

All endpoints are configured to use the `NEXT_PUBLIC_API_URL` environment variable from `.env.local` file. The centralized configuration is managed in `lib/api-config.ts`.

### Configuration Files:
- `lib/api-config.ts` - Centralized API base URL configuration
- `lib/api-client.ts` - Centralized API client with auth and error handling
- `lib/auth.ts` - Authentication functions (login, refresh token)
- `lib/api.ts` - All API endpoint functions

### Environment Setup:
Create a `.env.local` file in the `liftops-frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5295
```

For production, update the URL to your production API server.
