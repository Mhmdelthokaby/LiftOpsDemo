"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Search, CalendarIcon } from "lucide-react"
import { InventoryItem, getActiveInventoryItems, updateStage, getStageDetails, InstallationStage, getTechnicians, Technician, completeStage, getCustomers } from "@/lib/api"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateInput, parseDateInput, formatDateInputValue, cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface StageManagementDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stageId: string
    stageNumber: number
    elevatorTotalPrice: number // Total price for this elevator (sum of all its stages)
    existingStagePrices: { stageNumber: number; price?: number }[]
    onComplete: () => void
    onSave?: () => void // Optional callback for save (without closing dialog)
    stageStartDate?: string // Stage start date for validation
    projectInstallationStartDate?: string // Project installation start date for validation
    projectExpectedFinishDate?: string // Project expected finish date for validation
    projectStatus?: string // Project status to check if rejected
    customerId?: string // Customer ID to check customer status
}

interface SelectedPart {
    item: InventoryItem
    quantity: number
}

export function StageManagementDialog({
    open,
    onOpenChange,
    stageId,
    stageNumber,
    elevatorTotalPrice,
    existingStagePrices,
    onComplete,
    onSave,
    stageStartDate,
    projectInstallationStartDate,
    projectExpectedFinishDate,
    projectStatus,
    customerId
}: StageManagementDialogProps) {
    const [endDate, setEndDate] = useState<string>("")
    const [price, setPrice] = useState<string>("")
    const [collectPrice, setCollectPrice] = useState(false)
    const [notes, setNotes] = useState("")
    const [freeMonths, setFreeMonths] = useState<string>("6")
    const [supplyCost, setSupplyCost] = useState<string>("")
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([])
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [showInventory, setShowInventory] = useState(false)
    const [loading, setLoading] = useState(false)
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([])
    const [technicianRatings, setTechnicianRatings] = useState<Record<string, number>>({}) // technicianId -> rating (1-5)
    const [loadedStageStartDate, setLoadedStageStartDate] = useState<string | undefined>(undefined)
    const [customerStatus, setCustomerStatus] = useState<string | null>(null)

    useEffect(() => {
        if (open && stageId) {
            // Load technicians, inventory, and stage data
            loadTechnicians()
            loadInventory().then((items) => {
                // Load stage data after inventory is loaded, passing the items
                loadStageData(items)
            })
            // Load customer status if customerId is provided
            if (customerId) {
                loadCustomerStatus()
            }
        } else {
            // Reset form when dialog closes
            setNotes("")
            setSelectedParts([])
            setEndDate("")
            setPrice("")
            setCollectPrice(false)
            setSupplyCost("")
            setSelectedTechnicianIds([])
            setTechnicianRatings({})
            setLoadedStageStartDate(undefined)
            setCustomerStatus(null)
        }
    }, [open, stageId, customerId])

    const loadCustomerStatus = async () => {
        try {
            const customers = await getCustomers()
            const customer = customers.find(c => c.id === customerId)
            // Customer status is calculated from projects, but we can check if any project is rejected
            // For now, we'll rely on the backend check and show better error messages
            // The customer status will be checked on the backend
        } catch (error) {
            console.error("Failed to load customer status:", error)
        }
    }

    const loadTechnicians = async () => {
        try {
            const techs = await getTechnicians()
            setTechnicians(techs.filter(t => !t.isDisabled)) // Only show active technicians
        } catch (error: any) {
            console.error("Failed to load technicians:", error)
            // Don't show error toast - it's optional
        }
    }

    const loadInventory = async (): Promise<InventoryItem[]> => {
        try {
            const items = await getActiveInventoryItems()
            setInventoryItems(items)
            return items
        } catch (error: any) {
            toast.error("Failed to load inventory items")
            return []
        }
    }

    const loadStageData = async (items: InventoryItem[]) => {
        try {
            const stageData = await getStageDetails(stageId)
            
            // Load existing notes
            if (stageData.notes) {
                setNotes(stageData.notes)
            } else {
                setNotes("")
            }
            
            // Load existing supply cost
            if (stageData.supplyCost != null) {
                setSupplyCost(stageData.supplyCost.toString())
            } else {
                setSupplyCost("")
            }
            
            // Load existing stage price
            if (stageData.stagePrice != null) {
                setPrice(stageData.stagePrice.toString())
            } else {
                setPrice("")
            }
            
            // Load existing end date (convert from YYYY-MM-DD to DD/MM/YYYY)
            if (stageData.endDate) {
                // Extract date part directly to avoid timezone conversion issues
                const dateStr = stageData.endDate.toString()
                const dateOnly = dateStr.split('T')[0] // Extract YYYY-MM-DD part
                setEndDate(formatDateInput(dateOnly))
            } else {
                setEndDate("")
            }

            // Load stage start date for validation
            if (stageData.startDate) {
                const dateStr = stageData.startDate.toString()
                const dateOnly = dateStr.split('T')[0]
                setLoadedStageStartDate(dateOnly)
            } else {
                setLoadedStageStartDate(undefined)
            }

            // Load existing isPriceCollected
            setCollectPrice(stageData.isPriceCollected || false)
            
            // Load existing technicians
            if (stageData.technicians && stageData.technicians.length > 0) {
                setSelectedTechnicianIds(stageData.technicians.map(t => t.technicianId))
            } else {
                setSelectedTechnicianIds([])
            }
            
            // Load existing parts
            if (stageData.requiredParts && stageData.requiredParts.length > 0 && items.length > 0) {
                // Map required parts to selected parts
                const parts: SelectedPart[] = stageData.requiredParts.map(part => {
                    const item = items.find(i => i.id === part.inventoryItemId)
                    if (item) {
                        return {
                            item,
                            quantity: part.quantity
                        }
                    }
                    return null
                }).filter((p): p is SelectedPart => p !== null)
                
                setSelectedParts(parts)
            } else {
                setSelectedParts([])
            }
        } catch (error: any) {
            console.error("Failed to load stage data:", error)
            // Don't show error toast - it's okay if there's no existing data
        }
    }

    const filteredInventory = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const addPart = (item: InventoryItem) => {
        const existing = selectedParts.find(p => p.item.id === item.id)
        if (existing) {
            setSelectedParts(selectedParts.map(p =>
                p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
            ))
        } else {
            setSelectedParts([...selectedParts, { item, quantity: 1 }])
        }
        setSearchTerm("")
    }

    const removePart = (itemId: string) => {
        setSelectedParts(selectedParts.filter(p => p.item.id !== itemId))
    }

    const updateQuantity = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            removePart(itemId)
        } else {
            setSelectedParts(selectedParts.map(p =>
                p.item.id === itemId ? { ...p, quantity } : p
            ))
        }
    }

    const calculateTotalStagePrices = () => {
        const otherStagesTotal = existingStagePrices
            .filter(s => s.stageNumber !== stageNumber && s.price)
            .reduce((sum, s) => sum + (s.price || 0), 0)
        const currentPrice = parseFloat(price) || 0
        return otherStagesTotal + currentPrice
    }

    // Validation function for all fields
    const validateAllFields = (): string | null => {
        // Validate price
        if (price) {
            const priceValue = parseFloat(price)
            if (isNaN(priceValue) || priceValue < 0) {
                return "Price must be 0 or greater"
            }
            if (priceValue > elevatorTotalPrice) {
                return `Price must be less than or equal to total elevator price (${elevatorTotalPrice})`
            }
            
            const total = calculateTotalStagePrices()
            if (stageNumber === 4) {
                if (Math.abs(total - elevatorTotalPrice) > 0.01) {
                    return `Sum of all 4 stage prices (${total}) must equal total elevator price (${elevatorTotalPrice})`
                }
            } else {
                if (total > elevatorTotalPrice) {
                    return `Sum of stage prices (${total}) cannot exceed total elevator price (${elevatorTotalPrice})`
                }
            }
        }

        // Validate end date (convert from DD/MM/YYYY to Date object)
        if (endDate) {
            const parsedDate = parseDateInput(endDate)
            if (!parsedDate) {
                return "Invalid date format. Please use DD/MM/YYYY format"
            }
            const endDateObj = new Date(parsedDate + 'T00:00:00')
            if (isNaN(endDateObj.getTime())) {
                return "Invalid date"
            }
            
            // Validate end date is not before project installation start date
            if (projectInstallationStartDate) {
                const installationStartDateObj = new Date(projectInstallationStartDate + 'T00:00:00')
                if (endDateObj < installationStartDateObj) {
                    const formattedMinDate = formatDateInput(projectInstallationStartDate)
                    return `End date cannot be before project installation start date (${formattedMinDate})`
                }
            }
            
            // Validate end date is not before stage start date
            const actualStartDate = stageStartDate || loadedStageStartDate
            if (actualStartDate) {
                const startDateObj = new Date(actualStartDate + 'T00:00:00')
                if (endDateObj < startDateObj) {
                    const formattedStartDate = formatDateInput(actualStartDate)
                    return `End date cannot be before stage start date (${formattedStartDate})`
                }
            }

            // Validate end date is not after project expected finish date
            if (projectExpectedFinishDate) {
                const projectEndDateObj = new Date(projectExpectedFinishDate + 'T00:00:00')
                if (endDateObj > projectEndDateObj) {
                    const formattedMaxDate = formatDateInput(projectExpectedFinishDate)
                    return `End date cannot be after project expected finish date (${formattedMaxDate})`
                }
            }
        }

        return null
    }

    const validatePrice = () => {
        const priceValue = parseFloat(price)
        if (isNaN(priceValue) || priceValue < 0) {
            return "Price must be 0 or greater"
        }
        if (priceValue > elevatorTotalPrice) {
            return `Price must be less than or equal to total elevator price (${elevatorTotalPrice})`
        }
        
        const total = calculateTotalStagePrices()
        if (stageNumber === 4) {
            if (Math.abs(total - elevatorTotalPrice) > 0.01) {
                return `Sum of all 4 stage prices (${total}) must equal total elevator price (${elevatorTotalPrice})`
            }
        } else {
            if (total >= elevatorTotalPrice) {
                return `Sum of stage prices (${total}) cannot exceed total elevator price (${elevatorTotalPrice})`
            }
        }
        return null
    }

    // Calculate supply cost from selected parts
    const calculateSupplyCost = (): number => {
        // If supply cost is manually entered, use it
        const manualCost = parseFloat(supplyCost)
        if (!isNaN(manualCost) && manualCost > 0) {
            return manualCost
        }
        // Otherwise auto-calculate from selected parts
        return selectedParts.reduce((total, part) => {
            return total + (part.item.unitPrice * part.quantity)
        }, 0)
    }

    // Prepare update data
    const prepareUpdateData = () => {
        const calculatedSupplyCost = calculateSupplyCost()
        const priceValue = price.trim() ? parseFloat(price) : null
        // Convert endDate from DD/MM/YYYY to YYYY-MM-DD for API
        const endDateForAPI = endDate ? parseDateInput(endDate) : undefined
        return {
            stageId,
            parts: selectedParts.length > 0 ? selectedParts.map(p => ({
                inventoryItemId: p.item.id,
                quantity: p.quantity
            })) : undefined,
            notes: notes.trim() || undefined,
            supplyCost: calculatedSupplyCost > 0 ? calculatedSupplyCost : undefined,
            stagePrice: priceValue !== null && !isNaN(priceValue) ? priceValue : undefined,
            endDate: endDateForAPI || undefined,
            technicianIds: selectedTechnicianIds.length > 0 ? selectedTechnicianIds : undefined
        }
    }

    const handleSave = async () => {
        // Validate all fields
        const validationError = validateAllFields()
        if (validationError) {
            toast.error(validationError)
            return
        }

        setLoading(true)
        try {
            const updateData = prepareUpdateData()
            console.log("Saving stage price:", { priceInput: price, parsedPrice: updateData.stagePrice })
            await updateStage(updateData)

            toast.success("Stage details saved successfully")
            
            // Reload stage data to show the saved changes without closing dialog
            const items = await loadInventory()
            await loadStageData(items)
            
            // Refresh parent component data if onSave callback provided (doesn't close dialog)
            if (onSave) {
                onSave()
            }
        } catch (error: any) {
            console.error("Save error:", error)
            toast.error(error?.message || "Failed to save stage details")
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = async () => {
        // Check if project is rejected
        const normalizedProjectStatus = projectStatus?.toLowerCase()
        if (normalizedProjectStatus === "rejected") {
            toast.error("Cannot complete stage. This project has been rejected. Please contact the administrator to resolve this issue.")
            return
        }
        
        // Note: Customer status is checked on the backend, so we can't prevent the API call here
        // But we'll show a better error message if it fails

        // Validate all fields
        const validationError = validateAllFields()
        if (validationError) {
            toast.error(validationError)
            return
        }

        if (!endDate) {
            toast.error("Please select an end date")
            return
        }

        // Validate that all selected technicians have ratings
        if (selectedTechnicianIds.length > 0) {
            const missingRatings = selectedTechnicianIds.filter(id => !technicianRatings[id] || technicianRatings[id] < 1 || technicianRatings[id] > 5)
            if (missingRatings.length > 0) {
                toast.error("Please rate all selected technicians (rating must be between 1 and 5)")
                return
            }
        }

        setLoading(true)
        try {
            // Always update stage first to ensure all data is saved
            const updateData = prepareUpdateData()
            await updateStage(updateData)

            // Prepare technician ratings
            const ratings = selectedTechnicianIds.length > 0
                ? selectedTechnicianIds.map(id => ({
                    technicianId: id,
                    rating: technicianRatings[id]
                }))
                : undefined
            
            // Calculate and pass supply cost
            const calculatedSupplyCost = calculateSupplyCost()
            
            // Then complete the stage
            try {
                const priceValue = price.trim() ? parseFloat(price) : null
                // Convert endDate from DD/MM/YYYY to YYYY-MM-DD for API
                const endDateForAPI = endDate ? parseDateInput(endDate) : undefined
                if (!endDateForAPI && endDate) {
                    toast.error("Invalid date format. Please use DD/MM/YYYY format")
                    return
                }
                await completeStage(
                    stageId,
                    calculatedSupplyCost > 0 ? calculatedSupplyCost : undefined,
                    notes || undefined,
                    endDateForAPI,
                    priceValue !== null && !isNaN(priceValue) ? priceValue : undefined,
                    collectPrice,
                    stageNumber === 4 ? parseInt(freeMonths) || 6 : undefined,
                    ratings
                )

                toast.success("Stage completed successfully")
            } catch (error: any) {
                // Extract error message from API response
                let errorMessage = error?.message || 
                                   error?.data?.errors?.[0] || 
                                   error?.data?.message || 
                                   "Failed to complete stage. Please try again."
                
                // Provide more helpful error messages
                if (errorMessage.includes("rejected")) {
                    errorMessage = "Cannot complete stage. This project or client has been rejected. Please contact the administrator to resolve this issue. You may need to approve the project inspection or update the client status."
                } else if (errorMessage.includes("inspection")) {
                    errorMessage = "Cannot complete stage. Project inspection must be approved first."
                } else if (errorMessage.includes("price")) {
                    errorMessage = errorMessage // Keep the original price-related error message
                }
                
                toast.error(errorMessage)
                console.error("Error completing stage:", error)
                return // Don't proceed with reset/close if there's an error
            }
            
            // Reset form first
            setEndDate("")
            setPrice("")
            setCollectPrice(false)
            setNotes("")
            setFreeMonths("6")
            setSelectedParts([])
            setSelectedTechnicianIds([])
            setTechnicianRatings({})
            
            // Close dialog and refresh - onComplete will handle refresh and dialog closing
            onComplete()
        } catch (error: any) {
            toast.error(error?.message || "Failed to complete stage")
        } finally {
            setLoading(false)
        }
    }

    const totalStagePrices = calculateTotalStagePrices()
    const remainingAmount = elevatorTotalPrice - totalStagePrices

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[75vw] !max-w-[75vw] sm:!max-w-[75vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Complete Stage {stageNumber}</DialogTitle>
                    <DialogDescription>
                        Add items, set end date, and price for this stage
                    </DialogDescription>
                    {(projectStatus?.toLowerCase() === "rejected" || customerStatus === "Rejected") && (
                        <div className="mt-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
                            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                ⚠️ Warning: This project or client has been rejected. You cannot complete stages until the status is resolved. Please contact the administrator.
                            </p>
                        </div>
                    )}
                </DialogHeader>

                <div className="space-y-6">
                    {/* Technician Selection */}
                    <div className="space-y-2">
                        <Label>Technicians</Label>
                        <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                            {technicians.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No technicians available</p>
                            ) : (
                                <div className="space-y-4">
                                    {technicians.map((tech) => (
                                        <div key={tech.id} className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`tech-${tech.id}`}
                                                    checked={selectedTechnicianIds.includes(tech.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedTechnicianIds([...selectedTechnicianIds, tech.id])
                                                            // Initialize rating to 3 (default)
                                                            if (!technicianRatings[tech.id]) {
                                                                setTechnicianRatings({ ...technicianRatings, [tech.id]: 3 })
                                                            }
                                                        } else {
                                                            setSelectedTechnicianIds(selectedTechnicianIds.filter(id => id !== tech.id))
                                                            // Remove rating when unselected
                                                            const newRatings = { ...technicianRatings }
                                                            delete newRatings[tech.id]
                                                            setTechnicianRatings(newRatings)
                                                        }
                                                    }}
                                                />
                                                <Label
                                                    htmlFor={`tech-${tech.id}`}
                                                    className="text-sm font-normal cursor-pointer flex-1"
                                                >
                                                    {tech.name} {tech.isLeader ? '(Leader)' : tech.leaderName ? `(Leader: ${tech.leaderName})` : ''}
                                                </Label>
                                            </div>
                                            {selectedTechnicianIds.includes(tech.id) && (
                                                <div className="ml-6 flex items-center space-x-2">
                                                    <Label htmlFor={`rating-${tech.id}`} className="text-xs text-muted-foreground min-w-[60px]">
                                                        Rating:
                                                    </Label>
                                                    <Input
                                                        id={`rating-${tech.id}`}
                                                        type="number"
                                                        min="1"
                                                        max="5"
                                                        step="0.1"
                                                        value={technicianRatings[tech.id] || 3}
                                                        onChange={(e) => {
                                                            const rating = parseFloat(e.target.value)
                                                            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                                                                setTechnicianRatings({ ...technicianRatings, [tech.id]: rating })
                                                            }
                                                        }}
                                                        className="w-20 h-8"
                                                    />
                                                    <span className="text-xs text-muted-foreground">(1-5)</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Select one or more technicians and rate them ({selectedTechnicianIds.length} selected)
                        </p>
                    </div>

                    {/* Date and Price Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date * (DD/MM/YYYY)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="endDate"
                                    type="text"
                                    value={endDate}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        // Allow backspace/delete
                                        if (value.length < endDate.length) {
                                            setEndDate(value)
                                            return
                                        }
                                        // Format with automatic slashes
                                        const formatted = formatDateInputValue(value)
                                        setEndDate(formatted)
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
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={endDate ? (() => {
                                                const parsed = parseDateInput(endDate)
                                                return parsed ? new Date(parsed + 'T00:00:00') : undefined
                                            })() : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    const year = date.getFullYear()
                                                    const month = String(date.getMonth() + 1).padStart(2, '0')
                                                    const day = String(date.getDate()).padStart(2, '0')
                                                    const dateStr = `${year}-${month}-${day}`
                                                    setEndDate(formatDateInput(dateStr))
                                                }
                                            }}
                                            disabled={(date) => {
                                                // Disable dates before project installation start date
                                                if (projectInstallationStartDate) {
                                                    const minDate = new Date(projectInstallationStartDate + 'T00:00:00')
                                                    if (date < minDate) return true
                                                }
                                                // Disable dates before stage start date
                                                const actualStartDate = stageStartDate || loadedStageStartDate
                                                if (actualStartDate) {
                                                    const minDate = new Date(actualStartDate + 'T00:00:00')
                                                    if (date < minDate) return true
                                                }
                                                // Disable dates after project expected finish date
                                                if (projectExpectedFinishDate) {
                                                    const maxDate = new Date(projectExpectedFinishDate + 'T00:00:00')
                                                    if (date > maxDate) return true
                                                }
                                                return false
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {validateAllFields() && endDate && (
                                <p className="text-xs text-red-500">{validateAllFields()}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Stage Price *</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                            {price && (
                                <p className="text-xs text-muted-foreground">
                                    {validatePrice() ? (
                                        <span className="text-red-500">{validatePrice()}</span>
                                    ) : (
                                        <span className="text-green-500">Valid</span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Price Summary */}
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Total Elevator Price:</span>
                            <span className="font-semibold">{elevatorTotalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Total Stage Prices:</span>
                            <span className="font-semibold">{totalStagePrices.toFixed(2)}</span>
                        </div>
                        {stageNumber === 4 ? (
                            <div className="flex justify-between text-sm font-semibold">
                                <span>Remaining:</span>
                                <span className={Math.abs(remainingAmount) < 0.01 ? "text-green-500" : "text-red-500"}>
                                    {remainingAmount.toFixed(2)}
                                </span>
                            </div>
                        ) : (
                            <div className="flex justify-between text-sm">
                                <span>Remaining Available:</span>
                                <span className="font-semibold">{remainingAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Collect Price Checkbox - Required */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="collectPrice"
                            checked={collectPrice}
                            onCheckedChange={(checked) => setCollectPrice(checked as boolean)}
                            required
                        />
                        <Label htmlFor="collectPrice" className="cursor-pointer font-semibold">
                            Price Collected *
                        </Label>
                    </div>
                    {!collectPrice && price && (
                        <p className="text-xs text-red-500 ml-6">
                            You must collect the price before completing this stage
                        </p>
                    )}

                    {/* Free Months (only for stage 4) */}
                    {stageNumber === 4 && (
                        <div className="space-y-2">
                            <Label htmlFor="freeMonths">Free Maintenance Months</Label>
                            <Input
                                id="freeMonths"
                                type="number"
                                min="0"
                                value={freeMonths}
                                onChange={(e) => setFreeMonths(e.target.value)}
                                placeholder="6"
                            />
                            <p className="text-xs text-muted-foreground">
                                Default: 6 months. This will be applied when the elevator is transferred to maintenance.
                            </p>
                        </div>
                    )}

                    {/* Supply Cost Section */}
                    <div className="space-y-2">
                        <Label htmlFor="supplyCost">Supply Cost (Items Cost)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="supplyCost"
                                type="number"
                                step="0.01"
                                min="0"
                                value={supplyCost}
                                onChange={(e) => setSupplyCost(e.target.value)}
                                placeholder={selectedParts.length > 0 ? `Auto: ${calculateSupplyCost().toFixed(2)}` : "0.00"}
                            />
                            {selectedParts.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSupplyCost(calculateSupplyCost().toFixed(2))}
                                >
                                    Auto Calculate
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {selectedParts.length > 0 
                                ? `Calculated from ${selectedParts.length} item(s): ${calculateSupplyCost().toFixed(2)}`
                                : "Enter the total cost of items/parts used in this stage"}
                        </p>
                    </div>

                    {/* Inventory Items Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Inventory Items</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowInventory(!showInventory)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {showInventory ? "Hide" : "Add"} Items
                            </Button>
                        </div>

                        {showInventory && (
                            <div className="border rounded-lg p-4 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search items..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Item Number</TableHead>
                                                <TableHead>Stock</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredInventory.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        No items found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredInventory.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.name}</TableCell>
                                                        <TableCell>{item.itemNumber}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={item.stockQuantity === 0 ? "destructive" : "default"}>
                                                                {item.stockQuantity}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{item.unitPrice.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addPart(item)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Selected Parts */}
                        {selectedParts.length > 0 && (
                            <div className="border rounded-lg p-4">
                                <Label className="mb-4 block">Selected Items</Label>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedParts.map((part, index) => (
                                            <TableRow key={`${part.item.id}-${index}`}>
                                                <TableCell>{part.item.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={part.item.stockQuantity < part.quantity ? "destructive" : "default"}>
                                                        {part.item.stockQuantity}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{part.item.unitPrice.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={part.quantity}
                                                        onChange={(e) => updateQuantity(part.item.id, parseInt(e.target.value) || 1)}
                                                        className="w-20"
                                                    />
                                                </TableCell>
                                                <TableCell>{(part.item.unitPrice * part.quantity).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removePart(part.item.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleComplete}
                            disabled={loading || !endDate || !price || price.trim() === "" || !!validatePrice() || !collectPrice || projectStatus?.toLowerCase() === "rejected" || customerStatus === "Rejected"}
                            title={(projectStatus?.toLowerCase() === "rejected" || customerStatus === "Rejected") ? "Cannot complete stage. Project or client has been rejected." : undefined}
                        >
                            {loading ? "Completing..." : "Complete Stage"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

