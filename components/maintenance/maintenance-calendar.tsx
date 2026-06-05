"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, User, Building2, MapPin, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Loader2, Edit, Trash2, Save, X, ChevronUp, ChevronDown } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getMonthlySchedule, type MonthlyScheduleVisit, assignVisitToTechnician, cancelVisit, cancelIncompleteVisitsByDate, updateVisitOrder, getTechnicians, type Technician } from "@/lib/api"
import { toast } from "sonner"
import { canManageMaintenance } from "@/lib/user"

export function MaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [visits, setVisits] = useState<MonthlyScheduleVisit[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedDayVisits, setSelectedDayVisits] = useState<MonthlyScheduleVisit[]>([])
  const [editingVisit, setEditingVisit] = useState<MonthlyScheduleVisit | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editTechnicianId, setEditTechnicianId] = useState<string>("")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [visitToCancel, setVisitToCancel] = useState<MonthlyScheduleVisit | null>(null)
  const [cancelAllDialogOpen, setCancelAllDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const canManage = canManageMaintenance()

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const today = new Date()
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()
  const isSelectedDayToday = selectedDay !== null && isCurrentMonth && selectedDay === today.getDate()

  // A day is "editable" if it's today or in the future, OR if user is an admin
  const isSelectedDayEditable = selectedDay !== null && (
    canManage ||
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth() + 1) ||
    (year === today.getFullYear() && month === today.getMonth() + 1 && selectedDay >= today.getDate())
  )

  useEffect(() => {
    fetchVisits()
    fetchTechnicians()
  }, [month, year])

  const fetchVisits = async () => {
    try {
      setLoading(true)
      const data = await getMonthlySchedule(month, year)
      setVisits(data)
      return data
    } catch (error: any) {
      console.error("Failed to fetch visits:", error)
      toast.error(error.message || "Failed to load maintenance visits")
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const data = await getTechnicians()
      setTechnicians(data.filter(t => !t.isDisabled))
    } catch (error: any) {
      console.error("Failed to fetch technicians:", error)
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const getVisitsForDay = (day: number, allVisits: MonthlyScheduleVisit[] = visits): MonthlyScheduleVisit[] => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dayVisits = allVisits.filter((visit) => {
      const visitDate = new Date(visit.visitDate)
      const visitDateStr = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, "0")}-${String(visitDate.getDate()).padStart(2, "0")}`
      return visitDateStr === dateStr
    })

    // Visits from backend are already ordered by DisplayOrder, so maintain that order
    return dayVisits
  }

  const handleDayClick = (day: number) => {
    const dayVisits = getVisitsForDay(day)
    setSelectedDay(day)
    setSelectedDayVisits(dayVisits)
    // Initialize visit order from backend order (visits are already sorted by DisplayOrder)
    setVisitOrder(dayVisits.map(v => v.id))
  }

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const handleEditVisit = (visit: MonthlyScheduleVisit) => {
    setEditingVisit(visit)
    setEditNotes(visit.notes || "")
    setEditTechnicianId(visit.technicianId || "")
  }

  const handleSaveEdit = async () => {
    if (!editingVisit) return

    try {
      setSaving(true)
      // Reassign technician with notes
      await assignVisitToTechnician({
        visitId: editingVisit.id,
        technicianId: editTechnicianId || null,
        assignmentDate: editingVisit.visitDate,
        notes: editNotes || undefined
      })

      toast.success("Visit updated successfully")
      setEditingVisit(null)
      const freshVisits = await fetchVisits()
      // Refresh selected day visits
      if (selectedDay !== null) {
        const dayVisits = getVisitsForDay(selectedDay, freshVisits)
        setSelectedDayVisits(dayVisits)
      }
    } catch (error: any) {
      console.error("Failed to update visit:", error)
      toast.error(error.message || "Failed to update visit")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelVisit = async () => {
    if (!visitToCancel) return

    try {
      setSaving(true)
      await cancelVisit(visitToCancel.id)
      toast.success("Visit cancelled successfully")
      setCancelDialogOpen(false)
      setVisitToCancel(null)
      const freshVisits = await fetchVisits()
      // Refresh selected day visits
      if (selectedDay !== null) {
        const dayVisits = getVisitsForDay(selectedDay, freshVisits)
        setSelectedDayVisits(dayVisits)
      }
    } catch (error: any) {
      console.error("Failed to cancel visit:", error)
      toast.error(error.message || "Failed to cancel visit")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelAllIncompleteVisits = async () => {
    if (selectedDay === null) return

    try {
      setSaving(true)
      const selectedDate = new Date(year, month - 1, selectedDay)
      const result = await cancelIncompleteVisitsByDate(selectedDate)
      toast.success(result.message || `Cancelled ${result.count} incomplete visit(s)`)
      setCancelAllDialogOpen(false)
      const freshVisits = await fetchVisits()
      // Refresh selected day visits
      const dayVisits = getVisitsForDay(selectedDay, freshVisits)
      setSelectedDayVisits(dayVisits)
    } catch (error: any) {
      console.error("Failed to cancel incomplete visits:", error)
      toast.error(error.message || "Failed to cancel incomplete visits")
    } finally {
      setSaving(false)
    }
  }

  const [visitOrder, setVisitOrder] = useState<string[]>([])

  // Initialize visit order when selectedDayVisits changes
  // Use the order from backend (visits are already sorted by DisplayOrder)
  useEffect(() => {
    if (selectedDayVisits.length > 0) {
      // Always use the order from backend (visits come sorted by DisplayOrder)
      setVisitOrder(selectedDayVisits.map(v => v.id))
    } else {
      setVisitOrder([])
    }
  }, [selectedDayVisits.length, selectedDay])

  const sortedVisits = useMemo(() => {
    // Always use the order from visitOrder (which comes from backend DisplayOrder)
    if (visitOrder.length > 0 && visitOrder.length === selectedDayVisits.length) {
      // Use saved order
      return visitOrder
        .map(id => selectedDayVisits.find(v => v.id === id))
        .filter((v): v is MonthlyScheduleVisit => v !== undefined)
    } else {
      // Use default order from backend (already sorted by DisplayOrder)
      return [...selectedDayVisits]
    }
  }, [selectedDayVisits, visitOrder])


  const moveVisit = async (visitId: string, direction: 'up' | 'down') => {
    if (!isSelectedDayToday || selectedDay === null) return

    const currentIndex = visitOrder.indexOf(visitId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= visitOrder.length) return

    const newOrder = [...visitOrder]
    // Swap positions using temporary variable
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[newIndex]
    newOrder[newIndex] = temp
    setVisitOrder(newOrder)

    // Save the order to backend
    try {
      setSaving(true)
      const selectedDate = new Date(year, month - 1, selectedDay)
      console.log("Saving visit order:", {
        date: selectedDate.toISOString().split('T')[0],
        visitIds: newOrder,
        visitCount: newOrder.length,
        selectedDayVisitsCount: selectedDayVisits.length
      })

      await updateVisitOrder(selectedDate, newOrder)
      toast.success("Visit order saved")

      // Small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300))

      // Refresh visits to get updated order from backend
      const freshVisits = await fetchVisits()
      // Refresh selected day visits
      if (selectedDay !== null) {
        const dayVisits = getVisitsForDay(selectedDay, freshVisits)
        console.log("Refreshed visits order:", dayVisits.map(v => v.id))
        setSelectedDayVisits(dayVisits)
        setVisitOrder(dayVisits.map(v => v.id))
      }
    } catch (error: any) {
      console.error("Failed to save visit order:", error)
      toast.error(error.message || "Failed to save visit order")
      // Revert on error
      setVisitOrder([...visitOrder])
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return "bg-green-600 text-white"
      case "cancelled":
        return "bg-red-600 text-white"
      case "inprogress":
        return "bg-yellow-500 text-white"
      case "pending":
        return "bg-blue-500 text-white"
      case "frozen":
        return "bg-gray-500 text-white"
      default:
        return "bg-gray-400 text-white"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return <Badge className="bg-green-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>
      case "cancelled":
        return <Badge className="bg-red-600 text-white"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
      case "inprogress":
        return <Badge className="bg-yellow-500 text-white"><Loader2 className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>
      case "pending":
        return <Badge className="bg-blue-500 text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "frozen":
        return <Badge className="bg-gray-500 text-white">Frozen</Badge>
      default:
        return <Badge className="bg-gray-400 text-white">{status}</Badge>
    }
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{monthNames[month - 1]} {year}</CardTitle>
              <CardDescription>Scheduled maintenance visits</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {emptyDays.map((i) => (
                  <div key={`empty-${i}`} className="min-h-24 rounded-lg border border-transparent p-2" />
                ))}

                {/* Calendar days */}
                {days.map((day) => {
                  const dayVisits = getVisitsForDay(day)
                  const isToday = isCurrentMonth && day === today.getDate()
                  const hasAssignedVisits = dayVisits.some(v => v.technicianId && v.technicianName !== "Unassigned")

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`min-h-24 rounded-lg border p-2 text-left transition-colors hover:bg-accent ${isToday ? "border-primary bg-primary/5" : "border-border"
                        } ${hasAssignedVisits ? "cursor-pointer" : ""}`}
                    >
                      <div className={`mb-1 text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayVisits.slice(0, 2).map((visit) => {
                          const status = visit.status.toLowerCase()
                          return (
                            <div
                              key={visit.id}
                              className={`w-full rounded px-1 py-0.5 text-left text-xs ${getStatusColor(status)}`}
                              title={`${visit.projectNumber || "N/A"} - ${visit.technicianName}`}
                            >
                              {visit.elevatorCode}
                            </div>
                          )
                        })}
                        {dayVisits.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{dayVisits.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-yellow-500" />
                  <span className="text-xs text-muted-foreground">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-600" />
                  <span className="text-xs text-muted-foreground">Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-600" />
                  <span className="text-xs text-muted-foreground">Cancelled</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog for day visits */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="w-[95%] max-w-[1600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Visits for {selectedDay !== null ? `${monthNames[month - 1]} ${selectedDay}, ${year}` : ""}
                {isSelectedDayToday && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                    Today
                  </Badge>
                )}
                {canManage && !isSelectedDayToday && isSelectedDayEditable && (
                  <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                    Future - Edit Mode
                  </Badge>
                )}
              </DialogTitle>
              {selectedDayVisits.length > 0 && canManage && isSelectedDayEditable && (
                <div className="flex items-center gap-2">
                  {selectedDayVisits.some(v => v.status.toLowerCase() !== 'done' && v.status.toLowerCase() !== 'cancelled') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancelAllDialogOpen(true)}
                      disabled={saving}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel All Incomplete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedDayVisits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No visits scheduled for this day
              </div>
            ) : (
              sortedVisits.map((visit, index) => (
                <Card key={visit.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      {canManage && isSelectedDayEditable && (
                        <div className="flex flex-col gap-1 mr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveVisit(visit.id, 'up')}
                            disabled={visitOrder.indexOf(visit.id) === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveVisit(visit.id, 'down')}
                            disabled={visitOrder.indexOf(visit.id) === visitOrder.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{visit.projectNumber || "N/A"}</span>
                          <span className="text-sm text-muted-foreground">- {visit.elevatorCode}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          {visit.customerName && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Customer:</span>
                              <span className="font-medium">{visit.customerName}</span>
                            </div>
                          )}
                          {visit.customerAddress && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{visit.customerAddress}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {new Date(visit.visitDate).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          {visit.technicianName && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Technician:</span>
                              <span className="font-medium">{visit.technicianName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Elevator:</span>
                            <span className="font-medium">{visit.elevatorType}</span>
                            <span className="text-muted-foreground">
                              ({visit.elevatorStops} stops, {visit.elevatorFloors} floors)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(visit.status)}
                        {visit.isPaid && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Paid
                          </Badge>
                        )}
                        {canManage && isSelectedDayEditable && visit.status.toLowerCase() !== "done" && visit.status.toLowerCase() !== "cancelled" && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditVisit(visit)}
                              className="h-8"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVisitToCancel(visit)
                                setCancelDialogOpen(true)
                              }}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {visit.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {visit.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={editingVisit !== null} onOpenChange={(open) => !open && setEditingVisit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Visit Assignment</DialogTitle>
          </DialogHeader>
          {editingVisit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Input
                  id="project"
                  value={editingVisit.projectNumber || "N/A"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician">Assign Technician</Label>
                <Select value={editTechnicianId} onValueChange={setEditTechnicianId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for Visit</Label>
                <Textarea
                  id="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Enter notes for the technician about this visit..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  These notes will be visible to the technician when they view their assigned visits.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVisit(null)} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Visit Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Visit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this visit? This will remove it from today's schedule.
              {visitToCancel && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{visitToCancel.projectNumber} - {visitToCancel.elevatorCode}</p>
                  <p className="text-sm text-muted-foreground">{visitToCancel.technicianName}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelVisit}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Cancelling..." : "Yes, Cancel Visit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel All Incomplete Visits Confirmation Dialog */}
      <AlertDialog open={cancelAllDialogOpen} onOpenChange={setCancelAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel All Incomplete Visits?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel all incomplete visits (Pending and In Progress) for {selectedDay !== null ? `${monthNames[month - 1]} ${selectedDay}, ${year}` : "this date"}?
              <br /><br />
              This will cancel all visits that are not marked as "Done" or already "Cancelled".
            </AlertDialogDescription>
            {selectedDay !== null && (
              <div className="mt-2 p-2 bg-muted rounded">
                <span className="text-sm">
                  Incomplete visits: {selectedDayVisits.filter(v => v.status.toLowerCase() !== 'done' && v.status.toLowerCase() !== 'cancelled').length}
                </span>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>No, Keep Them</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAllIncompleteVisits}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Cancelling..." : "Yes, Cancel All Incomplete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
