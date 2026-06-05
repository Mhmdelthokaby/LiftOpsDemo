"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    getOffers, 
    approveOffer,
    convertOfferToProject,
    Offer,
    type ApproveOfferDto 
} from "@/lib/api"
import { ApproveOfferDialog } from "./approve-offer-dialog"
import { FileText, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

export function OfferList() {
    const [offers, setOffers] = useState<Offer[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedStatus, setSelectedStatus] = useState<string>("all")

    const loadOffers = async (status?: string) => {
        try {
            setLoading(true)
            const statusFilter = status && status !== "all" 
                ? status as 'WaitingForClientApproval' | 'Accepted' | 'Rejected'
                : undefined
            const data = await getOffers(statusFilter)
            setOffers(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load offers")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOffers(selectedStatus)
    }, [selectedStatus])

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            WaitingForClientApproval: "bg-yellow-100 text-yellow-800",
            Accepted: "bg-green-100 text-green-800",
            Rejected: "bg-red-100 text-red-800"
        }
        return (
            <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
                {status.replace(/([A-Z])/g, ' $1').trim()}
            </Badge>
        )
    }

    const handleApprove = async (offerId: string, isAccepted: boolean, notes?: string) => {
        try {
            await approveOffer(offerId, { offerId, isAccepted, notes })
            toast.success(`Offer ${isAccepted ? 'accepted' : 'rejected'} successfully`)
            loadOffers(selectedStatus)
        } catch (error: any) {
            toast.error(error.message || "Failed to update offer status")
        }
    }

    const handleConvertToProject = async (offerId: string) => {
        try {
            const projectId = await convertOfferToProject(offerId)
            toast.success("Offer converted to project successfully")
            loadOffers(selectedStatus)
        } catch (error: any) {
            toast.error(error.message || "Failed to convert offer to project")
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Offers</h2>
                <p className="text-muted-foreground">Manage and approve client offers</p>
            </div>

            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="WaitingForClientApproval">Waiting</TabsTrigger>
                    <TabsTrigger value="Accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="Rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedStatus} className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-muted-foreground">Loading...</div>
                        </div>
                    ) : offers.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No offers found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Inspection ID</TableHead>
                                        <TableHead>Price Per Unit</TableHead>
                                        <TableHead>Total Price</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>End Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offers.map((offer) => (
                                        <TableRow key={offer.id}>
                                            <TableCell className="font-mono text-sm">
                                                {offer.inspectionRequestId.substring(0, 8)}...
                                            </TableCell>
                                            <TableCell>
                                                ${offer.installationPricePerUnit.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                ${offer.totalInstallationPrice.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(offer.estimatedStartDate)}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(offer.estimatedEndDate)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(offer.status)}</TableCell>
                                            <TableCell>
                                                {formatDate(offer.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {offer.status === "WaitingForClientApproval" && (
                                                        <ApproveOfferDialog
                                                            offer={offer}
                                                            onApprove={handleApprove}
                                                        />
                                                    )}
                                                    {offer.status === "Accepted" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleConvertToProject(offer.id)}
                                                        >
                                                            <ArrowRight className="mr-2 h-4 w-4" />
                                                            Convert to Project
                                                        </Button>
                                                    )}
                                                    {offer.offerPdfPath && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a 
                                                                href={offer.offerPdfPath} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

