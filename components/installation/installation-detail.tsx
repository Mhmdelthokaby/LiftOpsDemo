import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, Calendar, User, MapPin } from "lucide-react"
import { Progress } from "@/components/ui/progress"

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

interface InstallationDetailProps {
  unit: InstallationUnit
}

const statusConfig = {
  completed: { icon: Check, color: "text-success", label: "Completed" },
  "in-progress": { icon: Clock, color: "text-warning", label: "In Progress" },
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
}

export function InstallationDetail({ unit }: InstallationDetailProps) {
  const completedPhases = unit.phases.filter((p) => p.status === "completed").length
  const progress = (completedPhases / unit.phases.length) * 100

  return (
    <div className="space-y-6">
      {/* Unit Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>
                {unit.project} - Unit {unit.unitId}
              </CardTitle>
              <CardDescription className="mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {unit.location}
                </span>
              </CardDescription>
            </div>
            <Badge variant="outline" className="capitalize">
              {unit.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold">
                {completedPhases} of {unit.phases.length} phases complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Phase Details */}
      <div className="space-y-4">
        {unit.phases.map((phase, index) => {
          const config = statusConfig[phase.status]
          const Icon = config.icon
          const isLast = index === unit.phases.length - 1

          return (
            <div key={phase.phase} className="relative">
              <Card className={phase.status === "in-progress" ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        phase.status === "completed"
                          ? "bg-success/20"
                          : phase.status === "in-progress"
                            ? "bg-warning/20"
                              : "bg-muted"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Phase {phase.phase}: {phase.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={`mt-1 ${
                          phase.status === "completed"
                            ? "bg-green-600 text-white"
                            : phase.status === "in-progress"
                              ? "bg-warning/20 text-warning"
                                : ""
                        }`}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {phase.supervisor && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Supervisor:</span>
                      <span className="font-medium">{phase.supervisor}</span>
                    </div>
                  )}
                  {phase.startDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{phase.startDate}</span>
                    </div>
                  )}
                  {phase.endDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">{phase.endDate}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              {!isLast && <div className="ml-5 h-4 w-0.5 bg-border" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
