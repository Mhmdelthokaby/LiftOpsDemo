"use client"

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useEffect, useState } from "react"
import { getTechnicians, Technician, disableTechnician, deleteTechnician } from "@/lib/api"
import { canManageTechnicians as canManage } from "@/lib/user"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Search, Plus, Star, UserCheck, UserX, Edit, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "@/lib/i18n/context"

export default function TechniciansPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [technicianToDelete, setTechnicianToDelete] = useState<Technician | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        // Check if user can view technicians (Manager only)
        if (!canManage()) {
            toast.error(t.technicians.accessDenied)
            router.push("/")
            return
        }

        async function fetchData() {
            try {
                const data = await getTechnicians()
                setTechnicians(data)
            } catch (error: any) {
                console.error("Failed to load technicians", error)
                toast.error(t.technicians.errorLoading)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [router])

    const filteredTechnicians = technicians.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.specialization && t.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleToggleStatus = async (technicianId: string, currentStatus: boolean) => {
        try {
            await disableTechnician(technicianId, !currentStatus)
            toast.success(t.technicians.statusUpdated.replace("{action}", !currentStatus ? t.technicians.disabled : t.technicians.enabled))
            // Refresh the list
            const data = await getTechnicians()
            setTechnicians(data)
        } catch (error: any) {
            console.error("Failed to toggle technician status", error)
            toast.error(error?.message || t.technicians.statusUpdateError)
        }
    }

    const handleDeleteClick = (technician: Technician) => {
        setTechnicianToDelete(technician)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!technicianToDelete) return

        try {
            setDeleting(true)
            await deleteTechnician(technicianToDelete.id)
            toast.success(t.technicians.deleteSuccess)
            setDeleteDialogOpen(false)
            setTechnicianToDelete(null)
            // Refresh the list
            const data = await getTechnicians()
            setTechnicians(data)
        } catch (error: any) {
            console.error("Failed to delete technician", error)
            toast.error(error?.message || t.technicians.deleteError)
        } finally {
            setDeleting(false)
        }
    }

    const refreshTechnicians = async () => {
        try {
            const data = await getTechnicians()
            setTechnicians(data)
        } catch (error: any) {
            console.error("Failed to refresh technicians", error)
        }
    }

    const getStatusBadge = (technician: Technician) => {
        if (technician.isDisabled) {
            return <Badge variant="destructive">{t.technicians.inactive}</Badge>
        }
        if (technician.currentActiveElevatorsCount === 0) {
            return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t.technicians.available}</Badge>
        }
        if (technician.currentActiveElevatorsCount < 5) {
            return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t.technicians.active}</Badge>
        }
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{t.technicians.busy}</Badge>
    }

    if (loading) {
        return (
            <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col">
                        <AppHeader />
                        <main className="flex-1 p-6 text-center">{t.technicians.loading}</main>
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
                    <main className="flex-1 p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{t.technicians.title}</h1>
                                <p className="text-muted-foreground">{t.technicians.subtitle}</p>
                            </div>
                            {canManage() && (
                                <Link href="/technicians/new">
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t.technicians.addTechnician}
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{t.technicians.allTechnicians}</CardTitle>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder={t.technicians.searchTechnicians}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-8 w-64"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {filteredTechnicians.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        {searchTerm ? t.technicians.noTechniciansSearch : t.technicians.noTechnicians}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t.technicians.name}</TableHead>
                                                <TableHead>{t.technicians.phone}</TableHead>
                                                <TableHead>{t.technicians.specialization}</TableHead>
                                                <TableHead>{t.technicians.leader}</TableHead>
                                                <TableHead>{t.technicians.status}</TableHead>
                                                <TableHead>{t.technicians.rating}</TableHead>
                                                <TableHead>{t.technicians.actions}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTechnicians.map((technician) => (
                                                <TableRow key={technician.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {technician.isDisabled ? (
                                                                <UserX className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <UserCheck className="h-4 w-4 text-green-500" />
                                                            )}
                                                            {technician.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{technician.phone}</TableCell>
                                                    <TableCell>
                                                        {technician.specialization || (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {technician.isLeader ? (
                                                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t.technicians.leader}</Badge>
                                                        ) : technician.leaderName ? (
                                                            <span>{technician.leaderName}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(technician)}</TableCell>
                                                    <TableCell>
                                                        {technician.overallRating ? (
                                                            <div className="flex items-center gap-1">
                                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                                <span>{technician.overallRating.toFixed(1)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Link href={`/technicians/${technician.id}/edit`}>
                                                                <Button variant="outline" size="sm" title={t.technicians.editTechnician}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                title={t.technicians.deleteTechnician}
                                                                onClick={() => handleDeleteClick(technician)}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                            <div className="flex items-center gap-2">
                                                                <Switch
                                                                    checked={!technician.isDisabled}
                                                                    onCheckedChange={() => handleToggleStatus(technician.id, technician.isDisabled)}
                                                                    id={`status-${technician.id}`}
                                                                />
                                                                <Label 
                                                                    htmlFor={`status-${technician.id}`}
                                                                    className="text-sm cursor-pointer"
                                                                >
                                                                    {technician.isDisabled ? t.technicians.inactive : t.technicians.active}
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.technicians.areYouSure}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.technicians.deleteConfirm.replace("{name}", technicianToDelete?.name || "")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>{t.technicians.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? t.technicians.deleting : t.technicians.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

