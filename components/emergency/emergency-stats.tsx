"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Navigation2, Wrench, CheckCircle2 } from "lucide-react"
import { getEmergencyTickets, EmergencyTicket } from "@/lib/api"

interface EmergencyStatsProps {
  refreshTrigger?: number
}

export function EmergencyStats({ refreshTrigger }: EmergencyStatsProps = {}) {
  const [tickets, setTickets] = useState<EmergencyTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTickets()
  }, [])

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadTickets()
    }
  }, [refreshTrigger])

  const loadTickets = async () => {
    try {
      const data = await getEmergencyTickets()
      setTickets(data)
    } catch (error) {
      console.error("Failed to load tickets", error)
    } finally {
      setLoading(false)
    }
  }

  // Count tickets by status
  const openTickets = tickets.filter((t) => t.status === "Open")
  const enRouteTickets = tickets.filter((t) => t.status === "EnRoute")
  const inProgressTickets = tickets.filter((t) => t.status === "InProgress")
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved")

  // Additional info for each status
  const highPriorityOpen = openTickets.filter((t) => t.priority === "High").length
  const enRouteWithTech = enRouteTickets.filter((t) => t.assignedTechnicianId).length
  const inProgressWithTech = inProgressTickets.filter((t) => t.assignedTechnicianId).length
  const resolvedToday = resolvedTickets.filter((t) => {
    if (!t.resolvedDate) return false
    const resolved = new Date(t.resolvedDate)
    const today = new Date()
    return resolved.toDateString() === today.toDateString()
  }).length

  if (loading) {
    return (
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-4">
      {/* Open Status Card */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{openTickets.length}</div>
          {highPriorityOpen > 0 ? (
            <p className="text-xs text-destructive mt-1">{highPriorityOpen} high priority</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Awaiting assignment</p>
          )}
        </CardContent>
      </Card>

      {/* EnRoute Status Card */}
      <Card className="border-l-4 border-l-chart-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Route</CardTitle>
          <Navigation2 className="h-4 w-4 text-chart-1" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-chart-1">{enRouteTickets.length}</div>
          {enRouteWithTech > 0 ? (
            <p className="text-xs text-muted-foreground mt-1">{enRouteWithTech} technicians dispatched</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Technicians traveling</p>
          )}
        </CardContent>
      </Card>

      {/* InProgress Status Card */}
      <Card className="border-l-4 border-l-warning">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Wrench className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{inProgressTickets.length}</div>
          {inProgressWithTech > 0 ? (
            <p className="text-xs text-muted-foreground mt-1">{inProgressWithTech} active technicians</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Work in progress</p>
          )}
        </CardContent>
      </Card>

      {/* Resolved Status Card */}
      <Card className="border-l-4 border-l-success">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{resolvedTickets.length}</div>
          {resolvedToday > 0 ? (
            <p className="text-xs text-success mt-1">{resolvedToday} resolved today</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">All completed tickets</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
