"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Check, Clock, Camera, Loader2, RefreshCw } from "lucide-react"
import { InstallationDetail } from "./installation-detail"
import { useState, useEffect } from "react"
import { getProjects, type InstallationProject, type Elevator, type InstallationStage } from "@/lib/api"
import { formatDate } from "@/lib/utils"

type InstallationUnit = {
  id: string
  unitId: string
  project: string
  location: string
  type: "elevator" | "escalator"
  currentPhase: 1 | 2 | 3 | 4
  phases: {
    phase: number
    name: string
    status: "completed" | "in-progress" | "pending"
    startDate?: string
    endDate?: string
    supervisor?: string
  }[]
}

// Phase name mapping
const PHASE_NAMES: Record<number, string> = {
  1: "Shipping/Foundation",
  2: "Mechanical Installation",
  3: "Electrical & Systems",
  4: "Testing & Handover",
}

// Map backend status to frontend status
// Backend returns: "Pending", "InProgress", or "Success" (from enum ToString())
const mapStatus = (status: string): "completed" | "in-progress" | "pending" => {
  const normalized = status.toLowerCase().replace(/\s+/g, "")
  if (normalized === "success") return "completed"
  if (normalized === "inprogress" || normalized === "in-progress") return "in-progress"
  return "pending" // Default to pending for unknown statuses
}

// Transform backend data to frontend format
const transformToInstallationUnits = (projects: InstallationProject[]): InstallationUnit[] => {
  const units: InstallationUnit[] = []

  projects.forEach((project) => {
    project.elevators.forEach((elevator, elevatorIndex) => {
      // Ensure we have 4 stages (create placeholder stages if missing)
      const stages: InstallationStage[] = []
      for (let i = 1; i <= 4; i++) {
        const existingStage = elevator.stages.find((s) => s.stageNumber === i)
        if (existingStage) {
          stages.push(existingStage)
        } else {
          // Create placeholder stage
          stages.push({
            id: `${elevator.id}-stage-${i}`,
            stageNumber: i,
            status: "Pending",
            isPriceCollected: false,
          })
        }
      }

      // Sort stages by stage number
      stages.sort((a, b) => a.stageNumber - b.stageNumber)

      // Determine current phase (highest in-progress, or first pending if none in-progress)
      let currentPhase: 1 | 2 | 3 | 4 = 1
      let highestInProgress = 0
      let firstPending = 0
      
      for (let i = 0; i < stages.length; i++) {
        const status = mapStatus(stages[i].status)
        if (status === "in-progress") {
          highestInProgress = i + 1
        } else if (status === "pending" && firstPending === 0) {
          firstPending = i + 1
        }
      }
      
      if (highestInProgress > 0) {
        currentPhase = highestInProgress as 1 | 2 | 3 | 4
      } else if (firstPending > 0) {
        currentPhase = firstPending as 1 | 2 | 3 | 4
      } else {
        // All completed, show phase 4
        currentPhase = 4
      }

      // Transform stages to phases
      const phases = stages.map((stage) => ({
        phase: stage.stageNumber,
        name: PHASE_NAMES[stage.stageNumber] || `Phase ${stage.stageNumber}`,
        status: mapStatus(stage.status),
        startDate: stage.startDate ? formatDate(stage.startDate) : undefined,
        endDate: stage.endDate ? formatDate(stage.endDate) : undefined,
        supervisor: undefined, // Backend doesn't provide supervisor info in current DTO
      }))

      // Determine unit type from elevator type
      const elevatorType = elevator.elevatorType?.toLowerCase() || "elevator"
      const type: "elevator" | "escalator" = elevatorType.includes("escalator") ? "escalator" : "elevator"

      // Generate unit ID (use project number and elevator index)
      const unitId = project.projectNumber 
        ? `${project.projectNumber}-${elevatorIndex + 1}` 
        : `E-${elevatorIndex + 1}-${elevator.id.substring(0, 4).toUpperCase()}`

      units.push({
        id: elevator.id,
        unitId,
        project: project.customerName || project.projectNumber || "Unnamed Project",
        location: project.customerAddress || "Location not specified",
        type,
        currentPhase,
        phases,
      })
    })
  })

  return units
}

