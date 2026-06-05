import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, CheckCircle2, Clock, XCircle } from "lucide-react"
import type { Project } from "./projects-table"

interface ProjectDetailProps {
  project: Project
}

const units = [
  { id: "E-01", type: "Elevator", capacity: "1200kg", floors: "B2-15", status: "operational" },
  { id: "E-02", type: "Elevator", capacity: "1200kg", floors: "B2-15", status: "operational" },
  { id: "E-03", type: "Elevator", capacity: "1600kg", floors: "B2-15", status: "in-progress" },
  { id: "ES-01", type: "Escalator", capacity: "9000/hr", floors: "1-2", status: "operational" },
]

const payments = [
  { milestone: "Contract Signing", amount: "$168,000", status: "paid", date: "2024-01-15" },
  { milestone: "Foundation Complete", amount: "$211,000", status: "paid", date: "2024-02-28" },
  { milestone: "Installation Phase 2", amount: "$253,000", status: "pending", date: "2024-04-15" },
  { milestone: "Final Handover", amount: "$213,000", status: "pending", date: "2024-06-30" },
]

const statusIcons = {
  operational: <CheckCircle2 className="h-4 w-4 text-success" />,
  "in-progress": <Clock className="h-4 w-4 text-warning" />,
  "not-started": <XCircle className="h-4 w-4 text-muted-foreground" />,
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">General Info</TabsTrigger>
        <TabsTrigger value="units">Units</TabsTrigger>
        <TabsTrigger value="contract">Contract</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Overview of {project.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project ID</p>
                <p className="text-lg font-mono">{project.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="text-lg">{project.client}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-lg">{project.location}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <p className="text-lg">{project.startDate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                <p className="text-lg">{project.units}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contract Value</p>
                <p className="text-lg font-semibold">{project.value}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Overall Progress</p>
              <Progress value={65} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">65% Complete</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="units" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Unit List</CardTitle>
            <CardDescription>All elevators and escalators for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Floors</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono">{unit.id}</TableCell>
                    <TableCell>{unit.type}</TableCell>
                    <TableCell>{unit.capacity}</TableCell>
                    <TableCell>{unit.floors}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcons[unit.status as keyof typeof statusIcons]}
                        <span className="capitalize">{unit.status.replace("-", " ")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contract" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contract Documents</CardTitle>
            <CardDescription>Legal and technical documentation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Main Contract Agreement</p>
                  <p className="text-xs text-muted-foreground">Signed on 2024-01-15</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Technical Specifications</p>
                  <p className="text-xs text-muted-foreground">Updated 2024-02-10</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Safety Certifications</p>
                  <p className="text-xs text-muted-foreground">Valid until 2025-01-15</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payments" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
            <CardDescription>Milestone-based payment tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{payment.milestone}</TableCell>
                    <TableCell className="font-semibold">{payment.amount}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={payment.status === "paid" ? "default" : "secondary"}
                        className={payment.status === "paid" ? "bg-success text-success-foreground" : ""}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
