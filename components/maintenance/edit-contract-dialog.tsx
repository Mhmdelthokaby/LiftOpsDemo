"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MaintenanceContractDetails, updateMaintenanceContract, UpdateMaintenanceContractDto, getTechnicians, Technician } from "@/lib/api"
import { toast } from "sonner"
import { RefreshCw, User } from "lucide-react"

interface EditContractDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contract: MaintenanceContractDetails | null
    onUpdate: () => void
}

export function EditContractDialog({
    open,
    onOpenChange,
    contract,
    onUpdate
}: EditContractDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<UpdateMaintenanceContractDto>({
        projectNumber: "",
        projectAddress: "",
        city: "",
        googleMapsLink: "",
        startDate: "",
        endDate: "",
        pricePerMonth: 0,
        freeMonths: 0,
        technicianId: ""
    })
    const [technicians, setTechnicians] = useState<Technician[]>([])

    useEffect(() => {
        if (contract && open) {
            // Format dates for input (YYYY-MM-DD)
            const formatDateForInput = (dateString: string): string => {
                if (!dateString) return ""
                try {
                    const date = new Date(dateString)
                    return date.toISOString().split('T')[0]
                } catch {
                    return ""
                }
            }

            setFormData({
                projectNumber: contract.projectNumber || "",
                projectAddress: contract.projectAddress || "",
                city: contract.city || "",
                googleMapsLink: contract.googleMapsLink || "",
                startDate: formatDateForInput(contract.startDate),
                endDate: formatDateForInput(contract.endDate),
                pricePerMonth: contract.pricePerMonth || 0,
                freeMonths: contract.freeMonths || 0,
                technicianId: contract.technicianId || ""
            })
        }
    }, [contract, open])

    useEffect(() => {
        if (open) {
            fetchTechnicians()
        }
    }, [open])

    const fetchTechnicians = async () => {
        try {
            const data = await getTechnicians()
            setTechnicians(data)
        } catch (error) {
            console.error("Failed to fetch technicians:", error)
        }
    }

    const handleSubmit = async () => {
        if (!contract) return

        // Validation
        if (!formData.projectNumber.trim()) {
            toast.error("Project number is required")
            return
        }

        if (!formData.startDate || !formData.endDate) {
            toast.error("Start date and end date are required")
            return
        }

        // Validate date format
        const startDate = new Date(formData.startDate)
        const endDate = new Date(formData.endDate)
        
        if (isNaN(startDate.getTime())) {
            toast.error("Invalid start date format")
            return
        }
        
        if (isNaN(endDate.getTime())) {
            toast.error("Invalid end date format")
            return
        }

        if (startDate > endDate) {
            toast.error("End date must be after start date")
            return
        }

        if (formData.freeMonths < 0) {
            toast.error("Free months cannot be negative")
            return
        }

        try {
            setLoading(true)
            // Prepare data - convert empty strings to undefined and ensure proper types
            const updateData: UpdateMaintenanceContractDto = {
                projectNumber: formData.projectNumber.trim(),
                projectAddress: formData.projectAddress?.trim() || undefined,
                city: formData.city?.trim() || "", // Always send city, even if empty
                googleMapsLink: formData.googleMapsLink?.trim() || undefined,
                startDate: formData.startDate, // Already in YYYY-MM-DD format from date input
                endDate: formData.endDate, // Already in YYYY-MM-DD format from date input
                pricePerMonth: formData.pricePerMonth,
                freeMonths: formData.freeMonths,
                technicianId: formData.technicianId && formData.technicianId.trim() ? formData.technicianId.trim() : undefined
            }
            
            console.log("Sending update data:", JSON.stringify(updateData, null, 2))
            await updateMaintenanceContract(contract.id, updateData)
            toast.success("Contract updated successfully")
            onUpdate()
            onOpenChange(false)
        } catch (error: any) {
            console.error("Error updating contract:", error)
            console.error("Error details:", {
                status: error?.status,
                message: error?.message,
                data: error?.data,
                response: error?.response
            })
            console.error("Payload sent:", updateData)
            
            // Extract error message from various possible locations
            let errorMessage = "Failed to update contract"
            if (error?.data) {
                if (error.data.message) {
                    errorMessage = error.data.message
                } else if (error.data.errors && Array.isArray(error.data.errors) && error.data.errors.length > 0) {
                    errorMessage = error.data.errors[0]
                } else if (typeof error.data === 'string') {
                    errorMessage = error.data
                }
            } else if (error?.message) {
                errorMessage = error.message
            }
            
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Maintenance Contract</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="projectNumber">Project Number *</Label>
                        <Input
                            id="projectNumber"
                            value={formData.projectNumber}
                            onChange={(e) => setFormData({ ...formData, projectNumber: e.target.value })}
                            placeholder="e.g., M-2024-001"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="projectAddress">Project Address</Label>
                        <Input
                            id="projectAddress"
                            value={formData.projectAddress || ""}
                            onChange={(e) => setFormData({ ...formData, projectAddress: e.target.value })}
                            placeholder="Enter project address"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            value={formData.city || ""}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Enter city"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                        <Input
                            id="googleMapsLink"
                            type="url"
                            value={formData.googleMapsLink || ""}
                            onChange={(e) => {
                                const value = e.target.value.trim()
                                // Basic validation - warn if it looks invalid
                                if (value && !value.match(/^(https?:\/\/)?(www\.)?(maps\.google\.|maps\.app\.|goo\.gl\/|maps\.)/i)) {
                                    // Still allow it but warn user
                                    console.warn("URL doesn't look like a Google Maps link")
                                }
                                setFormData({ ...formData, googleMapsLink: value })
                            }}
                            placeholder="https://maps.google.com/... or https://maps.app.goo.gl/..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Optional: Enter a valid Google Maps URL (e.g., https://maps.google.com/... or https://maps.app.goo.gl/...)
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date *</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date *</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pricePerMonth">Price Per Month</Label>
                            <Input
                                id="pricePerMonth"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.pricePerMonth}
                                onChange={(e) => setFormData({ ...formData, pricePerMonth: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="freeMonths">Free Months</Label>
                            <Input
                                id="freeMonths"
                                type="number"
                                min="0"
                                value={formData.freeMonths}
                                onChange={(e) => setFormData({ ...formData, freeMonths: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="technicianId">Main Responsible Technician</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <select
                                id="technicianId"
                                value={formData.technicianId}
                                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Technician</option>
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

