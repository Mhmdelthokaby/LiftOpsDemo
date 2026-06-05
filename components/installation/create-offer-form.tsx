"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createOffer, type CreateOfferDto } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreateOfferFormProps {
    inspectionId: string
    onSuccess: () => void
}

export function CreateOfferForm({ inspectionId, onSuccess }: CreateOfferFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<CreateOfferDto>({
        inspectionRequestId: inspectionId,
        installationPricePerUnit: 0,
        totalInstallationPrice: 0,
        estimatedStartDate: "",
        estimatedEndDate: "",
        notes: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validate required fields
            if (!formData.installationPricePerUnit || formData.installationPricePerUnit <= 0) {
                toast.error("Installation price per unit must be greater than 0")
                return
            }
            if (!formData.totalInstallationPrice || formData.totalInstallationPrice <= 0) {
                toast.error("Total installation price must be greater than 0")
                return
            }
            if (!formData.estimatedStartDate) {
                toast.error("Estimated start date is required")
                return
            }
            if (!formData.estimatedEndDate) {
                toast.error("Estimated end date is required")
                return
            }

            // Validate dates
            const startDate = new Date(formData.estimatedStartDate)
            const endDate = new Date(formData.estimatedEndDate)
            if (endDate < startDate) {
                toast.error("Estimated end date must be after estimated start date")
                return
            }

            await createOffer(formData)
            toast.success("Offer created successfully")
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || "Failed to create offer")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="installationPricePerUnit">Installation Price Per Unit *</Label>
                    <Input
                        id="installationPricePerUnit"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99999999.99"
                        value={formData.installationPricePerUnit || ""}
                        onChange={(e) => setFormData({ ...formData, installationPricePerUnit: parseFloat(e.target.value) || 0 })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="totalInstallationPrice">Total Installation Price *</Label>
                    <Input
                        id="totalInstallationPrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99999999.99"
                        value={formData.totalInstallationPrice || ""}
                        onChange={(e) => setFormData({ ...formData, totalInstallationPrice: parseFloat(e.target.value) || 0 })}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="estimatedStartDate">Estimated Start Date *</Label>
                    <Input
                        id="estimatedStartDate"
                        type="date"
                        value={formData.estimatedStartDate}
                        onChange={(e) => setFormData({ ...formData, estimatedStartDate: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="estimatedEndDate">Estimated End Date *</Label>
                    <Input
                        id="estimatedEndDate"
                        type="date"
                        value={formData.estimatedEndDate}
                        onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    maxLength={1000}
                    placeholder="Additional notes about the offer..."
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onSuccess}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Offer
                </Button>
            </div>
        </form>
    )
}

