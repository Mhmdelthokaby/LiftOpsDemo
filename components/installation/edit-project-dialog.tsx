"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InstallationProject, updateProject, updateStage, updateElevator, UpdateElevatorData } from "@/lib/api"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { formatDateInput, parseDateInput, formatDateInputValue } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: InstallationProject | null
    onUpdate: () => void
}

export function EditProjectDialog({
    open,
    onOpenChange,
    project,
    onUpdate
}: EditProjectDialogProps) {
    const [loading, setLoading] = useState(false)
    const [selectedElevatorIndex, setSelectedElevatorIndex] = useState(0)
    const [elevatorPrices, setElevatorPrices] = useState<Record<string, number>>({})
    const [elevatorTypes, setElevatorTypes] = useState<Record<string, string>>({})
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
            projectAddress: "",
            city: "القاهرة الجديدة",
            googleMapsLink: "",
            installationPricePerUnit: 0,
            totalPrice: 0,
            contractDate: "",
            installationStartDate: "",
            expectedFinishDate: "",
            notes: ""
        }
    })

    useEffect(() => {
        if (project && open) {
            console.log('=== LOADING PROJECT DATA INTO FORM ===')
            console.log('Full project object:', JSON.stringify(project, null, 2))
            console.log('Project dates from API:', {
                contractDate: project.contractDate,
                contractDateType: typeof project.contractDate,
                installationStartDate: project.installationStartDate,
                installationStartDateType: typeof project.installationStartDate,
                expectedFinishDate: project.expectedFinishDate,
                expectedFinishDateType: typeof project.expectedFinishDate
            })
            
            // Format dates - handle both string and Date objects
            const formatDate = (dateValue: string | Date | null | undefined): string => {
                if (!dateValue) return ""
                try {
                    const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString().split('T')[0]
                    return formatDateInput(dateStr)
                } catch (error) {
                    console.error('Error formatting date:', dateValue, error)
                    return ""
                }
            }
            
            const formattedContractDate = formatDate(project.contractDate)
            const formattedInstallationStartDate = formatDate(project.installationStartDate)
            const formattedExpectedFinishDate = formatDate(project.expectedFinishDate)
            
            console.log('Formatted dates for form:', {
                contractDate: formattedContractDate,
                installationStartDate: formattedInstallationStartDate,
                expectedFinishDate: formattedExpectedFinishDate
            })
            
            setFormData({
                customer: {
                    name: project.customerName || "",
                    phone: project.customerPhone || "",
                    email: project.customerEmail || "",
                    address: project.customerAddress || "",
                    city: project.customerCity || "القاهرة الجديدة",
                    projectNumber: project.projectNumber || "",
                    googleMapsLink: project.googleMapsLink || ""
                },
                contract: {
                    projectAddress: project.projectAddress || "",
                    city: project.city || project.customerCity || "القاهرة الجديدة",
                    googleMapsLink: project.googleMapsLink || "",
                    installationPricePerUnit: project.installationPricePerUnit || 0,
                    totalPrice: project.totalPrice || 0,
                    contractDate: formattedContractDate,
                    installationStartDate: formattedInstallationStartDate,
                    expectedFinishDate: formattedExpectedFinishDate,
                    notes: project.notes || ""
                }
            })
            
            console.log('Form data set with dates:', {
                contractDate: formattedContractDate,
                installationStartDate: formattedInstallationStartDate,
                expectedFinishDate: formattedExpectedFinishDate
            })
            setSelectedElevatorIndex(0)
            // Initialize elevator prices and types from project data
            if (project.elevators) {
                const prices: Record<string, number> = {}
                const types: Record<string, string> = {}
                project.elevators.forEach(elevator => {
                    // Use elevator.price (fixed price) instead of sum of stage prices
                    // This ensures we use the actual elevator price, not calculated from stages
                    prices[elevator.id] = elevator.price || elevator.stages.reduce((sum, stage) => sum + (stage.stagePrice || 0), 0)
                    types[elevator.id] = elevator.elevatorType
                })
                setElevatorPrices(prices)
                setElevatorTypes(types)
            }
        }
    }, [project, open]) // Re-run when project data changes or dialog opens/closes

    const updateCustomer = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            customer: {
                ...prev.customer,
                [field]: value
            }
        }))
    }

    const updateContract = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            contract: {
                ...prev.contract,
                [field]: value
            }
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        console.log('=== UPDATE PROJECT BUTTON CLICKED ===')
        console.log('Form Data:', JSON.stringify(formData, null, 2))
        console.log('Elevator Prices:', elevatorPrices)
        
        if (!project) {
            console.error('No project found')
            return
        }

        // Validation
        if (!formData.customer.name.trim()) {
            console.error('Validation failed: Customer name is required')
            toast.error("Customer name is required")
            return
        }
        if (!formData.customer.phone.trim()) {
            console.error('Validation failed: Customer phone is required')
            toast.error("Customer phone is required")
            return
        }
        if (!formData.contract.contractDate || !formData.contract.contractDate.trim()) {
            console.error('Validation failed: Contract date is required')
            toast.error("Contract date is required")
            return
        }
        
        // Validate contract date format
        const parsedContractDate = parseDateInput(formData.contract.contractDate)
        console.log('Contract Date - Input:', formData.contract.contractDate, 'Parsed:', parsedContractDate)
        if (!parsedContractDate) {
            console.error('Validation failed: Invalid contract date format')
            toast.error("Invalid contract date format. Please use DD/MM/YYYY format")
            return
        }

        setLoading(true)
        try {
            console.log('Starting update process...')
            
            // Check if any elevator with all stages completed is being updated
            console.log('Checking for completed elevators that should not be updated...')
            for (const elevator of project.elevators) {
                const areAllStagesCompleted = elevator.stages.length === 4 && 
                    elevator.stages.every(s => s.status?.toLowerCase() === "success")
                
                if (areAllStagesCompleted) {
                    // Check if user tried to change elevator type or price
                    const elevatorTypeChanged = elevatorTypes[elevator.id] && 
                        elevatorTypes[elevator.id] !== elevator.elevatorType
                    // Compare with the fixed elevator price, not sum of stage prices
                    const elevatorPriceChanged = elevatorPrices[elevator.id] !== undefined && 
                        Math.abs((elevatorPrices[elevator.id] ?? 0) - (elevator.price || 0)) > 0.01
                    
                    console.log(`Elevator ${project.elevators.indexOf(elevator) + 1}: Type changed? ${elevatorTypeChanged}, Price changed? ${elevatorPriceChanged}`)
                    
                    if (elevatorTypeChanged || elevatorPriceChanged) {
                        const errorMsg = `Cannot update Elevator ${project.elevators.indexOf(elevator) + 1}. All stages are completed. Elevator details are locked.`
                        console.error(`❌ ${errorMsg}`)
                        toast.error(errorMsg)
                        setLoading(false)
                        return
                    }
                }
            }
            console.log('✅ Completed elevator check passed')
            
            // FIRST: Update elevator prices if they changed (must be done BEFORE stage price updates for validation)
            console.log(`Updating elevator prices first (before stage prices)...`)
            for (const elevator of project.elevators) {
                const elevatorIndex = project.elevators.indexOf(elevator) + 1
                const areAllStagesCompleted = elevator.stages.length === 4 && 
                    elevator.stages.every(s => s.status?.toLowerCase() === "success")
                
                // Skip elevators with all stages completed (they're locked)
                if (areAllStagesCompleted) {
                    console.log(`Skipping Elevator ${elevatorIndex}: All stages completed, price locked`)
                    continue
                }
                
                // Check if elevator price changed
                const newElevatorPrice = elevatorPrices[elevator.id]
                const currentElevatorPrice = elevator.price || 0
                
                if (newElevatorPrice !== undefined && Math.abs(newElevatorPrice - currentElevatorPrice) > 0.01) {
                    console.log(`Updating Elevator ${elevatorIndex} price from ${currentElevatorPrice} to ${newElevatorPrice}`)
                    
                    // Get elevator type (from form or existing)
                    const elevatorType = elevatorTypes[elevator.id] || elevator.elevatorType
                    
                    try {
                        const elevatorUpdateData: UpdateElevatorData = {
                            elevatorType: elevatorType,
                            floorsCount: elevator.floorsCount || elevator.numberOfFloors || 0,
                            stopsCount: elevator.stopsCount || elevator.numberOfStops || 0,
                            numberOfFloors: elevator.numberOfFloors || elevator.floorsCount || 0,
                            numberOfStops: elevator.numberOfStops || elevator.stopsCount || 0,
                            numberOfElevators: 1, // Default, adjust if needed
                            pitType: "Concrete", // Default, adjust if needed
                            pitWidth: 0,
                            pitDepth: 0,
                            lastFloorHeight: 0,
                            holeDepth: 0,
                            travelLength: 0,
                            notes: undefined,
                            price: newElevatorPrice
                        }
                        
                        await updateElevator(elevator.id, elevatorUpdateData)
                        console.log(`✅ Elevator ${elevatorIndex} price updated successfully`)
                    } catch (elevatorError: any) {
                        console.error(`❌ Failed to update Elevator ${elevatorIndex} price:`, elevatorError)
                        toast.error(`Failed to update Elevator ${elevatorIndex} price: ${elevatorError?.message || 'Unknown error'}`)
                        setLoading(false)
                        return // Stop if elevator update fails
                    }
                } else {
                    console.log(`Elevator ${elevatorIndex}: Price unchanged (${currentElevatorPrice}), skipping update`)
                }
            }
            
            console.log('✅ All elevator prices updated. Now updating stage prices...')
            
            // SECOND: Update elevator stage prices if prices were changed
            // Ensure sum of all stages = elevator price
            console.log(`Processing ${project.elevators.length} elevators for stage price updates...`)
            for (const elevator of project.elevators) {
                const elevatorIndex = project.elevators.indexOf(elevator) + 1
                console.log(`\n--- Processing Elevator ${elevatorIndex} (${elevator.id}) ---`)
                
                const areAllStagesCompleted = elevator.stages.length === 4 && 
                    elevator.stages.every(s => s.status?.toLowerCase() === "success")
                
                // Skip elevators with all stages completed
                if (areAllStagesCompleted) {
                    console.log(`Skipping Elevator ${elevatorIndex}: All stages completed`)
                    continue
                }
                
                // Get the target elevator price (from form input or existing price)
                // Use the updated price if it was just updated, otherwise use existing
                const newElevatorPrice = elevatorPrices[elevator.id] ?? (elevator.price || 0)
                const currentTotalPrice = elevator.stages.reduce((sum, stage) => sum + (stage.stagePrice || 0), 0)
                console.log(`Elevator ${elevatorIndex}: New Price = ${newElevatorPrice}, Current Total = ${currentTotalPrice}`)
                
                // Update stage prices so that SUM OF ALL STAGES = elevator price
                // Stages that are "Pending" or "InProgress" can be updated
                // Completed stages (Success) keep their prices (already collected)
                // Always update if price changed OR if stages have no prices (0) - ensures distribution happens
                const shouldUpdate = Math.abs(newElevatorPrice - currentTotalPrice) > 0.01 || (currentTotalPrice === 0 && newElevatorPrice > 0)
                console.log(`Elevator ${elevatorIndex}: Should update? ${shouldUpdate}`)
                
                if (shouldUpdate) {
                    const sortedStages = [...elevator.stages].sort((a, b) => a.stageNumber - b.stageNumber)
                    console.log(`Elevator ${elevatorIndex}: Sorted stages:`, sortedStages.map(s => ({ number: s.stageNumber, status: s.status, price: s.stagePrice })))
                    
                    // Filter stages by status
                    // Updatable: Pending and InProgress stages can be updated
                    // Non-updatable: Success (completed) stages are locked
                    const updatableStages = sortedStages.filter(s => {
                        const status = s.status?.toLowerCase()
                        return status === 'pending' || status === 'inprogress'
                    })
                    const nonUpdatableStages = sortedStages.filter(s => {
                        const status = s.status?.toLowerCase()
                        return status === 'success' // Only completed stages are locked
                    })
                    
                    console.log(`Elevator ${elevatorIndex}: Updatable stages: ${updatableStages.length}, Non-updatable: ${nonUpdatableStages.length}`)
                    
                    if (updatableStages.length === 0) {
                        const errorMsg = `Cannot update prices for Elevator ${elevatorIndex}: All stages are completed. Stage prices cannot be updated for completed stages.`
                        console.error(`❌ ${errorMsg}`)
                        toast.error(errorMsg)
                        setLoading(false)
                        return // Stop the entire update process
                    }
                    
                    // Calculate total price of non-updatable stages (completed stages - already collected, keep as-is)
                    const nonUpdatableTotalPrice = nonUpdatableStages.reduce((sum, stage) => sum + (stage.stagePrice || 0), 0)
                    
                    // Calculate how much should be distributed among updatable stages (Pending + InProgress)
                    // Total elevator price = non-updatable (locked/completed) + updatable (Pending + InProgress)
                    const updatableTargetTotal = newElevatorPrice - nonUpdatableTotalPrice
                    
                    if (updatableTargetTotal < 0) {
                        toast.error(`Cannot set elevator price to ${newElevatorPrice.toFixed(2)}. The sum of completed stage prices (${nonUpdatableTotalPrice.toFixed(2)}) exceeds the target total.`)
                        setLoading(false)
                        return
                    }
                    
                    // Get current prices for updatable stages
                    const updatableCurrentTotalPrice = updatableStages.reduce((sum, stage) => sum + (stage.stagePrice || 0), 0)
                    
                    if (updatableCurrentTotalPrice > 0) {
                        // Distribute proportionally based on current stage prices
                        const stagePrices: number[] = []
                        let calculatedTotal = 0
                        
                        for (let i = 0; i < updatableStages.length; i++) {
                            const stage = updatableStages[i]
                            const currentStagePrice = stage.stagePrice || 0
                            const proportion = currentStagePrice / updatableCurrentTotalPrice
                            const newStagePrice = updatableTargetTotal * proportion
                            stagePrices.push(Math.round(newStagePrice * 100) / 100)
                            calculatedTotal += stagePrices[i]
                        }
                        
                        // Adjust the last stage to ensure exact sum
                        const difference = updatableTargetTotal - calculatedTotal
                        stagePrices[stagePrices.length - 1] = Math.round((stagePrices[stagePrices.length - 1] + difference) * 100) / 100
                        
                        // Update all updatable stages
                        console.log(`Updating ${updatableStages.length} stages for elevator ${project.elevators.indexOf(elevator) + 1} with prices:`, stagePrices)
                        for (let i = 0; i < updatableStages.length; i++) {
                            console.log(`Updating stage ${updatableStages[i].stageNumber} (${updatableStages[i].id}) with price: ${stagePrices[i]}`)
                            try {
                                await updateStage({
                                    stageId: updatableStages[i].id,
                                    stagePrice: stagePrices[i]
                                })
                                console.log(`✅ Stage ${updatableStages[i].stageNumber} updated successfully`)
                            } catch (stageError: any) {
                                console.error(`❌ Failed to update stage ${updatableStages[i].stageNumber}:`, stageError)
                                toast.error(`Failed to update stage ${updatableStages[i].stageNumber}: ${stageError?.message || 'Unknown error'}`)
                                setLoading(false)
                                return // Stop if stage update fails
                            }
                        }
                    } else {
                        // Distribute evenly among updatable stages
                        const pricePerStage = Math.round((updatableTargetTotal / updatableStages.length) * 100) / 100
                        const lastStagePrice = updatableTargetTotal - (pricePerStage * (updatableStages.length - 1))
                        
                        console.log(`Distributing ${updatableTargetTotal} evenly among ${updatableStages.length} stages for elevator ${project.elevators.indexOf(elevator) + 1}`)
                        for (let i = 0; i < updatableStages.length; i++) {
                            const stagePrice = i === updatableStages.length - 1 ? Math.round(lastStagePrice * 100) / 100 : pricePerStage
                            console.log(`Updating stage ${updatableStages[i].stageNumber} (${updatableStages[i].id}) with price: ${stagePrice}`)
                            try {
                                await updateStage({
                                    stageId: updatableStages[i].id,
                                    stagePrice: stagePrice
                                })
                                console.log(`✅ Stage ${updatableStages[i].stageNumber} updated successfully`)
                            } catch (stageError: any) {
                                console.error(`❌ Failed to update stage ${updatableStages[i].stageNumber}:`, stageError)
                                toast.error(`Failed to update stage ${updatableStages[i].stageNumber}: ${stageError?.message || 'Unknown error'}`)
                                setLoading(false)
                                return // Stop if stage update fails
                            }
                        }
                    }
                    console.log(`✅ Finished updating stages for elevator ${elevatorIndex}`)
                } else {
                    console.log(`Elevator ${elevatorIndex}: No price update needed (price unchanged)`)
                }
            }
            
            console.log('✅ All elevator stage prices processed. Proceeding to update project...')
            
            // Calculate total price from updated elevator prices
            // Use elevatorPrices if set (from form), otherwise use elevator.price (fixed price from backend)
            // Do NOT sum stage prices as they may not reflect the fixed elevator price
            const calculatedTotalPrice = project.elevators.reduce((sum, elevator) => {
                // Use the price from form state if it was updated, otherwise use the fixed elevator price
                const elevatorPrice = elevatorPrices[elevator.id] ?? (elevator.price || 0)
                console.log(`Elevator ${project.elevators.indexOf(elevator) + 1}: Using price ${elevatorPrice} (form: ${elevatorPrices[elevator.id]}, fixed: ${elevator.price})`)
                return sum + elevatorPrice
            }, 0)
            
            console.log(`Calculated total project price: ${calculatedTotalPrice}`)
            
            // Parse optional dates - ensure they're valid or undefined (not empty strings)
            const parsedInstallationStartDate = formData.contract.installationStartDate?.trim() 
                ? parseDateInput(formData.contract.installationStartDate) || undefined
                : undefined
            const parsedExpectedFinishDate = formData.contract.expectedFinishDate?.trim()
                ? parseDateInput(formData.contract.expectedFinishDate) || undefined
                : undefined
            
            console.log('=== DATE PARSING RESULTS ===')
            console.log('Contract Date:', {
                input: formData.contract.contractDate,
                parsed: parsedContractDate
            })
            console.log('Installation Start Date:', {
                input: formData.contract.installationStartDate,
                parsed: parsedInstallationStartDate
            })
            console.log('Expected Finish Date:', {
                input: formData.contract.expectedFinishDate,
                parsed: parsedExpectedFinishDate
            })
            
            const updatePayload = {
                customer: {
                    ...formData.customer,
                    googleMapsLink: formData.customer.googleMapsLink || undefined
                },
                contract: {
                    projectAddress: formData.contract.projectAddress?.trim() || undefined,
                    city: formData.contract.city || formData.customer.city || "القاهرة الجديدة",
                    googleMapsLink: formData.contract.googleMapsLink?.trim() || undefined,
                    totalPrice: calculatedTotalPrice,
                    installationPricePerUnit: calculatedTotalPrice / (project.elevators.length || 1),
                    contractDate: parsedContractDate,
                    installationStartDate: parsedInstallationStartDate || undefined,
                    expectedFinishDate: parsedExpectedFinishDate || undefined,
                    notes: formData.contract.notes || undefined
                }
            }
            
            console.log('=== UPDATE PAYLOAD ===')
            console.log(JSON.stringify(updatePayload, null, 2))
            
            console.log('=== CALLING updateProject API ===')
            console.log('Project ID:', project.id)
            console.log('Payload:', updatePayload)
            
            await updateProject(project.id, updatePayload)
            console.log('✅ Project updated successfully!')
            toast.success("Project updated successfully")
            onUpdate()
            onOpenChange(false)
        } catch (error: any) {
            console.error('❌ Error updating project:', error)
            console.error('Error message:', error?.message)
            console.error('Error stack:', error?.stack)
            toast.error(error?.message || "Failed to update project")
        } finally {
            setLoading(false)
            console.log('=== UPDATE PROCESS COMPLETED ===')
        }
    }

    if (!project) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[75vw] !max-w-[75vw] sm:!max-w-[75vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Project Information</DialogTitle>
                    <DialogDescription>
                        Update project and contract details (Customer information cannot be edited)
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Tabs defaultValue="contract" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="contract">Contract Details</TabsTrigger>
                            <TabsTrigger value="elevators">Elevators</TabsTrigger>
                        </TabsList>

                        <TabsContent value="contract" className="space-y-4 mt-4">
                            {/* Customer Info - Read Only */}
                            <div className="space-y-4 p-4 border border-border/40 rounded-lg bg-muted/20">
                                <div className="text-sm font-semibold text-muted-foreground mb-2">Customer Information (Read Only)</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customerName">Customer Name</Label>
                                        <Input
                                            id="customerName"
                                            value={formData.customer.name}
                                            disabled
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customerPhone">Phone</Label>
                                        <Input
                                            id="customerPhone"
                                            value={formData.customer.phone}
                                            disabled
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customerEmail">Email</Label>
                                        <Input
                                            id="customerEmail"
                                            type="email"
                                            value={formData.customer.email || ""}
                                            disabled
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="projectNumber">Project Number</Label>
                                        <Input
                                            id="projectNumber"
                                            value={formData.customer.projectNumber}
                                            disabled
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="customerAddress">Address</Label>
                                    <Input
                                        id="customerAddress"
                                        value={formData.customer.address || ""}
                                        disabled
                                        className="bg-background/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customerCity">City</Label>
                                    <Input
                                        id="customerCity"
                                        value={formData.customer.city || ""}
                                        disabled
                                        className="bg-background/50"
                                    />
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
                                            onChange={(e) => updateContract("projectAddress", e.target.value)}
                                            placeholder="Leave empty to use customer address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="projectCity">Project City</Label>
                                        <Input
                                            id="projectCity"
                                            value={formData.contract.city || ""}
                                            onChange={(e) => updateContract("city", e.target.value)}
                                            placeholder="Leave empty to use customer city"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                                    <Input
                                        id="googleMapsLink"
                                        type="url"
                                        value={formData.contract.googleMapsLink || ""}
                                        onChange={(e) => {
                                            const value = e.target.value.trim()
                                            // Basic validation - warn if it looks invalid
                                            if (value && !value.match(/^(https?:\/\/)?(www\.)?(maps\.google\.|maps\.app\.|goo\.gl\/|maps\.)/i)) {
                                                // Still allow it but warn user
                                                console.warn("URL doesn't look like a Google Maps link")
                                            }
                                            updateContract("googleMapsLink", value)
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
                                    <Label htmlFor="contractDate">Contract Date * (DD/MM/YYYY)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="contractDate"
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
                                            className="flex-1"
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "w-[40px] px-0",
                                                        !formData.contract.contractDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.contract.contractDate ? (() => {
                                                        const parsed = parseDateInput(formData.contract.contractDate)
                                                        return parsed ? new Date(parsed + 'T00:00:00') : undefined
                                                    })() : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const year = date.getFullYear()
                                                            const month = String(date.getMonth() + 1).padStart(2, '0')
                                                            const day = String(date.getDate()).padStart(2, '0')
                                                            const dateStr = `${year}-${month}-${day}`
                                                            updateContract("contractDate", formatDateInput(dateStr))
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="installationStartDate">Installation Start Date (DD/MM/YYYY)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="installationStartDate"
                                            type="text"
                                            value={formData.contract.installationStartDate}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                if (value.length < (formData.contract.installationStartDate || "").length) {
                                                    updateContract("installationStartDate", value)
                                                    return
                                                }
                                                const formatted = formatDateInputValue(value)
                                                updateContract("installationStartDate", formatted)
                                            }}
                                            placeholder="DD/MM/YYYY"
                                            maxLength={10}
                                            className="flex-1"
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "w-[40px] px-0",
                                                        !formData.contract.installationStartDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.contract.installationStartDate ? (() => {
                                                        const parsed = parseDateInput(formData.contract.installationStartDate)
                                                        return parsed ? new Date(parsed + 'T00:00:00') : undefined
                                                    })() : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const year = date.getFullYear()
                                                            const month = String(date.getMonth() + 1).padStart(2, '0')
                                                            const day = String(date.getDate()).padStart(2, '0')
                                                            const dateStr = `${year}-${month}-${day}`
                                                            updateContract("installationStartDate", formatDateInput(dateStr))
                                                        }
                                                    }}
                                                    disabled={(date) => {
                                                        if (!formData.contract.contractDate) return false
                                                        const contractDateParsed = parseDateInput(formData.contract.contractDate)
                                                        if (!contractDateParsed) return false
                                                        const contractDate = new Date(contractDateParsed + 'T00:00:00')
                                                        return date < contractDate
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expectedFinishDate">Expected Finish Date (DD/MM/YYYY)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="expectedFinishDate"
                                            type="text"
                                            value={formData.contract.expectedFinishDate}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                if (value.length < (formData.contract.expectedFinishDate || "").length) {
                                                    updateContract("expectedFinishDate", value)
                                                    return
                                                }
                                                const formatted = formatDateInputValue(value)
                                                updateContract("expectedFinishDate", formatted)
                                            }}
                                            placeholder="DD/MM/YYYY"
                                            maxLength={10}
                                            className="flex-1"
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "w-[40px] px-0",
                                                        !formData.contract.expectedFinishDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.contract.expectedFinishDate ? (() => {
                                                        const parsed = parseDateInput(formData.contract.expectedFinishDate)
                                                        return parsed ? new Date(parsed + 'T00:00:00') : undefined
                                                    })() : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const year = date.getFullYear()
                                                            const month = String(date.getMonth() + 1).padStart(2, '0')
                                                            const day = String(date.getDate()).padStart(2, '0')
                                                            const dateStr = `${year}-${month}-${day}`
                                                            updateContract("expectedFinishDate", formatDateInput(dateStr))
                                                        }
                                                    }}
                                                    disabled={(date) => {
                                                        if (!formData.contract.installationStartDate) return false
                                                        const startDateParsed = parseDateInput(formData.contract.installationStartDate)
                                                        if (!startDateParsed) return false
                                                        const startDate = new Date(startDateParsed + 'T00:00:00')
                                                        return date < startDate
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            {/* Elevator Prices */}
                            {project && project.elevators && project.elevators.length > 0 && (
                                <div className="space-y-4 p-4 border border-border/40 rounded-lg bg-muted/20">
                                    <div>
                                        <Label className="text-base font-semibold">Elevator Prices</Label>
                                        <p className="text-sm text-muted-foreground">Prices are calculated from stage prices</p>
                                    </div>
                                    {project.elevators.map((elevator, index) => {
                                        // Calculate elevator price from sum of stage prices
                                        const elevatorPrice = elevator.stages.reduce((sum, stage) => sum + (stage.stagePrice || 0), 0)
                                        return (
                                            <div key={elevator.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                                                <div>
                                                    <Label className="font-medium">Elevator {index + 1} ({elevator.elevatorType})</Label>
                                                </div>
                                                <div className="text-lg font-semibold text-primary">
                                                    ${elevatorPrice.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Total Project Price - Calculated from Elevator Prices */}
                            <div className="space-y-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
                                <Label className="text-base font-semibold">Total Project Price</Label>
                                <div className="text-2xl font-bold text-primary">
                                    ${project && project.elevators ? project.elevators.reduce((sum, elevator) => 
                                        sum + elevator.stages.reduce((stageSum, stage) => stageSum + (stage.stagePrice || 0), 0), 0
                                    ).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }) : '0.00'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Calculated from the sum of all elevator prices
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.contract.notes}
                                    onChange={(e) => updateContract("notes", e.target.value)}
                                    rows={4}
                                    placeholder="Additional notes about the project..."
                                />
                            </div>
                        </TabsContent>

                        {/* Elevators Tab */}
                        <TabsContent value="elevators" className="space-y-4 mt-4">
                            {project && project.elevators && project.elevators.length > 0 ? (
                                <>
                                    {/* Elevator Selection Tabs */}
                                    <Tabs value={`elevator-${selectedElevatorIndex}`} onValueChange={(value) => {
                                        const index = parseInt(value.replace('elevator-', ''))
                                        setSelectedElevatorIndex(index)
                                    }} className="w-full">
                                        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${project.elevators.length}, minmax(0, 1fr))` }}>
                                            {project.elevators.map((elevator, index) => (
                                                <TabsTrigger key={elevator.id} value={`elevator-${index}`} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                                    Elevator {index + 1}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>

                                        {project.elevators.map((elevator, index) => {
                                            // Use elevator.price (fixed price) if available, otherwise calculate from stages
                                            const calculatedElevatorPrice = elevator.price || elevator.stages.reduce((sum, stage) => sum + (stage.stagePrice || 0), 0)
                                            const elevatorPrice = elevatorPrices[elevator.id] ?? calculatedElevatorPrice
                                            const areAllStagesCompleted = elevator.stages.length === 4 && 
                                                elevator.stages.every(s => s.status?.toLowerCase() === "success")
                                            return (
                                                <TabsContent key={elevator.id} value={`elevator-${index}`} className="space-y-4 mt-4">
                                                    {areAllStagesCompleted && (
                                                        <div className="p-4 border border-orange-500/50 bg-orange-500/10 rounded-lg mb-4">
                                                            <div className="flex items-start space-x-3">
                                                                <div className="mt-0.5">
                                                                    <span className="text-orange-500 text-lg">⚠️</span>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                                                                        Cannot Update Elevator Details
                                                                    </div>
                                                                    <div className="text-sm text-orange-600 dark:text-orange-300">
                                                                        All stages are completed. This elevator installation is finished and details cannot be modified.
                                                                    </div>
                                                                    <div className="text-xs text-orange-500/80 dark:text-orange-400/80 mt-2 font-medium">
                                                                        Locked: Price, type, and other specifications are now permanent.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className={`space-y-4 p-4 border border-border/40 rounded-lg bg-card/50 ${areAllStagesCompleted ? 'opacity-60' : ''}`}>
                                                        <div>
                                                            <Label className="text-base font-semibold">
                                                                Elevator {index + 1} Details
                                                                {areAllStagesCompleted && (
                                                                    <span className="ml-2 text-xs text-orange-500">🔒 Locked</span>
                                                                )}
                                                            </Label>
                                                        </div>

                                                        <Separator />

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`elevator-type-${elevator.id}`}>Elevator Type *</Label>
                                                                <select
                                                                    id={`elevator-type-${elevator.id}`}
                                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                                                    value={elevatorTypes[elevator.id] ?? elevator.elevatorType}
                                                                    onChange={(e) => {
                                                                        setElevatorTypes(prev => ({
                                                                            ...prev,
                                                                            [elevator.id]: e.target.value
                                                                        }))
                                                                    }}
                                                                    disabled={areAllStagesCompleted}
                                                                    required
                                                                >
                                                                    <option value="WithMachineRoom">With Machine Room (مع غرفة)</option>
                                                                    <option value="MachineRoomLess">Machine Room Less - MRL (بدون غرفة)</option>
                                                                    <option value="Hydraulic">Hydraulic (هيدروليك)</option>
                                                                </select>
                                                                {areAllStagesCompleted && (
                                                                    <p className="text-xs text-orange-500">Cannot be changed - all stages completed</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`elevator-price-${elevator.id}`}>Elevator Total Price *</Label>
                                                                <Input
                                                                    id={`elevator-price-${elevator.id}`}
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={elevatorPrices[elevator.id] ?? elevatorPrice}
                                                                    onChange={(e) => {
                                                                        if (areAllStagesCompleted) {
                                                                            toast.error("Cannot update elevator price. All stages are completed.")
                                                                            return
                                                                        }
                                                                        const newPrice = parseFloat(e.target.value) || 0
                                                                        setElevatorPrices(prev => ({
                                                                            ...prev,
                                                                            [elevator.id]: newPrice
                                                                        }))
                                                                    }}
                                                                    className="bg-background"
                                                                    disabled={areAllStagesCompleted}
                                                                    required
                                                                />
                                                                {areAllStagesCompleted && (
                                                                    <p className="text-xs text-orange-500">Cannot be changed - all stages completed</p>
                                                                )}
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Current sum of all stages: ${elevatorPrice.toLocaleString('en-US', {
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 2
                                                                        })}. The sum of all stage prices will equal this total.
                                                                    </p>
                                                                    {!areAllStagesCompleted && elevatorPrice === 0 && (elevatorPrices[elevator.id] ?? elevatorPrice) > 0 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const newPrice = elevatorPrices[elevator.id] ?? elevatorPrice
                                                                                if (newPrice > 0) {
                                                                                    toast.info(`Price will be distributed evenly among ${elevator.stages.filter(s => s.status?.toLowerCase() !== 'success').length} stages when you save`)
                                                                                }
                                                                            }}
                                                                        >
                                                                            Auto-Distribute
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Floors Count</Label>
                                                                <div className="p-2 bg-background/50 rounded-md border border-border/40">
                                                                    <span className="text-sm">{elevator.floorsCount ?? elevator.numberOfFloors ?? 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Stops Count</Label>
                                                                <div className="p-2 bg-background/50 rounded-md border border-border/40">
                                                                    <span className="text-sm">{elevator.stopsCount ?? elevator.numberOfStops ?? 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>


                                                        <div className="space-y-2">
                                                            <Label>Stage Prices</Label>
                                                            <div className="space-y-2">
                                                                {elevator.stages.sort((a, b) => a.stageNumber - b.stageNumber).map((stage) => (
                                                                    <div key={stage.id} className="flex items-center justify-between p-2 bg-background/50 rounded-md border border-border/40">
                                                                        <span className="text-sm">Stage {stage.stageNumber}</span>
                                                                        <span className="text-sm font-semibold">
                                                                            ${(stage.stagePrice || 0).toLocaleString('en-US', {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 2
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TabsContent>
                                            )
                                        })}
                                    </Tabs>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    No elevators found for this project
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Updating..." : "Update Project"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

