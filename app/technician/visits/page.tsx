"use client"

import React, { useState, useEffect } from "react"
import { getTechnicianVisitsForToday, updateVisitStatus, TechnicianVisit, completeVisit, completeVisitAsTechnician, getMaintenanceChecklistItems, getTechnicianChecklistItems, MaintenanceChecklistItem, getTechnicianEmergencyTickets, EmergencyTicket, updateEmergencyTicket, resolveEmergencyTicket } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { MapPin, Phone, Calendar, CheckCircle2, Clock, FileText, Map as MapIcon, ExternalLink, RefreshCw, CheckCircle, XCircle, AlertTriangle, Navigation2, Wrench, User } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTranslation } from "@/lib/i18n/context"

export default function TechnicianVisitsPage() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<TechnicianVisit[]>([])
  const [emergencyTickets, setEmergencyTickets] = useState<EmergencyTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVisit, setSelectedVisit] = useState<TechnicianVisit | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingVisit, setCompletingVisit] = useState(false)
  const [notes, setNotes] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [isPaid, setIsPaid] = useState(false)
  const [checklistItems, setChecklistItems] = useState<MaintenanceChecklistItem[]>([])
  const [checklistState, setChecklistState] = useState<Map<string, { isCompleted: boolean; notes?: string }>>(new Map())
  const [loadingChecklist, setLoadingChecklist] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [visitsData, ticketsData] = await Promise.all([
        getTechnicianVisitsForToday().catch(() => []),
        getTechnicianEmergencyTickets().catch(() => [])
      ])
      setVisits(visitsData || [])
      setEmergencyTickets(ticketsData || [])
    } catch (error: any) {
      console.error("Failed to fetch data", error)
      toast.error(error.message || t.technicianVisits.errorLoading)
    } finally {
      setLoading(false)
    }
  }

  const fetchVisits = async () => {
    try {
      const data = await getTechnicianVisitsForToday()
      setVisits(data || [])
    } catch (error: any) {
      console.error("Failed to fetch visits", error)
      toast.error(error.message || t.technicianVisits.errorLoadingVisits)
    }
  }

  const handleStartVisit = async (visit: TechnicianVisit) => {
    try {
      await updateVisitStatus(visit.visitId, "InProgress")
      toast.success(t.technicianVisits.visitStarted)
      fetchVisits()
    } catch (error: any) {
      toast.error(error.message || t.technicianVisits.visitStartError)
    }
  }

  const handleCompleteVisit = async (visit: TechnicianVisit) => {
    setSelectedVisit(visit)
    setNotes(visit.notes || "")
    setPaymentNotes(visit.paymentNotes || "")
    setIsPaid(visit.isPaid)
    setCompleteDialogOpen(true)
    
    // Fetch checklist items
    try {
      setLoadingChecklist(true)
      console.log("Fetching checklist items...")
      // Use technician-specific endpoint which has proper authorization
      let items: MaintenanceChecklistItem[] = []
      try {
        items = await getTechnicianChecklistItems(false)
        console.log("Fetched checklist items (active only):", items)
        
        // If no active items, try fetching inactive ones too
        if (!items || items.length === 0) {
          console.log("No active items found, trying to fetch all items including inactive...")
          items = await getTechnicianChecklistItems(true)
          console.log("Fetched checklist items (all):", items)
        }
      } catch (techError: any) {
        console.warn("Technician endpoint failed, trying maintenance endpoint:", techError)
        // Fallback to maintenance endpoint if technician endpoint fails
        try {
          items = await getMaintenanceChecklistItems(false)
          if (!items || items.length === 0) {
            items = await getMaintenanceChecklistItems(true)
          }
        } catch (maintenanceError: any) {
          throw techError // Throw the original error
        }
      }
      
      setChecklistItems(items || [])
      
      // Initialize checklist state - default all to good (completed)
      const initialState = new Map<string, { isCompleted: boolean; notes?: string }>()
      if (items && items.length > 0) {
        items.forEach(item => {
          initialState.set(item.id, { isCompleted: true, notes: "" })
        })
      }
      setChecklistState(initialState)
    } catch (error: any) {
      console.error("Failed to fetch checklist items", error)
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        data: error.data
      })
      toast.error(t.technicianVisits.errorLoading + ": " + (error.message || "Unknown error"))
      setChecklistItems([])
    } finally {
      setLoadingChecklist(false)
    }
  }

  const handleSubmitComplete = async () => {
    if (!selectedVisit) return

    try {
      setCompletingVisit(true)
      
      // Map checklist items
      const checklistItemsDto = Array.from(checklistState.entries()).map(([itemId, state]) => ({
        checklistItemId: itemId,
        isCompleted: state.isCompleted,
        notes: state.notes || undefined,
        count: undefined,
        percentage: undefined
      }))

      // Use technician endpoint which has proper authorization
      try {
        await completeVisitAsTechnician(selectedVisit.visitId, {
          visitId: selectedVisit.visitId,
          notes: notes,
          paymentNotes: paymentNotes || undefined,
          partsUsed: [],
          checklistItems: checklistItemsDto
        })
      } catch (techError: any) {
        // Fallback to maintenance endpoint if technician endpoint fails
        console.warn("Technician endpoint failed, trying maintenance endpoint:", techError)
        await completeVisit(selectedVisit.visitId, {
          visitId: selectedVisit.visitId,
          notes: notes,
          paymentNotes: paymentNotes || undefined,
          partsUsed: [],
          checklistItems: checklistItemsDto
        })
      }

      // Mark as paid if needed
      if (isPaid && !selectedVisit.isPaid) {
        // The completeVisit might handle payment, but if not, we'd need a separate call
        // For now, paymentNotes is included in completeVisit
      }

      toast.success(t.technicianVisits.visitCompleted)
      setCompleteDialogOpen(false)
      setSelectedVisit(null)
      setNotes("")
      setPaymentNotes("")
      setIsPaid(false)
      setChecklistState(new Map())
      fetchVisits()
    } catch (error: any) {
      toast.error(error.message || t.technicianVisits.visitCompleteError)
    } finally {
      setCompletingVisit(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{t.technicianVisits.pending}</Badge>
      case "InProgress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t.technicianVisits.inProgress}</Badge>
      case "Done":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{t.technicianVisits.done}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEmergencyStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge className="bg-destructive text-destructive-foreground">{t.technicianVisits.open}</Badge>
      case "EnRoute":
        return <Badge className="bg-chart-1 text-primary-foreground">{t.technicianVisits.enRoute}</Badge>
      case "InProgress":
        return <Badge className="bg-warning text-warning-foreground">{t.technicianVisits.inProgress}</Badge>
      case "Resolved":
        return <Badge className="bg-success text-success-foreground">{t.technicianVisits.resolved}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge className="bg-destructive text-destructive-foreground">{t.technicianVisits.high}</Badge>
      case "Medium":
        return <Badge className="bg-warning text-warning-foreground">{t.technicianVisits.medium}</Badge>
      case "Low":
        return <Badge className="bg-secondary text-secondary-foreground">{t.technicianVisits.low}</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const handleEmergencyStatusChange = async (ticketId: string, newStatus: "Open" | "EnRoute" | "InProgress" | "Resolved") => {
    try {
      const ticket = emergencyTickets.find(t => t.id === ticketId)
      if (!ticket) return

      if (newStatus === "Resolved") {
        await resolveEmergencyTicket(ticketId)
        toast.success(t.technicianVisits.emergencyResolved)
      } else {
        await updateEmergencyTicket(ticketId, {
          project: ticket.project,
          location: ticket.location,
          unitId: ticket.unitId,
          googleMapsLink: ticket.googleMapsLink,
          priority: ticket.priority,
          status: newStatus,
          description: ticket.description,
          reportedBy: ticket.reportedBy,
          contact: ticket.contact,
          assignedTechnicianId: ticket.assignedTechnicianId,
          notes: ticket.notes,
        })
        toast.success(t.technicianVisits.emergencyStatusUpdated.replace("{status}", newStatus))
      }
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t.technicianVisits.emergencyResolveError)
    }
  }

  if (loading) {
    return (
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-6 text-center">{t.technicianVisits.loading}</main>
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
                <h1 className="text-3xl font-bold">{t.technicianVisits.title}</h1>
                <p className="text-muted-foreground mt-1">{t.technicianVisits.subtitle}</p>
              </div>
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t.technicianVisits.refresh}
              </Button>
            </div>

            <Tabs defaultValue="maintenance" className="w-full">
              <TabsList>
                <TabsTrigger value="maintenance">
                  {t.technicianVisits.maintenanceVisits} ({visits.length})
                </TabsTrigger>
                <TabsTrigger value="emergency">
                  {t.technicianVisits.emergencyTickets} ({emergencyTickets.filter(t => t.status !== "Resolved").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="maintenance" className="space-y-6">
                {visits.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t.technicianVisits.noVisits}</h3>
                      <p className="text-muted-foreground">{t.technicianVisits.noVisitsDesc}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {visits.map((visit) => (
                  <Card key={visit.visitId} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{visit.projectNumber}</CardTitle>
                          <CardDescription className="mt-1">{visit.customerName}</CardDescription>
                        </div>
                        {getStatusBadge(visit.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 mb-1">{t.technicianVisits.notesForVisit}</p>
                            {visit.notes ? (
                              <p className="text-sm text-blue-800 whitespace-pre-wrap">{visit.notes}</p>
                            ) : (
                              <p className="text-sm text-blue-600 italic">{t.technicianVisits.noNotes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {visit.paymentNotes && (
                        <div className="rounded-md bg-green-50 border border-green-200 p-3">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900 mb-1">{t.technicianVisits.paymentNotes}</p>
                              <p className="text-sm text-green-800 whitespace-pre-wrap">{visit.paymentNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{t.technicianVisits.address}</span>
                            <span>{visit.customerAddress}, {visit.city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{t.technicianVisits.phone}</span>
                            <a href={`tel:${visit.customerPhone}`} className="text-blue-600 hover:underline">
                              {visit.customerPhone}
                            </a>
                          </div>
                          {visit.googleMapsLink && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapIcon className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={visit.googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {t.technicianVisits.viewOnGoogleMaps}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{t.technicianVisits.visitDate}</span>
                            <span>{formatDate(visit.visitDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{t.technicianVisits.elevator}</span>
                            <span>{visit.elevatorCode}</span>
                          </div>
                          {visit.projectNotes && (
                            <div className="text-sm">
                              <span className="font-medium">{t.technicianVisits.notes}</span>
                              <span className="text-muted-foreground">{visit.projectNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>


                      {visit.googleMapsLink && (
                        <div className="pt-4 border-t">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{t.technicianVisits.locationMap}</span>
                            </div>
                            <div className="w-full h-64 rounded-lg overflow-hidden border bg-gray-100">
                              {(() => {
                                // Convert Google Maps link to embed format
                                let embedUrl = visit.googleMapsLink;
                                
                                // If it's already an embed link, use it directly
                                if (embedUrl.includes('/embed')) {
                                  // Already an embed link, use as is
                                } else if (embedUrl.includes('maps.google.com') || embedUrl.includes('google.com/maps')) {
                                  // Extract coordinates from the URL if available (@lat,lng format)
                                  const coordsMatch = embedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                                  
                                  if (coordsMatch) {
                                    // Use coordinates - create a simple embed URL
                                    const lat = coordsMatch[1];
                                    const lng = coordsMatch[2];
                                    embedUrl = `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
                                  } else {
                                    // Extract place or use address
                                    const placeMatch = embedUrl.match(/place\/([^\/\?]+)/);
                                    if (placeMatch) {
                                      const place = encodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
                                      embedUrl = `https://www.google.com/maps?q=${place}&output=embed`;
                                    } else {
                                      // Fallback: use the address
                                      const address = encodeURIComponent(`${visit.customerAddress}, ${visit.city}`);
                                      embedUrl = `https://www.google.com/maps?q=${address}&output=embed`;
                                    }
                                  }
                                } else {
                                  // If it's not a Google Maps link, try to use address
                                  const address = encodeURIComponent(`${visit.customerAddress}, ${visit.city}`);
                                  embedUrl = `https://www.google.com/maps?q=${address}&output=embed`;
                                }
                                
                                return (
                                  <iframe
                                    src={embedUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="w-full h-full"
                                  />
                                );
                              })()}
                            </div>
                            <a
                              href={visit.googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {t.technicianVisits.openInGoogleMaps}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="flex gap-2">
                        {visit.status === "Pending" && (
                          <Button onClick={() => handleStartVisit(visit)} className="flex-1">
                            <Clock className="h-4 w-4 mr-2" />
                            {t.technicianVisits.startVisit}
                          </Button>
                        )}
                        {visit.status === "InProgress" && (
                          <Button onClick={() => handleCompleteVisit(visit)} className="flex-1">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t.technicianVisits.completeVisit}
                          </Button>
                        )}
                        {visit.status === "Done" && (
                          <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            {t.technicianVisits.completed} {visit.completedDate ? formatDate(visit.completedDate) : ""}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="emergency" className="space-y-6">
                {emergencyTickets.filter(t => t.status !== "Resolved").length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t.technicianVisits.noEmergencies}</h3>
                      <p className="text-muted-foreground">{t.technicianVisits.noEmergenciesDesc}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {emergencyTickets.filter(t => t.status !== "Resolved").map((ticket) => (
                      <Card key={ticket.id} className={ticket.priority === "High" ? "border-destructive" : ""}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-2">
                                <CardTitle className="text-xl">#{ticket.ticketNumber}</CardTitle>
                                {getPriorityBadge(ticket.priority)}
                                {getEmergencyStatusBadge(ticket.status)}
                              </div>
                              <CardDescription className="mt-1">
                                {ticket.project} {ticket.unitId && `- Unit ${ticket.unitId}`}
                              </CardDescription>
                            </div>
                            {ticket.priority === "High" && <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-md bg-red-50 border border-red-200 p-3">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-900 mb-1">{t.technicianVisits.emergencyDescription}</p>
                                <p className="text-sm text-red-800 whitespace-pre-wrap">{ticket.description}</p>
                              </div>
                            </div>
                          </div>
                          {ticket.notes && (
                            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-blue-900 mb-1">{t.common.notes}</p>
                                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{ticket.notes}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{t.technicianVisits.location}</span>
                                <span>{ticket.location}</span>
                              </div>
                              {ticket.googleMapsLink && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapIcon className="h-4 w-4 text-muted-foreground" />
                                  <a
                                    href={ticket.googleMapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    {t.technicianVisits.openMap}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                              {ticket.contact && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{t.technicianVisits.contact}</span>
                                  <a href={`tel:${ticket.contact}`} className="text-blue-600 hover:underline">
                                    {ticket.contact}
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{t.technicianVisits.reported}</span>
                                <span>{formatDate(ticket.reportedAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{t.technicianVisits.reportedBy}</span>
                                <span>{ticket.reportedBy}</span>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="flex flex-wrap gap-2">
                            {ticket.status !== "Open" && (
                              <Button
                                variant={ticket.status === "Open" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleEmergencyStatusChange(ticket.id, "Open")}
                                disabled={ticket.status === "Open"}
                                className={ticket.status === "Open" ? "bg-destructive text-destructive-foreground" : ""}
                              >
                                {t.technicianVisits.open}
                              </Button>
                            )}
                            {ticket.status !== "EnRoute" && (
                              <Button
                                variant={ticket.status === "EnRoute" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleEmergencyStatusChange(ticket.id, "EnRoute")}
                                disabled={ticket.status === "EnRoute"}
                                className={ticket.status === "EnRoute" ? "bg-chart-1 text-primary-foreground" : ""}
                              >
                                <Navigation2 className="mr-1 h-3 w-3" />
                                {t.technicianVisits.enRoute}
                              </Button>
                            )}
                            {ticket.status !== "InProgress" && (
                              <Button
                                variant={ticket.status === "InProgress" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleEmergencyStatusChange(ticket.id, "InProgress")}
                                disabled={ticket.status === "InProgress"}
                                className={ticket.status === "InProgress" ? "bg-warning text-warning-foreground" : ""}
                              >
                                <Wrench className="mr-1 h-3 w-3" />
                                {t.technicianVisits.inProgress}
                              </Button>
                            )}
                            {ticket.status !== "Resolved" && (
                              <Button
                                variant={ticket.status === "Resolved" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleEmergencyStatusChange(ticket.id, "Resolved")}
                                disabled={ticket.status === "Resolved"}
                                className={ticket.status === "Resolved" ? "bg-success text-success-foreground" : ""}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                {t.technicianVisits.resolved}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Complete Visit Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.technicianVisits.completeVisitDialog}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedVisit && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t.technicianVisits.project} {selectedVisit.projectNumber}</p>
                <p className="text-sm text-muted-foreground">{t.technicianVisits.customer} {selectedVisit.customerName}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">{t.technicianVisits.maintenanceNotes}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.technicianVisits.notesPlaceholder}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">{t.technicianVisits.paymentNotesOptional}</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder={t.technicianVisits.paymentNotesPlaceholder}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPaid"
                checked={isPaid}
                onCheckedChange={(checked) => setIsPaid(checked === true)}
              />
              <Label htmlFor="isPaid" className="cursor-pointer">
                {t.technicianVisits.clientHasPaid}
              </Label>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t.technicianVisits.maintenanceChecklist}</Label>
                {loadingChecklist && (
                  <span className="text-sm text-muted-foreground">{t.technicianVisits.loadingChecklist}</span>
                )}
              </div>
              {loadingChecklist ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.technicianVisits.loadingChecklistItems}
                </div>
              ) : checklistItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-blue-50 border-blue-200">
                  <p className="text-sm font-medium text-blue-900">{t.technicianVisits.noChecklistItems}</p>
                  <p className="text-xs mt-2 text-blue-700">{t.technicianVisits.noChecklistHint}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {checklistItems.map((item) => {
                    const state = checklistState.get(item.id) || { isCompleted: true, notes: "" }
                    const isGood = state.isCompleted
                    return (
                      <div key={item.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                        <div>
                          <Label className="font-medium text-base">{item.title}</Label>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={isGood ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newState = new Map(checklistState)
                              newState.set(item.id, { ...state, isCompleted: true })
                              setChecklistState(newState)
                            }}
                            className={`flex items-center gap-2 ${isGood ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {t.technicianVisits.good}
                          </Button>
                          <Button
                            type="button"
                            variant={!isGood ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newState = new Map(checklistState)
                              newState.set(item.id, { ...state, isCompleted: false })
                              setChecklistState(newState)
                            }}
                            className={`flex items-center gap-2 ${!isGood ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                          >
                            <XCircle className="h-4 w-4" />
                            {t.technicianVisits.bad}
                          </Button>
                        </div>
                        
                        <Textarea
                          value={state.notes || ""}
                          onChange={(e) => {
                            const newState = new Map(checklistState)
                            newState.set(item.id, { ...state, notes: e.target.value })
                            setChecklistState(newState)
                          }}
                          placeholder={t.technicianVisits.addNotesForItem}
                          rows={2}
                          className="mt-2"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              {t.technicianVisits.cancel}
            </Button>
            <Button onClick={handleSubmitComplete} disabled={completingVisit}>
              {completingVisit ? t.technicianVisits.completing : t.technicianVisits.complete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DemoGuidePanel
        title={t.demoGuide.myVisits.title}
        description={t.demoGuide.myVisits.description}
        features={[
          { icon: "📅", label: t.technicianVisits.assignedVisits, description: t.technicianVisits.assignedVisitsDesc },
          { icon: "🚨", label: t.technicianVisits.emergencyTickets, description: t.technicianVisits.emergencyTicketsDesc },
          { icon: "▶️", label: t.technicianVisits.startComplete, description: t.technicianVisits.startCompleteDesc },
        ]}
        tip={t.demoGuide.myVisits.tip}
      />
    </SidebarProvider>
  )
}
