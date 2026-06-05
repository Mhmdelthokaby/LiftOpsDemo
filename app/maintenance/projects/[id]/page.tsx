"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getMaintenanceContractDetails, MaintenanceContractDetails } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Building2, Calendar, DollarSign, MapPin, Phone, Mail, RefreshCw, Wrench, Snowflake, Square, Play, Edit, User, FileDown } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { MonthlyMaintenanceDialog } from "@/components/maintenance/monthly-maintenance-dialog"
// import { MonthlyMaintenanceHistory } from "@/components/maintenance/monthly-maintenance-history" // Disabled: Using per-elevator history instead
import { ElevatorMaintenanceHistory } from "@/components/maintenance/elevator-maintenance-history"
import { EditContractDialog } from "@/components/maintenance/edit-contract-dialog"
import { EditElevatorDialog } from "@/components/maintenance/edit-elevator-dialog"
import { canManageMaintenance } from "@/lib/user"
import { formatDate } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { freezeContract, stopContract, activateContract, freezeElevator, stopElevator, activateElevator, getVisitsByElevator, getVisitDetails, getVisitsByContractAndMonth, type MaintenanceContract } from "@/lib/api"
import { generateMaintenanceProjectReportPDF } from "@/lib/pdf-utils"

export default function MaintenanceProjectDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [contract, setContract] = useState<MaintenanceContractDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [maintenanceDialog, setMaintenanceDialog] = useState<{ open: boolean; elevatorId: string | null }>({
        open: false,
        elevatorId: null
    })
    const [editContractDialog, setEditContractDialog] = useState(false)
    const [editElevatorDialog, setEditElevatorDialog] = useState<{ open: boolean; elevatorId: string | null }>({
        open: false,
        elevatorId: null
    })
    const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'freeze' | 'stop' | 'activate' | null; elevatorId?: string | null }>({
        open: false,
        type: null,
        elevatorId: null
    })
    const [refreshKey, setRefreshKey] = useState(0)
    const [currentMonthVisits, setCurrentMonthVisits] = useState<Array<{ elevatorId: string; status: string }>>([])

    const canManage = canManageMaintenance()

    useEffect(() => {
        if (id) {
            fetchContract()
        }
    }, [id])

    useEffect(() => {
        if (contract) {
            fetchCurrentMonthVisits()
        }
    }, [contract, refreshKey])

    const fetchCurrentMonthVisits = async () => {
        if (!contract) return
        
        try {
            const currentDate = new Date()
            const month = currentDate.getMonth() + 1
            const year = currentDate.getFullYear()
            const visits = await getVisitsByContractAndMonth(contract.id, month, year)
            
            // Extract elevator visits with their status
            const elevatorVisits = visits.map(visit => ({
                elevatorId: visit.elevatorId,
                status: visit.status
            }))
            
            setCurrentMonthVisits(elevatorVisits)
        } catch (error) {
            console.error("Failed to fetch current month visits:", error)
            setCurrentMonthVisits([])
        }
    }

    const isElevatorDoneThisMonth = (elevatorId: string): boolean => {
        const elevatorVisit = currentMonthVisits.find(v => v.elevatorId === elevatorId)
        return elevatorVisit?.status.toLowerCase() === "done"
    }

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && id) {
                fetchContract()
            }
        }

        const handleFocus = () => {
            if (id) {
                fetchContract()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleFocus)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleFocus)
        }
    }, [id])

    const fetchContract = async () => {
        if (!id) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const data = await getMaintenanceContractDetails(id)
            setContract(data)
        } catch (error: any) {
            console.error("Error fetching maintenance contract:", error)
            const errorMessage = error?.message || error?.data?.message || "Failed to load contract details"
            toast.error(errorMessage)
            if (errorMessage.includes("not found") || errorMessage.includes("404")) {
                router.push("/maintenance?view=projects")
            }
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "active":
                return "bg-success text-success-foreground"
            case "pending":
                return "bg-warning text-warning-foreground"
            case "frozen":
                return "bg-warning text-warning-foreground"
            case "cancelled":
                return "bg-destructive text-destructive-foreground"
            case "expired":
                return "bg-muted text-muted-foreground"
            default:
                return "bg-muted text-muted-foreground"
        }
    }


    const formatCurrency = (amount: number) => {
        if (amount === 0) return "Free"
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })
    }

    const getElevatorCode = (index: number) => {
        if (contract?.projectNumber) {
            return `${contract.projectNumber}-M${index + 1}`
        }
        return `M${index + 1}`
    }

    // Check if project is in free maintenance period
    const isFreeMaintenance = (contract: MaintenanceContractDetails): boolean => {
        if (contract.freeMonths <= 0) return false

        // Calculate months elapsed since start date
        const startDate = new Date(contract.startDate)
        const currentDate = new Date()

        const yearDiff = currentDate.getFullYear() - startDate.getFullYear()
        const monthDiff = currentDate.getMonth() - startDate.getMonth()
        let monthsElapsed = (yearDiff * 12) + monthDiff

        // If the day of current date is before the day of start date, we haven't completed a full month yet
        if (currentDate.getDate() < startDate.getDate()) {
            monthsElapsed--
        }

        // Project is in free maintenance if months elapsed < free months
        return monthsElapsed < contract.freeMonths
    }

    const openActionDialog = (type: 'freeze' | 'stop' | 'activate', elevatorId?: string) => {
        setActionDialog({ open: true, type, elevatorId: elevatorId || null })
    }

    const closeActionDialog = () => {
        setActionDialog({ open: false, type: null, elevatorId: null })
    }

    const handleConfirmAction = async () => {
        if (!contract || !actionDialog.type) return

        try {
            // If elevatorId is provided, change elevator status; otherwise change contract status
            if (actionDialog.elevatorId) {
                switch (actionDialog.type) {
                    case 'freeze':
                        await freezeElevator(actionDialog.elevatorId)
                        toast.success("Elevator frozen successfully")
                        break
                    case 'stop':
                        await stopElevator(actionDialog.elevatorId)
                        toast.success("Elevator stopped successfully")
                        break
                    case 'activate':
                        await activateElevator(actionDialog.elevatorId)
                        toast.success("Elevator activated successfully")
                        break
                }
            } else {
                switch (actionDialog.type) {
                    case 'freeze':
                        await freezeContract(contract.id)
                        toast.success("Contract frozen successfully")
                        break
                    case 'stop':
                        await stopContract(contract.id)
                        toast.success("Contract stopped successfully")
                        break
                    case 'activate':
                        await activateContract(contract.id)
                        toast.success("Contract activated successfully")
                        break
                }
            }
            closeActionDialog()
            fetchContract()
        } catch (error: any) {
            toast.error(error.message || `Failed to ${actionDialog.type} ${actionDialog.elevatorId ? 'elevator' : 'contract'}`)
        }
    }

    const getActionDialogContent = () => {
        const isElevator = !!actionDialog.elevatorId
        const entityName = isElevator ? "Elevator" : "Contract"

        switch (actionDialog.type) {
            case 'freeze':
                return {
                    title: `Freeze ${entityName}`,
                    description: `Are you sure you want to freeze this ${entityName.toLowerCase()}? Maintenance will be paused until reactivated.`,
                    confirmText: "Freeze",
                    variant: "default" as const
                }
            case 'stop':
                return {
                    title: `Stop ${entityName}`,
                    description: `Are you sure you want to stop this ${entityName.toLowerCase()}? This action will permanently stop maintenance for this ${entityName.toLowerCase()}.`,
                    confirmText: "Stop",
                    variant: "destructive" as const
                }
            case 'activate':
                return {
                    title: `Activate ${entityName}`,
                    description: `Are you sure you want to activate this ${entityName.toLowerCase()}? Maintenance will resume for this ${entityName.toLowerCase()}.`,
                    confirmText: "Activate",
                    variant: "default" as const
                }
            default:
                return {
                    title: "Confirm Action",
                    description: "Are you sure you want to proceed?",
                    confirmText: "Confirm",
                    variant: "default" as const
                }
        }
    }

    const handleGenerateProjectPDF = async () => {
        if (!contract) return

        try {
            toast.loading("Generating PDF report...")
            
            // Fetch all visits for all elevators in this contract
            const allVisits: Array<{
                id: string;
                visitDate: string;
                completedDate?: string;
                elevatorCode: string;
                status: string;
                spareParts?: Array<{
                    itemName: string;
                    quantity: number;
                    priceAtTimeOfUsage: number;
                    totalPrice: number;
                }>;
            }> = []

            // Get visits for each elevator
            for (const elevator of contract.elevators) {
                try {
                    const visits = await getVisitsByElevator(elevator.id)
                    for (const visit of visits) {
                        // Fetch full visit details to get spare parts
                        try {
                            const visitDetails = await getVisitDetails(visit.id)
                            allVisits.push({
                                id: visit.id,
                                visitDate: visit.visitDate,
                                completedDate: visit.completedDate,
                                elevatorCode: visit.elevatorCode,
                                status: visit.status,
                                spareParts: visitDetails.spareParts?.map(sp => ({
                                    itemName: sp.itemName,
                                    quantity: sp.quantity,
                                    priceAtTimeOfUsage: sp.priceAtTimeOfUsage,
                                    totalPrice: sp.totalPrice
                                }))
                            })
                        } catch (error) {
                            // If we can't get details, still add the visit without spare parts
                            allVisits.push({
                                id: visit.id,
                                visitDate: visit.visitDate,
                                completedDate: visit.completedDate,
                                elevatorCode: visit.elevatorCode,
                                status: visit.status
                            })
                        }
                    }
                } catch (error) {
                    console.error(`Failed to fetch visits for elevator ${elevator.id}:`, error)
                }
            }

            // Convert contract to MaintenanceContract format
            const contractForPDF: MaintenanceContract = {
                id: contract.id,
                customerId: contract.customerId,
                customerName: contract.customerName,
                customerPhone: contract.customerPhone,
                customerEmail: contract.customerEmail,
                customerAddress: contract.customerAddress,
                projectNumber: contract.projectNumber,
                isFromInstallation: contract.isFromInstallation,
                startDate: contract.startDate,
                endDate: contract.endDate,
                pricePerMonth: contract.pricePerMonth,
                freeMonths: contract.freeMonths,
                status: contract.status,
                elevatorCount: contract.elevators.length,
                technicianId: contract.technicianId,
                technicianName: contract.technicianName,
                createdAt: contract.createdAt
            }

            await generateMaintenanceProjectReportPDF(contractForPDF, allVisits)
            toast.dismiss()
            toast.success("PDF report generated successfully")
        } catch (error: any) {
            toast.dismiss()
            toast.error(error.message || "Failed to generate PDF report")
        }
    }

    if (loading) return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 text-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading contract details...</p>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )

    if (!contract) return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 text-center">Contract not found</main>
                </div>
            </div>
        </SidebarProvider>
    )

    return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-6 pt-6 max-w-6xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Projects
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={handleGenerateProjectPDF}
                                disabled={loading}
                            >
                                <FileDown className="mr-2 h-4 w-4" />
                                Download Project Report PDF
                            </Button>
                        </div>

                        {/* Summary Cards */}
                        {contract.elevators && contract.elevators.length > 0 && (() => {
                            const activeCount = contract.elevators.filter(e => e.status.toLowerCase() === 'active').length
                            const frozenCount = contract.elevators.filter(e => e.status.toLowerCase() === 'frozen').length
                            const stoppedCount = contract.elevators.filter(e => e.status.toLowerCase() === 'stopped').length
                            const totalCount = contract.elevators.length

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>Total Elevators</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{totalCount}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>Active</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-success">{activeCount}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>Frozen</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-warning">{frozenCount}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>Stopped</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-destructive">{stoppedCount}</div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Left Column: Contract & Customer Info */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CardTitle className="text-xl text-primary">
                                                        {contract.projectNumber || `M-${contract.id.substring(0, 8).toUpperCase()}`}
                                                    </CardTitle>
                                                    {isFreeMaintenance(contract) ? (
                                                        <Badge className="bg-success text-success-foreground">
                                                            Free Maintenance
                                                        </Badge>
                                                    ) : contract.freeMonths > 0 ? (
                                                        <Badge variant="outline" className="text-muted-foreground">
                                                            Free Period Expired
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">
                                                            Paid Maintenance
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardDescription>Project Number</CardDescription>
                                            </div>
                                            {canManage && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditContractDialog(true)}
                                                    className="text-primary hover:text-primary"
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(contract.projectAddress || contract.city) && (
                                            <div className="flex items-start space-x-3">
                                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div className="text-sm">
                                                    <div className="text-muted-foreground">Project Address</div>
                                                    <div className="font-medium">
                                                        {contract.projectAddress || contract.customerAddress}
                                                        {contract.city && `, ${contract.city}`}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {contract.googleMapsLink && (() => {
                                            // Validate URL - must be a valid Google Maps URL
                                            const isValidUrl = (url: string): boolean => {
                                                if (!url || url.trim().length === 0) return false
                                                // Check if it contains error messages or invalid characters
                                                if (url.includes('ApiError') || url.includes('parseResponse') || url.includes('localhost:3000')) return false
                                                // Check if it's a valid URL format
                                                try {
                                                    const urlObj = url.startsWith('http://') || url.startsWith('https://') 
                                                        ? new URL(url) 
                                                        : new URL(`https://${url}`)
                                                    // Check if it's a Google Maps domain
                                                    return urlObj.hostname.includes('google.com') || 
                                                           urlObj.hostname.includes('maps.app') ||
                                                           urlObj.hostname.includes('goo.gl') ||
                                                           urlObj.hostname.includes('maps.google')
                                                } catch {
                                                    return false
                                                }
                                            }
                                            
                                            const isValid = isValidUrl(contract.googleMapsLink)
                                            
                                            if (!isValid) return null
                                            
                                            const mapUrl = contract.googleMapsLink.startsWith('http://') || contract.googleMapsLink.startsWith('https://') 
                                                ? contract.googleMapsLink 
                                                : `https://${contract.googleMapsLink}`
                                            
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>Google Maps Location</span>
                                                    </div>
                                                    <div className="w-full h-48 rounded-lg overflow-hidden border border-border/40">
                                                        {contract.googleMapsLink.includes('/embed') ? (
                                                            <iframe
                                                                src={mapUrl}
                                                                width="100%"
                                                                height="100%"
                                                                style={{ border: 0 }}
                                                                allowFullScreen
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer-when-downgrade"
                                                            />
                                                        ) : (
                                                            <a
                                                                href={mapUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    window.open(mapUrl, '_blank', 'noopener,noreferrer')
                                                                }}
                                                                className="flex items-center justify-center h-full bg-muted/50 hover:bg-muted transition-colors text-primary cursor-pointer"
                                                            >
                                                                <div className="text-center">
                                                                    <MapPin className="h-8 w-8 mx-auto mb-2" />
                                                                    <span className="text-sm font-medium">View on Google Maps</span>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div className="text-sm">
                                                <div className="text-muted-foreground">Start Date</div>
                                                <div className="font-medium">{formatDate(contract.startDate)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div className="text-sm">
                                                <div className="text-muted-foreground">End Date</div>
                                                <div className="font-medium">{formatDate(contract.endDate)}</div>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center space-x-3">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <div className="text-sm">
                                                <div className="text-muted-foreground">Price/Month</div>
                                                <div className="font-medium">{formatCurrency(contract.pricePerMonth)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div className="text-sm">
                                                <div className="text-muted-foreground">Free Months</div>
                                                <div className="font-medium">{contract.freeMonths} {contract.freeMonths === 1 ? 'month' : 'months'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 text-primary">
                                            <User className="h-4 w-4" />
                                            <div className="text-sm">
                                                <div className="text-muted-foreground">Main Responsible Technician</div>
                                                <div className="font-semibold">{contract.technicianName || "Not Assigned"}</div>
                                            </div>
                                        </div>
                                        {contract.frozenReason && (
                                            <>
                                                <Separator />
                                                <div className="text-sm">
                                                    <div className="text-muted-foreground">Freeze Reason</div>
                                                    <div className="font-medium">{contract.frozenReason}</div>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-xl">Customer Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="font-semibold">{contract.customerName}</div>
                                        <div className="flex items-center space-x-3 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{contract.customerPhone}</span>
                                        </div>
                                        {contract.customerEmail && (
                                            <div className="flex items-center space-x-3 text-sm">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span>{contract.customerEmail}</span>
                                            </div>
                                        )}
                                        {contract.customerAddress && (
                                            <div className="flex items-start space-x-3 text-sm">
                                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <span>
                                                  {contract.customerAddress}
                                                  {contract.customerCity && `, ${contract.customerCity}`}
                                                </span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Elevators */}
                            <div className="md:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Building2 className="h-5 w-5" />
                                            Elevators ({contract.elevators.length})
                                        </CardTitle>
                                        <CardDescription>Maintenance elevators for this contract</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {contract.elevators.length > 0 ? (
                                            <div className="space-y-4">
                                                {contract.elevators.map((elevator, index) => (
                                                    <Card key={elevator.id} className="border-border/40">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono font-semibold text-primary">
                                                                            {getElevatorCode(index)}
                                                                        </span>
                                                                        <Badge variant="outline" className={getStatusColor(elevator.status)}>
                                                                            {elevator.status}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        <div>
                                                                            <div className="text-muted-foreground">Type</div>
                                                                            <div className="font-medium">{elevator.type}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-muted-foreground">Stops/Floors</div>
                                                                            <div className="font-medium">
                                                                                {elevator.numberOfStops} stops / {elevator.numberOfFloors} floors
                                                                            </div>
                                                                        </div>
                                                                        {elevator.nextMaintenanceDate && (
                                                                            <div>
                                                                                <div className="text-muted-foreground">Next Maintenance</div>
                                                                                <div className="font-medium">{formatDate(elevator.nextMaintenanceDate)}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {canManage && (
                                                                        <>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => setEditElevatorDialog({ open: true, elevatorId: elevator.id })}
                                                                                className="text-primary hover:text-primary"
                                                                            >
                                                                                <Edit className="h-4 w-4 mr-1" />
                                                                                Edit
                                                                            </Button>
                                                                            {elevator.status.toLowerCase() === 'active' && (
                                                                                <>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => openActionDialog('freeze', elevator.id)}
                                                                                        className="text-warning hover:text-warning"
                                                                                    >
                                                                                        <Snowflake className="h-4 w-4 mr-1" />
                                                                                        Freeze
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => openActionDialog('stop', elevator.id)}
                                                                                        className="text-destructive hover:text-destructive"
                                                                                    >
                                                                                        <Square className="h-4 w-4 mr-1" />
                                                                                        Stop
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                            {(elevator.status.toLowerCase() === 'frozen' || elevator.status.toLowerCase() === 'stopped') && (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => openActionDialog('activate', elevator.id)}
                                                                                    className="text-success hover:text-success"
                                                                                >
                                                                                    <Play className="h-4 w-4 mr-1" />
                                                                                    Activate
                                                                                </Button>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {elevator.status.toLowerCase() === 'active' && (
                                                                        <Button
                                                                            variant="default"
                                                                            size="sm"
                                                                            onClick={() => setMaintenanceDialog({ open: true, elevatorId: elevator.id })}
                                                                            className="bg-primary text-primary-foreground"
                                                                            disabled={isElevatorDoneThisMonth(elevator.id)}
                                                                            title={isElevatorDoneThisMonth(elevator.id) ? "Maintenance already completed for this month" : ""}
                                                                        >
                                                                            <Wrench className="h-4 w-4 mr-1" />
                                                                            Maintenance
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Elevator Maintenance History */}
                                                            <div className="mt-4 pt-4 border-t">
                                                                <ElevatorMaintenanceHistory
                                                                    key={`${elevator.id}-${refreshKey}`}
                                                                    elevatorId={elevator.id}
                                                                    contractId={contract.id}
                                                                    projectNumber={contract.projectNumber}
                                                                    pricePerMonth={contract.pricePerMonth}
                                                                    freeMonths={contract.freeMonths}
                                                                    elevatorCode={getElevatorCode(index)}
                                                                />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <p>No elevators found for this contract.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Maintenance History - Disabled: Now using per-elevator history */}
                                {/* <Card>
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Maintenance History
                                        </CardTitle>
                                        <CardDescription>Monthly maintenance records for this project</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <MonthlyMaintenanceHistory contract={{
                                            id: contract.id,
                                            customerId: contract.customerId,
                                            customerName: contract.customerName,
                                            customerPhone: contract.customerPhone,
                                            customerEmail: contract.customerEmail,
                                            customerAddress: contract.customerAddress,
                                            projectNumber: contract.projectNumber,
                                            isFromInstallation: contract.isFromInstallation,
                                            startDate: contract.startDate,
                                            endDate: contract.endDate,
                                            pricePerMonth: contract.pricePerMonth,
                                            freeMonths: contract.freeMonths,
                                            status: contract.status,
                                            elevatorCount: contract.elevators.length,
                                            createdAt: contract.createdAt
                                        }} />
                                    </CardContent>
                                </Card> */}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Monthly Maintenance Dialog */}
            {contract && maintenanceDialog.elevatorId && (
                <MonthlyMaintenanceDialog
                    contractId={contract.id}
                    projectNumber={contract.projectNumber || `M-${contract.id.substring(0, 8).toUpperCase()}`}
                    pricePerMonth={contract.pricePerMonth}
                    freeMonths={contract.freeMonths}
                    isOpen={maintenanceDialog.open}
                    onClose={() => setMaintenanceDialog({ open: false, elevatorId: null })}
                    onSuccess={() => {
                        fetchContract()
                        setRefreshKey(prev => prev + 1) // Trigger refresh of all elevator histories
                        fetchCurrentMonthVisits() // Refresh current month visits
                        setMaintenanceDialog({ open: false, elevatorId: null })
                    }}
                    elevatorId={maintenanceDialog.elevatorId}
                />
            )}

            {/* Edit Contract Dialog */}
            <EditContractDialog
                open={editContractDialog}
                onOpenChange={setEditContractDialog}
                contract={contract}
                onUpdate={fetchContract}
            />

            {/* Edit Elevator Dialog */}
            {contract && editElevatorDialog.elevatorId && (
                <EditElevatorDialog
                    open={editElevatorDialog.open}
                    onOpenChange={(open) => setEditElevatorDialog({ open, elevatorId: open ? editElevatorDialog.elevatorId : null })}
                    elevatorId={editElevatorDialog.elevatorId}
                    elevator={contract.elevators.find(e => e.id === editElevatorDialog.elevatorId) || null}
                    onUpdate={fetchContract}
                />
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && closeActionDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{getActionDialogContent().title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {getActionDialogContent().description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeActionDialog}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            className={actionDialog.type === 'stop' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {getActionDialogContent().confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    )
}

