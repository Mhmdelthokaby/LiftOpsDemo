"use client"

"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InspectionRequest } from "@/lib/api"
import { Eye, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"

interface InspectionDetailsDialogProps {
    inspection: InspectionRequest
    onTechnicalDataAdded?: () => void
    onOfferCreated?: () => void
}

export function InspectionDetailsDialog({ 
    inspection, 
    onTechnicalDataAdded, 
    onOfferCreated 
}: InspectionDetailsDialogProps) {
    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            PendingInspection: "bg-yellow-100 text-yellow-800",
            Inspected: "bg-blue-100 text-blue-800",
            OfferSent: "bg-purple-100 text-purple-800",
            OfferAccepted: "bg-green-100 text-green-800",
            OfferRejected: "bg-red-100 text-red-800"
        }
        return (
            <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
                {status.replace(/([A-Z])/g, ' $1').trim()}
            </Badge>
        )
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Inspection Request Details</DialogTitle>
                    <DialogDescription>
                        View complete inspection request information
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    {/* Client Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Client Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{inspection.clientName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-medium">{inspection.clientPhone}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{inspection.clientEmail}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                {getStatusBadge(inspection.status)}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Project Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Project Information</h3>
                        <div className="space-y-2">
                            <div>
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-medium">{inspection.projectAddress}</p>
                            </div>
                            {inspection.googleMapsLink && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Google Maps</p>
                                    <a 
                                        href={inspection.googleMapsLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {inspection.googleMapsLink}
                                    </a>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Number of Elevators</p>
                                    <p className="font-medium">{inspection.numberOfElevatorsRequired}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Elevator Type</p>
                                    <p className="font-medium">{inspection.elevatorType}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Technical Data */}
                    {(inspection.shaftType || inspection.shaftWidth || inspection.shaftDepth) && (
                        <>
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Technical Data (Hoistway)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {inspection.shaftType && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Shaft Type</p>
                                            <p className="font-medium">{inspection.shaftType}</p>
                                        </div>
                                    )}
                                    {inspection.shaftWidth !== undefined && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Shaft Width (m)</p>
                                            <p className="font-medium">{inspection.shaftWidth}</p>
                                        </div>
                                    )}
                                    {inspection.shaftDepth !== undefined && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Shaft Depth (m)</p>
                                            <p className="font-medium">{inspection.shaftDepth}</p>
                                        </div>
                                    )}
                                    {inspection.lastFloorHeight !== undefined && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Last Floor Height (m)</p>
                                            <p className="font-medium">{inspection.lastFloorHeight}</p>
                                        </div>
                                    )}
                                    {inspection.pitDepth !== undefined && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pit Depth (m)</p>
                                            <p className="font-medium">{inspection.pitDepth}</p>
                                        </div>
                                    )}
                                    {inspection.travelHeight !== undefined && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Travel Height (m)</p>
                                            <p className="font-medium">{inspection.travelHeight}</p>
                                        </div>
                                    )}
                                </div>
                                {inspection.technicalNotes && (
                                    <div className="mt-4">
                                        <p className="text-sm text-muted-foreground">Technical Notes</p>
                                        <p className="font-medium">{inspection.technicalNotes}</p>
                                    </div>
                                )}
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Offer Information */}
                    {inspection.offer && (
                        <>
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Offer Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Price Per Unit</p>
                                        <p className="font-medium">${inspection.offer.installationPricePerUnit.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Price</p>
                                        <p className="font-medium">${inspection.offer.totalInstallationPrice.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Estimated Start</p>
                                        <p className="font-medium">{formatDate(inspection.offer.estimatedStartDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Estimated End</p>
                                        <p className="font-medium">{formatDate(inspection.offer.estimatedEndDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <Badge className={
                                            inspection.offer.status === "Accepted" ? "bg-green-100 text-green-800" :
                                            inspection.offer.status === "Rejected" ? "bg-red-100 text-red-800" :
                                            "bg-yellow-100 text-yellow-800"
                                        }>
                                            {inspection.offer.status.replace(/([A-Z])/g, ' $1').trim()}
                                        </Badge>
                                    </div>
                                </div>
                                {inspection.offer.notes && (
                                    <div className="mt-4">
                                        <p className="text-sm text-muted-foreground">Notes</p>
                                        <p className="font-medium">{inspection.offer.notes}</p>
                                    </div>
                                )}
                                {inspection.offer.offerPdfPath && (
                                    <div className="mt-4">
                                        <a 
                                            href={inspection.offer.offerPdfPath} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline flex items-center gap-2"
                                        >
                                            <FileText className="h-4 w-4" />
                                            View Offer PDF
                                        </a>
                                    </div>
                                )}
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Notes */}
                    {inspection.notes && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Notes</h3>
                            <p className="text-sm">{inspection.notes}</p>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="text-sm text-muted-foreground">
                        <p>Created: {new Date(inspection.createdAt).toLocaleString()}</p>
                        {inspection.createdBy && <p>Created By: {inspection.createdBy}</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

