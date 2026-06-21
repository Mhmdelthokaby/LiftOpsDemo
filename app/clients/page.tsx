"use client"

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useEffect, useState } from "react"
import { getCustomers, Customer, getProjects, InstallationProject, getMaintenanceProjects, MaintenanceContract, getMaintenanceElevators, MaintenanceElevator } from "@/lib/api"
import { hasAnyRole } from "@/lib/user"
import { useToast } from "@/hooks/use-toast"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "@/lib/i18n/context"

type CustomerStatus = "Approved" | "PendingInspectionQuotation" | "Rejected";

interface CustomerWithProjects extends Customer {
    installationProjects: InstallationProject[];
    maintenanceContracts: MaintenanceContract[];
    completedInstallationCount: number;
    inProgressInstallationCount: number;
    activeMaintenanceCount: number;
    customerStatus: CustomerStatus;
}

type SortField = "name" | "last";
type SortDirection = "asc" | "desc";

export default function ClientsPage() {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState<CustomerWithProjects[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const { toast } = useToast();
    const canViewMaintenance = hasAnyRole(['Manager', 'MaintenanceAdmin']);

    // Calculate customer status based on projects and maintenance contracts
    // Rules:
    // - If client has at least one active maintenance contract → Client status = "Approved"
    // - If client has at least one project that is "active", "inprogress", or "completed" → Client status = "Approved"
    // - If all projects are rejected → Client status = "Rejected"
    // - Otherwise → Client status = "PendingInspectionQuotation"
    const calculateCustomerStatus = (projects: InstallationProject[], maintenanceContracts: MaintenanceContract[] = []): CustomerStatus => {
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

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch customers and projects (always available)
                const [customersData, projectsData] = await Promise.all([
                    getCustomers(),
                    getProjects()
                ]);

                // Conditionally fetch maintenance data based on user role
                let maintenanceContractsData: MaintenanceContract[] = [];
                let maintenanceElevatorsData: MaintenanceElevator[] = [];

                if (canViewMaintenance) {
                    try {
                        [maintenanceContractsData, maintenanceElevatorsData] = await Promise.all([
                            getMaintenanceProjects(),
                            getMaintenanceElevators()
                        ]);
                    } catch (error: any) {
                        // If 403 Forbidden, user doesn't have permission - silently skip maintenance data
                        if (error.status !== 403) {
                            // Only show error for other types of errors
                            console.error("Failed to load maintenance data", error);
                        }
                    }
                }

                // Match projects and maintenance contracts to customers
                const customersWithProjects: CustomerWithProjects[] = customersData.map(customer => {
                    const installationProjects = projectsData.filter(
                        project => project.customerId === customer.id
                    );

                    const maintenanceContracts = maintenanceContractsData.filter(
                        contract => contract.customerId === customer.id
                    );

                    // Get elevators for this customer's contracts
                    const customerElevators = maintenanceElevatorsData.filter(
                        elevator => maintenanceContracts.some(contract => contract.id === elevator.contractId)
                    );

                    // Count completed installation projects
                    const completedInstallationCount = installationProjects.filter(project => {
                        const status = project.status.toLowerCase();
                        return status === "completed";
                    }).length;

                    // Count in-progress installation projects (active or inprogress)
                    const inProgressInstallationCount = installationProjects.filter(project => {
                        const status = project.status.toLowerCase();
                        return status === "active" || status === "inprogress";
                    }).length;

                    // Count active elevators (only elevator status matters, not contract status)
                    const activeMaintenanceCount = customerElevators.filter(
                        elevator => elevator.status && elevator.status.toLowerCase() === "active"
                    ).length;

                    // Calculate customer status based on installation projects and maintenance contracts
                    const customerStatus = calculateCustomerStatus(installationProjects, maintenanceContracts);

                    return {
                        ...customer,
                        installationProjects,
                        maintenanceContracts,
                        completedInstallationCount,
                        inProgressInstallationCount,
                        activeMaintenanceCount,
                        customerStatus
                    };
                });

                setCustomers(customersWithProjects);
            } catch (error: any) {
                console.error("Failed to load customers", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to load customer data",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [canViewMaintenance, toast]);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.projectNumber && c.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort customers
    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        let comparison = 0;

        if (sortField === "name") {
            comparison = a.name.localeCompare(b.name);
        } else if (sortField === "last") {
            // Sort by last added (createdAt date)
            const aDate = a.createdAt || "";
            const bDate = b.createdAt || "";
            if (!aDate && !bDate) comparison = 0;
            else if (!aDate) comparison = 1; // No date goes to end
            else if (!bDate) comparison = -1;
            else comparison = aDate.localeCompare(bDate);
        }

        return sortDirection === "asc" ? comparison : -comparison;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field with ascending by default
            setSortField(field);
            setSortDirection("asc");
        }
    };

    return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{t.clients.title}</h1>
                                <p className="text-muted-foreground">{t.clients.subtitle}</p>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>All Clients</CardTitle>
                                    <div className="flex items-center gap-4">
                                        <Select value={sortField} onValueChange={(value) => handleSort(value as SortField)}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="Sort by" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="name">Sort by Name</SelectItem>
                                                <SelectItem value="last">Sort by Last Added</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                                        >
                                            {sortDirection === "asc" ? (
                                                <ArrowUp className="h-4 w-4" />
                                            ) : (
                                                <ArrowDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <div className="relative w-64">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search clients..."
                                                className="pl-8"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleSort("name")}
                                                        className="h-8 px-2 lg:px-3"
                                                    >
                                                        Name
                                                        {sortField === "name" && (
                                                            sortDirection === "asc" ? (
                                                                <ArrowUp className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowDown className="ml-2 h-4 w-4" />
                                                            )
                                                        )}
                                                        {sortField !== "name" && (
                                                            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                                                        )}
                                                    </Button>
                                                </TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Address</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Installation Done</TableHead>
                                                <TableHead>Installation In Progress</TableHead>
                                                <TableHead>Maintenance</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-24 text-center">
                                                        Loading...
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredCustomers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-24 text-center">
                                                        No results found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                sortedCustomers.map((customer) => {
                                                    const getStatusBadge = (status: CustomerStatus) => {
                                                        switch (status) {
                                                            case "Approved":
                                                                return (
                                                                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                                                                        Approved
                                                                    </Badge>
                                                                );
                                                            case "PendingInspectionQuotation":
                                                                return (
                                                                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/5">
                                                                        Pending
                                                                    </Badge>
                                                                );
                                                            case "Rejected":
                                                                return (
                                                                    <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                                                                        Rejected
                                                                    </Badge>
                                                                );
                                                            default:
                                                                return null;
                                                        }
                                                    };

                                                    return (
                                                        <TableRow key={customer.id}>
                                                            <TableCell className="font-medium">{customer.name}</TableCell>
                                                            <TableCell>{customer.email}</TableCell>
                                                            <TableCell>{customer.phone}</TableCell>
                                                            <TableCell>{customer.address || "N/A"}</TableCell>
                                                            <TableCell>
                                                                {getStatusBadge(customer.customerStatus)}
                                                            </TableCell>
                                                            <TableCell>
                                                                {customer.completedInstallationCount > 0 ? (
                                                                    <Badge variant="default" className="w-fit bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                                                                        {customer.completedInstallationCount} Done
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground">0</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {customer.inProgressInstallationCount > 0 ? (
                                                                    <Badge variant="default" className="w-fit bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
                                                                        {customer.inProgressInstallationCount} In Progress
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground">0</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {customer.activeMaintenanceCount > 0 ? (
                                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 w-fit">
                                                                        {customer.activeMaintenanceCount} Active
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground">0</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Link href={`/clients/${customer.id}`}>
                                                                    <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                                                                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </main>
                    <DemoGuidePanel
                      title={t.demoGuide.clients.title}
                      description={t.demoGuide.clients.description}
                      features={[
                        { icon: "🔍", label: "Search & Filter", description: "Quickly find any client by name or contact" },
                        { icon: "📋", label: "Client Details", description: "View client profile, projects, and contracts" },
                        { icon: "➕", label: "Add / Edit", description: "Full client management with contact info" },
                      ]}
                      tip={t.demoGuide.clients.tip}
                    />
                </div>
            </div>
        </SidebarProvider>
    )
}
