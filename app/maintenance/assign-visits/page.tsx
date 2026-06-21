"use client"

import React, { useState, useEffect } from "react"
import { getMonthlySchedule, assignVisitToTechnician, getTechnicians, Technician, MaintenanceVisitListItem } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, User, RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { canManageMaintenance } from "@/lib/user"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { useRouter } from "next/navigation"

export default function AssignVisitsPage() {
  const router = useRouter()
  const [visits, setVisits] = useState<MaintenanceVisitListItem[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; visit: MaintenanceVisitListItem | null }>({
    open: false,
    visit: null
  })
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!canManageMaintenance()) {
      router.push('/')
      return
    }
    fetchData()
  }, [router])

  useEffect(() => {
    if (selectedDate) {
      fetchVisits()
    }
  }, [selectedDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [techsData] = await Promise.all([
        getTechnicians()
      ])
      setTechnicians(techsData || [])
      await fetchVisits()
    } catch (error: any) {
      console.error("Failed to fetch data", error)
      toast.error(error.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const fetchVisits = async () => {
    try {
      const month = selectedDate.getMonth() + 1
      const year = selectedDate.getFullYear()
      const visitsData = await getMonthlySchedule(month, year)
      
      // Filter visits for the selected date
      const dateStr = selectedDate.toISOString().split('T')[0]
      const filteredVisits = (visitsData || []).filter(v => {
        const visitDateStr = new Date(v.visitDate).toISOString().split('T')[0]
        return visitDateStr === dateStr
      })
      
      setVisits(filteredVisits)
    } catch (error: any) {
      console.error("Failed to fetch visits", error)
      toast.error(error.message || "Failed to fetch visits")
    }
  }

  const handleAssignClick = (visit: MaintenanceVisitListItem) => {
    setAssignDialog({ open: true, visit })
    setSelectedTechnicianId(visit.technicianId || "")
  }

  const handleAssign = async () => {
    if (!assignDialog.visit || !selectedTechnicianId) {
      toast.error("Please select a technician")
      return
    }

    try {
      setAssigning(true)
      await assignVisitToTechnician({
        visitId: assignDialog.visit.id,
        technicianId: selectedTechnicianId,
        assignmentDate: selectedDate.toISOString().split('T')[0]
      })
      toast.success("Visit assigned successfully")
      setAssignDialog({ open: false, visit: null })
      setSelectedTechnicianId("")
      fetchVisits()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign visit")
    } finally {
      setAssigning(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>
      case "inprogress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>
      case "done":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Done</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTechnicianName = (technicianId?: string) => {
    if (!technicianId) return "Unassigned"
    const tech = technicians.find(t => t.id === technicianId)
    return tech?.name || "Unknown"
  }

  if (loading) {
    return (
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-6 text-center">Loading...</main>
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
          <main className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Assign Maintenance Visits</h1>
                <p className="text-muted-foreground mt-1">Assign technicians to maintenance visits day by day</p>
              </div>
              <Button onClick={fetchVisits} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>Choose the date to view and assign visits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="visitDate">Visit Date</Label>
                    <Input
                      id="visitDate"
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const date = new Date(e.target.value)
                        date.setHours(0, 0, 0, 0)
                        setSelectedDate(date)
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-6">
                    <Badge variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(selectedDate.toISOString())}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {visits.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No visits scheduled</h3>
                  <p className="text-muted-foreground">There are no maintenance visits scheduled for {formatDate(selectedDate.toISOString())}.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Visits for {formatDate(selectedDate.toISOString())}</h2>
                  <Badge variant="outline">{visits.length} visit{visits.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="grid gap-4">
                  {visits.map((visit) => (
                    <Card key={visit.id} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{visit.projectNumber || visit.elevatorCode}</CardTitle>
                            <CardDescription className="mt-1">
                              {visit.customerName} - {visit.elevatorCode}
                            </CardDescription>
                          </div>
                          {getStatusBadge(visit.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Technician</p>
                              <p className="text-sm text-muted-foreground">
                                {visit.technicianId ? (
                                  <span className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    {getTechnicianName(visit.technicianId)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2 text-yellow-600">
                                    <AlertCircle className="h-3 w-3" />
                                    Unassigned
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Status</p>
                              <p className="text-sm text-muted-foreground">{visit.status}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Visit Date</p>
                              <p className="text-sm text-muted-foreground">{formatDate(visit.visitDate)}</p>
                            </div>
                          </div>
                        </div>
                        {visit.status.toLowerCase() !== "done" && (
                          <div className="mt-4 pt-4 border-t">
                            <Button
                              onClick={() => handleAssignClick(visit)}
                              variant={visit.technicianId ? "outline" : "default"}
                              className="w-full"
                            >
                              {visit.technicianId ? (
                                <>
                                  <User className="h-4 w-4 mr-2" />
                                  Reassign Technician
                                </>
                              ) : (
                                <>
                                  <User className="h-4 w-4 mr-2" />
                                  Assign Technician
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Assign Technician Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => setAssignDialog({ open, visit: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assignDialog.visit && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Project: {assignDialog.visit.projectNumber || assignDialog.visit.elevatorCode}</p>
                <p className="text-sm text-muted-foreground">Customer: {assignDialog.visit.customerName}</p>
                <p className="text-sm text-muted-foreground">Date: {formatDate(assignDialog.visit.visitDate)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="technician">Select Technician</Label>
              <select
                id="technician"
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a technician...</option>
                {technicians
                  .filter(tech => !tech.isDisabled)
                  .map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} {tech.specialization ? `(${tech.specialization})` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Note: A technician can only complete one maintenance visit per elevator per month.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, visit: null })}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedTechnicianId || assigning}>
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DemoGuidePanel
        title="Assign Visits"
        description="Assign monthly maintenance visits to technicians — ensuring every visit has a responsible field agent."
        features={[
          { icon: "📅", label: "Monthly Schedule", description: "See all generated visits grouped by date" },
          { icon: "👨‍🔧", label: "Assign to Technician", description: "Pick a technician for each unassigned visit" },
          { icon: "✅", label: "Track Assignment", description: "Know exactly who is handling each visit" },
        ]}
        tip="Unassigned visits are shown first so you never miss a scheduling gap."
      />
    </SidebarProvider>
  )
}
