"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getProjectDetails, startStage, approveInspection, rejectProject, InstallationProject, InstallationStage } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, CheckCircle2, Clock, MapPin, Phone, Mail, FileText, Plus, Hammer, Edit, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { StageManagementDialog } from "@/components/installation/stage-management-dialog"
import { EditProjectDialog } from "@/components/installation/edit-project-dialog"

export default function ProjectDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [project, setProject] = useState<InstallationProject | null>(null)
    const [loading, setLoading] = useState(true)
    const [stageDialogOpen, setStageDialogOpen] = useState(false)
    const [selectedStage, setSelectedStage] = useState<{ stageId: string; stageNumber: number; elevatorId: string } | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [activeElevatorTab, setActiveElevatorTab] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchProject()
        }
    }, [id])

    const fetchProject = async () => {
        if (!id) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const data = await getProjectDetails(id)
            console.log('=== PROJECT DATA FROM API ===')
            console.log('Full project:', JSON.stringify(data, null, 2))
            console.log('Contract dates:', {
                contractDate: data.contractDate,
                installationStartDate: data.installationStartDate,
                expectedFinishDate: data.expectedFinishDate
            })
            setProject(data)
            
            // Preserve active elevator tab if it exists, otherwise set to first elevator
            if (data.elevators && data.elevators.length > 0) {
                if (!activeElevatorTab || !data.elevators.find(e => `elevator-${e.id}` === activeElevatorTab)) {
                    setActiveElevatorTab(`elevator-${data.elevators[0]?.id}`)
                }
            }
        } catch (error: any) {
            console.error("Error fetching project:", error)
            const errorMessage = error?.message || error?.data?.message || "Failed to load project details"
            toast.error(errorMessage)
            if (errorMessage.includes("not found") || errorMessage.includes("404")) {
                router.push("/projects")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleApproveInspection = async () => {
        if (!project) return;
        try {
            await approveInspection(project.id)
            toast.success("Inspection approved successfully. Project is now active.")
            fetchProject()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to approve inspection")
        }
    }

    const handleRejectProject = async () => {
        if (!project) return;
        try {
            await rejectProject(project.id)
            toast.success("Project rejected successfully.")
            fetchProject()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reject project")
        }
    }

    // Helper function to check if stages should be disabled
    const isStagesDisabled = () => {
        const status = project?.status?.toLowerCase()
        return status === "pending" || status === "rejected"
    }

    const handleStartStage = async (stageId: string) => {
        if (!project) return;
        
        // Prevent starting stages if project is pending or rejected
        if (isStagesDisabled()) {
            const statusMessage = project.status?.toLowerCase() === "pending" 
                ? "Project inspection must be approved first."
                : "Cannot start stage. Project has been rejected."
            toast.error(`Cannot start stage. ${statusMessage}`)
            return;
        }

        try {
            await startStage(stageId)
            toast.success("Stage started")
            fetchProject()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to start stage")
        }
    }

    const handleOpenStageDialog = (stageId: string, stageNumber: number, elevatorId: string) => {
        // Prevent opening stage dialog if stages are disabled
        if (isStagesDisabled()) {
            const statusMessage = project?.status?.toLowerCase() === "pending" 
                ? "Project inspection must be approved first."
                : "Cannot complete stage. Project has been rejected."
            toast.error(statusMessage)
            return;
        }
        // Set the active elevator tab to the elevator containing this stage
        setActiveElevatorTab(`elevator-${elevatorId}`)
        setSelectedStage({ stageId, stageNumber, elevatorId })
        setStageDialogOpen(true)
    }

    const handleStageDialogComplete = async () => {
        try {
            await fetchProject()
        } catch (error) {
            console.error("Error refreshing project after stage completion:", error)
        } finally {
            setStageDialogOpen(false)
            setSelectedStage(null)
        }
    }

    const handleStageDialogSave = () => {
        // Refresh project data but don't close dialog
        fetchProject()
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "success": return "text-green-500"
            case "inprogress": return "text-blue-500"
            case "pending": return "text-muted-foreground"
            default: return ""
        }
    }

    const getProgress = (stages: InstallationStage[]) => {
        const completed = stages.filter(s => s.status.toLowerCase() === "success").length
        return (completed / stages.length) * 100
    }

    const areAllStagesCompleted = (stages: InstallationStage[]) => {
        return stages.length === 4 && stages.every(s => s.status.toLowerCase() === "success")
    }

    if (loading) return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 text-center">Loading project details...</main>
                </div>
            </div>
        </SidebarProvider>
    )

    if (!project) return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 text-center">Project not found</main>
                </div>
            </div>
        </SidebarProvider>
    )

    return (
        <SidebarProvider defaultOpen>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <main className="flex-1 p-8 pt-6 max-w-6xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Projects
                            </Button>
                            <div className="flex space-x-2 items-center">
                                {project.status?.toLowerCase() === "pending" && (
                                    <>
                                        <Button 
                                            onClick={handleApproveInspection}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                        </Button>
                                        <Button 
                                            onClick={handleRejectProject}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Project
                                </Button>
                                {project.status?.toLowerCase() === "completed" ? (
                                    <Badge className="bg-green-600 text-white px-3 py-1">Overall Status: Completed</Badge>
                                ) : project.status?.toLowerCase() === "pending" ? (
                                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-3 py-1">Overall Status: Pending Inspection</Badge>
                                ) : project.status?.toLowerCase() === "rejected" ? (
                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-3 py-1">Overall Status: Rejected</Badge>
                                ) : (
                                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1">Overall Status: {project.status}</Badge>
                                )}
                            </div>
                        </div>

                        {project.status?.toLowerCase() === "pending" && (
                            <Card className="border-yellow-500/50 bg-yellow-500/10">
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <Clock className="h-5 w-5 text-yellow-500" />
                                        <div className="flex-1">
                                            <div className="font-semibold text-yellow-700 dark:text-yellow-400">Project Pending Inspection Approval</div>
                                            <div className="text-sm text-yellow-600 dark:text-yellow-300">
                                                This project is waiting for inspection approval. Stages cannot be started until the inspection is approved.
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button 
                                                onClick={handleApproveInspection}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                            <Button 
                                                onClick={handleRejectProject}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                <XCircle className="mr-2 h-4 w-4" /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {project.status?.toLowerCase() === "rejected" && (
                            <Card className="border-red-500/50 bg-red-500/10">
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <XCircle className="h-5 w-5 text-red-500" />
                                        <div className="flex-1">
                                            <div className="font-semibold text-red-700 dark:text-red-400">Project Rejected</div>
                                            <div className="text-sm text-red-600 dark:text-red-300">
                                                This project has been rejected. Stages cannot be started or completed.
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Left Column: Project & Customer Info */}
                            <div className="space-y-6">
                                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-primary">{project.projectNumber}</CardTitle>
                                        <CardDescription>Project identification</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(project.projectAddress || project.city) && (
                                            <div className="flex items-start space-x-3">
                                                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                                <div className="text-sm">
                                                    <div className="text-muted-foreground">Project Address</div>
                                                    <div className="font-medium">
                                                        {project.projectAddress || project.customerAddress}
                                                        {project.city && `, ${project.city}`}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {project.googleMapsLink && (() => {
                                            // Validate URL - must be a valid Google Maps URL
                                            const isValidUrl = (url: string): boolean => {
                                                if (!url || url.trim().length === 0) return false
                                                // Check if it contains error messages or invalid characters
                                                if (url.includes('ApiError') || url.includes('parseResponse') || url.includes('localhost:3000')) return false
                                                // Check if it's a valid URL format
                                                try {
                                                    const urlObj = url.startsWith('http://') || url.startsWith('https://') 
                                                        ? new URL(url) 
                                                        : new URL(`https://${url}`)
                                                    // Check if it's a Google Maps domain
                                                    return urlObj.hostname.includes('google.com') || 
                                                           urlObj.hostname.includes('maps.app') ||
                                                           urlObj.hostname.includes('goo.gl') ||
                                                           urlObj.hostname.includes('maps.google')
                                                } catch {
                                                    return false
                                                }
                                            }
                                            
                                            const isValid = isValidUrl(project.googleMapsLink)
                                            
                                            if (!isValid) return null
                                            
                                            const mapUrl = project.googleMapsLink.startsWith('http://') || project.googleMapsLink.startsWith('https://') 
                                                ? project.googleMapsLink 
                                                : `https://${project.googleMapsLink}`
                                            
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>Google Maps Location</span>
                                                    </div>
                                                    <div className="w-full h-48 rounded-lg overflow-hidden border border-border/40">
                                                        {project.googleMapsLink.includes('/embed') ? (
                                                            <iframe
                                                                src={mapUrl}
                                                                width="100%"
                                                                height="100%"
                                                                style={{ border: 0 }}
                                                                allowFullScreen
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer-when-downgrade"
                                                            />
                                                        ) : (
                                                            <a
                                                                href={mapUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    window.open(mapUrl, '_blank', 'noopener,noreferrer')
                                                                }}
                                                                className="flex items-center justify-center h-full bg-muted/50 hover:bg-muted transition-colors text-primary cursor-pointer"
                                                            >
                                                                <div className="text-center">
                                                                    <MapPin className="h-8 w-8 mx-auto mb-2" />
                                                                    <span className="text-sm font-medium">View on Google Maps</span>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                        <div className="flex items-center space-x-3">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">Contract: {formatDate(project.contractDate)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl">Customer Contact</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="font-semibold">{project.customerName}</div>
                                        <div className="flex items-center space-x-3 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span>Contact via Project Logs</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Elevator Workflows */}
                            <div className="md:col-span-2 space-y-6">
                                {project.elevators && project.elevators.length > 0 ? (
                                    <Tabs 
                                        value={activeElevatorTab || `elevator-${project.elevators[0]?.id}`} 
                                        onValueChange={setActiveElevatorTab}
                                        className="w-full"
                                    >
                                        <TabsList className="bg-muted/50 w-full justify-start p-1 h-auto flex-wrap">
                                            {project.elevators.map((elevator, i) => {
                                                const allCompleted = areAllStagesCompleted(elevator.stages);
                                                return (
                                                    <TabsTrigger 
                                                        key={elevator.id} 
                                                        value={`elevator-${elevator.id}`} 
                                                        className="data-[state=active]:bg-card data-[state=active]:text-primary py-2"
                                                        title={allCompleted ? "All stages completed - Cannot be updated" : ""}
                                                    >
                                                        Elevator {i + 1} ({elevator.elevatorType})
                                                        {allCompleted && (
                                                            <span className="ml-2 text-xs" title="Cannot update - All stages completed">
                                                                🔒
                                                            </span>
                                                        )}
                                                    </TabsTrigger>
                                                );
                                            })}
                                        </TabsList>

                                        {project.elevators.map((elevator) => {
                                            const allCompleted = areAllStagesCompleted(elevator.stages);
                                            return (
                                            <TabsContent key={elevator.id} value={`elevator-${elevator.id}`} className="mt-4 space-y-4">
                                                {allCompleted && (
                                                    <Card className="border-green-500/50 bg-green-500/10 mb-4">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start space-x-3">
                                                                <div className="mt-0.5">
                                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-green-700 dark:text-green-400 mb-1">
                                                                        ✅ Elevator Installation Completed
                                                                    </div>
                                                                    <div className="text-sm text-green-600 dark:text-green-300">
                                                                        All stages are completed. This elevator installation is finished and details cannot be modified.
                                                                    </div>
                                                                    <div className="text-xs text-green-500/80 dark:text-green-400/80 mt-2 font-medium">
                                                                        Locked: Price, dimensions, type, and other specifications are now permanent.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                                <div className="flex items-center justify-between mb-2 px-2">
                                                    <div className="text-sm font-medium">Installation Progress</div>
                                                    <div className="text-sm font-bold text-primary">{Math.round(getProgress(elevator.stages))}%</div>
                                                </div>
                                                <Progress value={getProgress(elevator.stages)} className="h-2 mb-6" />

                                            <div className={`grid gap-4 ${isStagesDisabled() ? 'opacity-60' : ''}`}>
                                                {elevator.stages.sort((a, b) => a.stageNumber - b.stageNumber).map((stage) => (
                                                    <Card key={stage.id} className={`border-border/40 ${stage.status.toLowerCase() === 'inprogress' ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/5' : 'bg-card/30'} ${isStagesDisabled() ? 'pointer-events-none' : ''}`}>
                                                        <CardContent className="p-4 flex items-center justify-between">
                                                            <div className="flex items-center space-x-4">
                                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${stage.status.toLowerCase() === 'success' ? 'bg-green-500/20 border-green-500 text-green-500' :
                                                                        stage.status.toLowerCase() === 'inprogress' ? 'bg-blue-500/20 border-blue-500 text-blue-500 animate-pulse' :
                                                                            'bg-muted/30 border-muted-foreground/30 text-muted-foreground'
                                                                    }`}>
                                                                    {stage.status.toLowerCase() === 'success' ? <CheckCircle2 className="h-5 w-5" /> : stage.stageNumber}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold">Stage {stage.stageNumber}</div>
                                                                    <div className={`text-xs capitalize ${getStatusColor(stage.status)}`}>{stage.status}</div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center space-x-2">
                                                                {stage.status.toLowerCase() === 'pending' && (
                                                                    <Button 
                                                                        size="sm" 
                                                                        onClick={() => handleStartStage(stage.id)}
                                                                        disabled={isStagesDisabled()}
                                                                        title={isStagesDisabled() ? (project.status?.toLowerCase() === "pending" ? "Project inspection must be approved first" : "Project has been rejected") : ""}
                                                                    >
                                                                        Start Stage
                                                                    </Button>
                                                                )}
                                                                {stage.status.toLowerCase() === 'inprogress' && (
                                                                    <Button 
                                                                        size="sm" 
                                                                        onClick={() => handleOpenStageDialog(stage.id, stage.stageNumber, elevator.id)} 
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                        disabled={isStagesDisabled()}
                                                                        title={isStagesDisabled() ? (project.status?.toLowerCase() === "pending" ? "Project inspection must be approved first" : "Project has been rejected") : ""}
                                                                    >
                                                                        <Hammer className="mr-2 h-4 w-4" /> Complete Stage
                                                                    </Button>
                                                                )}
                                                                {stage.status.toLowerCase() === 'success' && (
                                                                    <div className="flex items-center space-x-2">
                                                                        {stage.stagePrice && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                        {stage.isPriceCollected ? "Paid" : "Unpaid"}: {stage.stagePrice.toFixed(2)}
                                                                            </Badge>
                                                                        )}
                                                                        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                                                                            <FileText className="mr-2 h-4 w-4" /> Report
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </TabsContent>
                                        );
                                        })}
                                    </Tabs>
                                ) : (
                                    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                                        <CardContent className="p-8 text-center text-muted-foreground">
                                            <p>No elevators found for this project.</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Stage Management Dialog */}
            {selectedStage && project && (() => {
                const elevator = project.elevators.find(e => e.id === selectedStage.elevatorId)
                if (!elevator) return null
                const stage = elevator.stages.find(s => s.id === selectedStage.stageId)
                // Use the fixed elevator price (never changes) - NOT the sum of stage prices
                const elevatorTotalPrice = elevator.price || 0
                return (
                    <StageManagementDialog
                        open={stageDialogOpen}
                        onOpenChange={setStageDialogOpen}
                        stageId={selectedStage.stageId}
                        stageNumber={selectedStage.stageNumber}
                        elevatorTotalPrice={elevatorTotalPrice}
                        existingStagePrices={elevator.stages.map(s => ({ stageNumber: s.stageNumber, price: s.stagePrice }))}
                        stageStartDate={stage?.startDate}
                        projectInstallationStartDate={project.installationStartDate || undefined}
                        projectExpectedFinishDate={project.expectedFinishDate || undefined}
                        projectStatus={project.status}
                        customerId={project.customerId}
                        onComplete={handleStageDialogComplete}
                        onSave={handleStageDialogSave}
                    />
                )
            })()}

            {/* Edit Project Dialog */}
            {project && (
                <EditProjectDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    project={project}
                    onUpdate={fetchProject}
                />
            )}
            <DemoGuidePanel
              title="Projects"
              description="Track every elevator installation project from start to finish."
              features={[
                { icon: "📁", label: "Project List", description: "All active and completed installation projects" },
                { icon: "🔄", label: "Progress Stages", description: "Foundation → Mechanical → Electrical → Testing" },
                { icon: "🛗", label: "Elevator Management", description: "Manage individual elevators within each project" },
                { icon: "➕", label: "New Project Wizard", description: "Multi-step form to create a new project" },
              ]}
              tip="Each project tracks its own elevators, timeline, and responsible team."
            />
        </SidebarProvider>
    )
}
