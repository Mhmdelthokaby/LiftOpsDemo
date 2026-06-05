"use client"

import React, { useState, useEffect, useMemo } from "react"
import { getMaintenanceProjects, MaintenanceContract, freezeContract, stopContract, activateContract, getMaintenanceElevators, MaintenanceElevator } from "@/lib/api"
import { canManageMaintenance, canViewMaintenance } from "@/lib/user"
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
import { Plus, Search, RefreshCw, Building2, DollarSign, Users, ArrowRight, Phone, Mail, MapPin, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { MonthlyMaintenanceHistory } from "@/components/maintenance/monthly-maintenance-history"

export function MaintenanceProjectsView() {
  const router = useRouter()
  const [projects, setProjects] = useState<MaintenanceContract[]>([])
  const [elevators, setElevators] = useState<MaintenanceElevator[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'freeze' | 'stop' | 'activate' | null; contractId: string | null }>({
    open: false,
    type: null,
    contractId: null
  })

  useEffect(() => {
    if (!canViewMaintenance()) {
      router.push('/')
      return
    }
    fetchProjects()
  }, [router])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProjects()
      }
    }

    const handleFocus = () => {
      fetchProjects()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const [projectsData, elevatorsData] = await Promise.all([
        getMaintenanceProjects(),
        getMaintenanceElevators()
      ])
      setProjects(projectsData || [])
      setElevators(elevatorsData || [])
    } catch (error: any) {
      console.error("Failed to fetch maintenance data", error)
      toast.error(error.message || "Failed to fetch maintenance data")
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Group projects by customer
  const projectsByCustomer = useMemo(() => {
    const grouped = new Map<string, MaintenanceContract[]>()
    
    filteredProjects.forEach(project => {
      const key = project.customerId
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(project)
    })
    
    return Array.from(grouped.entries()).map(([customerId, customerProjects]) => {
      const firstProject = customerProjects[0]
      const totalElevators = customerProjects.reduce((sum, p) => sum + p.elevatorCount, 0)
      
      return {
        customerId,
        customerName: firstProject.customerName,
        customerPhone: firstProject.customerPhone,
        customerEmail: firstProject.customerEmail,
        customerAddress: firstProject.customerAddress,
        customerCity: firstProject.customerCity,
        projects: customerProjects,
        totalProjects: customerProjects.length,
        totalElevators,
      }
    })
  }, [filteredProjects])

  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())

  const toggleCustomer = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers)
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId)
    } else {
      newExpanded.add(customerId)
    }
    setExpandedCustomers(newExpanded)
  }

  // Check if project is in free maintenance period
  const isFreeMaintenance = (project: MaintenanceContract): boolean => {
    if (project.freeMonths <= 0) return false
    
    // Calculate months elapsed since start date
    const startDate = new Date(project.startDate)
    const currentDate = new Date()
    
    const yearDiff = currentDate.getFullYear() - startDate.getFullYear()
    const monthDiff = currentDate.getMonth() - startDate.getMonth()
    let monthsElapsed = (yearDiff * 12) + monthDiff
    
    // If the day of current date is before the day of start date, we haven't completed a full month yet
    if (currentDate.getDate() < startDate.getDate()) {
      monthsElapsed--
    }
    
    // Project is in free maintenance if months elapsed < free months
    return monthsElapsed < project.freeMonths
  }

  const canManage = canManageMaintenance()

  const openActionDialog = (type: 'freeze' | 'stop' | 'activate', contractId: string) => {
    setActionDialog({ open: true, type, contractId })
  }

  const closeActionDialog = () => {
    setActionDialog({ open: false, type: null, contractId: null })
  }

  const handleConfirmAction = async () => {
    if (!actionDialog.contractId || !actionDialog.type) return

    try {
      switch (actionDialog.type) {
        case 'freeze':
          await freezeContract(actionDialog.contractId)
          toast.success("Project frozen successfully")
          break
        case 'stop':
          await stopContract(actionDialog.contractId)
          toast.success("Project stopped successfully")
          break
        case 'activate':
          await activateContract(actionDialog.contractId)
          toast.success("Project activated successfully")
          break
      }
      closeActionDialog()
      fetchProjects()
    } catch (error: any) {
      toast.error(error.message || `Failed to ${actionDialog.type} project`)
    }
  }

  const getActionDialogContent = () => {
    switch (actionDialog.type) {
      case 'freeze':
        return {
          title: "Freeze Project",
          description: "Are you sure you want to freeze this project? Maintenance will be paused until reactivated.",
          confirmText: "Freeze",
          variant: "default" as const
        }
      case 'stop':
        return {
          title: "Stop Project",
          description: "Are you sure you want to stop this project? This action will permanently stop maintenance for this project.",
          confirmText: "Stop",
          variant: "destructive" as const
        }
      case 'activate':
        return {
          title: "Activate Project",
          description: "Are you sure you want to activate this project? Maintenance will resume for this project.",
          confirmText: "Activate",
          variant: "default" as const
        }
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          variant: "default" as const
        }
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Projects</h1>
          <p className="text-muted-foreground">Manage maintenance contracts and projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchProjects} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManage && (
            <Link href="/maintenance/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {(() => {
        const totalCount = elevators.length
        const activeCount = elevators.filter(e => e.status.toLowerCase() === 'active').length
        const frozenCount = elevators.filter(e => e.status.toLowerCase() === 'frozen').length
        const stoppedCount = elevators.filter(e => e.status.toLowerCase() === 'stopped').length
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Elevators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{activeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Frozen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{frozenCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Stopped</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stoppedCount}</div>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Maintenance Projects by Customer</CardTitle>
              <CardDescription>
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} across {projectsByCustomer.length} customer{projectsByCustomer.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : projectsByCustomer.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm 
                ? "No projects match your search" 
                : "No maintenance projects found"}
            </div>
          ) : (
            <div className="space-y-4">
              {projectsByCustomer.map((customerGroup) => {
                const isExpanded = expandedCustomers.has(customerGroup.customerId)
                
                return (
                  <Collapsible
                    key={customerGroup.customerId}
                    open={isExpanded}
                    onOpenChange={() => toggleCustomer(customerGroup.customerId)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-lg">{customerGroup.customerName}</CardTitle>
                                  <CardDescription className="flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {customerGroup.customerPhone}
                                    </span>
                                    {customerGroup.customerEmail && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {customerGroup.customerEmail}
                                      </span>
                                    )}
                                    {customerGroup.customerAddress && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {customerGroup.customerAddress}
                                        {customerGroup.customerCity && `, ${customerGroup.customerCity}`}
                                      </span>
                                    )}
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Projects</div>
                                <div className="text-lg font-semibold">{customerGroup.totalProjects}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Elevators</div>
                                <div className="text-lg font-semibold">{customerGroup.totalElevators}</div>
                              </div>
                              <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Project Number</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Elevators</TableHead>
                                <TableHead>Price/Month</TableHead>
                                <TableHead>Free Months</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerGroup.projects.map((project) => {

                                const formatCurrency = (amount: number) => {
                                  if (amount === 0) return "Free"
                                  return amount.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                  })
                                }

                                const getProjectNumberDisplay = () => {
                                  if (project.projectNumber && project.projectNumber.trim() !== "") {
                                    return project.projectNumber
                                  }
                                  // Generate a display number from ID if project number is missing
                                  return `M-${project.id.substring(0, 8).toUpperCase()}`
                                }

                                return (
                                  <React.Fragment key={project.id}>
                                    <TableRow className="hover:bg-muted/50">
                                      <TableCell className="font-medium">
                                        <div className="flex flex-col gap-1">
                                          <span className="font-mono text-sm">{getProjectNumberDisplay()}</span>
                                          {isFreeMaintenance(project) ? (
                                            <Badge className="bg-success text-success-foreground text-xs w-fit">
                                              Free Maintenance
                                            </Badge>
                                          ) : project.freeMonths > 0 ? (
                                            <Badge variant="outline" className="text-muted-foreground text-xs w-fit">
                                              Free Period Expired
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-muted-foreground text-xs w-fit">
                                              Paid Maintenance
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={project.isFromInstallation ? "default" : "outline"}>
                                          {project.isFromInstallation ? "Installation" : "Direct"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <Building2 className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{project.elevatorCount}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                                          <span>{formatCurrency(project.pricePerMonth)}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="font-medium">
                                          {project.freeMonths} {project.freeMonths === 1 ? 'month' : 'months'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => router.push(`/maintenance/projects/${project.id}`)}
                                            className="text-primary hover:text-primary"
                                          >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View All Details
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell colSpan={6} className="p-0">
                                        <MonthlyMaintenanceHistory contract={project} />
                                      </TableCell>
                                    </TableRow>
                                  </React.Fragment>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogCancel onClick={closeActionDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={actionDialog.type === 'stop' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {getActionDialogContent().confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
