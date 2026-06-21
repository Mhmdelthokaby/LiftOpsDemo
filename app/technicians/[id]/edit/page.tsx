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
            toast.error(t.technicianEdit.accessDenied)
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
                toast.error(t.technicianEdit.notFound)
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
            const errorMessage = error?.message || error?.data?.message || t.technicianEdit.errorLoading
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
            toast.error(t.technicianEdit.nameRequired)
            return
        }
        if (!formData.phone.trim()) {
            toast.error(t.technicianEdit.phoneRequired)
            return
        }
        if (formData.username && !formData.password) {
            toast.error(t.technicianEdit.passwordRequiredWithUsername)
            return
        }
        if (formData.password && !formData.username) {
            toast.error(t.technicianEdit.usernameRequiredWithPassword)
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
            
            toast.success(t.technicianEdit.success)
            router.push("/technicians")
        } catch (error: any) {
            console.error("Error updating technician:", error)
            const errorMessage = error?.message || error?.response?.data?.message || t.technicianEdit.error
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
                            <p>{t.technicianEdit.loading}</p>
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
                        <main className="flex-1 p-8 text-center">{t.technicianEdit.technicianNotFound}</main>
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
                                <ChevronLeft className="mr-2 h-4 w-4" /> {t.technicianEdit.backToTechnicians}
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">{t.technicianEdit.title}</CardTitle>
                                <CardDescription>{t.technicianEdit.subtitle}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                {t.technicianEdit.name}
                                            </Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => handleChange("name", e.target.value)}
                                                placeholder={t.technicianEdit.namePlaceholder}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                {t.technicianEdit.phone}
                                            </Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleChange("phone", e.target.value)}
                                                placeholder={t.technicianEdit.phonePlaceholder}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="specialization">{t.common.specialization}</Label>
                                        <Textarea
                                            id="specialization"
                                            value={formData.specialization || ""}
                                            onChange={(e) => handleChange("specialization", e.target.value)}
                                            placeholder={t.technicianEdit.specializationPlaceholder}
                                            rows={3}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t.technicianEdit.specializationHint}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="leaderId">{t.technicianEdit.leader}</Label>
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
                                                <SelectValue placeholder={t.technicianEdit.leaderPlaceholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t.technicianEdit.noLeader}</SelectItem>
                                                {availableLeaders.map((leader) => (
                                                    <SelectItem key={leader.id} value={leader.id}>
                                                        {leader.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            {t.technicianEdit.leaderHint}
                                        </p>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="text-lg font-semibold mb-4">{t.technicianEdit.loginCredentials}</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {t.technicianEdit.loginHint}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="username">{t.technicianEdit.usernameEmail}</Label>
                                                <Input
                                                    id="username"
                                                    type="email"
                                                    value={formData.username || ""}
                                                    onChange={(e) => handleChange("username", e.target.value)}
                                                    placeholder={t.technicianEdit.emailPlaceholder}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {t.technicianEdit.emailHint}
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="password">{t.technicianEdit.password}</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password || ""}
                                                        onChange={(e) => handleChange("password", e.target.value)}
                                                        placeholder={t.technicianEdit.passwordPlaceholder}
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        aria-label={showPassword ? t.technicianNew.hidePassword : t.technicianNew.showPassword}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.technicianEdit.passwordHint}
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
                                            {t.technicianEdit.cancel}
                                        </Button>
                                        <Button type="submit" disabled={loading}>
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t.technicianEdit.saving}
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    {t.technicianEdit.saveChanges}
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
                { icon: "👨‍🔧", label: t.technicians.teamList, description: t.technicians.teamListDesc },
                { icon: "✏️", label: t.technicians.addEditDelete, description: t.technicians.addEditDeleteDesc },
                { icon: "🔘", label: t.technicians.enableDisable, description: t.technicians.enableDisableDesc },
              ]}
              tip={t.demoGuide.technicians.tip}
            />
        </SidebarProvider>
    )
}

