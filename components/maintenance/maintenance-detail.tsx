"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, User, Wrench, Camera, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMaintenanceChecklistItems, type MaintenanceChecklistItem } from "@/lib/api"

type MaintenanceVisit = {
  id: string
  date: string
  time: string
  project: string
  location: string
  units: number
  technician: string
  status: "scheduled" | "completed" | "in-progress"
  type: "routine" | "inspection" | "repair"
}

interface MaintenanceDetailProps {
  visit: MaintenanceVisit
}

export function MaintenanceDetail({ visit }: MaintenanceDetailProps) {
  const [checklistItems, setChecklistItems] = useState<MaintenanceChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchChecklistItems = async () => {
      try {
        setLoading(true)
        const items = await getMaintenanceChecklistItems(false) // Only active items
        setChecklistItems(items.sort((a, b) => a.order - b.order))
      } catch (error) {
        console.error("Failed to load checklist items:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchChecklistItems()
  }, [])

  const handleChecklistToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }
  const statusColors = {
    scheduled: "bg-chart-1 text-primary-foreground",
    completed: "bg-green-600 text-white",
    "in-progress": "bg-warning text-warning-foreground",
  }

  return (
    <div className="space-y-6">
      {/* Visit Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{visit.project}</CardTitle>
            <Badge className={statusColors[visit.status]}>{visit.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">
              {visit.date} at {visit.time}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Location:</span>
            <span className="font-medium">{visit.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Technician:</span>
            <span className="font-medium">{visit.technician}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Units:</span>
            <span className="font-medium">
              {visit.units} unit{visit.units > 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : checklistItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No checklist items available. Please add checklist items in the "Manage Checklist Items" tab.
            </p>
          ) : (
            checklistItems.map((item, index) => (
              <div key={item.id}>
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id={item.id} 
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => handleChecklistToggle(item.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={item.id} className="text-sm font-normal leading-tight cursor-pointer">
                      {item.title}
                    </Label>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                {index < checklistItems.length - 1 && <Separator className="mt-4" />}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Work Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full bg-transparent">
            <Camera className="mr-2 h-4 w-4" />
            Upload Photos
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Capture photos of completed work and any issues found</p>
        </CardContent>
      </Card>
    </div>
  )
}
