"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createProject, searchCustomer, Customer, checkProjectNumberExists } from "@/lib/api"
import { canCreateOrEditProjects } from "@/lib/user"
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
import { ChevronLeft, ChevronRight, Save, Plus, Trash2, Search, CheckCircle2, X, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateInput, parseDateInput, formatDateInputValue, formatDateToLocalString, cn } from "@/lib/utils"

export default function NewProjectPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)
    const [searchingCustomer, setSearchingCustomer] = useState(false)
    const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
    const [useExistingCustomer, setUseExistingCustomer] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [checkingProjectNumber, setCheckingProjectNumber] = useState(false)
    const [projectNumberExists, setProjectNumberExists] = useState(false)
    const projectNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [formData, setFormData] = useState({
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
            installationPricePerUnit: 0,
            totalPrice: 0,
            contractDate: formatDateInput(new Date()),
            installationStartDate: null as string | null,
            expectedFinishDate: null as string | null,
            notes: ""
        },
        projectAddress: "", // Optional project-specific address
        projectCity: "القاهرة الجديدة", // Project-specific city
        elevators: [
            {
                elevatorType: "WithMachineRoom",
                floorsCount: 0,
                stopsCount: 0,
                numberOfFloors: 0,
                numberOfStops: 0,
                numberOfElevators: 1,
                pitType: "Concrete",
                pitWidth: 0,
                pitDepth: 0,
                lastFloorHeight: 0,
                holeDepth: 0,
                travelLength: 0,
                notes: "",
                price: 0
            }
        ]
    })

    useEffect(() => {
        // Check if user can create projects
        if (!canCreateOrEditProjects()) {
            router.push('/projects')
        }
    }, [router])

    // Real-time project number validation
    useEffect(() => {
        const projectNumber = formData.customer.projectNumber?.trim() || "";

        // Clear previous timeout
        if (projectNumberTimeoutRef.current) {
            clearTimeout(projectNumberTimeoutRef.current);
        }

        // If empty, reset validation state
        if (projectNumber === "") {
            setProjectNumberExists(false);
            return;
        }

        // Debounce the check (wait 500ms after user stops typing)
        projectNumberTimeoutRef.current = setTimeout(async () => {
            setCheckingProjectNumber(true);
            try {
                const exists = await checkProjectNumberExists(projectNumber);
                setProjectNumberExists(exists);
            } catch (error: any) {
                console.error("Error checking project number:", error);
                // If it's a 404, the endpoint might not exist yet, silently fail
                // Otherwise, treat as if number doesn't exist (don't block user)
                if (error?.status === 404) {
                    console.warn("Project number check endpoint not available");
                    setProjectNumberExists(false);
                } else {
                    // For other errors, assume number is available to not block user
                    setProjectNumberExists(false);
                }
            } finally {
                setCheckingProjectNumber(false);
            }
        }, 500);

        // Cleanup timeout on unmount or when projectNumber changes
        return () => {
            if (projectNumberTimeoutRef.current) {
                clearTimeout(projectNumberTimeoutRef.current);
            }
        };
    }, [formData.customer.projectNumber])

    const searchForCustomer = useCallback(async (phone?: string, email?: string) => {
        const searchPhone = phone || formData.customer.phone
        const searchEmail = email || formData.customer.email

        // Phone is required for search
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
                // Don't auto-fill - let user decide
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
        // Reset existing customer when user changes email or phone
        if ((field === 'email' || field === 'phone') && existingCustomer) {
            setExistingCustomer(null)
            setUseExistingCustomer(false)
        }

        setFormData(prev => ({
            ...prev,
            customer: { ...prev.customer, [field]: value }
        }))
    }

    // Auto-search when phone changes (with debouncing)
    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // Only search if phone is provided and we're on step 1
        // Wait for at least 5 characters to avoid too many searches
        if (step === 1 && formData.customer.phone && formData.customer.phone.trim().length >= 5) {
            // Debounce search by 500ms after user stops typing (reduced for faster response)
            searchTimeoutRef.current = setTimeout(() => {
                searchForCustomer()
            }, 500)
        } else if (step === 1) {
            // Clear existing customer if phone is too short or empty
            if (formData.customer.phone.trim().length < 5) {
                setExistingCustomer(null)
                setUseExistingCustomer(false)
            }
        }

        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [formData.customer.phone, step, searchForCustomer])

    const updateContract = (field: string, value: string | number | null) => {
        setFormData(prev => ({
            ...prev,
            contract: { ...prev.contract, [field]: value === "" ? null : value }
        }))
    }

    const addElevator = () => {
        setFormData(prev => ({
            ...prev,
            elevators: [...prev.elevators, {
                elevatorType: "WithMachineRoom",
                floorsCount: 0,
                stopsCount: 0,
                numberOfFloors: 0,
                numberOfStops: 0,
                numberOfElevators: 1,
                pitType: "Concrete",
                pitWidth: 0,
                pitDepth: 0,
                lastFloorHeight: 0,
                holeDepth: 0,
                travelLength: 0,
                notes: "",
                price: 0
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
        setFormData(prev => {
            const newElevators = [...prev.elevators]
            newElevators[index] = { ...newElevators[index], [field]: value }
            return { ...prev, elevators: newElevators }
        })
    }

    const handleSubmit = async () => {
        // Validate phone is required
        if (!formData.customer.phone || formData.customer.phone.trim() === "") {
            toast.error("Phone number is required and must be unique")
            setLoading(false)
            return
        }

        // Validate project number is required
        if (!formData.customer.projectNumber || formData.customer.projectNumber.trim() === "") {
            toast.error("Project number is required")
            setLoading(false)
            return
        }

        // Validate project number is unique (final check before submission)
        if (projectNumberExists) {
            toast.error("This project number already exists. Please use a different one.")
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            // Prepare the data in the correct format for the backend
            // Normalize phone and email (trim whitespace)
            const normalizedPhone = formData.customer.phone.trim()
            const normalizedEmail = formData.customer.email?.trim() || ""

            const projectData = {
                customer: {
                    name: formData.customer.name.trim(),
                    phone: normalizedPhone,
                    email: normalizedEmail,
                    address: formData.customer.address?.trim() || "",
                    city: formData.customer.city || "القاهرة الجديدة",
                    projectNumber: formData.customer.projectNumber.trim(),
                    googleMapsLink: formData.customer.googleMapsLink?.trim() || null
                },
                contract: {
                    // Use project address if provided, otherwise fallback to customer address
                    projectAddress: formData.projectAddress?.trim() || formData.customer.address?.trim() || null,
                    city: formData.projectCity || formData.customer.city || "القاهرة الجديدة",
                    googleMapsLink: formData.customer.googleMapsLink?.trim() || null,
                    installationPricePerUnit: formData.elevators.length > 0 ? formData.elevators.reduce((sum, e) => sum + (e.price || 0), 0) / formData.elevators.length : 0,
                    totalPrice: formData.elevators.reduce((sum, e) => sum + (e.price || 0), 0),
                    contractDate: parseDateInput(formData.contract.contractDate),
                    installationStartDate: formData.contract.installationStartDate ? parseDateInput(formData.contract.installationStartDate) : null,
                    expectedFinishDate: formData.contract.expectedFinishDate ? parseDateInput(formData.contract.expectedFinishDate) : null,
                    notes: formData.contract.notes || null
                },
                elevators: formData.elevators.map(e => ({
                    elevatorType: e.elevatorType,
                    floorsCount: e.floorsCount || e.numberOfFloors,
                    stopsCount: e.stopsCount || e.numberOfStops,
                    numberOfFloors: e.numberOfFloors || e.floorsCount,
                    numberOfStops: e.numberOfStops || e.stopsCount,
                    numberOfElevators: e.numberOfElevators,
                    pitType: e.pitType || "Concrete",
                    pitWidth: e.pitWidth || 0,
                    pitDepth: e.pitDepth || 0,
                    lastFloorHeight: e.lastFloorHeight || 0,
                    holeDepth: e.holeDepth || 0,
                    travelLength: e.travelLength || 0,
                    notes: e.notes || "",
                    price: e.price || 0
                }))
            }

            // Remove null/empty date strings - convert empty strings to null
            if (projectData.contract.installationStartDate === "") {
                projectData.contract.installationStartDate = null
            }
            if (projectData.contract.expectedFinishDate === "") {
                projectData.contract.expectedFinishDate = null
            }

            const result = await createProject(projectData)
            toast.success("Project created successfully")
            // Small delay to ensure backend has processed the request
            setTimeout(() => {
                router.push("/projects")
            }, 500)
        } catch (error: any) {
            console.error("Error creating project:", error)
            const errorMessage = error?.message || error?.data?.message || error?.errors?.[0] || "Failed to create project"
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
                            <h2 className="text-3xl font-bold tracking-tight">New Installation Project</h2>
                            <div className="w-10"></div>
                        </div>

                        <div className="flex justify-center mb-8">
                            <div className="flex items-center space-x-2">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className="flex items-center">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${step === s ? 'border-primary bg-primary text-primary-foreground' : step > s ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground'}`}>
                                            {s}
                                        </div>
                                        {s < 3 && <div className={`h-1 w-12 mx-2 rounded ${step > s ? 'bg-primary' : 'bg-border'}`}></div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {step === 1 && (
                            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Customer & Project Info</CardTitle>
                                    <CardDescription>Enter the customer details and project identification. Search for existing customer first.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Customer Search Section */}
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
                                                <div className="text-sm space-y-1 text-muted-foreground">
                                                    <p><strong>Name:</strong> {existingCustomer.name}</p>
                                                    <p><strong>Email:</strong> {existingCustomer.email}</p>
                                                    <p><strong>Phone:</strong> {existingCustomer.phone}</p>
                                                    {existingCustomer.address && <p><strong>Address:</strong> {existingCustomer.address}{existingCustomer.city && `, ${existingCustomer.city}`}</p>}
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    {!useExistingCustomer ? (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={useExistingCustomerData}
                                                            className="flex-1"
                                                        >
                                                            Use This Customer
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={useNewCustomer}
                                                            className="flex-1"
                                                        >
                                                            <X className="mr-2 h-4 w-4" />
                                                            Create New Instead
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {existingCustomer === null && formData.customer.phone && formData.customer.phone.trim().length >= 5 && !searchingCustomer && (
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                                    Customer not found. A new customer will be created when you submit.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cust-name">Customer Name {useExistingCustomer && <span className="text-xs text-muted-foreground">(from existing)</span>}</Label>
                                            <Input
                                                id="cust-name"
                                                value={formData.customer.name}
                                                onChange={e => updateCustomer("name", e.target.value)}
                                                placeholder="Full Name or Company"
                                                className="bg-background/50"
                                                disabled={useExistingCustomer}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cust-email">
                                                Email Address (Optional) {useExistingCustomer && <span className="text-xs text-muted-foreground">(from existing)</span>}
                                                <span className="text-xs text-muted-foreground block mt-1">If provided, must be unique</span>
                                            </Label>
                                            <Input
                                                id="cust-email"
                                                type="email"
                                                value={formData.customer.email}
                                                onChange={e => updateCustomer("email", e.target.value)}
                                                placeholder="email@example.com"
                                                className="bg-background/50"
                                                disabled={useExistingCustomer}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cust-phone">
                                                Phone Number * {useExistingCustomer && <span className="text-xs text-muted-foreground">(from existing)</span>}
                                                <span className="text-xs text-muted-foreground block mt-1">Required - Must be unique</span>
                                            </Label>
                                            <Input
                                                id="cust-phone"
                                                value={formData.customer.phone}
                                                onChange={e => updateCustomer("phone", e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                className="bg-background/50"
                                                disabled={useExistingCustomer}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="proj-num">Project Number *</Label>
                                            <div className="space-y-1">
                                                <Input
                                                    id="proj-num"
                                                    value={formData.customer.projectNumber}
                                                    onChange={e => updateCustomer("projectNumber", e.target.value)}
                                                    placeholder="PRJ-2024-XXX"
                                                    className={`bg-background/50 ${projectNumberExists ? "border-red-500" : ""}`}
                                                    required
                                                />
                                                {checkingProjectNumber && formData.customer.projectNumber && (
                                                    <p className="text-xs text-muted-foreground">Checking availability...</p>
                                                )}
                                                {!checkingProjectNumber && projectNumberExists && formData.customer.projectNumber && (
                                                    <p className="text-xs text-red-500">This project number already exists. Please use a different one.</p>
                                                )}
                                                {!checkingProjectNumber && !projectNumberExists && formData.customer.projectNumber && (
                                                    <p className="text-xs text-green-500">✓ Project number is available</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cust-addr">
                                                Client Address {useExistingCustomer && <span className="text-xs text-muted-foreground">(from existing)</span>}
                                            </Label>
                                            <Input
                                                id="cust-addr"
                                                value={formData.customer.address}
                                                onChange={e => updateCustomer("address", e.target.value)}
                                                placeholder="Enter client address"
                                                className="bg-background/50"
                                                disabled={useExistingCustomer}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cust-city">
                                                City <span className="text-destructive">*</span> {useExistingCustomer && <span className="text-xs text-muted-foreground">(from existing)</span>}
                                            </Label>
                                            <Input
                                                id="cust-city"
                                                value={formData.customer.city}
                                                onChange={e => updateCustomer("city", e.target.value)}
                                                placeholder="القاهرة الجديدة"
                                                className="bg-background/50"
                                                disabled={useExistingCustomer}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Client's address and city. You can specify a different project address in step 3 if needed.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="maps">Google Maps Link</Label>
                                        <Input
                                            id="maps"
                                            type="url"
                                            value={formData.customer.googleMapsLink}
                                            onChange={e => {
                                                const value = e.target.value.trim()
                                                // Basic validation - warn if it looks invalid
                                                if (value && !value.match(/^(https?:\/\/)?(www\.)?(maps\.google\.|maps\.app\.|goo\.gl\/|maps\.)/i)) {
                                                    // Still allow it but warn user
                                                    console.warn("URL doesn't look like a Google Maps link")
                                                }
                                                updateCustomer("googleMapsLink", value)
                                            }}
                                            placeholder="https://maps.google.com/... or https://maps.app.goo.gl/..."
                                            className="bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter a valid Google Maps URL (e.g., https://maps.google.com/... or https://maps.app.goo.gl/...)
                                        </p>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={() => setStep(2)}
                                            disabled={!formData.customer.projectNumber}
                                        >
                                            Next Step <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {step === 2 && (
                            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Elevator Details</CardTitle>
                                    <CardDescription>Specify the quantity and types of elevators for this project.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {formData.elevators.map((elevator, index) => (
                                        <div key={index} className="space-y-4 p-4 border border-border/40 rounded-lg relative">
                                            {formData.elevators.length > 1 && (
                                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeElevator(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Elevator Type *</Label>
                                                        <select
                                                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background"
                                                            value={elevator.elevatorType}
                                                            onChange={e => updateElevator(index, "elevatorType", e.target.value)}
                                                            required
                                                        >
                                                            <option value="WithMachineRoom">With Machine Room (مع غرفة)</option>
                                                            <option value="MachineRoomLess">Machine Room Less - MRL (بدون غرفة)</option>
                                                            <option value="Hydraulic">Hydraulic (هيدروليك)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <Separator />

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Floors Count *</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            value={elevator.floorsCount}
                                                            placeholder="2"
                                                            onChange={e => {
                                                                const inputVal = e.target.value;
                                                                if (inputVal === "") {
                                                                    updateElevator(index, "floorsCount", 0);
                                                                    updateElevator(index, "numberOfFloors", 0);
                                                                    return;
                                                                }
                                                                const val = parseInt(inputVal, 10);
                                                                if (!isNaN(val) && val >= 1 && val <= 99) {
                                                                    updateElevator(index, "floorsCount", val);
                                                                    updateElevator(index, "numberOfFloors", val);
                                                                }
                                                            }}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                        <p className="text-xs text-muted-foreground">Enter a number between 1 and 99</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Stops Count *</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            value={elevator.stopsCount}
                                                            placeholder="2"
                                                            onChange={e => {
                                                                const inputVal = e.target.value;
                                                                if (inputVal === "") {
                                                                    updateElevator(index, "stopsCount", 0);
                                                                    updateElevator(index, "numberOfStops", 0);
                                                                    return;
                                                                }
                                                                const val = parseInt(inputVal, 10);
                                                                if (!isNaN(val) && val >= 1 && val <= 99) {
                                                                    updateElevator(index, "stopsCount", val);
                                                                    updateElevator(index, "numberOfStops", val);
                                                                }
                                                            }}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                        <p className="text-xs text-muted-foreground">Enter a number between 1 and 99</p>
                                                    </div>
                                                </div>

                                                <Separator />

                                                <div className="space-y-2">
                                                    <Label>Pit Type *</Label>
                                                    <select
                                                        className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background"
                                                        value={elevator.pitType || "Concrete"}
                                                        onChange={e => updateElevator(index, "pitType", e.target.value)}
                                                        required
                                                    >
                                                        <option value="Concrete">Concrete (خرسانة)</option>
                                                        <option value="Brick">Brick (طوب)</option>
                                                    </select>
                                                </div>

                                                <Separator />

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Shaft Width</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={elevator.pitWidth || 0}
                                                            onChange={e => updateElevator(index, "pitWidth", parseFloat(e.target.value) || 0)}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Shaft Depth</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={elevator.pitDepth || 0}
                                                            onChange={e => updateElevator(index, "pitDepth", parseFloat(e.target.value) || 0)}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Over Head</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={elevator.lastFloorHeight || 0}
                                                            onChange={e => updateElevator(index, "lastFloorHeight", parseFloat(e.target.value) || 0)}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Pit Depth</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={elevator.holeDepth || 0}
                                                            onChange={e => updateElevator(index, "holeDepth", parseFloat(e.target.value) || 0)}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Total travel</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={elevator.travelLength || 0}
                                                            onChange={e => updateElevator(index, "travelLength", parseFloat(e.target.value) || 0)}
                                                            className="bg-background/50"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Notes (Optional)</Label>
                                                    <Textarea
                                                        value={elevator.notes || ""}
                                                        onChange={e => updateElevator(index, "notes", e.target.value)}
                                                        placeholder="Additional notes about this elevator..."
                                                        className="bg-background/50 min-h-[80px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5" onClick={addElevator}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Another Elevator Type
                                    </Button>
                                    <div className="flex justify-between pt-4">
                                        <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> Previous</Button>
                                        <Button onClick={() => setStep(3)}>Next Step <ChevronRight className="ml-2 h-4 w-4" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {step === 3 && (
                            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Contract & Finalize</CardTitle>
                                    <CardDescription>Review and enter contract details.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Elevator Prices */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-base font-semibold">Elevator Prices</Label>
                                            <p className="text-sm text-muted-foreground">Enter the price for each elevator</p>
                                        </div>
                                        {formData.elevators.map((elevator, index) => (
                                            <div key={index} className="space-y-2 p-4 border border-border/40 rounded-lg">
                                                <Label>Elevator {index + 1} Price ($) - {elevator.elevatorType}</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={elevator.price || 0}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        updateElevator(index, "price", val);
                                                    }}
                                                    className="bg-background/50"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        ))}
                                        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                                            <Label className="text-base font-semibold">Total Contract Price ($)</Label>
                                            <div className="text-2xl font-bold text-primary">
                                                {formData.elevators.reduce((sum, elevator) => sum + (elevator.price || 0), 0).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Contract Date * (DD/MM/YYYY)</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !formData.contract.contractDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formData.contract.contractDate ? formData.contract.contractDate : "Pick a date"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={formData.contract.contractDate ? (() => {
                                                            const parsed = parseDateInput(formData.contract.contractDate)
                                                            if (!parsed) return undefined
                                                            // Parse YYYY-MM-DD as local date to avoid timezone issues
                                                            const [year, month, day] = parsed.split('-').map(Number)
                                                            return new Date(year, month - 1, day)
                                                        })() : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                // Use local date formatting to avoid timezone conversion issues
                                                                const formatted = formatDateInput(date)
                                                                updateContract("contractDate", formatted)
                                                                // If installation start date is before new contract date, clear it
                                                                const parsedContract = parseDateInput(formatted)
                                                                if (formData.contract.installationStartDate) {
                                                                    const parsedInstallation = parseDateInput(formData.contract.installationStartDate)
                                                                    if (parsedInstallation && parsedInstallation < parsedContract) {
                                                                        updateContract("installationStartDate", null)
                                                                    }
                                                                }
                                                            } else {
                                                                updateContract("contractDate", "")
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                type="text"
                                                value={formData.contract.contractDate}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    if (value.length < formData.contract.contractDate.length) {
                                                        updateContract("contractDate", value)
                                                        return
                                                    }
                                                    const formatted = formatDateInputValue(value)
                                                    updateContract("contractDate", formatted)
                                                }}
                                                placeholder="DD/MM/YYYY"
                                                maxLength={10}
                                                required
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Installation Start Date (Optional) (DD/MM/YYYY)</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !formData.contract.installationStartDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formData.contract.installationStartDate ? formData.contract.installationStartDate : "Pick a date"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={formData.contract.installationStartDate ? (() => {
                                                            const parsed = parseDateInput(formData.contract.installationStartDate)
                                                            if (!parsed) return undefined
                                                            // Parse YYYY-MM-DD as local date to avoid timezone issues
                                                            const [year, month, day] = parsed.split('-').map(Number)
                                                            return new Date(year, month - 1, day)
                                                        })() : undefined}
                                                        disabled={(date) => {
                                                            if (!formData.contract.contractDate) return false
                                                            const parsedContract = parseDateInput(formData.contract.contractDate)
                                                            if (!parsedContract) return false
                                                            // Parse YYYY-MM-DD as local date to avoid timezone issues
                                                            const [year, month, day] = parsedContract.split('-').map(Number)
                                                            const contractDate = new Date(year, month - 1, day)
                                                            // Compare dates at midnight local time
                                                            const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                                                            const contractMidnight = new Date(contractDate.getFullYear(), contractDate.getMonth(), contractDate.getDate())
                                                            return dateMidnight < contractMidnight
                                                        }}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                // Use local date formatting to avoid timezone conversion issues
                                                                const formatted = formatDateInput(date)
                                                                updateContract("installationStartDate", formatted)
                                                                // If expected finish date is before new installation date, clear it
                                                                if (formData.contract.expectedFinishDate) {
                                                                    const parsedExpected = parseDateInput(formData.contract.expectedFinishDate)
                                                                    const parsedInstallation = parseDateInput(formatted)
                                                                    if (parsedExpected && parsedInstallation && parsedExpected < parsedInstallation) {
                                                                        updateContract("expectedFinishDate", null)
                                                                    }
                                                                }
                                                            } else {
                                                                updateContract("installationStartDate", null)
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                type="text"
                                                value={formData.contract.installationStartDate || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    if (value.length < (formData.contract.installationStartDate || "").length) {
                                                        updateContract("installationStartDate", value || null)
                                                        return
                                                    }
                                                    const formatted = formatDateInputValue(value)
                                                    updateContract("installationStartDate", formatted || null)
                                                }}
                                                placeholder="DD/MM/YYYY"
                                                maxLength={10}
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Expected Finish Date (Optional) (DD/MM/YYYY)</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !formData.contract.expectedFinishDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formData.contract.expectedFinishDate ? formData.contract.expectedFinishDate : "Pick a date"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={formData.contract.expectedFinishDate ? (() => {
                                                            const parsed = parseDateInput(formData.contract.expectedFinishDate)
                                                            if (!parsed) return undefined
                                                            // Parse YYYY-MM-DD as local date to avoid timezone issues
                                                            const [year, month, day] = parsed.split('-').map(Number)
                                                            return new Date(year, month - 1, day)
                                                        })() : undefined}
                                                        disabled={(date) => {
                                                            const minDate = formData.contract.installationStartDate || formData.contract.contractDate
                                                            if (!minDate) return false
                                                            const parsedMin = parseDateInput(minDate)
                                                            if (!parsedMin) return false
                                                            // Parse YYYY-MM-DD as local date to avoid timezone issues
                                                            const [year, month, day] = parsedMin.split('-').map(Number)
                                                            const minDateObj = new Date(year, month - 1, day)
                                                            // Compare dates at midnight local time
                                                            const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                                                            const minMidnight = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate())
                                                            return dateMidnight < minMidnight
                                                        }}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                // Use local date formatting to avoid timezone conversion issues
                                                                const formatted = formatDateInput(date)
                                                                updateContract("expectedFinishDate", formatted)
                                                            } else {
                                                                updateContract("expectedFinishDate", null)
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                type="text"
                                                value={formData.contract.expectedFinishDate || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    if (value.length < (formData.contract.expectedFinishDate || "").length) {
                                                        updateContract("expectedFinishDate", value || null)
                                                        return
                                                    }
                                                    const formatted = formatDateInputValue(value)
                                                    updateContract("expectedFinishDate", formatted || null)
                                                }}
                                                placeholder="DD/MM/YYYY"
                                                maxLength={10}
                                                className="bg-background/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-address">
                                            Project Address (Optional)
                                        </Label>
                                        <Textarea
                                            id="project-address"
                                            value={formData.projectAddress}
                                            onChange={e => setFormData(prev => ({ ...prev, projectAddress: e.target.value }))}
                                            placeholder="Enter project installation address (if different from client address)"
                                            className="bg-background/50 min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-city">
                                            Project City <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="project-city"
                                            value={formData.projectCity}
                                            onChange={e => setFormData(prev => ({ ...prev, projectCity: e.target.value }))}
                                            placeholder="Leave empty to use customer city"
                                            className="bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {formData.projectAddress
                                                ? "This address and city will be used for the project installation site."
                                                : "If project address is left empty, the client address will be used for the project installation site."}
                                        </p>
                                        {formData.customer.address && (
                                            <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                                <p className="text-xs text-muted-foreground">
                                                    <strong>Client Address:</strong> {formData.customer.address}
                                                    {formData.customer.city && `, ${formData.customer.city}`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contract Notes</Label>
                                        <Textarea value={formData.contract.notes} onChange={e => updateContract("notes", e.target.value)} placeholder="Terms, special conditions, etc." className="bg-background/50 min-h-[100px]" />
                                    </div>

                                    <Separator className="my-6 bg-border/40" />

                                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
                                        <h4 className="font-semibold text-primary">Summary</h4>
                                        <p className="text-sm text-muted-foreground">{formData.customer.name} - Project {formData.customer.projectNumber}</p>
                                        <p className="text-sm text-muted-foreground">{formData.elevators.length} Total Elevator{formData.elevators.length !== 1 ? 's' : ''}</p>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="mr-2 h-4 w-4" /> Previous</Button>
                                        <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                                            {loading ? "Creating..." : "Save Project"} <Save className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
