"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Clock, MapPin, User, Phone, FileText, Navigation, CheckCircle2, Navigation2, Wrench, Map as MapIcon, ExternalLink } from "lucide-react"
import { EmergencyTicket, Technician } from "@/lib/api"

interface EmergencyDetailProps {
  ticket: EmergencyTicket
  onStatusChange?: (ticketId: string, status: "Open" | "EnRoute" | "InProgress" | "Resolved") => void
  onAssignTechnician?: (ticketId: string, technicianId: string) => void
  technicians?: Technician[]
}

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

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  } catch {
    return dateString
  }
}

export function EmergencyDetail({ ticket, onStatusChange, onAssignTechnician, technicians = [] }: EmergencyDetailProps) {
  return (
    <div className="space-y-6">
      {/* Status Assignment Buttons */}
      {onStatusChange && (
        <Card>
          <CardHeader>
            <CardTitle>Change Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={ticket.status === "Open" ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusChange(ticket.id, "Open")}
                disabled={ticket.status === "Open"}
                className={ticket.status === "Open" ? "bg-destructive text-destructive-foreground" : ""}
              >
                Open
              </Button>
              <Button
                variant={ticket.status === "EnRoute" ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusChange(ticket.id, "EnRoute")}
                disabled={ticket.status === "EnRoute"}
                className={ticket.status === "EnRoute" ? "bg-chart-1 text-primary-foreground" : ""}
              >
                <Navigation2 className="mr-1 h-3 w-3" />
                En Route
              </Button>
              <Button
                variant={ticket.status === "InProgress" ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusChange(ticket.id, "InProgress")}
                disabled={ticket.status === "InProgress"}
                className={ticket.status === "InProgress" ? "bg-warning text-warning-foreground" : ""}
              >
                <Wrench className="mr-1 h-3 w-3" />
                In Progress
              </Button>
              <Button
                variant={ticket.status === "Resolved" ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusChange(ticket.id, "Resolved")}
                disabled={ticket.status === "Resolved"}
                className={ticket.status === "Resolved" ? "bg-success text-success-foreground" : ""}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Resolved
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technician Assignment */}
      {onAssignTechnician && technicians.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Technician</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={ticket.assignedTechnicianId || "unassign"}
              onValueChange={(value) => {
                if (value === "unassign") {
                  onAssignTechnician(ticket.id, "")
                } else {
                  onAssignTechnician(ticket.id, value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a technician" />
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
          </CardContent>
        </Card>
      )}

      {/* Ticket Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Ticket #{ticket.ticketNumber}</CardTitle>
            <div className="flex gap-2">
              <Badge className={priorityColors[ticket.priority] || priorityColors.Medium}>
                {ticket.priority} priority
              </Badge>
              <Badge className={statusColors[ticket.status] || statusColors.Open}>
                {ticket.status.replace(/([A-Z])/g, " $1").trim()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-lg font-semibold">
              {ticket.project} - Unit {ticket.unitId}
            </h4>
            <p className="text-muted-foreground">{ticket.description}</p>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">{ticket.location}</span>
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
              <span className="text-muted-foreground">Reported:</span>
              <span className="font-medium">{formatDate(ticket.reportedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reported By:</span>
              <span className="font-medium">{ticket.reportedBy}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Contact:</span>
              <span className="font-medium">{ticket.contact}</span>
            </div>
            {ticket.assignedTechnicianName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned To:</span>
                <span className="font-medium">{ticket.assignedTechnicianName}</span>
              </div>
            )}
            {ticket.resolvedDate && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Resolved:</span>
                <span className="font-medium">{formatDate(ticket.resolvedDate)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-2 md:grid-cols-2">
        <Button className="w-full">
          <Navigation className="mr-2 h-4 w-4" />
          Navigate to Site
        </Button>
        <Button variant="outline" className="w-full bg-transparent">
          <Phone className="mr-2 h-4 w-4" />
          Call Contact
        </Button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Ticket Created</p>
                <p className="text-xs text-muted-foreground">
                  Reported by {ticket.reportedBy} at {formatDate(ticket.reportedAt)}
                </p>
              </div>
            </div>
            {ticket.assignedTechnicianName && (
              <>
                <div className="ml-4 h-4 w-0.5 bg-border" />
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Technician Assigned</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.assignedTechnicianName} is handling this emergency
                    </p>
                  </div>
                </div>
              </>
            )}
            {ticket.resolvedDate && (
              <>
                <div className="ml-4 h-4 w-0.5 bg-border" />
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/20">
                    <Clock className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ticket Resolved</p>
                    <p className="text-xs text-muted-foreground">
                      Resolved at {formatDate(ticket.resolvedDate)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {ticket.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Work Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{ticket.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
