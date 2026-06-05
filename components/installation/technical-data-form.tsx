"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateInspectionTechnicalData, type UpdateInspectionTechnicalDataDto } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface TechnicalDataFormProps {
    inspectionId: string
    onSuccess: () => void
}

export function TechnicalDataForm({ inspectionId, onSuccess }: TechnicalDataFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<UpdateInspectionTechnicalDataDto>({
        shaftType: "",
        shaftWidth: undefined,
        shaftDepth: undefined,
        lastFloorHeight: undefined,
        pitDepth: undefined,
        travelHeight: undefined,
        technicalNotes: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validate that at least some technical data is provided
            if (!formData.shaftType && !formData.shaftWidth && !formData.shaftDepth) {
                toast.error("Please provide at least shaft type and dimensions")
                return
            }

            // Validate numeric fields
            if (formData.shaftWidth !== undefined && (formData.shaftWidth < 0 || formData.shaftWidth > 999999.99)) {
                toast.error("Shaft width must be between 0 and 999999.99")
                return
            }
            if (formData.shaftDepth !== undefined && (formData.shaftDepth < 0 || formData.shaftDepth > 999999.99)) {
                toast.error("Shaft depth must be between 0 and 999999.99")
                return
            }
            if (formData.lastFloorHeight !== undefined && (formData.lastFloorHeight < 0 || formData.lastFloorHeight > 999999.99)) {
                toast.error("Last floor height must be between 0 and 999999.99")
                return
            }
            if (formData.pitDepth !== undefined && (formData.pitDepth < 0 || formData.pitDepth > 999999.99)) {
                toast.error("Pit depth must be between 0 and 999999.99")
                return
            }
            if (formData.travelHeight !== undefined && (formData.travelHeight < 0 || formData.travelHeight > 999999.99)) {
                toast.error("Travel height must be between 0 and 999999.99")
                return
            }

            await updateInspectionTechnicalData(inspectionId, formData)
            toast.success("Technical data updated successfully")
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || "Failed to update technical data")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="shaftType">Shaft Type</Label>
                <Select
                    value={formData.shaftType || ""}
                    onValueChange={(value) => setFormData({ ...formData, shaftType: value })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select shaft type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Concrete">Concrete</SelectItem>
                        <SelectItem value="Brick">Brick</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="shaftWidth">Shaft Width (cm)</Label>
                    <Input
                        id="shaftWidth"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        value={formData.shaftWidth || ""}
                        onChange={(e) => setFormData({ ...formData, shaftWidth: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="shaftDepth">Shaft Depth (cm)</Label>
                    <Input
                        id="shaftDepth"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        value={formData.shaftDepth || ""}
                        onChange={(e) => setFormData({ ...formData, shaftDepth: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="lastFloorHeight">Last Floor Height (cm)</Label>
                    <Input
                        id="lastFloorHeight"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        value={formData.lastFloorHeight || ""}
                        onChange={(e) => setFormData({ ...formData, lastFloorHeight: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pitDepth">Pit Depth (cm)</Label>
                    <Input
                        id="pitDepth"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        value={formData.pitDepth || ""}
                        onChange={(e) => setFormData({ ...formData, pitDepth: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="travelHeight">Travel Height (cm)</Label>
                <Input
                    id="travelHeight"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    value={formData.travelHeight || ""}
                    onChange={(e) => setFormData({ ...formData, travelHeight: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0.00"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="technicalNotes">Technical Notes</Label>
                <Textarea
                    id="technicalNotes"
                    value={formData.technicalNotes || ""}
                    onChange={(e) => setFormData({ ...formData, technicalNotes: e.target.value })}
                    rows={4}
                    maxLength={2000}
                    placeholder="Additional technical notes about the hoistway..."
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onSuccess}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Technical Data
                </Button>
            </div>
        </form>
    )
}

