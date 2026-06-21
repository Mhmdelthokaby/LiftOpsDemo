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
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { ChevronLeft, Save, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/context"

export default function NewTechnicianPage() {
    const { t } = useTranslation()
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
            toast.error(t.technicianNew.accessDenied)
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
            toast.error(t.technicianNew.nameRequired)
            return
        }
        if (!formData.phone.trim()) {
            toast.error(t.technicianNew.phoneRequired)
            return
        }
        if (formData.username && !formData.password) {
            toast.error(t.technicianNew.passwordRequiredWithUsername)
            return
        }
        if (formData.password && !formData.username) {
            toast.error(t.technicianNew.usernameRequiredWithPassword)
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
            
            toast.success(t.technicianNew.success)
            router.push("/technicians")
        } catch (error: any) {
            console.error("Error creating technician:", error)
            const errorMessage = error?.message || error?.response?.data?.message || t.technicianNew.error
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
                            <p>{t.technicianNew.loading}</p>
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
                                <ChevronLeft className="mr-2 h-4 w-4" /> {t.technicianNew.backToTechnicians}
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">{t.technicianNew.title}</CardTitle>
                                <CardDescription>{t.technicianNew.subtitle}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                {t.technicianNew.name}
                                            </Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => handleChange("name", e.target.value)}
                                                placeholder={t.technicianNew.namePlaceholder}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                {t.technicianNew.phone}
                                            </Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleChange("phone", e.target.value)}
                                                placeholder={t.technicianNew.phonePlaceholder}
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
                                            placeholder={t.technicianNew.specializationPlaceholder}
                                            rows={3}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t.technicianNew.specializationHint}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="leaderId">{t.technicianNew.leader}</Label>
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
                                                <SelectValue placeholder={t.technicianNew.leaderPlaceholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t.technicianNew.noLeader}</SelectItem>
                                                {availableLeaders.map((leader) => (
                                                    <SelectItem key={leader.id} value={leader.id}>
                                                        {leader.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            {t.technicianNew.leaderHint}
                                        </p>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="text-lg font-semibold mb-4">{t.technicianNew.loginCredentials}</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {t.technicianNew.loginHint}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="username">{t.technicianNew.usernameEmail}</Label>
                                                <Input
                                                    id="username"
                                                    type="email"
                                                    value={formData.username || ""}
                                                    onChange={(e) => handleChange("username", e.target.value)}
                                                    placeholder={t.technicianNew.emailPlaceholder}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {t.technicianNew.emailHint}
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="password">{t.technicianNew.password}</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password || ""}
                                                        onChange={(e) => handleChange("password", e.target.value)}
                                                        placeholder={t.technicianNew.passwordPlaceholder}
                                                        className="pr-10"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        aria-label={showPassword ? t.technicianNew.hidePassword : t.technicianNew.showPassword}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.technicianNew.passwordHint}
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
                                            {t.technicianNew.cancel}
                                        </Button>
                                        <Button type="submit" disabled={loading}>
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t.technicianNew.adding}
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    {t.technicianNew.addTechnician}
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

