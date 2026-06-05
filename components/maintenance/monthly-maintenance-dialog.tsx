"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, XCircle, DollarSign, RefreshCw } from "lucide-react"
import {
  getMaintenanceChecklistItems,
  type MaintenanceChecklistItem,
  scheduleVisit,
  completeVisit,
  markVisitAsPaid,
  getMaintenanceElevators,
  type MaintenanceElevator,
  getVisitsByContractAndMonth,
  getVisitDetails,
  getMaintenanceContractDetails,
  getTechnicians,
  type Technician,
  updateVisitStatusAdmin
} from "@/lib/api"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface MonthlyMaintenanceDialogProps {
  contractId: string
  projectNumber: string
  pricePerMonth: number
  freeMonths: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editMode?: boolean
  visitId?: string
  elevatorId?: string
}

interface ChecklistItemState {
  id: string
  status: "good" | "medium" | "bad" | undefined // good, medium, bad, or undefined = not set
  notes: string
  count: number | undefined // Count of items (e.g., 4 wires, 1 motor)
  percentage: number | undefined // Percentage value (e.g., 75%, 50%)
}

export function MonthlyMaintenanceDialog({
  contractId,
  projectNumber,
  pricePerMonth,
  freeMonths,
  isOpen,
  onClose,
  onSuccess,
  editMode = false,
  visitId,
  elevatorId
}: MonthlyMaintenanceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [checklistItems, setChecklistItems] = useState<MaintenanceChecklistItem[]>([])
  const [elevators, setElevators] = useState<MaintenanceElevator[]>([])
  const [selectedElevatorId, setSelectedElevatorId] = useState<string>("")
  const [maintenanceDone, setMaintenanceDone] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [notes, setNotes] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [checklistState, setChecklistState] = useState<Map<string, ChecklistItemState>>(new Map())
  const [visitDate, setVisitDate] = useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("")

  useEffect(() => {
    if (isOpen) {
      // Set elevatorId if provided as prop
      if (elevatorId) {
        setSelectedElevatorId(elevatorId)
      }

      if (editMode && visitId) {
        fetchEditData()
      } else {
        fetchData()
      }
    } else {
      // Reset form when dialog closes
      setMaintenanceDone(false)
      setIsPaid(false)
      setNotes("")
      setPaymentNotes("")
      setChecklistState(new Map())
      setSelectedElevatorId(elevatorId || "") // Keep elevatorId if provided
      setSelectedTechnicianId("")
    }
  }, [isOpen, contractId, editMode, visitId, elevatorId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [items, elevatorsData, techniciansData, contractData] = await Promise.all([
        getMaintenanceChecklistItems(false),
        getMaintenanceElevators(),
        getTechnicians(),
        getMaintenanceContractDetails(contractId)
      ])

      setChecklistItems(items.sort((a, b) => a.order - b.order))
      setTechnicians(techniciansData)

      if (contractData && contractData.technicianId && !selectedTechnicianId) {
        setSelectedTechnicianId(contractData.technicianId)
      }

      // Filter elevators for this contract
      const contractElevators = elevatorsData.filter(e => e.contractId === contractId)
      setElevators(contractElevators)

      if (contractElevators.length > 0) {
        setSelectedElevatorId(elevatorId || contractElevators[0].id)
      }

      // Initialize checklist state with default values
      const initialState = new Map<string, ChecklistItemState>()
      items.forEach(item => {
        initialState.set(item.id, {
          id: item.id,
          status: "good", // Default: Good
          notes: "", // Default: empty string
          count: 1, // Default: 1
          percentage: 90 // Default: 90%
        })
      })
      setChecklistState(initialState)
    } catch (error: any) {
      console.error("Failed to fetch data:", error)
      toast.error(error.message || "Failed to load maintenance data")
    } finally {
      setLoading(false)
    }
  }

  const fetchEditData = async () => {
    try {
      setLoading(true)
      const [visit, items, elevatorsData, techniciansData] = await Promise.all([
        getVisitDetails(visitId!),
        getMaintenanceChecklistItems(false),
        getMaintenanceElevators(),
        getTechnicians()
      ])

      setChecklistItems(items.sort((a, b) => a.order - b.order))
      setTechnicians(techniciansData)

      // Filter elevators for this contract
      const contractElevators = elevatorsData.filter(e => e.contractId === contractId)
      setElevators(contractElevators)

      // Set form values from visit
      setSelectedElevatorId(visit.elevatorId)
      setMaintenanceDone(visit.status === 'Done' || visit.status === 'done')
      setIsPaid(visit.isPaid)
      setNotes(visit.notes || "")
      setPaymentNotes(visit.paymentNotes || "")
      setVisitDate(new Date(visit.visitDate))
      setSelectedTechnicianId(visit.technicianId || "")

      // Initialize checklist state from visit
      const initialState = new Map<string, ChecklistItemState>()
      items.forEach(item => {
        const visitItem = visit.checklistItems.find((ci: any) => ci.checklistItemId === item.id)
        // Map isCompleted to status: true = good, false = bad
        // Default: Good if no visit item exists
        // For backward compatibility, if isCompleted exists but no status, use it
        let status: "good" | "medium" | "bad" | undefined = "good" // Default: Good
        if (visitItem) {
          if (visitItem.isCompleted === true) {
            status = "good"
          } else if (visitItem.isCompleted === false) {
            status = "bad"
          }
        }
        initialState.set(item.id, {
          id: item.id,
          status: status,
          notes: visitItem?.notes || "", // Default: empty string
          count: visitItem?.count ?? 1, // Default: 1
          percentage: visitItem?.percentage ?? 90 // Default: 90%
        })
      })
      setChecklistState(initialState)
    } catch (error: any) {
      console.error("Failed to fetch edit data:", error)
      toast.error(error.message || "Failed to load visit details")
    } finally {
      setLoading(false)
    }
  }

  const handleChecklistStatusChange = (itemId: string, status: "good" | "medium" | "bad" | undefined) => {
    const newState = new Map(checklistState)
    const current = newState.get(itemId) || { id: itemId, status: undefined, notes: "", count: undefined, percentage: undefined }
    // If clicking the same status that's already set, unset it; otherwise set the new status
    if (current.status === status) {
      newState.set(itemId, { ...current, status: undefined })
    } else {
      newState.set(itemId, { ...current, status })
    }
    setChecklistState(newState)
  }

  const handleChecklistNotesChange = (itemId: string, notes: string) => {
    const newState = new Map(checklistState)
    const current = newState.get(itemId) || { id: itemId, status: undefined, notes: "", count: undefined, percentage: undefined }
    newState.set(itemId, { ...current, notes })
    setChecklistState(newState)
  }

  const handleChecklistCountChange = (itemId: string, count: number | undefined) => {
    const newState = new Map(checklistState)
    const current = newState.get(itemId) || { id: itemId, status: undefined, notes: "", count: undefined, percentage: undefined }
    newState.set(itemId, { ...current, count: count === undefined || count === 0 ? undefined : count })
    setChecklistState(newState)
  }

  const handleChecklistPercentageChange = (itemId: string, percentage: number | undefined) => {
    const newState = new Map(checklistState)
    const current = newState.get(itemId) || { id: itemId, status: undefined, notes: "", count: undefined, percentage: undefined }
    newState.set(itemId, { ...current, percentage: percentage === undefined || percentage === 0 ? undefined : percentage })
    setChecklistState(newState)
  }

  const handleSubmit = async () => {
    if (!selectedElevatorId) {
      toast.error("Please select an elevator")
      return
    }

    if (!selectedTechnicianId) {
      toast.error("Please select a technician")
      return
    }

    // Validate that the visit date is not in the future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(visitDate)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate > today) {
      toast.error("Cannot schedule maintenance for future dates. Please select today or a past date.")
      return
    }

    try {
      setLoading(true)

      if (editMode && visitId) {
        // Edit mode: update existing visit
        if (maintenanceDone) {
          // Mark as done - complete the visit
          await completeVisit(visitId, {
            visitId: visitId,
            notes,
            paymentNotes,
            partsUsed: [], // No parts for now
            checklistItems: Array.from(checklistState.values())
              .filter(state => state.status !== undefined)
              .map(state => ({
                checklistItemId: state.id,
                isCompleted: state.status === "good", // true = good, false = medium/bad
                notes: state.notes || undefined,
                count: state.count,
                percentage: state.percentage
              }))
          })

          // Update payment status
          if (isPaid && pricePerMonth > 0 && freeMonths === 0) {
            await markVisitAsPaid(visitId)
          }
        } else {
          // Mark as not done - change status back to Pending
          await updateVisitStatusAdmin(visitId, "Pending")
          
          // Note: When changing from Done to Pending, we clear the completed date
          // The backend should handle this when status changes to Pending
        }
      } else if (maintenanceDone) {
        // New visit: schedule and complete if done
        let currentVisitId = visitId

        if (!currentVisitId) {
          // Check if maintenance already exists for this month
          const selectedMonth = visitDate.getMonth() + 1
          const selectedYear = visitDate.getFullYear()

          try {
            // Try to get existing visits for this month to check if one is already completed
            const contractElevator = elevators.find(e => e.id === selectedElevatorId)
            if (contractElevator) {
              const existingVisits = await getVisitsByContractAndMonth(contractElevator.contractId, selectedMonth, selectedYear)
              const hasCompletedVisit = existingVisits.some(v =>
                v.elevatorId === selectedElevatorId &&
                v.status === 'Done' &&
                new Date(v.visitDate).getMonth() + 1 === selectedMonth &&
                new Date(v.visitDate).getFullYear() === selectedYear
              )

              if (hasCompletedVisit) {
                const monthName = visitDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                toast.error(`Maintenance has already been completed for this elevator in ${monthName}. Only one maintenance visit is allowed per month.`)
                return
              }
            }
          } catch (error) {
            // If check fails, continue - backend will validate
            console.warn("Could not check existing visits:", error)
          }

          // Check if visit already exists for this month, or create one
          currentVisitId = await scheduleVisit({
            elevatorId: selectedElevatorId,
            visitDate: visitDate.toISOString(),
            technicianId: selectedTechnicianId
          })

          // Complete the visit
          await completeVisit(currentVisitId, {
            visitId: currentVisitId,
            notes,
            paymentNotes,
            partsUsed: [], // No parts for now
            checklistItems: Array.from(checklistState.values())
              .filter(state => state.status !== undefined)
              .map(state => ({
                checklistItemId: state.id,
                isCompleted: state.status === "good", // true = good, false = medium/bad
                notes: state.notes || undefined,
                count: state.count,
                percentage: state.percentage
              }))
          })

          // Mark as paid if applicable (and not free)
          if (isPaid && pricePerMonth > 0 && freeMonths === 0) {
            await markVisitAsPaid(currentVisitId)
          }
        }
      }

      toast.success(editMode ? "Maintenance updated successfully" : "Maintenance status updated successfully")
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Failed to update maintenance:", error)
      // Extract error message from various possible error formats
      const errorMessage = error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to update maintenance status"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isFree = pricePerMonth === 0 || freeMonths > 0
  const allChecklistCompleted = checklistItems.length > 0 &&
    Array.from(checklistState.values()).every(state => state.status !== undefined)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {editMode ? "Edit" : "Monthly"} Maintenance - {projectNumber || "N/A"}
          </DialogTitle>
        </DialogHeader>

        {loading && !checklistItems.length ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Elevator Selection */}
            {elevators.length > 1 && (
              <div className="space-y-2">
                <Label>Select Elevator</Label>
                <select
                  value={selectedElevatorId}
                  onChange={(e) => setSelectedElevatorId(e.target.value)}
                  disabled={editMode}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {elevators.map(elevator => (
                    <option key={elevator.id} value={elevator.id}>
                      {elevator.elevatorCode} - {elevator.type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Technician Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Technician</Label>
              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a technician...</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} {tech.specialization ? `(${tech.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Visit Date */}
            <div className="space-y-2">
              <Label htmlFor="visitDate" className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Visit Date
              </Label>
              <input
                id="visitDate"
                type="date"
                value={visitDate.toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                disabled={editMode}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value)
                  selectedDate.setHours(0, 0, 0, 0)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)

                  if (selectedDate > today) {
                    toast.error("Cannot select future dates. Please select today or a past date.")
                    // Reset to today if future date selected
                    const todayDate = new Date()
                    todayDate.setHours(0, 0, 0, 0)
                    setVisitDate(todayDate)
                    return
                  }
                  setVisitDate(selectedDate)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Maximum date: Today ({formatDate(new Date())})
              </p>
            </div>

            {/* Maintenance Status */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Maintenance Status</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={maintenanceDone ? "default" : "outline"}
                  onClick={() => setMaintenanceDone(true)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </Button>
                <Button
                  type="button"
                  variant={!maintenanceDone ? "default" : "outline"}
                  onClick={() => setMaintenanceDone(false)}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Not Done
                </Button>
              </div>
            </div>

            {/* Payment Status - Only show if not free */}
            {!isFree && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Status
                  </Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant={isPaid ? "default" : "outline"}
                      onClick={() => setIsPaid(true)}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Paid
                    </Button>
                    <Button
                      type="button"
                      variant={!isPaid ? "default" : "outline"}
                      onClick={() => setIsPaid(false)}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Not Paid
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Payment Notes</Label>
                  <Textarea
                    id="paymentNotes"
                    placeholder="Add notes about payment..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Maintenance Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Maintenance Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this maintenance visit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            {/* Checklist */}
            {checklistItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Maintenance Checklist</Label>
                  {allChecklistCompleted && (
                    <Badge className="bg-success text-success-foreground">
                      All Completed
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 border rounded-lg p-4">
                  {checklistItems.map((item, index) => {
                    const state = checklistState.get(item.id) || { id: item.id, status: undefined, notes: "", count: undefined, percentage: undefined }
                    return (
                      <div key={item.id}>
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 space-y-3">
                            <div>
                              <Label htmlFor={item.id} className="text-sm font-medium leading-tight">
                                {item.title}
                              </Label>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                              )}
                            </div>

                            {/* Status Selection: Good/Medium/Bad */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${item.id}-good`}
                                  checked={state.status === "good"}
                                  onCheckedChange={(checked) => {
                                    handleChecklistStatusChange(item.id, checked ? "good" : undefined)
                                  }}
                                />
                                <Label htmlFor={`${item.id}-good`} className="text-sm text-green-600 cursor-pointer font-medium">
                                  ✓ Good
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${item.id}-medium`}
                                  checked={state.status === "medium"}
                                  onCheckedChange={(checked) => {
                                    handleChecklistStatusChange(item.id, checked ? "medium" : undefined)
                                  }}
                                />
                                <Label htmlFor={`${item.id}-medium`} className="text-sm text-yellow-600 cursor-pointer font-medium">
                                  ⚠ Medium
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${item.id}-bad`}
                                  checked={state.status === "bad"}
                                  onCheckedChange={(checked) => {
                                    handleChecklistStatusChange(item.id, checked ? "bad" : undefined)
                                  }}
                                />
                                <Label htmlFor={`${item.id}-bad`} className="text-sm text-red-600 cursor-pointer font-medium">
                                  ✗ Bad
                                </Label>
                              </div>
                            </div>

                            {/* Additional Fields: Count, Percentage, Notes */}
                            {state.status !== undefined && (
                              <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <Label htmlFor={`${item.id}-count`} className="text-xs font-medium">
                                      Count of Items
                                    </Label>
                                    <Input
                                      id={`${item.id}-count`}
                                      type="number"
                                      min="0"
                                      placeholder="e.g., 4 wires, 1 motor"
                                      value={state.count || ""}
                                      onChange={(e) => handleChecklistCountChange(item.id, e.target.value ? parseInt(e.target.value) : undefined)}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`${item.id}-percentage`} className="text-xs font-medium">
                                      Percentage (%)
                                    </Label>
                                    <Input
                                      id={`${item.id}-percentage`}
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      placeholder="e.g., 75, 50"
                                      value={state.percentage || ""}
                                      onChange={(e) => handleChecklistPercentageChange(item.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`${item.id}-notes`} className="text-xs font-medium">
                                    Description/Notes
                                  </Label>
                                  <Textarea
                                    id={`${item.id}-notes`}
                                    placeholder="Add description for this item..."
                                    value={state.notes}
                                    onChange={(e) => handleChecklistNotesChange(item.id, e.target.value)}
                                    rows={2}
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {index < checklistItems.length - 1 && <Separator className="mt-3" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedElevatorId}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Maintenance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

