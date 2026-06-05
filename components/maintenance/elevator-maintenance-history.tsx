"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getVisitsByElevator, MaintenanceVisitListItem, getVisitDetails, getMaintenanceContractDetails, type MaintenanceContract } from "@/lib/api"
import { generateMaintenanceReportPDF, generateMaintenanceReportHTML } from "@/lib/pdf-utils"
import { CheckCircle2, XCircle, FileText, Calendar, RefreshCw, ChevronDown, ChevronUp, Edit, FileDown, Eye } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MonthlyMaintenanceDialog } from "@/components/maintenance/monthly-maintenance-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface ElevatorMaintenanceHistoryProps {
  elevatorId: string
  contractId: string
  projectNumber?: string
  pricePerMonth: number
  freeMonths: number
  elevatorCode: string
}

export function ElevatorMaintenanceHistory({
  elevatorId,
  contractId,
  projectNumber,
  pricePerMonth,
  freeMonths,
  elevatorCode
}: ElevatorMaintenanceHistoryProps) {
  const [visits, setVisits] = useState<MaintenanceVisitListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editDialog, setEditDialog] = useState<{ open: boolean; visitId: string | null }>({
    open: false,
    visitId: null
  })

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  useEffect(() => {
    if (expanded) {
      fetchVisits()
    }
  }, [expanded, selectedMonth, selectedYear, refreshKey, elevatorId])

  const fetchVisits = async () => {
    try {
      setLoading(true)
      const data = await getVisitsByElevator(elevatorId, selectedMonth || undefined, selectedYear || undefined)
      setVisits(data || [])
    } catch (error: any) {
      console.error("Failed to fetch elevator visits:", error)
      toast.error(error.message || "Failed to fetch maintenance history")
      setVisits([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === 'done') {
      return <Badge className="bg-success text-success-foreground">Done</Badge>
    }
    if (statusLower === 'inprogress') {
      return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>
    }
    if (statusLower === 'pending') {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Pending</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getPaymentBadge = (isPaid: boolean) => {
    if (pricePerMonth === 0 || freeMonths > 0) {
      return <Badge variant="outline">Free</Badge>
    }
    if (isPaid) {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>
    }
    return <Badge variant="outline" className="bg-warning text-warning-foreground">Not Paid</Badge>
  }

  const getChecklistStatus = (visit: MaintenanceVisitListItem) => {
    if (!visit.checklistItems || visit.checklistItems.length === 0) {
      return <span className="text-muted-foreground text-sm">No checklist</span>
    }
    const allGood = visit.checklistItems.every(item => item.isCompleted)
    const someIssues = visit.checklistItems.some(item => !item.isCompleted)

    if (allGood) {
      return <Badge className="bg-success text-success-foreground">All Good</Badge>
    }
    if (someIssues) {
      return <Badge className="bg-destructive text-destructive-foreground">Some Issues</Badge>
    }
    return <Badge variant="outline">Partial</Badge>
  }

  const fetchVisitAndContract = async (visitId: string) => {
    // Fetch visit details
    const visitDetails = await getVisitDetails(visitId)

    // Fetch contract details if available
    let contract: MaintenanceContract | undefined
    try {
      const contractDetails = await getMaintenanceContractDetails(contractId)
      contract = {
        id: contractDetails.id,
        customerId: contractDetails.customerId,
        customerName: contractDetails.customerName,
        customerPhone: contractDetails.customerPhone,
        customerEmail: contractDetails.customerEmail,
        customerAddress: contractDetails.customerAddress,
        projectNumber: contractDetails.projectNumber,
        isFromInstallation: contractDetails.isFromInstallation,
        startDate: contractDetails.startDate,
        endDate: contractDetails.endDate,
        pricePerMonth: contractDetails.pricePerMonth,
        freeMonths: contractDetails.freeMonths,
        status: contractDetails.status,
        elevatorCount: contractDetails.elevators.length,
        technicianId: contractDetails.technicianId,
        technicianName: contractDetails.technicianName,
        createdAt: contractDetails.createdAt
      }
    } catch (error) {
      console.error("Failed to fetch contract details:", error)
      // Continue without contract details
    }

    return { visitDetails, contract }
  }

  const handlePreviewPDF = async (visitId: string) => {
    try {
      toast.loading("Opening preview...")
      const { visitDetails, contract } = await fetchVisitAndContract(visitId)

      const htmlContent = generateMaintenanceReportHTML(visitDetails, contract)

      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PDF Preview - ${visitDetails.elevatorCode}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .pdf-container {
      width: 210mm;
      min-height: 297mm;
      background-color: #ffffff;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      position: relative;
    }
    @media print {
      body {
        padding: 0;
        background-color: white;
      }
      .pdf-container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    ${htmlContent}
  </div>
</body>
</html>
      `

      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(fullHtml)
        newWindow.document.close()
        toast.dismiss()
        toast.success("Preview opened in new window")
      } else {
        toast.dismiss()
        toast.error("Please allow popups to view preview")
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || "Failed to open preview")
    }
  }

  const handleGenerateVisitPDF = async (visitId: string) => {
    try {
      toast.loading("Generating PDF report...")
      const { visitDetails, contract } = await fetchVisitAndContract(visitId)
      
      await generateMaintenanceReportPDF(visitDetails, contract)
      
      toast.dismiss()
      toast.success("PDF report generated successfully")
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || "Failed to generate PDF report")
    }
  }

  // Generate year options (current year and 2 years before/after)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="p-4">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Maintenance History - {elevatorCode}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedMonth?.toString() || "all"}
                onValueChange={(value) => setSelectedMonth(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear?.toString() || "all"}
                onValueChange={(value) => setSelectedYear(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={fetchVisits} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Visits List */}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No maintenance visits found
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <div key={visit.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatDate(visit.visitDate)}</span>
                        {getStatusBadge(visit.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getPaymentBadge(visit.isPaid)}
                        {getChecklistStatus(visit)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        <span className={visit.status.toLowerCase() === 'done' ? "text-success font-medium" : "text-muted-foreground"}>
                          {visit.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payment: </span>
                        <span className={visit.isPaid ? "text-success font-medium" : pricePerMonth === 0 ? "text-muted-foreground" : "text-warning font-medium"}>
                          {pricePerMonth === 0 ? "Free" : visit.isPaid ? "Paid" : "Not Paid"}
                        </span>
                      </div>
                      {visit.completedDate && (
                        <div>
                          <span className="text-muted-foreground">Completed: </span>
                          <span className="font-medium">{formatDate(visit.completedDate)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Checklist: </span>
                        {visit.checklistItems && visit.checklistItems.length > 0 ? (
                          <span className={visit.checklistItems.every(item => item.isCompleted) ? "text-success font-medium" : visit.checklistItems.some(item => !item.isCompleted) ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {visit.checklistItems.every(item => item.isCompleted) ? "All Good" : visit.checklistItems.some(item => !item.isCompleted) ? "Some Issues" : "Partial"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </div>
                    {visit.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{visit.notes}</span>
                        </div>
                      </div>
                    )}
                    {visit.checklistItems && visit.checklistItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Checklist Items:</div>
                        {visit.checklistItems.map((item) => (
                          <div key={item.checklistItemId} className="flex items-center gap-2 text-xs">
                            {item.isCompleted ? (
                              <CheckCircle2 className="h-3 w-3 text-success" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive" />
                            )}
                            <span className={item.isCompleted ? "text-success" : "text-destructive"}>
                              {item.checklistItemTitle}
                            </span>
                            {item.notes && (
                              <span className="text-muted-foreground ml-2">({item.notes})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      {visit.status.toLowerCase() === 'done' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditDialog({ open: true, visitId: visit.id })}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Maintenance
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewPDF(visit.id)}
                        className={visit.status.toLowerCase() === 'done' ? "flex-1" : "w-full"}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateVisitPDF(visit.id)}
                        className={visit.status.toLowerCase() === 'done' ? "flex-1" : "w-full"}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Maintenance Dialog */}
      {editDialog.visitId && (
        <MonthlyMaintenanceDialog
          contractId={contractId}
          projectNumber={projectNumber || `M-${contractId.substring(0, 8).toUpperCase()}`}
          pricePerMonth={pricePerMonth}
          freeMonths={freeMonths}
          isOpen={editDialog.open}
          onClose={() => setEditDialog({ open: false, visitId: null })}
          onSuccess={() => {
            fetchVisits()
            setRefreshKey(prev => prev + 1) // Trigger refresh for other components
            setEditDialog({ open: false, visitId: null })
          }}
          editMode={true}
          visitId={editDialog.visitId}
          elevatorId={elevatorId}
        />
      )}

    </div>
  )
}

