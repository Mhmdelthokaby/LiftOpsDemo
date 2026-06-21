"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createInspectionProject, searchCustomer, Customer } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Search, CheckCircle2, X, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "@/lib/i18n/context"

export default function NewInspectionProjectPage() {
    const { t } = useTranslation()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [searchingCustomer, setSearchingCustomer] = useState(false)
    const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
    const [useExistingCustomer, setUseExistingCustomer] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [formData, setFormData] = useState({
        customerId: "" as string | undefined,
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        projectAddress: "",
        googleMapsLink: "",
        pitType: "Concrete",
        pitWidth: 0,
        pitDepth: 0,
        lastFloorHeight: 0,
        holeDepth: 0,
        travelLength: 0,
        notes: ""
    })

    const searchForCustomer = useCallback(async (phone?: string, email?: string) => {
        const searchPhone = phone || formData.customerPhone
        const searchEmail = email || formData.customerEmail

        if (!searchPhone || searchPhone.trim() === "") {
            setExistingCustomer(null)
            setUseExistingCustomer(false)
            return
        }

        setSearchingCustomer(true)
        try {
            const customer = await searchCustomer(searchEmail, searchPhone)
            if (customer) {
                setExistingCustomer(customer)
            } else {
                setExistingCustomer(null)
                setUseExistingCustomer(false)
            }
        } catch (error) {
            console.error("Error searching for customer:", error)
            setExistingCustomer(null)
            setUseExistingCustomer(false)
        } finally {
            setSearchingCustomer(false)
        }
    }, [formData.customerPhone, formData.customerEmail])

    const useExistingCustomerData = () => {
        if (!existingCustomer) return

        setFormData(prev => ({
            ...prev,
            customerId: existingCustomer.id,
            customerName: existingCustomer.name,
            customerEmail: existingCustomer.email,
            customerPhone: existingCustomer.phone,
            customerAddress: existingCustomer.address || prev.customerAddress
        }))
        setUseExistingCustomer(true)
        toast.success(t.inspection.usingExistingCustomer)
    }

    const useNewCustomer = () => {
        setUseExistingCustomer(false)
        setExistingCustomer(null)
        setFormData(prev => ({
            ...prev,
            customerId: undefined
        }))
        toast.info(t.inspection.creatingCustomer)
    }

    // Auto-search when phone changes (with debouncing)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        if (formData.customerPhone && formData.customerPhone.trim().length >= 5) {
            searchTimeoutRef.current = setTimeout(() => {
                searchForCustomer()
            }, 500)
        } else {
            if (formData.customerPhone.trim().length < 5) {
                setExistingCustomer(null)
                setUseExistingCustomer(false)
            }
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [formData.customerPhone, searchForCustomer])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!formData.customerPhone.trim()) {
            toast.error(t.inspection.phoneRequired)
            return
        }

        if (!formData.projectAddress.trim()) {
            toast.error(t.inspection.addressRequired)
            return
        }

        if (!formData.pitType) {
            toast.error(t.inspection.pitTypeRequired)
            return
        }

        if (formData.pitWidth <= 0 || formData.pitDepth <= 0 || formData.lastFloorHeight <= 0 ||
            formData.holeDepth <= 0 || formData.travelLength <= 0) {
            toast.error(t.inspection.measurementsRequired)
            return
        }

        setLoading(true)
        try {
            const projectId = await createInspectionProject({
                customerId: useExistingCustomer && existingCustomer ? existingCustomer.id : undefined,
                customerName: formData.customerName || undefined,
                customerPhone: formData.customerPhone,
                customerEmail: formData.customerEmail || undefined,
                customerAddress: formData.customerAddress || undefined,
                projectAddress: formData.projectAddress,
                googleMapsLink: formData.googleMapsLink || undefined,
                pitType: formData.pitType,
                pitWidth: formData.pitWidth,
                pitDepth: formData.pitDepth,
                lastFloorHeight: formData.lastFloorHeight,
                holeDepth: formData.holeDepth,
                travelLength: formData.travelLength,
                notes: formData.notes || undefined
            })

            toast.success(t.inspection.success)
            router.push(`/inspection`)
        } catch (error: any) {
            console.error("Error creating inspection project:", error)
            toast.error(error?.message || t.inspection.error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="flex flex-col min-h-screen">
                <AppHeader />
                <main className="flex-1 p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/inspection')}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold">{t.inspection.title}</h1>
                                <p className="text-muted-foreground">{t.inspection.subtitle}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Customer Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.inspection.customerInformation}</CardTitle>
                                    <CardDescription>
                                        {t.inspection.customerInfoDesc}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="customerPhone">{t.inspection.phone}</Label>
                                            <div className="relative">
                                                <Input
                                                    id="customerPhone"
                                                    value={formData.customerPhone}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({ ...prev, customerPhone: e.target.value }))
                                                        setExistingCustomer(null)
                                                        setUseExistingCustomer(false)
                                                    }}
                                                    placeholder={t.inspection.phonePlaceholder}
                                                    required
                                                />
                                                {searchingCustomer && (
                                                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customerEmail">{t.inspection.email}</Label>
                                            <Input
                                                id="customerEmail"
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                                                placeholder={t.inspection.emailPlaceholder}
                                            />
                                        </div>
                                    </div>

                                    {existingCustomer && !useExistingCustomer && (
                                        <div className="p-4 border rounded-lg bg-muted/50">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium">{t.inspection.customerFound}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {existingCustomer.name} - {existingCustomer.phone}
                                                    </p>
                                                    {existingCustomer.email && (
                                                        <p className="text-sm text-muted-foreground">{existingCustomer.email}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={useExistingCustomerData}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        {t.inspection.useThisCustomer}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={useNewCustomer}
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        {t.inspection.createNew}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {useExistingCustomer && existingCustomer && (
                                        <Badge variant="outline" className="w-fit">
                                            {t.inspection.usingExisting.replace("{name}", existingCustomer.name)}
                                        </Badge>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="customerName">{t.inspection.name}</Label>
                                        <Input
                                            id="customerName"
                                            value={formData.customerName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                                            placeholder={t.inspection.namePlaceholder}
                                            required
                                            disabled={useExistingCustomer}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="customerAddress">{t.inspection.address}</Label>
                                        <Textarea
                                            id="customerAddress"
                                            value={formData.customerAddress}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                                            placeholder={t.inspection.addressPlaceholder}
                                            disabled={useExistingCustomer}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Project Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.inspection.projectInformation}</CardTitle>
                                    <CardDescription>
                                        {t.inspection.projectInfoDesc}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="projectAddress">{t.inspection.projectAddress}</Label>
                                        <Textarea
                                            id="projectAddress"
                                            value={formData.projectAddress}
                                            onChange={(e) => setFormData(prev => ({ ...prev, projectAddress: e.target.value }))}
                                            placeholder={t.inspection.projectAddressPlaceholder}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="googleMapsLink">{t.inspection.googleMapsLink}</Label>
                                        <Input
                                            id="googleMapsLink"
                                            value={formData.googleMapsLink}
                                            onChange={(e) => setFormData(prev => ({ ...prev, googleMapsLink: e.target.value }))}
                                            placeholder={t.inspection.googleMapsPlaceholder}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pit Measurements Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.inspection.pitMeasurements}</CardTitle>
                                    <CardDescription>
                                        {t.inspection.pitMeasurementsDesc}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pitType">{t.inspection.pitType}</Label>
                                        <Select
                                            value={formData.pitType}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, pitType: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t.inspection.selectPitType} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Concrete">{t.inspection.concrete}</SelectItem>
                                                <SelectItem value="Brick">{t.inspection.brick}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="pitWidth">{t.inspection.shaftWidth}</Label>
                                            <Input
                                                id="pitWidth"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.pitWidth || ""}
                                                onChange={(e) => setFormData(prev => ({ ...prev, pitWidth: parseFloat(e.target.value) || 0 }))}
                                                placeholder={t.inspection.placeholderValue}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pitDepth">{t.inspection.shaftDepth}</Label>
                                            <Input
                                                id="pitDepth"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.pitDepth || ""}
                                                onChange={(e) => setFormData(prev => ({ ...prev, pitDepth: parseFloat(e.target.value) || 0 }))}
                                                placeholder={t.inspection.placeholderValue}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastFloorHeight">{t.inspection.overHead}</Label>
                                            <Input
                                                id="lastFloorHeight"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.lastFloorHeight || ""}
                                                onChange={(e) => setFormData(prev => ({ ...prev, lastFloorHeight: parseFloat(e.target.value) || 0 }))}
                                                placeholder={t.inspection.placeholderValue}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="holeDepth">{t.inspection.pitDepth}</Label>
                                            <Input
                                                id="holeDepth"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.holeDepth || ""}
                                                onChange={(e) => setFormData(prev => ({ ...prev, holeDepth: parseFloat(e.target.value) || 0 }))}
                                                placeholder={t.inspection.placeholderValue}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="travelLength">{t.inspection.totalTravel}</Label>
                                            <Input
                                                id="travelLength"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.travelLength || ""}
                                                onChange={(e) => setFormData(prev => ({ ...prev, travelLength: parseFloat(e.target.value) || 0 }))}
                                                placeholder={t.inspection.placeholderValue}
                                                required
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notes Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.inspection.additionalNotes}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder={t.inspection.notesPlaceholder}
                                        rows={4}
                                    />
                                </CardContent>
                            </Card>

                            {/* Submit Button */}
                            <div className="flex justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/inspection')}
                                >
                                    {t.inspection.cancel}
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t.inspection.creating}
                                        </>
                                    ) : (
                                        t.inspection.createProject
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
            <DemoGuidePanel
              title={t.demoGuide.inspection.title}
              description={t.demoGuide.inspection.description}
              features={[
                { icon: "🔍", label: t.inspection.customerSearch, description: t.inspection.customerSearchDesc },
                { icon: "📐", label: t.inspection.pitMeasurementsFeature, description: t.inspection.pitMeasurementsFeatureDesc },
                { icon: "📝", label: t.inspection.notesDetails, description: t.inspection.notesDetailsDesc },
              ]}
              tip={t.demoGuide.inspection.tip}
            />
        </SidebarProvider>
    )
}

