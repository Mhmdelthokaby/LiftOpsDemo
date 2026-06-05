"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    getProjects,
    InstallationProject
} from "@/lib/api"
import { Eye, FileText } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export function InspectionList() {
    const [projects, setProjects] = useState<InstallationProject[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedStatus, setSelectedStatus] = useState<string>("all")

    const loadProjects = async (status?: string) => {
        try {
            setLoading(true)
            // Fetch all projects
            const data = await getProjects()
            
            // Filter based on project status
            let filteredData = data
            if (status && status !== "all") {
                filteredData = data.filter(project => {
                    const projectStatus = project.status?.toLowerCase()
                    if (status === "pending") {
                        // Pending = projects with status "pending" (UnderInspectionAndQuotation)
                        return projectStatus === "pending" || projectStatus === "underinspectionandquotation"
                    } else if (status === "active") {
                        // Active = projects with status "active"
                        return projectStatus === "active"
                    } else if (status === "rejected") {
                        // Rejected = projects with status "rejected"
                        return projectStatus === "rejected"
                    }
                    return true
                })
            }
            
            setProjects(filteredData)
        } catch (error: any) {
            toast.error(error.message || "Failed to load projects")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadProjects(selectedStatus)
    }, [selectedStatus])

    const getStatusBadge = (status: string) => {
        const statusLower = status.toLowerCase()
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            pending: "outline",
            active: "default",
            rejected: "destructive"
        }
        const colors: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800",
            active: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800"
        }
        const displayStatus = statusLower === "underinspectionandquotation" ? "pending" : statusLower
        return (
            <Badge className={colors[displayStatus] || "bg-gray-100 text-gray-800"}>
                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
            </Badge>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Inspection Requests</h2>
                <p className="text-muted-foreground">Manage inspection requests and track their progress</p>
            </div>

            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedStatus} className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-muted-foreground">Loading...</div>
                        </div>
                    ) : projects.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No projects found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Number</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Elevators</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map((project) => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">
                                                {project.projectNumber || "N/A"}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {project.customerName}
                                            </TableCell>
                                            <TableCell>{project.customerAddress || project.projectAddress}</TableCell>
                                            <TableCell>{project.elevators?.length || 0}</TableCell>
                                            <TableCell>{getStatusBadge(project.status)}</TableCell>
                                            <TableCell>
                                                {formatDate(project.contractDate)}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/projects/${project.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

