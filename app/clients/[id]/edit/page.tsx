"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCustomers, Customer, updateCustomer } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function EditClientPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [customer, setCustomer] = useState<Customer | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "القاهرة الجديدة",
        projectNumber: "",
        googleMapsLink: ""
    })

    useEffect(() => {
        if (id) {
            fetchClientData()
        }
    }, [id])

    const fetchClientData = async () => {
        if (!id) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const customers = await getCustomers()
            const foundCustomer = customers.find(c => c.id === id)
            
            if (!foundCustomer) {
                toast.error("Client not found")
                router.push("/clients")
                return
            }

            setCustomer(foundCustomer)
            setFormData({
                name: foundCustomer.name || "",
                email: foundCustomer.email || "",
                phone: foundCustomer.phone || "",
                address: foundCustomer.address || "",
                city: foundCustomer.city || "القاهرة الجديدة",
                projectNumber: foundCustomer.projectNumber || "",
                googleMapsLink: ""
            })
        } catch (error: any) {
            console.error("Error fetching client:", error)
            const errorMessage = error?.message || error?.data?.message || "Failed to load client details"
            toast.error(errorMessage)
            router.push("/clients")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validation
        if (!formData.name.trim()) {
            toast.error("Name is required")
            return
        }
        if (!formData.phone.trim()) {
            toast.error("Phone is required")
            return
        }
        if (!formData.email.trim()) {
            toast.error("Email is required")
            return
        }

        try {
            setSaving(true)
            await updateCustomer(id, {
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                city: formData.city || "القاهرة الجديدة",
                projectNumber: formData.projectNumber.trim(),
                googleMapsLink: formData.googleMapsLink.trim()
            })
            
            toast.success("Client updated successfully")
            router.push(`/clients/${id}`)
        } catch (error: any) {
            console.error("Error updating client:", error)
            const errorMessage = error?.message || error?.response?.data?.message || "Failed to update client"
            toast.error(errorMessage)
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    if (loading) {
        return (
            <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col">
                        <AppHeader />
                        <main className="flex-1 p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p>Loading client details...</p>
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        )
    }

    if (!customer) {
        return (
            <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col">
                        <AppHeader />
                        <main className="flex-1 p-8 text-center">Client not found</main>
                    </div>
                </div>
            </SidebarProvider>
        )
    }

    return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 pt-6 max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <Button 
                                variant="ghost" 
                                onClick={() => router.push(`/clients/${id}`)} 
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Client Details
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Edit Client</CardTitle>
                                <CardDescription>Update client information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                Name <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => handleChange("name", e.target.value)}
                                                placeholder="Client name"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                Phone <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleChange("phone", e.target.value)}
                                                placeholder="Phone number"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">
                                            Email <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange("email", e.target.value)}
                                            placeholder="Email address"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Textarea
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => handleChange("address", e.target.value)}
                                            placeholder="Client address"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => handleChange("city", e.target.value)}
                                            placeholder="City"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="projectNumber">Project Number</Label>
                                            <Input
                                                id="projectNumber"
                                                value={formData.projectNumber}
                                                onChange={(e) => handleChange("projectNumber", e.target.value)}
                                                placeholder="Project number"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                                            <Input
                                                id="googleMapsLink"
                                                type="url"
                                                value={formData.googleMapsLink}
                                                onChange={(e) => handleChange("googleMapsLink", e.target.value)}
                                                placeholder="https://maps.google.com/..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push(`/clients/${id}`)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={saving}>
                                            {saving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>
            <DemoGuidePanel
              title="Clients"
              description="Manage all your client relationships in one place."
              features={[
                { icon: "🔍", label: "Search & Filter", description: "Quickly find any client by name or contact" },
                { icon: "📋", label: "Client Details", description: "View client profile, projects, and contracts" },
                { icon: "➕", label: "Add / Edit", description: "Full client management with contact info" },
              ]}
              tip="Click any client row to see their full project and contract history."
            />
        </SidebarProvider>
    )
}

