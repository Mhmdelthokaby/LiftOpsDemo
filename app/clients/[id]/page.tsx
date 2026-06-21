"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCustomers, Customer, getProjects, InstallationProject, getMaintenanceProjects, MaintenanceContract } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Mail, Phone, MapPin, Calendar, DollarSign, ArrowRight, Building2, CheckCircle2, Edit, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { canViewMaintenance } from "@/lib/user"

type CustomerStatusType = "Approved" | "PendingInspectionQuotation" | "Rejected";

interface CustomerWithProjects extends Customer {
    installationProjects: InstallationProject[];
    maintenanceContracts: MaintenanceContract[];
    customerStatus?: CustomerStatusType;
}

export default function ClientDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [customer, setCustomer] = useState<CustomerWithProjects | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchClientData()
        }
    }, [id])

    // Calculate customer status based on projects and maintenance contracts
    // Rules:
    // - If client has at least one active maintenance contract → Client status = "Approved"
    // - If client has at least one project that is "active", "inprogress", or "completed" → Client status = "Approved"
    // - If all projects are rejected → Client status = "Rejected"
    // - Otherwise → Client status = "PendingInspectionQuotation"
    const calculateCustomerStatus = (projects: InstallationProject[], maintenanceContracts: MaintenanceContract[] = []): CustomerStatusType => {
        // First check: If client has at least one active maintenance contract, they are Approved
        const hasActiveMaintenance = maintenanceContracts.some(contract => 
            contract.status && contract.status.toLowerCase() === "active"
        );
        
        if (hasActiveMaintenance) {
            return "Approved";
        }

        if (projects.length === 0) {
            return "PendingInspectionQuotation";
        }

        // Check if any project is active, in progress, or completed
        // These statuses indicate the client is approved
        const hasActiveProject = projects.some(p => {
            const status = p.status.toLowerCase();
            return status === "active" || status === "inprogress" || status === "completed";
        });
        
        if (hasActiveProject) {
            return "Approved";
        }

        // Check if all projects are rejected
        const allRejected = projects.every(p => p.status.toLowerCase() === "rejected");
        
        if (allRejected) {
            return "Rejected";
        }

        // Otherwise, all projects are pending
        return "PendingInspectionQuotation";
    };


    const fetchClientData = async () => {
        if (!id) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const canViewMaintenanceData = canViewMaintenance()
            
            // Only fetch maintenance projects if user has permission
            const promises: Promise<any>[] = [
                getCustomers(),
                getProjects()
            ]
            
            if (canViewMaintenanceData) {
                promises.push(getMaintenanceProjects())
            }

            const results = await Promise.all(promises)
            const customersData = results[0]
            const projectsData = results[1]
            const maintenanceProjectsData = canViewMaintenanceData ? results[2] : []

            const foundCustomer = customersData.find(c => c.id === id)
            if (!foundCustomer) {
                toast.error("Client not found")
                router.push("/clients")
                return
            }

            const installationProjects = projectsData.filter(
                project => project.customerId === foundCustomer.id
            )

            const maintenanceContracts = canViewMaintenanceData 
                ? maintenanceProjectsData.filter(
                    contract => contract.customerId === foundCustomer.id
                )
                : []

            const customerStatus = calculateCustomerStatus(installationProjects, maintenanceContracts);

            setCustomer({
                ...foundCustomer,
                installationProjects,
                maintenanceContracts,
                customerStatus
            })
        } catch (error: any) {
            console.error("Error fetching client:", error)
            // Don't show error for 403 (permission denied) - user just doesn't have access
            if (error?.status !== 403) {
                const errorMessage = error?.message || error?.data?.message || "Failed to load client details"
                toast.error(errorMessage)
            }
            // Only redirect if it's not a permission error
            if (error?.status !== 403) {
                router.push("/clients")
            }
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const statusLower = status.toLowerCase()
        if (statusLower === "completed") {
            return <Badge className="bg-green-600 text-white">Completed</Badge>
        } else if (statusLower === "inprogress" || statusLower === "in progress") {
            return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>
        } else if (statusLower === "pending") {
            return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
        }
        return <Badge variant="outline">{status}</Badge>
    }

    if (loading) return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 text-center">Loading client details...</main>
                </div>
            </div>
        </SidebarProvider>
    )

    if (!customer) return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 text-center">Client not found</main>
                </div>
            </div>
        </SidebarProvider>
    )

    const activeInstallationProjects = customer.installationProjects.filter(
        p => p.status.toLowerCase() !== "completed"
    )
    const completedInstallationProjects = customer.installationProjects.filter(
        p => p.status.toLowerCase() === "completed"
    )
    
    const activeMaintenanceContracts = customer.maintenanceContracts.filter(
        c => c.status.toLowerCase() === "active"
    )

    return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 pt-6 max-w-7xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Clients
                            </Button>
                            <div className="flex items-center space-x-3">
                                {customer?.customerStatus && (
                                    <Badge 
                                        className={
                                            customer.customerStatus === "Approved" 
                                                ? "bg-green-600 text-white px-3 py-1.5 text-sm"
                                                : customer.customerStatus === "Rejected"
                                                ? "bg-red-600 text-white px-3 py-1.5 text-sm"
                                                : "bg-yellow-500 text-white px-3 py-1.5 text-sm"
                                        }
                                    >
                                        {customer.customerStatus === "Approved" && <CheckCircle className="mr-1.5 h-3.5 w-3.5 inline" />}
                                        {customer.customerStatus === "Rejected" && <XCircle className="mr-1.5 h-3.5 w-3.5 inline" />}
                                        Status: {customer.customerStatus}
                                    </Badge>
                                )}
                                <Button variant="outline" onClick={() => router.push(`/clients/${id}/edit`)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Client
                                </Button>
                            </div>
                        </div>

                        {/* Client Information Card */}
                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-2xl">{customer.name}</CardTitle>
                                <CardDescription>Client Information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                                <p className="text-base">{customer.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Phone className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                                <p className="text-base">{customer.phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-muted-foreground">Client Address</p>
                                                <p className="text-base">{customer.address || "No address provided"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                                                <p className="text-base font-semibold">
                                                    {customer.installationProjects.length + (canViewMaintenance() ? customer.maintenanceContracts.length : 0)}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {customer.installationProjects.length} Installation{customer.installationProjects.length !== 1 ? 's' : ''}
                                                    {canViewMaintenance() && ` • ${customer.maintenanceContracts.length} Maintenance`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Installation Projects Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Installation Projects</h2>
                                    <p className="text-muted-foreground">
                                        {customer.installationProjects.length} project{customer.installationProjects.length !== 1 ? 's' : ''} total
                                        {activeInstallationProjects.length > 0 && ` • ${activeInstallationProjects.length} active`}
                                        {completedInstallationProjects.length > 0 && ` • ${completedInstallationProjects.length} completed`}
                                    </p>
                                </div>
                            </div>

                            {customer.installationProjects.length === 0 ? (
                                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-8 text-center text-muted-foreground">
                                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No installation projects found</p>
                                        <p className="text-sm">This client doesn't have any installation projects yet.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {customer.installationProjects.map((project) => (
                                        <Card key={project.id} className="border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">{project.projectNumber}</CardTitle>
                                                        <CardDescription className="mt-1">
                                                            {project.customerName}
                                                        </CardDescription>
                                                    </div>
                                                    {getStatusBadge(project.status)}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="space-y-2">
                                                    <div className="flex items-start space-x-2 text-sm">
                                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Project Address</p>
                                                            <p className="text-sm line-clamp-2">
                                                                {project.projectAddress || project.customerAddress || "No address provided"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {(project.projectAddress || project.customerAddress) && customer.address && (
                                                        <div className="flex items-center space-x-2 text-xs">
                                                            {(() => {
                                                                const projectAddr = (project.projectAddress || project.customerAddress || "").trim().toLowerCase();
                                                                const clientAddr = customer.address.trim().toLowerCase();
                                                                const isSame = projectAddr === clientAddr;
                                                                return isSame ? (
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                        Same as client address
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                                                        Different from client address
                                                                    </Badge>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-muted-foreground">
                                                        Contract: {new Date(project.contractDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {project.totalPrice > 0 && (
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="text-muted-foreground">
                                                            {project.totalPrice.toLocaleString()} EGP
                                                        </span>
                                                    </div>
                                                )}
                                                {project.elevators && project.elevators.length > 0 && (
                                                    <div className="pt-2 border-t">
                                                        <p className="text-xs text-muted-foreground">
                                                            {project.elevators.length} Elevator{project.elevators.length !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="pt-2">
                                                    <Link href={`/projects/${project.id}`}>
                                                        <Button variant="outline" size="sm" className="w-full hover:bg-primary/10 hover:text-primary">
                                                            View Project Details
                                                            <ArrowRight className="ml-2 h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Maintenance Projects Section - Only show if user has permission */}
                        {canViewMaintenance() && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">Maintenance Projects</h2>
                                        <p className="text-muted-foreground">
                                            {customer.maintenanceContracts.length} contract{customer.maintenanceContracts.length !== 1 ? 's' : ''} total
                                            {activeMaintenanceContracts.length > 0 && ` • ${activeMaintenanceContracts.length} active`}
                                        </p>
                                    </div>
                                </div>

                                {customer.maintenanceContracts.length === 0 ? (
                                    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                        <CardContent className="p-8 text-center text-muted-foreground">
                                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p className="text-lg font-medium">No maintenance projects found</p>
                                            <p className="text-sm">This client doesn't have any maintenance contracts yet.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {customer.maintenanceContracts.map((contract) => (
                                            <Card key={contract.id} className="border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <CardTitle className="text-lg">{contract.projectNumber}</CardTitle>
                                                            <CardDescription className="mt-1">
                                                                {contract.customerName}
                                                            </CardDescription>
                                                        </div>
                                                        {getStatusBadge(contract.status)}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="text-muted-foreground">
                                                            {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {contract.pricePerMonth > 0 && (
                                                        <div className="flex items-center space-x-2 text-sm">
                                                            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            <span className="text-muted-foreground">
                                                                {contract.pricePerMonth.toLocaleString()} EGP/month
                                                                {contract.freeMonths > 0 && ` • ${contract.freeMonths} free month${contract.freeMonths !== 1 ? 's' : ''}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {contract.elevatorCount > 0 && (
                                                        <div className="pt-2 border-t">
                                                            <p className="text-xs text-muted-foreground">
                                                                {contract.elevatorCount} Elevator{contract.elevatorCount !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="pt-2">
                                                        <Link href={`/maintenance/projects/${contract.id}`}>
                                                            <Button variant="outline" size="sm" className="w-full hover:bg-primary/10 hover:text-primary">
                                                                View Contract Details
                                                                <ArrowRight className="ml-2 h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <DemoGuidePanel
              title="Clients"
              description="Manage all your client relationships in one place."
              features={[
                { icon: "🔍", label: "Search & Filter", description: "Quickly find any client by name or contact" },
                { icon: "📋", label: "Client Details", description: "View client profile, projects, and contracts" },
                { icon: "➕", label: "Add / Edit", description: "Full client management with contact info" },
              ]}
              tip="Click any client row to see their full project and contract history."
            />
        </SidebarProvider>
    )
}

