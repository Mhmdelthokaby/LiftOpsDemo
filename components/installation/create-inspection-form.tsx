"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createInspectionRequest, getCustomers, searchCustomer, type CreateInspectionRequestDto, type Customer } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface CreateInspectionFormProps {
    onSuccess: () => void
}

export function CreateInspectionForm({ onSuccess }: CreateInspectionFormProps) {
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Customer | null>(null)
    const [availableClients, setAvailableClients] = useState<Customer[]>([])
    const [formData, setFormData] = useState<CreateInspectionRequestDto>({
        clientId: undefined,
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        projectAddress: "",
        googleMapsLink: "",
        numberOfElevatorsRequired: 1,
        elevatorType: "",
        notes: ""
    })

    useEffect(() => {
        loadClients()
    }, [])

    const loadClients = async () => {
        try {
            const clients = await getCustomers()
            setAvailableClients(clients)
        } catch (error) {
            // Silently fail - client lookup is optional
        }
    }

    const handleSearchClient = async () => {
        if (!formData.clientPhone && !formData.clientEmail) {
            toast.error("Please enter phone or email to search for existing client")
            return
        }

        setSearching(true)
        try {
            const client = await searchCustomer(formData.clientEmail, formData.clientPhone)
            if (client) {
                setSelectedClient(client)
                setFormData({
                    ...formData,
                    clientId: client.id,
                    clientName: client.name,
                    clientPhone: client.phone,
                    clientEmail: client.email || formData.clientEmail
                })
                toast.success("Client found and linked")
            } else {
                toast.info("No existing client found. A new client will be created when the offer is accepted.")
                setSelectedClient(null)
                setFormData({
                    ...formData,
                    clientId: undefined
                })
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to search for client")
        } finally {
            setSearching(false)
        }
    }

    const handleSelectClient = (clientId: string) => {
        const client = availableClients.find(c => c.id === clientId)
        if (client) {
            setSelectedClient(client)
            setFormData({
                ...formData,
                clientId: client.id,
                clientName: client.name,
                clientPhone: client.phone,
                clientEmail: client.email || ""
            })
        }
    }

    const handleClearClient = () => {
        setSelectedClient(null)
        setFormData({
            ...formData,
            clientId: undefined
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validate required fields
            if (!formData.clientName || !formData.clientPhone || !formData.clientEmail || 
                !formData.projectAddress || !formData.elevatorType) {
                toast.error("Please fill in all required fields")
                return
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(formData.clientEmail)) {
                toast.error("Please enter a valid email address")
                return
            }

            // Validate number of elevators
            if (formData.numberOfElevatorsRequired < 1 || formData.numberOfElevatorsRequired > 100) {
                toast.error("Number of elevators must be between 1 and 100")
                return
            }

            await createInspectionRequest(formData)
            toast.success("Inspection request created successfully")
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || "Failed to create inspection request")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Selection Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Client Information</Label>
                    {selectedClient && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearClient}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Clear Selection
                        </Button>
                    )}
                </div>

                {selectedClient ? (
                    <Card>
                        <CardContent className="pt-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-green-600">✓ Linked to existing client</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Name:</span> {selectedClient.name}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Phone:</span> {selectedClient.phone}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email:</span> {selectedClient.email || "N/A"}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label>Search Existing Client (Optional)</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search by phone or email..."
                                    value={formData.clientPhone || formData.clientEmail || ""}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value.includes("@")) {
                                            setFormData({ ...formData, clientEmail: value, clientPhone: "" })
                                        } else {
                                            setFormData({ ...formData, clientPhone: value, clientEmail: "" })
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSearchClient}
                                    disabled={searching || (!formData.clientPhone && !formData.clientEmail)}
                                >
                                    {searching ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {availableClients.length > 0 && (
                            <div className="space-y-2">
                                <Label>Or Select from Existing Clients</Label>
                                <Select onValueChange={handleSelectClient}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select existing client..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableClients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name} - {client.phone}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            If no client is selected, a new client will be created when the offer is accepted.
                        </p>
                    </>
                )}
            </div>

            {/* Client Details (editable if not linked) */}
            {!selectedClient && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clientName">Client Name *</Label>
                            <Input
                                id="clientName"
                                value={formData.clientName}
                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                required
                                maxLength={200}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clientPhone">Client Phone *</Label>
                            <Input
                                id="clientPhone"
                                type="tel"
                                value={formData.clientPhone}
                                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                required
                                maxLength={20}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="clientEmail">Client Email *</Label>
                        <Input
                            id="clientEmail"
                            type="email"
                            value={formData.clientEmail}
                            onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                            required
                            maxLength={200}
                        />
                    </div>
                </>
            )}

            <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email *</Label>
                <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    required
                    maxLength={200}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="projectAddress">Project Address *</Label>
                <Input
                    id="projectAddress"
                    value={formData.projectAddress}
                    onChange={(e) => setFormData({ ...formData, projectAddress: e.target.value })}
                    required
                    maxLength={500}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                <Input
                    id="googleMapsLink"
                    type="url"
                    value={formData.googleMapsLink}
                    onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    maxLength={500}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="numberOfElevatorsRequired">Number of Elevators *</Label>
                    <Input
                        id="numberOfElevatorsRequired"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.numberOfElevatorsRequired}
                        onChange={(e) => setFormData({ ...formData, numberOfElevatorsRequired: parseInt(e.target.value) || 1 })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="elevatorType">Elevator Type *</Label>
                    <Input
                        id="elevatorType"
                        value={formData.elevatorType}
                        onChange={(e) => setFormData({ ...formData, elevatorType: e.target.value })}
                        required
                        maxLength={100}
                        placeholder="e.g., Passenger, Freight"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    maxLength={1000}
                    placeholder="Additional notes about the inspection request..."
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onSuccess}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Inspection
                </Button>
            </div>
        </form>
    )
}

