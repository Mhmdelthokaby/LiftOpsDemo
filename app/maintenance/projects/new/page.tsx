"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createMaintenanceProject, searchCustomer, Customer, checkMaintenanceProjectNumber, CreateMaintenanceProjectDto, getTechnicians, type Technician } from "@/lib/api"
import { canManageMaintenance } from "@/lib/user"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Save, Plus, Trash2, Search, CheckCircle2, X } from "lucide-react"
import { toast } from "sonner"

export default function NewMaintenanceProjectPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [searchingCustomer, setSearchingCustomer] = useState(false)
    const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
    const [useExistingCustomer, setUseExistingCustomer] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [checkingProjectNumber, setCheckingProjectNumber] = useState(false)
    const [projectNumberExists, setProjectNumberExists] = useState(false)
    const projectNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [technicians, setTechnicians] = useState<Technician[]>([])

    const [formData, setFormData] = useState<CreateMaintenanceProjectDto>({
        customer: {
            name: "",
            phone: "",
            email: "",
            address: "",
            city: "القاهرة الجديدة",
            projectNumber: "",
            googleMapsLink: ""
        },
        contract: {
            projectNumber: "",
            projectAddress: "", // Optional project-specific address
            city: "",
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
            pricePerMonth: 0,
            freeMonths: 0,
            notes: "",
            technicianId: ""
        },
        elevators: [
            {
                type: "WithMachineRoom",
                numberOfStops: 2,
                numberOfFloors: 2,
                notes: ""
            }
        ]
    })

    useEffect(() => {
        if (!canManageMaintenance()) {
            router.push('/maintenance?view=projects')
            return
        }

        const fetchTechnicians = async () => {
            try {
                const data = await getTechnicians()
                setTechnicians(data)
            } catch (error) {
                console.error("Error fetching technicians:", error)
            }
        }
        fetchTechnicians()
    }, [router])

    // Real-time project number validation
    useEffect(() => {
        const projectNumber = formData.contract.projectNumber?.trim() || "";

        if (projectNumberTimeoutRef.current) {
            clearTimeout(projectNumberTimeoutRef.current);
        }

        if (projectNumber === "") {
            setProjectNumberExists(false);
            return;
        }

        projectNumberTimeoutRef.current = setTimeout(async () => {
            setCheckingProjectNumber(true);
            try {
                const exists = await checkMaintenanceProjectNumber(projectNumber);
                setProjectNumberExists(exists);
            } catch (error: any) {
                console.error("Error checking project number:", error);
                setProjectNumberExists(false);
            } finally {
                setCheckingProjectNumber(false);
            }
        }, 500);

        return () => {
            if (projectNumberTimeoutRef.current) {
                clearTimeout(projectNumberTimeoutRef.current);
            }
        };
    }, [formData.contract.projectNumber])

    const searchForCustomer = useCallback(async (phone?: string, email?: string) => {
        const searchPhone = phone || formData.customer.phone
        const searchEmail = email || formData.customer.email

        if (!searchPhone || searchPhone.trim() === "") {
            setExistingCustomer(null)
            setUseExistingCustomer(false)
            return
        }

        setSearchingCustomer(true)
        try {
            const customer = await searchCustomer(searchEmail, searchPhone)
            if (customer) {
                setExistingCustomer(customer)
            } else {
                setExistingCustomer(null)
                setUseExistingCustomer(false)
            }
        } catch (error) {
            console.error("Error searching for customer:", error)
            setExistingCustomer(null)
            setUseExistingCustomer(false)
        } finally {
            setSearchingCustomer(false)
        }
    }, [formData.customer.phone, formData.customer.email])

    const useExistingCustomerData = () => {
        if (!existingCustomer) return

        setFormData(prev => ({
            ...prev,
            customer: {
                ...prev.customer,
                name: existingCustomer.name,
                email: existingCustomer.email,
                phone: existingCustomer.phone,
                                                address: existingCustomer.address || prev.customer.address,
                                                city: existingCustomer.city || prev.customer.city || "القاهرة الجديدة",
                                                googleMapsLink: existingCustomer.projectNumber || prev.customer.googleMapsLink
            }
        }))
        setUseExistingCustomer(true)
        toast.success("Using existing customer data")
    }

    const useNewCustomer = () => {
        setUseExistingCustomer(false)
        setExistingCustomer(null)
        toast.info("Creating new customer")
    }

    const updateCustomer = (field: string, value: string) => {
        if ((field === 'email' || field === 'phone') && existingCustomer) {
            setExistingCustomer(null)
            setUseExistingCustomer(false)
        }

        setFormData(prev => ({
            ...prev,
            customer: { ...prev.customer, [field]: value }
        }))
    }

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        if (formData.customer.phone && formData.customer.phone.trim().length >= 5) {
            searchTimeoutRef.current = setTimeout(() => {
                searchForCustomer()
            }, 500)
        } else if (formData.customer.phone.trim().length < 5) {
            setExistingCustomer(null)
            setUseExistingCustomer(false)
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [formData.customer.phone, searchForCustomer])

    const updateContract = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            contract: { ...prev.contract, [field]: value }
        }))
    }

    const addElevator = () => {
        setFormData(prev => ({
            ...prev,
            elevators: [...prev.elevators, {
                type: "WithMachineRoom",
                numberOfStops: 2,
                numberOfFloors: 2,
                notes: ""
            }]
        }))
    }

    const removeElevator = (index: number) => {
        if (formData.elevators.length <= 1) return
        const newElevators = [...formData.elevators]
        newElevators.splice(index, 1)
        setFormData(prev => ({ ...prev, elevators: newElevators }))
    }

    const updateElevator = (index: number, field: string, value: string | number) => {
        const newElevators = [...formData.elevators]
        newElevators[index] = { ...newElevators[index], [field]: value }
        setFormData(prev => ({ ...prev, elevators: newElevators }))
    }

    const handleSubmit = async () => {
        if (!formData.customer.phone || formData.customer.phone.trim() === "") {
            toast.error("Phone number is required")
            setLoading(false)
            return
        }

        if (!formData.contract.projectNumber || formData.contract.projectNumber.trim() === "") {
            toast.error("Project number is required")
            setLoading(false)
            return
        }

        if (projectNumberExists) {
            toast.error("This project number already exists. Please use a different one.")
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const projectData: CreateMaintenanceProjectDto = {
                customer: {
                    name: formData.customer.name.trim(),
                    phone: formData.customer.phone.trim(),
                    email: formData.customer.email?.trim() || "",
                    address: formData.customer.address?.trim() || "",
                    city: formData.customer.city || "القاهرة الجديدة",
                    projectNumber: formData.contract.projectNumber.trim(),
                    googleMapsLink: formData.customer.googleMapsLink?.trim() || undefined
                },
                contract: {
                    projectNumber: formData.contract.projectNumber.trim(),
                    projectAddress: formData.contract.projectAddress?.trim() || undefined,
                    city: formData.contract.city || formData.customer.city || "القاهرة الجديدة",
                    googleMapsLink: formData.customer.googleMapsLink?.trim() || undefined,
                    startDate: formData.contract.startDate,
                    endDate: formData.contract.endDate,
                    pricePerMonth: formData.contract.pricePerMonth,
                    freeMonths: formData.contract.freeMonths,
                    notes: formData.contract.notes || undefined,
                    technicianId: formData.contract.technicianId || undefined
                },
                elevators: formData.elevators.map(e => ({
                    type: e.type,
                    numberOfStops: e.numberOfStops,
                    numberOfFloors: e.numberOfFloors,
                    notes: e.notes || undefined
                }))
            }

            await createMaintenanceProject(projectData)
            toast.success("Maintenance project created successfully")
            setTimeout(() => {
                router.push("/maintenance/projects")
            }, 500)
        } catch (error: any) {
            console.error("Error creating maintenance project:", error)
            const errorMessage = error?.message || error?.data?.message || error?.errors?.[0] || "Failed to create maintenance project"
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 pt-6 max-w-4xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <h2 className="text-3xl font-bold tracking-tight">New Maintenance Project</h2>
                            <div className="w-10"></div>
                        </div>

                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Customer Information</CardTitle>
                                <CardDescription>Search for existing customer or create new one</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm font-semibold">Customer Search (Auto)</Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {searchingCustomer
                                                    ? "Searching for existing customer..."
                                                    : "Type phone number to automatically search for existing customer"}
                                            </p>
                                        </div>
                                        {searchingCustomer && (
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Search className="mr-2 h-4 w-4 animate-pulse" />
                                                Searching...
                                            </div>
                                        )}
                                    </div>

                                    {existingCustomer && (
                                        <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">Customer Found</span>
                                                </div>
                                                <Badge variant="secondary">Existing</Badge>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <p><strong>Name:</strong> {existingCustomer.name}</p>
                                                <p><strong>Phone:</strong> {existingCustomer.phone}</p>
                                                {existingCustomer.email && <p><strong>Email:</strong> {existingCustomer.email}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={useExistingCustomerData}>
                                                    Use This Customer
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={useNewCustomer}>
                                                    Create New
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customerName">Customer Name *</Label>
                                        <Input
                                            id="customerName"
                                            value={formData.customer.name}
                                            onChange={(e) => updateCustomer('name', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customerPhone">Phone *</Label>
                                        <Input
                                            id="customerPhone"
                                            value={formData.customer.phone}
                                            onChange={(e) => updateCustomer('phone', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customerEmail">Email</Label>
                                        <Input
                                            id="customerEmail"
                                            type="email"
                                            value={formData.customer.email}
                                            onChange={(e) => updateCustomer('email', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customerAddress">Address</Label>
                                        <Input
                                            id="customerAddress"
                                            value={formData.customer.address}
                                            onChange={(e) => updateCustomer('address', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customerCity">City <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="customerCity"
                                        value={formData.customer.city}
                                        onChange={(e) => updateCustomer('city', e.target.value)}
                                        placeholder="القاهرة الجديدة"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Contract Details</CardTitle>
                                <CardDescription>Enter maintenance contract information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="projectNumber">Project Number *</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="projectNumber"
                                            value={formData.contract.projectNumber}
                                            onChange={(e) => updateContract('projectNumber', e.target.value)}
                                            required
                                            className={projectNumberExists ? "border-destructive" : ""}
                                        />
                                        {checkingProjectNumber && (
                                            <div className="text-sm text-muted-foreground">Checking...</div>
                                        )}
                                        {!checkingProjectNumber && formData.contract.projectNumber && (
                                            projectNumberExists ? (
                                                <div className="flex items-center gap-1 text-destructive text-sm">
                                                    <X className="h-4 w-4" />
                                                    Already exists
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-success text-sm">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Available
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Project Address and City */}
                                <div className="space-y-4 p-4 border border-border/40 rounded-lg bg-background/50">
                                    <div className="text-sm font-semibold text-muted-foreground mb-2">Project Location (Optional - defaults to customer address/city if not set)</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="projectAddress">Project Address</Label>
                                            <Input
                                                id="projectAddress"
                                                value={formData.contract.projectAddress || ""}
                                                onChange={(e) => updateContract('projectAddress', e.target.value)}
                                                placeholder="Leave empty to use customer address"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="projectCity">Project City <span className="text-destructive">*</span></Label>
                                            <Input
                                                id="projectCity"
                                                value={formData.contract.city}
                                                onChange={(e) => updateContract('city', e.target.value)}
                                                placeholder="Leave empty to use customer city"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                                        <Input
                                            id="googleMapsLink"
                                            type="url"
                                            value={formData.customer.googleMapsLink || ""}
                                            onChange={(e) => {
                                                const value = e.target.value.trim()
                                                // Basic validation - warn if it looks invalid
                                                if (value && !value.match(/^(https?:\/\/)?(www\.)?(maps\.google\.|maps\.app\.|goo\.gl\/|maps\.)/i)) {
                                                    // Still allow it but warn user
                                                    console.warn("URL doesn't look like a Google Maps link")
                                                }
                                                updateCustomer('googleMapsLink', value)
                                            }}
                                            placeholder="https://maps.google.com/... or https://maps.app.goo.gl/..."
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Optional: Enter a valid Google Maps URL (e.g., https://maps.google.com/... or https://maps.app.goo.gl/...)
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date *</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={formData.contract.startDate}
                                            onChange={(e) => updateContract('startDate', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date *</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={formData.contract.endDate}
                                            onChange={(e) => updateContract('endDate', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pricePerMonth">Price Per Month *</Label>
                                        <Input
                                            id="pricePerMonth"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.contract.pricePerMonth}
                                            onChange={(e) => updateContract('pricePerMonth', parseFloat(e.target.value) || 0)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="freeMonths">Free Months *</Label>
                                        <Input
                                            id="freeMonths"
                                            type="number"
                                            min="0"
                                            value={formData.contract.freeMonths}
                                            onChange={(e) => updateContract('freeMonths', parseInt(e.target.value) || 0)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contractNotes">Notes</Label>
                                    <Textarea
                                        id="contractNotes"
                                        value={formData.contract.notes}
                                        onChange={(e) => updateContract('notes', e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="technicianId">Main Responsible Technician</Label>
                                    <select
                                        id="technicianId"
                                        value={formData.contract.technicianId}
                                        onChange={(e) => updateContract('technicianId', e.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="">Select a technician...</option>
                                        {technicians.map(tech => (
                                            <option key={tech.id} value={tech.id}>
                                                {tech.name} {tech.specialization ? `(${tech.specialization})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                        This technician will be the default for all monthly maintenance visits for this project.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Elevators</CardTitle>
                                        <CardDescription>Add elevator details for this maintenance contract</CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={addElevator}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Elevator
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {formData.elevators.map((elevator, index) => (
                                    <div key={index} className="border rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold">Elevator {index + 1}</h4>
                                            {formData.elevators.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeElevator(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                        <Separator />
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Type *</Label>
                                                <select
                                                    value={elevator.type}
                                                    onChange={(e) => updateElevator(index, 'type', e.target.value)}
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    required
                                                >
                                                    <option value="WithMachineRoom">With Machine Room</option>
                                                    <option value="MachineRoomLess">Machine Room Less</option>
                                                    <option value="Hydraulic">Hydraulic</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Number of Stops *</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={elevator.numberOfStops}
                                                    onChange={(e) => updateElevator(index, 'numberOfStops', parseInt(e.target.value) || 0)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Number of Floors *</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={elevator.numberOfFloors}
                                                    onChange={(e) => updateElevator(index, 'numberOfFloors', parseInt(e.target.value) || 0)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Notes</Label>
                                            <Textarea
                                                value={elevator.notes}
                                                onChange={(e) => updateElevator(index, 'notes', e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => router.back()} disabled={loading}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading || projectNumberExists}>
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? "Creating..." : "Create Project"}
                            </Button>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

