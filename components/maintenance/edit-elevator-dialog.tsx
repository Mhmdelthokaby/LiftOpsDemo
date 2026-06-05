"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateMaintenanceElevator, UpdateMaintenanceElevatorDto } from "@/lib/api"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

interface EditElevatorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    elevatorId: string
    elevator: {
        type: string
        numberOfStops: number
        numberOfFloors: number
        nextMaintenanceDate?: string
    } | null
    onUpdate: () => void
}

export function EditElevatorDialog({
    open,
    onOpenChange,
    elevatorId,
    elevator,
    onUpdate
}: EditElevatorDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<UpdateMaintenanceElevatorDto>({
        type: "",
        numberOfStops: 0,
        numberOfFloors: 0,
        nextMaintenanceDate: undefined
    })

    useEffect(() => {
        if (elevator && open) {
            // Format date for input (YYYY-MM-DD)
            const formatDateForInput = (dateString?: string): string => {
                if (!dateString) return ""
                try {
                    const date = new Date(dateString)
                    return date.toISOString().split('T')[0]
                } catch {
                    return ""
                }
            }

            setFormData({
                type: elevator.type || "",
                numberOfStops: elevator.numberOfStops || 0,
                numberOfFloors: elevator.numberOfFloors || 0,
                nextMaintenanceDate: elevator.nextMaintenanceDate ? formatDateForInput(elevator.nextMaintenanceDate) : undefined
            })
        }
    }, [elevator, open])

    const handleSubmit = async () => {
        // Validation
        if (!formData.type.trim()) {
            toast.error("Elevator type is required")
            return
        }

        if (formData.numberOfStops < 0) {
            toast.error("Number of stops cannot be negative")
            return
        }

        if (formData.numberOfFloors < 0) {
            toast.error("Number of floors cannot be negative")
            return
        }

        try {
            setLoading(true)
            const updateData: UpdateMaintenanceElevatorDto = {
                type: formData.type,
                numberOfStops: formData.numberOfStops,
                numberOfFloors: formData.numberOfFloors,
                nextMaintenanceDate: formData.nextMaintenanceDate || undefined
            }
            await updateMaintenanceElevator(elevatorId, updateData)
            toast.success("Elevator updated successfully")
            onUpdate()
            onOpenChange(false)
        } catch (error: any) {
            console.error("Error updating elevator:", error)
            const errorMessage = error?.response?.data?.message || 
                              error?.data?.message || 
                              error?.message || 
                              "Failed to update elevator"
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Elevator</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Elevator Type *</Label>
                        <Input
                            id="type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            placeholder="e.g., Passenger, Freight, etc."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="numberOfStops">Number of Stops</Label>
                            <Input
                                id="numberOfStops"
                                type="number"
                                min="0"
                                value={formData.numberOfStops}
                                onChange={(e) => setFormData({ ...formData, numberOfStops: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="numberOfFloors">Number of Floors</Label>
                            <Input
                                id="numberOfFloors"
                                type="number"
                                min="0"
                                value={formData.numberOfFloors}
                                onChange={(e) => setFormData({ ...formData, numberOfFloors: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nextMaintenanceDate">Next Maintenance Date</Label>
                        <Input
                            id="nextMaintenanceDate"
                            type="date"
                            value={formData.nextMaintenanceDate || ""}
                            onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value || undefined })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Leave empty if not scheduled
                        </p>
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

