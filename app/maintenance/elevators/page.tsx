"use client"

import { useState, useEffect } from "react"
import { getMaintenanceElevators, MaintenanceElevator, freezeElevator, stopElevator, activateElevator } from "@/lib/api"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { canViewMaintenance, canManageMaintenance } from "@/lib/user"
import { formatDate } from "@/lib/utils"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Building2, Calendar, Phone, Eye, Snowflake, Square, Play } from "lucide-react"
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

export default function MaintenanceElevatorsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [elevators, setElevators] = useState<MaintenanceElevator[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'freeze' | 'stop' | 'activate' | null; elevatorId: string | null }>({
    open: false,
    type: null,
    elevatorId: null
  })

  useEffect(() => {
    if (!canViewMaintenance()) {
      router.push('/')
      return
    }
    fetchElevators()
  }, [router])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchElevators()
      }
    }

    const handleFocus = () => {
      fetchElevators()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchElevators = async () => {
    try {
      setLoading(true)
      const data = await getMaintenanceElevators()
      setElevators(data || [])
    } catch (error: any) {
      console.error("Failed to fetch maintenance elevators", error)
      toast.error(error.message || t.maintenanceElevators.errorLoading)
    } finally {
      setLoading(false)
    }
  }

  const filteredElevators = elevators.filter(elevator => {
    const matchesSearch =
      elevator.elevatorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesStatus = true
    if (statusFilter !== "all") {
      matchesStatus = elevator.status.toLowerCase() === statusFilter.toLowerCase()
    }

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-success text-success-foreground"
      case "frozen":
        return "bg-warning text-warning-foreground"
      case "stopped":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }


  const canManage = canManageMaintenance()

  const openActionDialog = (type: 'freeze' | 'stop' | 'activate', elevatorId: string) => {
    setActionDialog({ open: true, type, elevatorId })
  }

  const closeActionDialog = () => {
    setActionDialog({ open: false, type: null, elevatorId: null })
  }

  const handleConfirmAction = async () => {
    if (!actionDialog.elevatorId || !actionDialog.type) return

    try {
      switch (actionDialog.type) {
        case 'freeze':
          await freezeElevator(actionDialog.elevatorId)
          toast.success(t.maintenanceElevators.freezeSuccess)
          break
        case 'stop':
          await stopElevator(actionDialog.elevatorId)
          toast.success(t.maintenanceElevators.stopSuccess)
          break
        case 'activate':
          await activateElevator(actionDialog.elevatorId)
          toast.success(t.maintenanceElevators.activateSuccess)
          break
      }
      closeActionDialog()
      fetchElevators()
    } catch (error: any) {
      toast.error(error.message || t.maintenanceElevators.actionError)
    }
  }

  const getActionDialogContent = () => {
    switch (actionDialog.type) {
      case 'freeze':
        return {
          title: t.maintenanceElevators.freezeTitle,
          description: t.maintenanceElevators.freezeDesc,
          confirmText: t.maintenanceElevators.freeze,
          variant: "default" as const
        }
      case 'stop':
        return {
          title: t.maintenanceElevators.stopTitle,
          description: t.maintenanceElevators.stopDesc,
          confirmText: t.maintenanceElevators.stop,
          variant: "destructive" as const
        }
      case 'activate':
        return {
          title: t.maintenanceElevators.activateTitle,
          description: t.maintenanceElevators.activateDesc,
          confirmText: t.maintenanceElevators.activate,
          variant: "default" as const
        }
      default:
        return {
          title: t.maintenanceElevators.confirmAction,
          description: t.maintenanceElevators.confirmDefault,
          confirmText: t.maintenanceElevators.confirmAction,
          variant: "default" as const
        }
    }
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
                <h1 className="text-3xl font-bold tracking-tight">{t.maintenance.elevatorFleet}</h1>
                <p className="text-muted-foreground">{t.maintenance.subtitle}</p>
              </div>
              <Button variant="outline" onClick={fetchElevators} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t.common.refresh}
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>{t.maintenanceElevators.totalElevators}</CardDescription>
                  <CardTitle className="text-2xl">{filteredElevators.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>{t.maintenanceElevators.active}</CardDescription>
                  <CardTitle className="text-2xl text-success">
                    {filteredElevators.filter(e => e.status.toLowerCase() === 'active').length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>{t.maintenanceElevators.frozen}</CardDescription>
                  <CardTitle className="text-2xl text-warning">
                    {filteredElevators.filter(e => e.status.toLowerCase() === 'frozen').length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>{t.maintenanceElevators.stopped}</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    {filteredElevators.filter(e => e.status.toLowerCase() === 'stopped').length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t.maintenanceElevators.allElevators}</CardTitle>
                    <CardDescription>
                      {t.maintenanceElevators.elevatorsFound({ count: filteredElevators.length })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t.maintenanceElevators.searchElevators}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">{t.maintenanceElevators.allStatus}</option>
                      <option value="active">{t.maintenanceElevators.active}</option>
                      <option value="frozen">{t.maintenanceElevators.frozen}</option>
                      <option value="stopped">{t.maintenanceElevators.stopped}</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredElevators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== "all" 
                      ? t.maintenanceElevators.noElevatorsFilter 
                      : t.maintenanceElevators.noElevators}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.maintenanceElevators.code}</TableHead>
                        <TableHead>{t.maintenanceElevators.customer}</TableHead>
                        <TableHead>{t.maintenanceElevators.project}</TableHead>
                        <TableHead>{t.maintenanceElevators.type}</TableHead>
                        <TableHead>{t.maintenanceElevators.stopsFloors}</TableHead>
                        <TableHead>{t.maintenanceElevators.nextMaintenance}</TableHead>
                        <TableHead>{t.maintenanceElevators.status}</TableHead>
                        <TableHead>{t.maintenanceElevators.source}</TableHead>
                        <TableHead>{t.maintenanceElevators.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredElevators.map((elevator) => (
                        <TableRow key={elevator.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium font-mono">
                            {elevator.elevatorCode}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{elevator.customerName}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {elevator.customerPhone}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{elevator.projectNumber || t.maintenanceElevators.nA}</span>
                          </TableCell>
                          <TableCell>{elevator.type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{elevator.numberOfStops} stops / {elevator.numberOfFloors} floors</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{elevator.nextMaintenanceDate ? formatDate(elevator.nextMaintenanceDate) : t.maintenanceElevators.notScheduled}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(elevator.status)}>
                              {elevator.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={elevator.isFromInstallation ? "default" : "outline"}>
                              {elevator.isFromInstallation ? t.maintenanceElevators.installation : t.maintenanceElevators.direct}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => router.push(`/maintenance/projects/${elevator.contractId}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t.maintenanceElevators.details}
                              </Button>
                              {canManage && (
                                <>
                                  {elevator.status.toLowerCase() === 'active' && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => openActionDialog('freeze', elevator.id)}
                                        className="text-warning hover:text-warning"
                                      >
                                        <Snowflake className="h-4 w-4 mr-1" />
                                        {t.maintenanceElevators.freeze}
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => openActionDialog('stop', elevator.id)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Square className="h-4 w-4 mr-1" />
                                        {t.maintenanceElevators.stop}
                                      </Button>
                                    </>
                                  )}
                                  {(elevator.status.toLowerCase() === 'frozen' || elevator.status.toLowerCase() === 'stopped') && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openActionDialog('activate', elevator.id)}
                                      className="text-success hover:text-success"
                                    >
                                        <Play className="h-4 w-4 mr-1" />
                                        {t.maintenanceElevators.activate}
                                    </Button>
                                  )}
                                </>
                              )}
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

      {/* Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeActionDialog}>{t.maintenanceElevators.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={actionDialog.type === 'stop' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {getActionDialogContent().confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DemoGuidePanel
        title={t.demoGuide.elevators.title}
        description={t.demoGuide.elevators.description}
        features={[
          { icon: "🔍", label: t.maintenanceElevators.searchFilter, description: t.maintenanceElevators.searchFilterDesc },
          { icon: "❄️", label: t.maintenanceElevators.freeze, description: t.maintenanceElevators.freezeDesc },
          { icon: "⏹️", label: t.maintenanceElevators.stop, description: t.maintenanceElevators.stopDesc },
          { icon: "▶️", label: t.maintenanceElevators.activate, description: t.maintenanceElevators.activateDesc },
        ]}
        tip={t.demoGuide.elevators.tip}
      />
    </SidebarProvider>
  )
}

