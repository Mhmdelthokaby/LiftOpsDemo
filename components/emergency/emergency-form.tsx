"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  createEmergencyTicket,
  updateEmergencyTicket,
  getEmergencyTicketById,
  getTechnicians,
  getProjects,
  getMaintenanceProjects,
  Technician,
  EmergencyTicket,
  InstallationProject,
  MaintenanceContract,
  CreateEmergencyTicketDto,
  UpdateEmergencyTicketDto,
} from "@/lib/api"
import { getUser } from "@/lib/user"
import { useToast } from "@/hooks/use-toast"
import { Check, ChevronsUpDown, Building2, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface EmergencyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId?: string
  onSuccess?: () => void
}

export function EmergencyForm({ open, onOpenChange, ticketId, onSuccess }: EmergencyFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [installationProjects, setInstallationProjects] = useState<InstallationProject[]>([])
  const [maintenanceProjects, setMaintenanceProjects] = useState<MaintenanceContract[]>([])
  const [projectSearchOpen, setProjectSearchOpen] = useState(false)
  const [projectSearchValue, setProjectSearchValue] = useState("")
  const [selectedProject, setSelectedProject] = useState<InstallationProject | MaintenanceContract | null>(null)
  const [selectedProjectType, setSelectedProjectType] = useState<"installation" | "maintenance" | "external" | null>(null)
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [formData, setFormData] = useState<CreateEmergencyTicketDto>({
    project: "",
    location: "",
    unitId: "",
    googleMapsLink: "",
    priority: "Medium",
    description: "",
    reportedBy: "",
    contact: "",
  })
  const [status, setStatus] = useState<"Open" | "EnRoute" | "InProgress" | "Resolved">("Open")
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  useEffect(() => {
    if (open) {
      loadTechnicians()
      loadProjects()
      if (ticketId) {
        loadTicket()
      } else {
        resetForm()
        // Auto-populate ReportedBy with current user name
        const user = getUser()
        if (user) {
          setFormData((prev) => ({ ...prev, reportedBy: user.name }))
        }
      }
    }
  }, [open, ticketId])

  const loadTechnicians = async () => {
    try {
      const techs = await getTechnicians()
      setTechnicians(techs)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load technicians",
        variant: "destructive",
      })
    }
  }

  const loadProjects = async () => {
    try {
      const [installationProjs, maintenanceProjs] = await Promise.all([
        getProjects().catch(() => [] as InstallationProject[]),
        getMaintenanceProjects().catch(() => [] as MaintenanceContract[]),
      ])
      setInstallationProjects(installationProjs)
      setMaintenanceProjects(maintenanceProjs)
    } catch (error: any) {
      console.error("Failed to load projects", error)
      // Don't show error toast, just log it
    }
  }

  const loadTicket = async () => {
    if (!ticketId) return
    try {
      setLoading(true)
      const ticket = await getEmergencyTicketById(ticketId)
      setFormData({
        project: ticket.project,
        location: ticket.location,
        unitId: ticket.unitId,
        googleMapsLink: ticket.googleMapsLink || "",
        priority: ticket.priority,
        description: ticket.description,
        reportedBy: ticket.reportedBy,
        contact: ticket.contact,
      })
      setStatus(ticket.status)
      setAssignedTechnicianId(ticket.assignedTechnicianId || "")
      setNotes(ticket.notes || "")
      
      // Try to find the project in installation or maintenance lists
      const installationProject = installationProjects.find(
        (p) => p.projectNumber === ticket.project || p.customerName === ticket.project
      )
      const maintenanceProject = maintenanceProjects.find(
        (p) => p.projectNumber === ticket.project || p.customerName === ticket.project
      )
      
      if (installationProject) {
        setSelectedProject(installationProject)
        setSelectedProjectType("installation")
        setProjectSearchValue(installationProject.projectNumber)
      } else if (maintenanceProject) {
        setSelectedProject(maintenanceProject)
        setSelectedProjectType("maintenance")
        setProjectSearchValue(maintenanceProject.projectNumber)
      } else {
        setProjectSearchValue(ticket.project)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      project: "",
      location: "",
      unitId: "",
      googleMapsLink: "",
      priority: "Medium",
      description: "",
      reportedBy: "",
      contact: "",
    })
    setStatus("Open")
    setAssignedTechnicianId("")
    setNotes("")
    setSelectedProject(null)
    setSelectedProjectType(null)
    setProjectSearchValue("")
    setIsManualEntry(false)
  }

  const handleProjectSelect = (
    project: InstallationProject | MaintenanceContract,
    type: "installation" | "maintenance"
  ) => {
    setSelectedProject(project)
    setSelectedProjectType(type)
    setProjectSearchValue(project.projectNumber)
    setIsManualEntry(false)
    
    let location = ""
    if (type === "installation") {
      const instProject = project as InstallationProject
      location = instProject.projectAddress || instProject.customerAddress || ""
    } else {
      const maintProject = project as MaintenanceContract
      location = maintProject.customerAddress || ""
    }
    
    setFormData((prev) => ({
      ...prev,
      project: project.projectNumber,
      location,
      googleMapsLink: project.googleMapsLink || "",
    }))
    setProjectSearchOpen(false)
  }

  const handleManualProjectEntry = (value: string) => {
    setProjectSearchValue(value)
    setFormData((prev) => ({ ...prev, project: value }))
    
    // Check if this matches any existing project
    const foundInstallation = installationProjects.find(
      (p) => p.projectNumber.toLowerCase() === value.toLowerCase() ||
             p.customerName.toLowerCase() === value.toLowerCase()
    )
    const foundMaintenance = maintenanceProjects.find(
      (p) => p.projectNumber.toLowerCase() === value.toLowerCase() ||
             p.customerName.toLowerCase() === value.toLowerCase()
    )
    
    if (foundInstallation) {
      handleProjectSelect(foundInstallation, "installation")
      return
    }
    
    if (foundMaintenance) {
      handleProjectSelect(foundMaintenance, "maintenance")
      return
    }
    
    // Not found in our projects - mark as external
    if (value.trim()) {
      setIsManualEntry(true)
      setSelectedProjectType("external")
      setSelectedProject(null)
    } else {
      setIsManualEntry(false)
      setSelectedProjectType(null)
      setSelectedProject(null)
    }
  }

  const getProjectStatusBadge = (status: string, type: "installation" | "maintenance") => {
    if (type === "maintenance") {
      const statusMap: Record<string, { label: string; className: string }> = {
        Active: { label: "Active", className: "bg-success text-success-foreground" },
        Frozen: { label: "Frozen", className: "bg-warning text-warning-foreground" },
        Stopped: { label: "Stopped", className: "bg-destructive text-destructive-foreground" },
      }
      return statusMap[status] || { label: status, className: "bg-secondary text-secondary-foreground" }
    } else {
      const statusMap: Record<string, { label: string; className: string }> = {
        Active: { label: "Active", className: "bg-success text-success-foreground" },
        Approved: { label: "Approved", className: "bg-success text-success-foreground" },
        UnderInspectionAndQuotation: { label: "In Progress", className: "bg-warning text-warning-foreground" },
        Rejected: { label: "Rejected", className: "bg-destructive text-destructive-foreground" },
      }
      return statusMap[status] || { label: status, className: "bg-secondary text-secondary-foreground" }
    }
  }

  // Filter and deduplicate projects by project number
  const filteredInstallationProjects = installationProjects.filter((project) =>
    project.projectNumber.toLowerCase().includes(projectSearchValue.toLowerCase()) ||
    project.customerName.toLowerCase().includes(projectSearchValue.toLowerCase()) ||
    (project.projectAddress || "").toLowerCase().includes(projectSearchValue.toLowerCase())
  )

  const filteredMaintenanceProjects = maintenanceProjects.filter((project) =>
    project.projectNumber.toLowerCase().includes(projectSearchValue.toLowerCase()) ||
    project.customerName.toLowerCase().includes(projectSearchValue.toLowerCase()) ||
    project.customerAddress.toLowerCase().includes(projectSearchValue.toLowerCase())
  )

  // Create a map to track project numbers and avoid duplicates
  const projectNumberMap = new Map<string, { installation?: InstallationProject; maintenance?: MaintenanceContract }>()
  
  filteredInstallationProjects.forEach((project) => {
    const existing = projectNumberMap.get(project.projectNumber) || {}
    existing.installation = project
    projectNumberMap.set(project.projectNumber, existing)
  })
  
  filteredMaintenanceProjects.forEach((project) => {
    const existing = projectNumberMap.get(project.projectNumber) || {}
    existing.maintenance = project
    projectNumberMap.set(project.projectNumber, existing)
  })

  // Get unique project numbers that match the search
  const uniqueProjectNumbers = Array.from(projectNumberMap.keys())
  
  const hasFilteredResults = uniqueProjectNumbers.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (ticketId) {
        const updateData: UpdateEmergencyTicketDto = {
          ...formData,
          status,
          assignedTechnicianId: assignedTechnicianId || undefined,
          notes: notes || undefined,
        }
        await updateEmergencyTicket(ticketId, updateData)
        toast({
          title: "Success",
          description: "Emergency ticket updated successfully",
        })
      } else {
        await createEmergencyTicket(formData)
        toast({
          title: "Success",
          description: "Emergency ticket created successfully",
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticketId ? "Edit Emergency Ticket" : "New Emergency Ticket"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="project">Project</Label>
              <div className="flex gap-2 min-w-0">
                <Popover open={projectSearchOpen} onOpenChange={setProjectSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectSearchOpen}
                      className="flex-1 justify-between min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        {selectedProject ? (
                          <>
                            {selectedProjectType === "maintenance" ? (
                              <Wrench className="h-4 w-4 shrink-0" />
                            ) : (
                              <Building2 className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate">{selectedProject.projectNumber}</span>
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                              <Badge
                                variant="outline"
                                className="text-xs whitespace-nowrap"
                              >
                                {selectedProjectType === "maintenance" ? "Maint" : "Inst"}
                              </Badge>
                              {selectedProjectType !== "external" && (
                                <Badge
                                  className={cn(
                                    "text-xs whitespace-nowrap",
                                    getProjectStatusBadge(selectedProject.status, selectedProjectType as "installation" | "maintenance").className
                                  )}
                                >
                                  {getProjectStatusBadge(selectedProject.status, selectedProjectType as "installation" | "maintenance").label}
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : isManualEntry ? (
                          <>
                            <span className="truncate">{projectSearchValue || formData.project}</span>
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                              <Badge
                                variant="outline"
                                className="text-xs whitespace-nowrap bg-destructive/10 text-destructive border-destructive"
                              >
                                External
                              </Badge>
                              <Badge className="text-xs whitespace-nowrap bg-secondary text-secondary-foreground">
                                Not Ours
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground truncate">Search by project name...</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search by project name..."
                        value={projectSearchValue}
                        onValueChange={(value) => {
                          setProjectSearchValue(value)
                          // Check if user is typing manually
                          if (value && !uniqueProjectNumbers.some(pn => 
                            pn.toLowerCase().includes(value.toLowerCase()) ||
                            installationProjects.some(p => p.customerName.toLowerCase().includes(value.toLowerCase())) ||
                            maintenanceProjects.some(p => p.customerName.toLowerCase().includes(value.toLowerCase()))
                          )) {
                            // User is typing something not in the list
                            setTimeout(() => {
                              handleManualProjectEntry(value)
                            }, 300)
                          }
                        }}
                      />
                    <CommandList>
                      <CommandEmpty>No projects found.</CommandEmpty>
                      {uniqueProjectNumbers.length > 0 && (
                        <CommandGroup>
                          {uniqueProjectNumbers.map((projectNumber) => {
                            const projectData = projectNumberMap.get(projectNumber)!
                            const hasInstallation = !!projectData.installation
                            const hasMaintenance = !!projectData.maintenance
                            
                            // If project exists in both, show combined item
                            if (hasInstallation && hasMaintenance) {
                              const instProject = projectData.installation!
                              const maintProject = projectData.maintenance!
                              const isSelected =
                                (selectedProject?.id === instProject.id && selectedProjectType === "installation") ||
                                (selectedProject?.id === maintProject.id && selectedProjectType === "maintenance")
                              
                              return (
                                <CommandItem
                                  key={`both-${projectNumber}`}
                                  value={`${projectNumber} ${instProject.customerName}`}
                                  onSelect={() => {
                                    // Default to installation if both exist
                                    handleProjectSelect(instProject, "installation")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex items-center gap-2 mr-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <Wrench className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex flex-1 items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{projectNumber}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {instProject.customerName}
                                      </span>
                                      {(instProject.projectAddress || instProject.customerAddress) && (
                                        <span className="text-xs text-muted-foreground">
                                          {instProject.projectAddress || instProject.customerAddress}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Badge variant="outline" className="text-xs">
                                        Both
                                      </Badge>
                                      <Badge
                                        className={cn(
                                          getProjectStatusBadge(instProject.status, "installation").className
                                        )}
                                      >
                                        {getProjectStatusBadge(instProject.status, "installation").label}
                                      </Badge>
                                    </div>
                                  </div>
                                </CommandItem>
                              )
                            }
                            
                            // Show installation only
                            if (hasInstallation) {
                              const project = projectData.installation!
                              const statusBadge = getProjectStatusBadge(project.status, "installation")
                              const isSelected =
                                selectedProject?.id === project.id && selectedProjectType === "installation"
                              return (
                                <CommandItem
                                  key={`inst-${project.id}`}
                                  value={`${project.projectNumber} ${project.customerName} ${project.projectAddress || ""}`}
                                  onSelect={() => handleProjectSelect(project, "installation")}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-1 items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{project.projectNumber}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {project.customerName}
                                      </span>
                                      {project.projectAddress && (
                                        <span className="text-xs text-muted-foreground">
                                          {project.projectAddress}
                                        </span>
                                      )}
                                    </div>
                                    <Badge className={cn("ml-2", statusBadge.className)}>
                                      {statusBadge.label}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              )
                            }
                            
                            // Show maintenance only
                            if (hasMaintenance) {
                              const project = projectData.maintenance!
                              const statusBadge = getProjectStatusBadge(project.status, "maintenance")
                              const isSelected =
                                selectedProject?.id === project.id && selectedProjectType === "maintenance"
                              return (
                                <CommandItem
                                  key={`maint-${project.id}`}
                                  value={`${project.projectNumber} ${project.customerName} ${project.customerAddress}`}
                                  onSelect={() => handleProjectSelect(project, "maintenance")}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Wrench className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-1 items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{project.projectNumber}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {project.customerName}
                                      </span>
                                      {project.customerAddress && (
                                        <span className="text-xs text-muted-foreground">
                                          {project.customerAddress}
                                        </span>
                                      )}
                                    </div>
                                    <Badge className={cn("ml-2", statusBadge.className)}>
                                      {statusBadge.label}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              )
                            }
                            
                            return null
                          })}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              </div>
              {selectedProject && selectedProjectType && selectedProjectType !== "external" && (
                <p className="text-xs text-muted-foreground">
                  Type: {selectedProjectType === "maintenance" ? "Maintenance" : "Installation"} | Status:{" "}
                  {getProjectStatusBadge(selectedProject.status, selectedProjectType).label}
                  {(selectedProject.status === "Active" || selectedProject.status === "Approved") && (
                    <span className="ml-1 text-success">✓ Our Project</span>
                  )}
                </p>
              )}
              {isManualEntry && (
                <div className="space-y-2">
                  <Input
                    value={formData.project}
                    onChange={(e) => handleManualProjectEntry(e.target.value)}
                    placeholder="Enter project name"
                    className="mt-2"
                  />
                  <p className="text-xs text-destructive">
                    ⚠ This project is not found in our system - marked as external project
                  </p>
                </div>
              )}
              {!selectedProject && !isManualEntry && (
                <Input
                  value={formData.project}
                  onChange={(e) => handleManualProjectEntry(e.target.value)}
                  placeholder="Or enter project name manually"
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsLink">Google Maps Link (optional)</Label>
            <Input
              id="googleMapsLink"
              value={formData.googleMapsLink || ""}
              onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitId">Unit ID</Label>
              <Input
                id="unitId"
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "Low" | "Medium" | "High") =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ticketId && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="EnRoute">En Route</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician">Assigned Technician</Label>
                <Select value={assignedTechnicianId} onValueChange={setAssignedTechnicianId}>
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By</Label>
              <Input
                id="reportedBy"
                value={formData.reportedBy}
                onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                required
                disabled={!ticketId} // Disable when creating new ticket (auto-filled)
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>
          </div>

          {ticketId && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : ticketId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
