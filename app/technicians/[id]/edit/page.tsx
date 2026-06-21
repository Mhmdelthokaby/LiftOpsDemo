"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getTechnicians, updateTechnician, UpdateTechnicianDto, Technician } from "@/lib/api"
import { canManageTechnicians as canManage } from "@/lib/user"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { ChevronLeft, Save, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/context"

export default function EditTechnicianPage() {
    const { t } = useTranslation()
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [loading, setLoading] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)
    const [fetching, setFetching] = useState(true)
    const [technician, setTechnician] = useState<Technician | null>(null)

    const [formData, setFormData] = useState<UpdateTechnicianDto>({
        name: "",
        phone: "",
        specialization: "",
        leaderId: undefined,
        username: "",
        password: ""
    })
    const [availableLeaders, setAvailableLeaders] = useState<Technician[]>([])
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        // Check if user can edit technicians (Manager only)
        if (!canManage()) {
            toast.error("Access denied. Manager role required.")
            router.push("/technicians")
            return
        }
        setCheckingAccess(false)
        
        if (id) {
            fetchTechnicianData()
        }
    }, [id, router])

    const fetchTechnicianData = async () => {
        if (!id) {
            setFetching(false)
            return
        }
        try {
            setFetching(true)
            const technicians = await getTechnicians()
            const foundTechnician = technicians.find(t => t.id === id)
            
            if (!foundTechnician) {
                toast.error("Technician not found")
                router.push("/technicians")
                return
            }

            setTechnician(foundTechnician)
            setFormData({
                name: foundTechnician.name || "",
                phone: foundTechnician.phone || "",
                specialization: foundTechnician.specialization || "",
                leaderId: foundTechnician.leaderId,
                username: foundTechnician.username || "", // Username from linked AppUser
                password: "" // Password is never retrieved for security reasons
            })
            
            // Load available leaders (excluding current technician to prevent self-reference)
            const allTechnicians = await getTechnicians()
            setAvailableLeaders(allTechnicians.filter(t => !t.isDisabled && t.id !== id))
        } catch (error: any) {
            console.error("Error fetching technician:", error)
            const errorMessage = error?.message || error?.data?.message || "Failed to load technician details"
            toast.error(errorMessage)
            router.push("/technicians")
        } finally {
            setFetching(false)
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
        if (formData.username && !formData.password) {
            toast.error("Password is required when username is provided")
            return
        }
        if (formData.password && !formData.username) {
            toast.error("Username is required when password is provided")
            return
        }

        try {
            setLoading(true)
            await updateTechnician(id, {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                specialization: formData.specialization?.trim() || undefined,
                leaderId: formData.leaderId || undefined,
                username: formData.username?.trim() || undefined,
                password: formData.password || undefined
            })
            
            toast.success("Technician updated successfully")
            router.push("/technicians")
        } catch (error: any) {
            console.error("Error updating technician:", error)
            const errorMessage = error?.message || error?.response?.data?.message || "Failed to update technician"
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof UpdateTechnicianDto, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    if (checkingAccess || fetching) {
        return (
            <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col">
                        <AppHeader />
                        <main className="flex-1 p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p>{checkingAccess ? "Checking access..." : "Loading technician details..."}</p>
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        )
    }

    if (!technician) {
        return (
            <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col">
                        <AppHeader />
                        <main className="flex-1 p-8 text-center">Technician not found</main>
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
                                onClick={() => router.push("/technicians")} 
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Technicians
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">{t.technicians.title}</CardTitle>
                                <CardDescription>{t.technicians.subtitle}</CardDescription>
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
                                                placeholder="Technician full name"
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
                                        <Label htmlFor="specialization">Specialization</Label>
                                        <Textarea
                                            id="specialization"
                                            value={formData.specialization || ""}
                                            onChange={(e) => handleChange("specialization", e.target.value)}
                                            placeholder="e.g., Passenger Elevators, Freight Elevators, Maintenance"
                                            rows={3}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Optional: Describe the technician's area of expertise
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="leaderId">Leader</Label>
                                        <Select
                                            value={formData.leaderId || "none"}
                                            onValueChange={(value) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    leaderId: value === "none" ? undefined : value
                                                }))
                                            }}
                                        >
                                            <SelectTrigger id="leaderId">
                                                <SelectValue placeholder="Select a leader (or leave empty to be a leader)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Leader (This technician will be a leader)</SelectItem>
                                                {availableLeaders.map((leader) => (
                                                    <SelectItem key={leader.id} value={leader.id}>
                                                        {leader.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Optional: Select a leader for this technician. If no leader is selected, this technician will be a leader.
                                        </p>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="text-lg font-semibold mb-4">Login Credentials (Optional)</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Update username and password to allow this technician to sign in and view their assigned maintenance visits. Leave empty to keep current credentials.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="username">Username/Email</Label>
                                                <Input
                                                    id="username"
                                                    type="email"
                                                    value={formData.username || ""}
                                                    onChange={(e) => handleChange("username", e.target.value)}
                                                    placeholder="technician@example.com"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Email address to use for login
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="password">Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password || ""}
                                                        onChange={(e) => handleChange("password", e.target.value)}
                                                        placeholder="Enter new password"
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Minimum 8 characters with uppercase, lowercase, number, and special character. Leave empty to keep current password.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push("/technicians")}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading}>
                                            {loading ? (
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
              title={t.demoGuide.technicians.title}
              description={t.demoGuide.technicians.description}
              features={[
                { icon: "👨‍🔧", label: "Team List", description: "All technicians with specialization and rating" },
                { icon: "✏️", label: "Add / Edit / Delete", description: "Full team management" },
                { icon: "🔘", label: "Enable / Disable", description: "Temporarily deactivate a technician without deleting" },
              ]}
              tip={t.demoGuide.technicians.tip}
            />
        </SidebarProvider>
    )
}

