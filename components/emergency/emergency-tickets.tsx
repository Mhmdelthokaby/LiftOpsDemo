"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EmergencyDetail } from "./emergency-detail"
import { EmergencyForm } from "./emergency-form"
import {
  getEmergencyTickets,
  EmergencyTicket,
  assignEmergencyTechnician,
  resolveEmergencyTicket,
  deleteEmergencyTicket,
  updateEmergencyTicket,
  getTechnicians,
  Technician,
} from "@/lib/api"
import { AlertTriangle, Clock, MapPin, User, Phone, Edit, Trash2, CheckCircle2, Navigation2, Wrench, Map as MapIcon, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const priorityColors: Record<string, string> = {
  High: "bg-destructive text-destructive-foreground",
  Medium: "bg-warning text-warning-foreground",
  Low: "bg-secondary text-secondary-foreground",
}

const statusColors: Record<string, string> = {
  Open: "bg-destructive text-destructive-foreground",
  EnRoute: "bg-chart-1 text-primary-foreground",
  InProgress: "bg-warning text-warning-foreground",
  Resolved: "bg-success text-success-foreground",
}

interface EmergencyTicketsProps {
  refreshTrigger?: number
}

export function EmergencyTickets({ refreshTrigger }: EmergencyTicketsProps = {}) {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<EmergencyTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<EmergencyTicket | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState<string | undefined>()
  const [technicians, setTechnicians] = useState<Technician[]>([])

  useEffect(() => {
    loadTickets()
    loadTechnicians()
  }, [])

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadTickets()
    }
  }, [refreshTrigger])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const data = await getEmergencyTickets()
      setTickets(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load emergency tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTechnicians = async () => {
    try {
      const techs = await getTechnicians()
      setTechnicians(techs)
    } catch (error: any) {
      console.error("Failed to load technicians", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return
    try {
      await deleteEmergencyTicket(id)
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      })
      loadTickets()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ticket",
        variant: "destructive",
      })
    }
  }

  const handleAssignTechnician = async (ticketId: string, technicianId: string) => {
    if (!technicianId) return
    try {
      await assignEmergencyTechnician(ticketId, technicianId)
      toast({
        title: "Success",
        description: "Technician assigned successfully",
      })
      loadTickets()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign technician",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: "Open" | "EnRoute" | "InProgress" | "Resolved") => {
    try {
      const ticket = tickets.find(t => t.id === ticketId)
      if (!ticket) return

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
      toast({
        title: "Success",
        description: `Ticket status updated to ${newStatus}`,
      })
      loadTickets()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const handleResolve = async (ticketId: string) => {
    try {
      await resolveEmergencyTicket(ticketId)
      toast({
        title: "Success",
        description: "Ticket resolved successfully",
      })
      loadTickets()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve ticket",
        variant: "destructive",
      })
    }
  }

  const filterTickets = (status: string) => {
    // Map filter values to actual status values
    const statusMap: Record<string, string> = {
      "open": "Open",
      "enroute": "EnRoute",
      "en-route": "EnRoute",
      "inprogress": "InProgress",
      "in-progress": "InProgress",
      "resolved": "Resolved",
    }
    
    const actualStatus = statusMap[status.toLowerCase()] || status
    return tickets.filter((t) => t.status === actualStatus)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return dateString
    }
  }

  const TicketList = ({ status }: { status: string }) => {
    const filtered = filterTickets(status)

    if (loading) {
      return <div className="text-center py-8">Loading...</div>
    }

    if (filtered.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No tickets found</div>
    }

    return (
      <div className="grid gap-4">
        {filtered.map((ticket) => {
          const priorityLower = ticket.priority.toLowerCase()
          const statusNormalized = ticket.status.replace(/([A-Z])/g, "-$1").toLowerCase().substring(1)
          return (
            <Card key={ticket.id} className={ticket.priority === "High" ? "border-destructive" : ""}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold">#{ticket.ticketNumber}</h3>
                        <Badge className={priorityColors[ticket.priority] || priorityColors.Medium}>
                          {ticket.priority}
                        </Badge>
                        <Badge className={statusColors[ticket.status] || statusColors.Open}>
                          {ticket.status.replace(/([A-Z])/g, " $1").trim()}
                        </Badge>
                      </div>
                      <h4 className="mb-1 text-lg font-medium">
                        {ticket.project} - Unit {ticket.unitId}
                      </h4>
                      <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    </div>
                    {ticket.priority === "High" && <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />}
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
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
                          Open map
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(ticket.reportedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{ticket.assignedTechnicianName || "Unassigned"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{ticket.contact}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Status Assignment Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={ticket.status === "Open" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(ticket.id, "Open")}
                        disabled={ticket.status === "Open"}
                        className={ticket.status === "Open" ? "bg-destructive text-destructive-foreground" : ""}
                      >
                        Open
                      </Button>
                      <Button
                        variant={ticket.status === "EnRoute" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(ticket.id, "EnRoute")}
                        disabled={ticket.status === "EnRoute"}
                        className={ticket.status === "EnRoute" ? "bg-chart-1 text-primary-foreground" : ""}
                      >
                        <Navigation2 className="mr-1 h-3 w-3" />
                        En Route
                      </Button>
                      <Button
                        variant={ticket.status === "InProgress" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(ticket.id, "InProgress")}
                        disabled={ticket.status === "InProgress"}
                        className={ticket.status === "InProgress" ? "bg-warning text-warning-foreground" : ""}
                      >
                        <Wrench className="mr-1 h-3 w-3" />
                        In Progress
                      </Button>
                      <Button
                        variant={ticket.status === "Resolved" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(ticket.id, "Resolved")}
                        disabled={ticket.status === "Resolved"}
                        className={ticket.status === "Resolved" ? "bg-success text-success-foreground" : ""}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Resolved
                      </Button>
                    </div>

                    {/* Technician Assignment and Actions */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={ticket.assignedTechnicianId || "unassign"}
                          onValueChange={(value) => {
                            if (value === "unassign") {
                              handleAssignTechnician(ticket.id, "")
                            } else {
                              handleAssignTechnician(ticket.id, value)
                            }
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Assign Technician" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassign">Unassign</SelectItem>
                            {technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>
                                {tech.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm" onClick={() => setSelectedTicket(ticket)}>
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Emergency Ticket #{ticket.ticketNumber}</DialogTitle>
                          </DialogHeader>
                          {selectedTicket && <EmergencyDetail ticket={selectedTicket} onStatusChange={handleStatusChange} onAssignTechnician={handleAssignTechnician} technicians={technicians} />}
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTicketId(ticket.id)
                          setFormOpen(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(ticket.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="enroute">En Route</TabsTrigger>
          <TabsTrigger value="inprogress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <TicketList status="open" />
        </TabsContent>
        <TabsContent value="enroute">
          <TicketList status="enroute" />
        </TabsContent>
        <TabsContent value="inprogress">
          <TicketList status="inprogress" />
        </TabsContent>
        <TabsContent value="resolved">
          <TicketList status="resolved" />
        </TabsContent>
      </Tabs>

      <EmergencyForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingTicketId(undefined)
        }}
        ticketId={editingTicketId}
        onSuccess={loadTickets}
      />
    </>
  )
}
