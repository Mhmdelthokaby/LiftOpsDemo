"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar, MapPin, User, Building2, DollarSign, RefreshCw, Search, Phone, Mail, Wrench, CheckCircle2, XCircle, TrendingUp, TrendingDown, Wallet, Download, UserPlus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { getMaintenanceProjects, MaintenanceContract, getVisitsByContractAndMonth, MaintenanceVisitListDto, getTechnicians, Technician, assignTechniciansToContractVisits, getMaintenanceStatistics, MaintenanceStatistics } from "@/lib/api"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { MonthlyMaintenanceDialog } from "@/components/maintenance/monthly-maintenance-dialog"
import * as XLSX from "xlsx"

const statusColors: Record<string, string> = {
  active: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
  frozen: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
}

export function MaintenanceList() {
  const [projects, setProjects] = useState<MaintenanceContract[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all") // Filter by project city
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1)
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
  const [maintenanceDoneFilter, setMaintenanceDoneFilter] = useState<string>("all") // "all", "done", "not-done"
  const [freePaidFilter, setFreePaidFilter] = useState<string>("all") // "all", "free", "paid"
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all") // "all", "paid", "unpaid"
  const [loading, setLoading] = useState(true)
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [contractVisits, setContractVisits] = useState<Record<string, MaintenanceVisitListDto[]>>({})
  const [selectedProject, setSelectedProject] = useState<MaintenanceContract | null>(null)
  const [maintenanceDialog, setMaintenanceDialog] = useState<{ open: boolean; contract: MaintenanceContract | null }>({
    open: false,
    contract: null
  })
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; contract: MaintenanceContract | null }>({
    open: false,
    contract: null
  })
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [assignmentNotes, setAssignmentNotes] = useState("")
  const [stats, setStats] = useState<MaintenanceStatistics>({
    totalMaintenanceTasks: 0,
    completedMaintenanceTasks: 0,
    totalMustCollect: 0,
    totalCollected: 0,
    totalNotCollected: 0,
    totalFreeProjects: 0,
    totalPaidProjects: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchTechnicians()
    fetchStatistics()
  }, [])

  useEffect(() => {
    fetchStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, yearFilter])

  const fetchTechnicians = async () => {
    try {
      const data = await getTechnicians()
      setTechnicians(data.filter(t => !t.isDisabled) || [])
    } catch (error: any) {
      console.error("Failed to fetch technicians", error)
    }
  }

  // Refresh projects when page becomes visible (e.g., when navigating back from creating a new contract)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProjects()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (projects.length > 0) {
      fetchVisitsForContracts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, monthFilter, yearFilter])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const data = await getMaintenanceProjects()
      setProjects(data || [])
    } catch (error: any) {
      console.error("Failed to fetch maintenance projects", error)
      toast.error(error.message || "Failed to fetch maintenance projects")
    } finally {
      setLoading(false)
    }
  }

  const fetchVisitsForContracts = async () => {
    if (projects.length === 0) return

    try {
      setVisitsLoading(true)
      const visitsMap: Record<string, MaintenanceVisitListDto[]> = {}

      // Fetch visits for each contract in parallel
      const visitPromises = projects.map(async (project) => {
        try {
          const visits = await getVisitsByContractAndMonth(project.id, monthFilter, yearFilter)
          visitsMap[project.id] = visits || []
        } catch (error: any) {
          console.error(`Failed to fetch visits for contract ${project.id}:`, error)
          visitsMap[project.id] = []
        }
      })

      await Promise.all(visitPromises)
      setContractVisits(visitsMap)
    } catch (error: any) {
      console.error("Failed to fetch visits", error)
      toast.error(error.message || "Failed to fetch maintenance visits")
    } finally {
      setVisitsLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true)
      const statistics = await getMaintenanceStatistics(monthFilter, yearFilter)
      setStats(statistics)
    } catch (error: any) {
      console.error("Failed to fetch statistics", error)
      toast.error(error.message || "Failed to fetch maintenance statistics")
    } finally {
      setStatsLoading(false)
    }
  }

  // Get maintenance status for a contract based on visits - ALL elevators must be done
  const getMaintenanceStatus = (contractId: string, elevatorCount: number): { hasDone: boolean; hasPending: boolean } => {
    const visits = contractVisits[contractId] || []

    if (visits.length === 0) {
      return { hasDone: false, hasPending: false }
    }

    // Group visits by elevatorId and check if each elevator has at least one "Done" visit
    const elevatorsWithDoneVisits = new Set<string>()
    const elevatorsWithPendingVisits = new Set<string>()

    visits.forEach(visit => {
      if (visit.status.toLowerCase() === "done") {
        elevatorsWithDoneVisits.add(visit.elevatorId)
      } else {
        elevatorsWithPendingVisits.add(visit.elevatorId)
      }
    })

    // Project is "Done" only if ALL elevators have completed maintenance
    const hasDone = elevatorsWithDoneVisits.size === elevatorCount && elevatorCount > 0
    // Project has pending if there are any pending visits OR not all elevators are done
    const hasPending = elevatorsWithPendingVisits.size > 0 || elevatorsWithDoneVisits.size < elevatorCount

    return { hasDone, hasPending }
  }

  // Check if contract has assigned technicians for TODAY ONLY
  // This ensures that incomplete visits from previous days don't block reassignment
  // Only visits scheduled for today's date will show as "Assigned"
  const isAssignedToday = (contractId: string): { isAssigned: boolean; technicianIds: string[]; notes: string } => {
    const visits = contractVisits[contractId] || []
    const today = new Date()
    const todayDateStr = today.toISOString().split('T')[0]
    const todayMonth = today.getMonth() + 1
    const todayYear = today.getFullYear()
    
    // Only check if we're viewing the current month/year, otherwise return false
    // This prevents showing "Assigned" status when viewing different months
    if (monthFilter !== todayMonth || yearFilter !== todayYear) {
      return { isAssigned: false, technicianIds: [], notes: "" }
    }
    
    // Filter visits for TODAY ONLY - visits from previous days are ignored
    // This allows incomplete visits from yesterday to be reassigned today
    const todayVisits = visits.filter(visit => {
      let visitDateStr: string
      if (typeof visit.visitDate === 'string') {
        // Handle ISO string format
        visitDateStr = visit.visitDate.split('T')[0]
      } else {
        visitDateStr = new Date(visit.visitDate).toISOString().split('T')[0]
      }
      // Only consider visits scheduled for today's date
      return visitDateStr === todayDateStr
    })

    // If no visits exist for today, it's not assigned
    if (todayVisits.length === 0) {
      return { isAssigned: false, technicianIds: [], notes: "" }
    }

    // Check if any TODAY'S visit has a technician assigned
    // Note: Incomplete visits from previous days won't affect this check
    const assignedTechnicianIds = new Set<string>()
    let assignmentNotes = ""

    todayVisits.forEach(visit => {
      // Check both technicianId formats (string or undefined)
      if (visit.technicianId && visit.technicianId.toString().trim() !== '') {
        assignedTechnicianIds.add(visit.technicianId.toString())
      }
      // Get notes from first visit (assuming all visits have same notes when assigned together)
      if (visit.notes && visit.notes.trim() && !assignmentNotes) {
        assignmentNotes = visit.notes
      }
    })

    return {
      isAssigned: assignedTechnicianIds.size > 0,
      technicianIds: Array.from(assignedTechnicianIds),
      notes: assignmentNotes
    }
  }

  // Get payment status for a contract based on visits - ALL elevators' visits must be paid
  const getPaymentStatus = (contractId: string): { allPaid: boolean; hasUnpaid: boolean } => {
    const visits = contractVisits[contractId] || []
    if (visits.length === 0) return { allPaid: false, hasUnpaid: false }

    // Group visits by elevatorId
    const visitsByElevator = new Map<string, MaintenanceVisitListDto[]>()
    visits.forEach(visit => {
      if (!visitsByElevator.has(visit.elevatorId)) {
        visitsByElevator.set(visit.elevatorId, [])
      }
      visitsByElevator.get(visit.elevatorId)!.push(visit)
    })

    // Check if ALL elevators have ALL their visits paid
    let allElevatorsPaid = true
    let hasUnpaidElevator = false

    visitsByElevator.forEach((elevatorVisits) => {
      const allVisitsPaid = elevatorVisits.every(v => v.isPaid)
      if (!allVisitsPaid) {
        allElevatorsPaid = false
        hasUnpaidElevator = true
      }
    })

    return { allPaid: allElevatorsPaid, hasUnpaid: hasUnpaidElevator }
  }

  // Check if project is in free maintenance period for a specific month/year
  const isFreeMaintenanceForMonth = (project: MaintenanceContract, month: number, year: number): boolean => {
    if (project.freeMonths <= 0) return false

    const startDate = new Date(project.startDate)
    const targetDate = new Date(year, month - 1, 1) // First day of target month

    // Calculate months elapsed since start date up to target month
    const yearDiff = targetDate.getFullYear() - startDate.getFullYear()
    const monthDiff = targetDate.getMonth() - startDate.getMonth()
    let monthsElapsed = (yearDiff * 12) + monthDiff

    // Project is in free maintenance if months elapsed < free months
    return monthsElapsed < project.freeMonths
  }

  // Check if project is in free maintenance period (current date)
  const isFreeMaintenance = (project: MaintenanceContract): boolean => {
    const currentDate = new Date()
    return isFreeMaintenanceForMonth(project, currentDate.getMonth() + 1, currentDate.getFullYear())
  }

  // Get unique cities from projects (project city or customer city fallback)
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>()
    projects.forEach(project => {
      const projectCity = project.city || project.customerCity || "القاهرة الجديدة"
      if (projectCity && projectCity.trim() !== "") {
        cities.add(projectCity)
      }
    })
    return Array.from(cities).sort()
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const searchLower = searchTerm.toLowerCase()
      // Get project code (project number or fallback to generated code)
      const projectCode = (project.projectNumber && project.projectNumber.trim() !== "")
        ? project.projectNumber.toLowerCase()
        : `M-${project.id.substring(0, 8).toUpperCase()}`.toLowerCase()

      const matchesSearch =
        project.customerName.toLowerCase().includes(searchLower) ||
        projectCode.includes(searchLower)

      let matchesStatus = true
      if (statusFilter !== "all") {
        matchesStatus = project.status.toLowerCase() === statusFilter.toLowerCase()
      }

      // Filter by project city (use project city or fallback to customer city)
      let matchesCity = true
      if (cityFilter !== "all") {
        const projectCity = project.city || project.customerCity || "القاهرة الجديدة"
        matchesCity = projectCity === cityFilter
      }

      // Filter by maintenance done status
      let matchesMaintenanceDone = true
      if (maintenanceDoneFilter !== "all") {
        const { hasDone, hasPending } = getMaintenanceStatus(project.id, project.elevatorCount)
        if (maintenanceDoneFilter === "done") {
          matchesMaintenanceDone = hasDone
        } else if (maintenanceDoneFilter === "not-done") {
          matchesMaintenanceDone = hasPending && !hasDone
        }
      }

      // Filter by free/paid contract
      let matchesFreePaid = true
      if (freePaidFilter !== "all") {
        if (freePaidFilter === "free") {
          matchesFreePaid = project.pricePerMonth === 0
        } else if (freePaidFilter === "paid") {
          matchesFreePaid = project.pricePerMonth > 0
        }
      }

      // Filter by payment status
      let matchesPaymentStatus = true
      if (paymentStatusFilter !== "all") {
        const { allPaid, hasUnpaid } = getPaymentStatus(project.id)
        if (paymentStatusFilter === "paid") {
          matchesPaymentStatus = allPaid && contractVisits[project.id]?.length > 0
        } else if (paymentStatusFilter === "unpaid") {
          matchesPaymentStatus = hasUnpaid
        }
      }

      return matchesSearch && matchesStatus && matchesCity && matchesMaintenanceDone && matchesFreePaid && matchesPaymentStatus
    })
  }, [projects, searchTerm, statusFilter, cityFilter, maintenanceDoneFilter, freePaidFilter, paymentStatusFilter, contractVisits])


  const formatCurrency = (amount: number) => {
    if (amount === 0) return "Free"
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  // Statistics are now fetched from backend - no need to calculate here

  const getProjectNumberDisplay = (project: MaintenanceContract) => {
    if (project.projectNumber && project.projectNumber.trim() !== "") {
      return project.projectNumber
    }
    return `M-${project.id.substring(0, 8).toUpperCase()}`
  }

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredProjects.map((project) => {
        const { hasDone, hasPending } = getMaintenanceStatus(project.id, project.elevatorCount)
        const { allPaid, hasUnpaid } = getPaymentStatus(project.id)
        
        const maintenanceStatus = hasDone ? "Done" : hasPending ? "Pending" : "No Visits"
        
        // Check if project is in free maintenance period for the selected month/year
        const isInFreePeriod = isFreeMaintenanceForMonth(project, monthFilter, yearFilter)
        const paymentStatus = isInFreePeriod
          ? "Free" 
          : contractVisits[project.id]?.length > 0
            ? (allPaid ? "Paid" : hasUnpaid ? "Unpaid" : "N/A")
            : "N/A"
        
        const paidOrFree = project.pricePerMonth === 0 ? "Free" : "Paid"
        const projectAddress = project.projectAddress || project.customerAddress || ""
        const fullAddress = projectAddress + (project.city ? `, ${project.city}` : project.customerCity ? `, ${project.customerCity}` : "")
        
        return {
          "Client Name": project.customerName,
          "Project Name": getProjectNumberDisplay(project),
          "Phone": project.customerPhone,
          "Address of Project": fullAddress,
          "Client of Project": project.customerName,
          "Paid or Free": paidOrFree,
          "Number of Free Months": project.freeMonths,
          "Maintenance Status": maintenanceStatus,
          "Payment Status": paymentStatus,
        }
      })

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Maintenance Projects")

      // Generate filename with current date
      const dateStr = new Date().toISOString().split('T')[0]
      const monthName = new Date(yearFilter, monthFilter - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      const filename = `Maintenance_Projects_${monthName.replace(' ', '_')}_${dateStr}.xlsx`

      // Write file
      XLSX.writeFile(wb, filename)
      
      toast.success(`Exported ${exportData.length} projects to Excel`)
    } catch (error: any) {
      console.error("Failed to export to Excel", error)
      toast.error(error.message || "Failed to export to Excel")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Maintenance Projects</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by project name or code..."
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
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="frozen">Frozen</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <select
                value={maintenanceDoneFilter}
                onChange={(e) => setMaintenanceDoneFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Maintenance</option>
                <option value="done">Done</option>
                <option value="not-done">Not Done</option>
              </select>
              <select
                value={freePaidFilter}
                onChange={(e) => setFreePaidFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Contracts</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="icon" onClick={() => { fetchProjects(); fetchVisitsForContracts(); fetchStatistics(); }} disabled={loading || visitsLoading || statsLoading}>
                <RefreshCw className={`h-4 w-4 ${loading || visitsLoading || statsLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" onClick={exportToExcel} disabled={filteredProjects.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Maintenace Done</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.completedMaintenanceTasks} / {stats.totalMaintenanceTasks}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalMaintenanceTasks > 0
                    ? `${((stats.completedMaintenanceTasks / stats.totalMaintenanceTasks) * 100).toFixed(1)}% completed`
                    : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Must Collect</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.totalMustCollect)} EGP
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(yearFilter, monthFilter - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold mt-1 text-success">
                  {formatCurrency(stats.totalCollected)} EGP
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalMustCollect > 0
                    ? `${((stats.totalCollected / stats.totalMustCollect) * 100).toFixed(1)}% collected`
                    : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Not Collected</p>
                <p className="text-2xl font-bold mt-1 text-destructive">
                  {formatCurrency(stats.totalNotCollected)} EGP
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalMustCollect > 0
                    ? `${((stats.totalNotCollected / stats.totalMustCollect) * 100).toFixed(1)}% pending`
                    : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Free Projects</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalFreeProjects}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {projects.length > 0
                    ? `${((stats.totalFreeProjects / projects.length) * 100).toFixed(1)}% of total`
                    : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid Projects</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalPaidProjects}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {projects.length > 0
                    ? `${((stats.totalPaidProjects / projects.length) * 100).toFixed(1)}% of total`
                    : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm || statusFilter !== "all" || cityFilter !== "all" || maintenanceDoneFilter !== "all" || freePaidFilter !== "all" || paymentStatusFilter !== "all"
              ? "No projects match your filters"
              : "No maintenance projects found"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{project.customerName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground font-mono">
                          Project: {getProjectNumberDisplay(project)}
                        </p>
                        {isFreeMaintenance(project) ? (
                          <Badge className="bg-success text-success-foreground text-xs">
                            Free Maintenance
                          </Badge>
                        ) : project.freeMonths > 0 ? (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            Free Period Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            Paid Maintenance
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={statusColors[project.status.toLowerCase()] || "bg-muted text-muted-foreground"}>
                      {project.status}
                    </Badge>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{project.customerPhone}</span>
                    </div>
                    {project.customerEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{project.customerEmail}</span>
                      </div>
                    )}
                    {(project.projectAddress || project.customerAddress) && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {project.projectAddress || project.customerAddress}
                          {project.city && `, ${project.city}`}
                          {!project.city && project.customerCity && `, ${project.customerCity}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Start: {formatDate(project.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>End: {formatDate(project.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{project.elevatorCount} elevator{project.elevatorCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(project.pricePerMonth)}/month</span>
                    </div>
                    {project.technicianName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-primary">{project.technicianName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Free Months:</span>
                      <Badge variant="outline">{project.freeMonths}</Badge>
                    </div>
                  </div>

                  {/* Maintenance Status and Payment Status */}
                  {(() => {
                    const visits = contractVisits[project.id] || []
                    const { hasDone, hasPending } = getMaintenanceStatus(project.id, project.elevatorCount)
                    const { allPaid, hasUnpaid } = getPaymentStatus(project.id)
                    const maintenanceStatus = hasDone ? "Done" : hasPending ? "Pending" : "No Visits"

                    // Determine payment status - if project is in free maintenance, show "Free"
                    let paymentStatus: string
                    let paymentBadgeVariant: "default" | "secondary" | "destructive" | "outline"
                    let paymentIcon: React.ReactNode = null

                    if (isFreeMaintenance(project)) {
                      paymentStatus = "Free"
                      paymentBadgeVariant = "default"
                    } else if (visits.length > 0) {
                      if (allPaid) {
                        paymentStatus = "Paid"
                        paymentBadgeVariant = "default"
                        paymentIcon = <CheckCircle2 className="h-3 w-3" />
                      } else if (hasUnpaid) {
                        paymentStatus = "Unpaid"
                        paymentBadgeVariant = "destructive"
                        paymentIcon = <XCircle className="h-3 w-3" />
                      } else {
                        paymentStatus = "N/A"
                        paymentBadgeVariant = "outline"
                      }
                    } else {
                      paymentStatus = "N/A"
                      paymentBadgeVariant = "outline"
                    }

                    return (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Maintenance:</span>
                          <Badge variant={hasDone ? "default" : hasPending ? "secondary" : "outline"} className="flex items-center gap-1">
                            {hasDone && <CheckCircle2 className="h-3 w-3" />}
                            {!hasDone && hasPending && <XCircle className="h-3 w-3" />}
                            {maintenanceStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Payment:</span>
                          <Badge variant={paymentBadgeVariant} className="flex items-center gap-1">
                            {paymentIcon}
                            {paymentStatus}
                          </Badge>
                        </div>
                        <Badge variant={project.isFromInstallation ? "default" : "outline"}>
                          {project.isFromInstallation ? "From Installation" : "Direct Entry"}
                        </Badge>
                      </div>
                    )
                  })()}
                </div>

                <div className="flex flex-col gap-2">
                  {project.status.toLowerCase() === 'active' && (() => {
                    const { hasDone } = getMaintenanceStatus(project.id, project.elevatorCount)
                    const isDoneThisMonth = hasDone
                    const { isAssigned, technicianIds: assignedTechnicianIds, notes: existingNotes } = isAssignedToday(project.id)
                    
                    return (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setMaintenanceDialog({ open: true, contract: project })}
                          className="bg-primary text-primary-foreground"
                          disabled={isDoneThisMonth}
                          title={isDoneThisMonth ? "Maintenance already completed for this month" : ""}
                        >
                          <Wrench className="h-4 w-4 mr-1" />
                          Maintenance
                        </Button>
                        {isAssigned && (
                          <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-200">
                            Assigned
                          </Badge>
                        )}
                        <Button
                          variant={isAssigned ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setAssignDialog({ open: true, contract: project })
                            if (isAssigned) {
                              // Pre-populate with existing assignment
                              setSelectedTechnicianIds(assignedTechnicianIds)
                              setAssignmentNotes(existingNotes)
                            } else {
                              setSelectedTechnicianIds([])
                              setAssignmentNotes("")
                            }
                            fetchTechnicians()
                          }}
                          className={isAssigned ? "w-full bg-blue-600 hover:bg-blue-700" : "w-full"}
                        >
                          {isAssigned ? (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Edit Assigned
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign Technician
                            </>
                          )}
                        </Button>
                      </>
                    )
                  })()}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedProject(project)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Project Details - {getProjectNumberDisplay(project)}</DialogTitle>
                      </DialogHeader>
                      {selectedProject && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Project Number</label>
                              <p className="font-mono font-medium">{getProjectNumberDisplay(selectedProject)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Status</label>
                              <Badge className={statusColors[selectedProject.status.toLowerCase()] || "bg-muted text-muted-foreground"}>
                                {selectedProject.status}
                              </Badge>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Source</label>
                              <Badge variant={selectedProject.isFromInstallation ? "default" : "outline"}>
                                {selectedProject.isFromInstallation ? "From Installation" : "Direct Entry"}
                              </Badge>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Elevators</label>
                              <p>{selectedProject.elevatorCount}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Price/Month</label>
                              <p>{formatCurrency(selectedProject.pricePerMonth)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Free Months</label>
                              <p>{selectedProject.freeMonths}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                              <p>{formatDate(selectedProject.startDate)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">End Date</label>
                              <p>{formatDate(selectedProject.endDate)}</p>
                            </div>
                            {selectedProject.technicianName && (
                              <div className="col-span-2">
                                <label className="text-sm font-medium text-muted-foreground">Main Responsible Technician</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <User className="h-4 w-4 text-primary" />
                                  <span className="font-semibold text-primary">{selectedProject.technicianName}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Customer Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <p>{selectedProject.customerName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  Phone
                                </label>
                                <p>{selectedProject.customerPhone}</p>
                              </div>
                              {selectedProject.customerEmail && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Email
                                  </label>
                                  <p>{selectedProject.customerEmail}</p>
                                </div>
                              )}
                              {(selectedProject.projectAddress || selectedProject.customerAddress) && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Project Address
                                  </label>
                                  <p>{selectedProject.projectAddress || selectedProject.customerAddress}</p>
                                  {selectedProject.city && <p className="text-sm text-muted-foreground mt-1">City: {selectedProject.city}</p>}
                                  {!selectedProject.city && selectedProject.customerCity && <p className="text-sm text-muted-foreground mt-1">City: {selectedProject.customerCity}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Link href={`/maintenance/projects/${project.id}`}>
                    <Button variant="ghost" size="sm" className="w-full">
                      View Project
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Monthly Maintenance Dialog */}
      {maintenanceDialog.contract && (
        <MonthlyMaintenanceDialog
          contractId={maintenanceDialog.contract.id}
          projectNumber={maintenanceDialog.contract.projectNumber || `M-${maintenanceDialog.contract.id.substring(0, 8).toUpperCase()}`}
          pricePerMonth={maintenanceDialog.contract.pricePerMonth}
          freeMonths={maintenanceDialog.contract.freeMonths}
          isOpen={maintenanceDialog.open}
          onClose={() => setMaintenanceDialog({ open: false, contract: null })}
          onSuccess={() => {
            fetchProjects()
            fetchVisitsForContracts()
            setMaintenanceDialog({ open: false, contract: null })
          }}
        />
      )}

      {/* Assign Technicians Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => setAssignDialog({ open, contract: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Technicians to Maintenance Visits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assignDialog.contract && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Project: {assignDialog.contract.projectNumber}</p>
                <p className="text-sm text-muted-foreground">Customer: {assignDialog.contract.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  Date: {formatDate(new Date().toISOString())} (Today)
                </p>
                <p className="text-sm text-muted-foreground">
                  Elevators: {assignDialog.contract.elevatorCount}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Technicians (one or more)</label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                {technicians.map((tech) => (
                  <div key={tech.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`tech-${tech.id}`}
                      checked={selectedTechnicianIds.includes(tech.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTechnicianIds([...selectedTechnicianIds, tech.id])
                        } else {
                          setSelectedTechnicianIds(selectedTechnicianIds.filter(id => id !== tech.id))
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`tech-${tech.id}`} className="text-sm cursor-pointer flex-1">
                      {tech.name} {tech.specialization ? `(${tech.specialization})` : ''}
                    </label>
                  </div>
                ))}
                {technicians.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No technicians available</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignmentNotes">Notes for Visit</Label>
              <Textarea
                id="assignmentNotes"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Enter notes for the technician about this visit..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These notes will be visible to the technician when they view their assigned visits.
              </p>
            </div>
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800">
                Note: Technicians will be assigned to maintenance visits for today. Each technician can only complete one maintenance visit per elevator per month.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, contract: null })}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!assignDialog.contract || selectedTechnicianIds.length === 0) {
                  toast.error("Please select at least one technician")
                  return
                }

                try {
                  setAssigning(true)
                  await assignTechniciansToContractVisits({
                    contractId: assignDialog.contract.id,
                    technicianIds: selectedTechnicianIds,
                    assignmentDate: new Date().toISOString().split('T')[0],
                    notes: assignmentNotes.trim() || undefined
                  })
                  toast.success("Technicians assigned successfully")
                  setAssignDialog({ open: false, contract: null })
                  setSelectedTechnicianIds([])
                  setAssignmentNotes("")
                  // Ensure we're viewing current month/year to see the assignment
                  const today = new Date()
                  const currentMonth = today.getMonth() + 1
                  const currentYear = today.getFullYear()
                  if (monthFilter !== currentMonth || yearFilter !== currentYear) {
                    setMonthFilter(currentMonth)
                    setYearFilter(currentYear)
                  }
                  // Refresh data
                  await fetchProjects()
                  await fetchVisitsForContracts()
                } catch (error: any) {
                  toast.error(error.message || "Failed to assign technicians")
                } finally {
                  setAssigning(false)
                }
              }}
              disabled={selectedTechnicianIds.length === 0 || assigning}
            >
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
