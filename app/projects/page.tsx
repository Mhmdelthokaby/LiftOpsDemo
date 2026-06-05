"use client"

import { useState, useEffect } from "react"
import { getProjects, InstallationProject } from "@/lib/api"
import { canViewProjects, canCreateOrEditProjects } from "@/lib/user"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, ArrowRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<InstallationProject[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user can view projects
    if (!canViewProjects()) {
      router.push('/')
      return
    }
    fetchProjects()
  }, [router, statusFilter])

  // Refresh projects when page becomes visible (e.g., when navigating back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProjects()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchProjects = async () => {
    try {
      // Map frontend filter to backend status if needed
      let backendStatus: 'UnderInspectionAndQuotation' | 'Approved' | 'Rejected' | 'Active' | undefined = undefined
      
      if (statusFilter === "pending") {
        // For pending, we'll filter on frontend since it maps to "Pending" status string
        backendStatus = undefined
      } else if (statusFilter === "active") {
        // Active includes Active, InProgress, Planning - filter on frontend
        backendStatus = undefined
      } else if (statusFilter === "completed") {
        // Completed - filter on frontend
        backendStatus = undefined
      }
      
      const data = await getProjects(backendStatus)
      setProjects(data || [])
    } catch (error) {
      console.error("Failed to fetch projects", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())

    // Normalize status for comparison
    const projectStatus = project.status.toLowerCase()
    let matchesStatus = true
    
    if (statusFilter !== "all") {
      switch (statusFilter.toLowerCase()) {
        case "pending":
          matchesStatus = projectStatus === "pending"
          break
        case "active":
          matchesStatus = projectStatus === "active"
          break
        case "inprogress":
          matchesStatus = projectStatus === "inprogress"
          break
        case "completed":
          matchesStatus = projectStatus === "completed"
          break
        default:
          matchesStatus = projectStatus === statusFilter.toLowerCase()
      }
    }

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case "completed":
        return <Badge className="bg-green-600 text-white">Completed</Badge>
      case "active":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Active</Badge>
      case "inprogress":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">In Progress</Badge>
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/5">Pending</Badge>
      case "rejected":
        return <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-8 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Installation Projects</h2>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={fetchProjects}
                  disabled={loading}
                  className="hover:bg-muted"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {canCreateOrEditProjects() && (
                  <Link href="/projects/new">
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" /> New Project
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>All Projects</CardTitle>
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects or customers..."
                      className="pl-8 bg-background/50 border-border/40"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inprogress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8 text-muted-foreground">Loading projects...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="font-semibold">Project #</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Address</TableHead>
                        <TableHead className="font-semibold">Contract Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No projects found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProjects.map((project) => (
                          <TableRow key={project.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-primary">{project.projectNumber}</TableCell>
                            <TableCell>{project.customerName}</TableCell>
                            <TableCell>
                              {project.projectAddress || project.customerAddress}
                              {(project.city || project.customerCity) && `, ${project.city || project.customerCity || "القاهرة الجديدة"}`}
                            </TableCell>
                            <TableCell>{formatDate(project.contractDate)}</TableCell>
                            <TableCell>{getStatusBadge(project.status)}</TableCell>
                            <TableCell className="text-right">
                              <Link href={`/projects/${project.id}`}>
                                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                                  Details <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
