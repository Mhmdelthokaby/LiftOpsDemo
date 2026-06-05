"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Offer } from "@/lib/api"
import { CheckCircle, XCircle } from "lucide-react"

interface ApproveOfferDialogProps {
    offer: Offer
    onApprove: (offerId: string, isAccepted: boolean, notes?: string) => void
}

export function ApproveOfferDialog({ offer, onApprove }: ApproveOfferDialogProps) {
    const [open, setOpen] = useState(false)
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)

    const handleApprove = async (isAccepted: boolean) => {
        setLoading(true)
        try {
            await onApprove(offer.id, isAccepted, notes || undefined)
            setOpen(false)
            setNotes("")
        } catch (error) {
            // Error handling is done in parent
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Approve/Reject
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve or Reject Offer</DialogTitle>
                    <DialogDescription>
                        Review the offer details and make a decision
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Price Per Unit</p>
                            <p className="font-medium">${offer.installationPricePerUnit.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Price</p>
                            <p className="font-medium">${offer.totalInstallationPrice.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <p className="font-medium">{formatDate(offer.estimatedStartDate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <p className="font-medium">{formatDate(offer.estimatedEndDate)}</p>
                        </div>
                    </div>
                    {offer.notes && (
                        <div>
                            <p className="text-sm text-muted-foreground">Offer Notes</p>
                            <p className="font-medium">{offer.notes}</p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Decision Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            placeholder="Add notes about your decision..."
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => handleApprove(false)}
                            disabled={loading}
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                        </Button>
                        <Button
                            onClick={() => handleApprove(true)}
                            disabled={loading}
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