const statusConfig = {
  completed: { icon: Check, color: "text-success", bgColor: "bg-success/10" },
  "in-progress": { icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  pending: { icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
}

interface InstallationPipelineProps {
  filter: "all" | "phase1" | "phase2" | "phase3" | "phase4"
}

export function InstallationPipeline({ filter }: InstallationPipelineProps) {
  const [selectedUnit, setSelectedUnit] = useState<InstallationUnit | null>(null)
  const [installations, setInstallations] = useState<InstallationUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInstallations = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      // Fetch all projects first, then filter for active/completed ones with stages
      const projects = await getProjects()
      
      // Only include projects with status "Active", "InProgress", or "Completed" that have stages (stages 1-4)
      const activeProjects = projects.filter(project => {
        const status = project.status?.toLowerCase().replace(/\s+/g, "")
        // Show Active, InProgress, or Completed projects (exclude pending, rejected, underinspectionandquotation)
        if (status !== 'active' && status !== 'inprogress' && status !== 'completed') {
          return false
        }
        
        // Check if project has elevators with stages
        if (!project.elevators || project.elevators.length === 0) {
          return false
        }
        
        // Only include projects that have at least one elevator with at least one stage (1-4)
        const hasStages = project.elevators.some(elevator => {
          if (!elevator.stages || elevator.stages.length === 0) {
            return false
          }
          // Check if there's at least one stage with stageNumber 1-4
          return elevator.stages.some(stage => {
            return stage.stageNumber >= 1 && stage.stageNumber <= 4
          })
        })
        return hasStages
      })
      const units = transformToInstallationUnits(activeProjects)
      setInstallations(units)
    } catch (err) {
      console.error("Error fetching installations:", err)
      setError(err instanceof Error ? err.message : "Failed to load installations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInstallations()
  }, [])

  const filteredInstallations = installations.filter((installation) => {
    if (filter === "all") {
      // All Units - show all units that are in progress in any stages 1, 2, 3, or 4
      return true
    }
    
    const phaseNumber = Number.parseInt(filter.replace("phase", ""))
    // Filter by installations where the specified phase is the current active phase
    const targetPhase = installation.phases.find((p) => p.phase === phaseNumber)
    if (!targetPhase) return false
    
    // Show if the phase is in-progress
    if (targetPhase.status === "in-progress") return true
    
    // Show if the phase is pending AND all previous phases are completed (ready to start this phase)
    if (targetPhase.status === "pending") {
      const previousPhases = installation.phases.filter((p) => p.phase < phaseNumber)
      const allPreviousCompleted = previousPhases.every((p) => p.status === "completed")
      return allPreviousCompleted
    }
    
    // Don't show if phase is completed (already moved to next phase or all done)
    return false
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading installations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchInstallations(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive font-medium">Error loading installations</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fetchInstallations()}
          >
            Retry
          </Button>
        </div>
      )}

      {!error && filteredInstallations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No installations found</p>
          {filter !== "all" && (
            <p className="text-sm text-muted-foreground mt-1">
              No units are currently in Phase {filter.replace("phase", "")}
            </p>
          )}
        </div>
      )}

      {!error && filteredInstallations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredInstallations.map((installation) => (
        <Card key={installation.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {installation.project} - {installation.unitId}
                </CardTitle>
                <CardDescription>{installation.location}</CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">
                {installation.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phase Progress */}
            <div className="space-y-3">
              {installation.phases.map((phase) => {
                const config = statusConfig[phase.status]
                const Icon = config.icon

                return (
                  <div key={phase.phase} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">
                        Phase {phase.phase}: {phase.name}
                      </p>
                      {phase.supervisor && (
                        <p className="text-xs text-muted-foreground">Supervisor: {phase.supervisor}</p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        phase.status === "completed"
                          ? "bg-green-600 text-white"
                          : phase.status === "in-progress"
                            ? "bg-warning/20 text-warning"
                              : ""
                      }
                    >
                      {phase.status === "completed" ? "Completed" : phase.status === "in-progress" ? "In Progress" : "Pending"}
                    </Badge>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="flex-1" onClick={() => setSelectedUnit(installation)}>
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Installation Details</DialogTitle>
                  </DialogHeader>
                  {selectedUnit && <InstallationDetail unit={selectedUnit} />}
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm">
                <Camera className="mr-2 h-4 w-4" />
                Photos
              </Button>
            </div>
          </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  )
}
