"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createTechnician, CreateTechnicianDto, getTechnicians, Technician } from "@/lib/api"
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
import { ChevronLeft, Save, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function NewTechnicianPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)

    const [formData, setFormData] = useState<CreateTechnicianDto>({
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
        // Check if user can create technicians (Manager only)
        if (!canManage()) {
            toast.error("Access denied. Manager role required.")
            router.push("/technicians")
            return
        }
        setCheckingAccess(false)
        loadAvailableLeaders()
    }, [router])

    const loadAvailableLeaders = async () => {
        try {
            const technicians = await getTechnicians()
            setAvailableLeaders(technicians.filter(t => !t.isDisabled))
        } catch (error) {
            console.error("Failed to load technicians for leader selection:", error)
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
            await createTechnician({
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                specialization: formData.specialization?.trim() || undefined,
                leaderId: formData.leaderId || undefined,
                username: formData.username?.trim() || undefined,
                password: formData.password || undefined
            })
            
            toast.success("Technician added successfully")
            router.push("/technicians")
        } catch (error: any) {
            console.error("Error creating technician:", error)
            const errorMessage = error?.message || error?.response?.data?.message || "Failed to add technician"
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof CreateTechnicianDto, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    if (checkingAccess) {
        return (
            <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col">
                        <AppHeader />
                        <main className="flex-1 p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p>Checking access...</p>
                        </main>
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
                                <CardTitle className="text-2xl">Add New Technician</CardTitle>
                                <CardDescription>Add a new technical team member to the system</CardDescription>
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
                                            Provide username and password to allow this technician to sign in and view their assigned maintenance visits.
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
                                                        placeholder="Enter password"
                                                        className="pr-10"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Minimum 8 characters with uppercase, lowercase, number, and special character
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
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Add Technician
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
        </SidebarProvider>
    )
}

