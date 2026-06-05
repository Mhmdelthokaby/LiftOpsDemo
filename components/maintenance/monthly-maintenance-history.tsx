"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getVisitsByContractAndMonth, MaintenanceVisitListDto, MaintenanceContract } from "@/lib/api"
import { CheckCircle2, XCircle, DollarSign, FileText, Calendar, RefreshCw, ChevronDown, ChevronUp, Edit, Download, Eye } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MonthlyMaintenanceDialog } from "@/components/maintenance/monthly-maintenance-dialog"
import { getVisitDetails } from "@/lib/api"
import { toast } from "sonner"
import { generatePDF, generateFullPdfTemplateHtml } from "@/lib/pdf-utils"

interface MonthlyMaintenanceHistoryProps {
  contract: MaintenanceContract
}

interface MonthStatus {
  month: number
  year: number
  monthName: string
  visit?: MaintenanceVisitListDto
  maintenanceDone: boolean
  isPaid: boolean
  hasNotes: boolean
  allItemsGood: boolean
  someItemsHaveIssues: boolean
}

export function MonthlyMaintenanceHistory({ contract }: MonthlyMaintenanceHistoryProps) {
  const [monthlyStatuses, setMonthlyStatuses] = useState<MonthStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; visitId: string | null; elevatorId: string | null }>({
    open: false,
    visitId: null,
    elevatorId: null
  })

  useEffect(() => {
    if (expanded && monthlyStatuses.length === 0) {
      fetchMonthlyHistory()
    }
  }, [expanded])

  const fetchMonthlyHistory = async () => {
    try {
      setLoading(true)
      const startDate = new Date(contract.startDate)
      const endDate = new Date(contract.endDate)
      const currentDate = new Date()
      const actualEndDate = endDate < currentDate ? endDate : currentDate

      const months: MonthStatus[] = []
      const currentMonth = new Date(startDate)

      while (currentMonth <= actualEndDate) {
        const month = currentMonth.getMonth() + 1
        const year = currentMonth.getFullYear()
        const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })

        try {
          const visits = await getVisitsByContractAndMonth(contract.id, month, year)
          
          // Group visits by elevatorId
          const visitsByElevator = new Map<string, MaintenanceVisitListDto[]>()
          visits.forEach(visit => {
            if (!visitsByElevator.has(visit.elevatorId)) {
              visitsByElevator.set(visit.elevatorId, [])
            }
            visitsByElevator.get(visit.elevatorId)!.push(visit)
          })
          
          // Check if ALL elevators have completed maintenance
          // Project is "Done" only if all elevators have at least one "Done" visit
          const elevatorsWithDoneVisits = new Set<string>()
          visits.forEach(visit => {
            if (visit.status.toLowerCase() === 'done') {
              elevatorsWithDoneVisits.add(visit.elevatorId)
            }
          })
          const maintenanceDone = elevatorsWithDoneVisits.size === contract.elevatorCount && contract.elevatorCount > 0
          
          // Check payment status - ALL elevators' visits must be paid
          let isPaid = false
          if (visits.length > 0) {
            // Check if all elevators have all their visits paid
            let allElevatorsPaid = true
            visitsByElevator.forEach((elevatorVisits) => {
              const allVisitsPaid = elevatorVisits.every(v => v.isPaid)
              if (!allVisitsPaid) {
                allElevatorsPaid = false
              }
            })
            isPaid = allElevatorsPaid
          }
          
          // Get first visit for display purposes (notes, checklist, etc.)
          const visit = visits.length > 0 ? visits[0] : undefined
          const hasNotes = !!(visit?.notes && visit.notes.trim() !== '')
          
          const checklistItems = visit?.checklistItems || []
          const allItemsGood = checklistItems.length > 0 && checklistItems.every(item => item.isCompleted === true)
          const someItemsHaveIssues = checklistItems.some(item => item.isCompleted === false)

          months.push({
            month,
            year,
            monthName,
            visit,
            maintenanceDone,
            isPaid,
            hasNotes,
            allItemsGood,
            someItemsHaveIssues
          })
        } catch (error) {
          // If no visits found, add month with no maintenance
          months.push({
            month,
            year,
            monthName,
            maintenanceDone: false,
            isPaid: false,
            hasNotes: false,
            allItemsGood: false,
            someItemsHaveIssues: false
          })
        }

        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1)
      }

      setMonthlyStatuses(months.reverse()) // Most recent first
    } catch (error: any) {
      console.error("Failed to fetch monthly history:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: MonthStatus) => {
    if (!status.maintenanceDone) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Not Done</Badge>
    }
    return <Badge className="bg-success text-success-foreground">Done</Badge>
  }

  const getPaymentBadge = (status: MonthStatus) => {
    // Check if project is in free maintenance period for this month
    const startDate = new Date(contract.startDate)
    const statusDate = new Date(status.year, status.month - 1, 1)
    
    // Calculate months elapsed since start date
    const yearDiff = statusDate.getFullYear() - startDate.getFullYear()
    const monthDiff = statusDate.getMonth() - startDate.getMonth()
    let monthsElapsed = (yearDiff * 12) + monthDiff
    
    // If the day of status date is before the day of start date, we haven't completed a full month yet
    if (statusDate.getDate() < startDate.getDate()) {
      monthsElapsed--
    }
    
    const isFreePeriod = contract.freeMonths > 0 && monthsElapsed < contract.freeMonths
    
    if (contract.pricePerMonth === 0 || isFreePeriod) {
      return <Badge variant="outline">Free</Badge>
    }
    if (status.isPaid) {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>
    }
    return <Badge variant="outline" className="bg-warning text-warning-foreground">Not Paid</Badge>
  }

  const getChecklistStatus = (status: MonthStatus) => {
    if (!status.visit || !status.visit.checklistItems || status.visit.checklistItems.length === 0) {
      return <span className="text-muted-foreground text-sm">No checklist</span>
    }
    if (status.allItemsGood) {
      return <Badge className="bg-success text-success-foreground">All Good</Badge>
    }
    if (status.someItemsHaveIssues) {
      return <Badge className="bg-destructive text-destructive-foreground">Some Issues</Badge>
    }
    return <Badge variant="outline">Partial</Badge>
  }

  const generateMonthContentHtml = (status: MonthStatus): string => {
    const startDate = new Date(contract.startDate)
    const statusDate = new Date(status.year, status.month - 1, 1)
    
    const yearDiff = statusDate.getFullYear() - startDate.getFullYear()
    const monthDiff = statusDate.getMonth() - startDate.getMonth()
    let monthsElapsed = (yearDiff * 12) + monthDiff
    
    if (statusDate.getDate() < startDate.getDate()) {
      monthsElapsed--
    }
    
    const isFreePeriod = contract.freeMonths > 0 && monthsElapsed < contract.freeMonths
    const isFree = contract.pricePerMonth === 0 || isFreePeriod
    const paymentStatus = isFree ? "Free" : status.isPaid ? "Paid" : "Not Paid"
    const maintenanceStatus = status.maintenanceDone ? "Done" : "Not Done"
    const checklistStatus = !status.visit || !status.visit.checklistItems || status.visit.checklistItems.length === 0
      ? "N/A"
      : status.allItemsGood
      ? "All Good"
      : status.someItemsHaveIssues
      ? "Some Issues"
      : "Partial"

    let html = `
      <div style="font-family: Arial, sans-serif; color: #000000;">
        <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 20px; color: #000000;">${status.monthName}</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #000000;">Project Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666;">Project Number:</td>
              <td style="padding: 8px 0; color: #000000;">${contract.projectNumber || `M-${contract.id.substring(0, 8).toUpperCase()}`}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666;">Customer:</td>
              <td style="padding: 8px 0; color: #000000;">${contract.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666;">Elevators:</td>
              <td style="padding: 8px 0; color: #000000;">${contract.elevatorCount}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #000000;">Maintenance Status</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666; width: 40%;">Maintenance:</td>
              <td style="padding: 8px 0; color: ${status.maintenanceDone ? '#16a34a' : '#666'}; font-weight: ${status.maintenanceDone ? '600' : '400'};">${maintenanceStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666;">Payment:</td>
              <td style="padding: 8px 0; color: ${isFree ? '#666' : status.isPaid ? '#16a34a' : '#f59e0b'}; font-weight: ${status.isPaid && !isFree ? '600' : '400'};">${paymentStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666;">Checklist:</td>
              <td style="padding: 8px 0; color: ${checklistStatus === 'All Good' ? '#16a34a' : checklistStatus === 'Some Issues' ? '#dc2626' : '#666'}; font-weight: ${checklistStatus !== 'N/A' ? '600' : '400'};">${checklistStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 500; color: #666;">Notes:</td>
              <td style="padding: 8px 0; color: #000000;">${status.hasNotes ? "Yes" : "No"}</td>
            </tr>
          </table>
        </div>
    `

    if (status.hasNotes && status.visit?.notes) {
      html += `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #000000;">Notes</h3>
          <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; color: #000000;">
            ${status.visit.notes}
          </div>
        </div>
      `
    }

    if (status.visit && status.visit.checklistItems && status.visit.checklistItems.length > 0) {
      html += `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #000000;">Checklist Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
      `
      
      status.visit.checklistItems.forEach((item) => {
        const statusColor = item.isCompleted ? '#16a34a' : '#dc2626'
        const statusText = item.isCompleted ? '✓' : '✗'
        html += `
            <tr>
              <td style="padding: 6px 0; color: ${statusColor}; font-weight: 600; width: 30px;">${statusText}</td>
              <td style="padding: 6px 0; color: ${statusColor}; font-weight: ${item.isCompleted ? '500' : '400'};">${item.checklistItemTitle}</td>
              ${item.notes ? `<td style="padding: 6px 0; padding-left: 12px; color: #666; font-size: 14px;">(${item.notes})</td>` : '<td></td>'}
            </tr>
        `
      })
      
      html += `
          </table>
        </div>
      `
    }

    html += `
      </div>
    `

    return html
  }

  const handlePreviewPDF = (status: MonthStatus) => {
    try {
      const contentHtml = generateMonthContentHtml(status)
      const fullTemplateHtml = generateFullPdfTemplateHtml(contentHtml, {
        headerTitle: "LiftOps Elevators & Escalators",
        headerSubtitle: "كولينز للمصاعد والسلالم الكهربائية"
      }, window.location.origin)
      
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PDF Preview - ${status.monthName}</title>
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
    ${fullTemplateHtml}
  </div>
</body>
</html>
      `
      
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(fullHtml)
        newWindow.document.close()
        toast.success("Preview opened in new window")
      } else {
        toast.error("Please allow popups to view preview")
      }
    } catch (error: any) {
      console.error("Failed to open preview:", error)
      toast.error(error.message || "Failed to open preview")
    }
  }

  const handleDownloadPDF = async (status: MonthStatus) => {
    try {
      const contentHtml = generateMonthContentHtml(status)
      const filename = `Maintenance_${contract.projectNumber || contract.id.substring(0, 8)}_${status.monthName.replace(/\s+/g, '_')}.pdf`
      
      await generatePDF(contentHtml, {
        filename,
        headerTitle: "LiftOps Elevators & Escalators",
        headerSubtitle: "كولينز للمصاعد والسلالم الكهربائية"
      })
      
      toast.success("PDF downloaded successfully")
    } catch (error: any) {
      console.error("Failed to generate PDF:", error)
      toast.error(error.message || "Failed to generate PDF")
    }
  }


  return (
    <div className="p-4">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly Maintenance History
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : monthlyStatuses.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No maintenance history available
              </div>
            ) : (
              <div className="space-y-3">
                {monthlyStatuses.map((status, index) => (
                  <div key={`${status.year}-${status.month}`} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{status.monthName}</span>
                        {getStatusBadge(status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getPaymentBadge(status)}
                        {getChecklistStatus(status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewPDF(status)}
                          className="ml-2"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(status)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Maintenance: </span>
                        <span className={status.maintenanceDone ? "text-success font-medium" : "text-muted-foreground"}>
                          {status.maintenanceDone ? "Done" : "Not Done"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payment: </span>
                        {(() => {
                          // Check if project is in free maintenance period for this month
                          const startDate = new Date(contract.startDate)
                          const statusDate = new Date(status.year, status.month - 1, 1)
                          
                          const yearDiff = statusDate.getFullYear() - startDate.getFullYear()
                          const monthDiff = statusDate.getMonth() - startDate.getMonth()
                          let monthsElapsed = (yearDiff * 12) + monthDiff
                          
                          if (statusDate.getDate() < startDate.getDate()) {
                            monthsElapsed--
                          }
                          
                          const isFreePeriod = contract.freeMonths > 0 && monthsElapsed < contract.freeMonths
                          const isFree = contract.pricePerMonth === 0 || isFreePeriod
                          
                          return (
                            <span className={status.isPaid && !isFree ? "text-success font-medium" : isFree ? "text-muted-foreground" : "text-warning font-medium"}>
                              {isFree ? "Free" : status.isPaid ? "Paid" : "Not Paid"}
                            </span>
                          )
                        })()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Notes: </span>
                        <span className={status.hasNotes ? "font-medium" : "text-muted-foreground"}>
                          {status.hasNotes ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Checklist: </span>
                        {status.visit && status.visit.checklistItems && status.visit.checklistItems.length > 0 ? (
                          <span className={status.allItemsGood ? "text-success font-medium" : status.someItemsHaveIssues ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {status.allItemsGood ? "All Good" : status.someItemsHaveIssues ? "Some Issues" : "Partial"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </div>
                    {status.hasNotes && status.visit?.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{status.visit.notes}</span>
                        </div>
                      </div>
                    )}
                    {status.visit && status.visit.checklistItems && status.visit.checklistItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Checklist Items:</div>
                        {status.visit.checklistItems.map((item) => (
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
                    {status.maintenanceDone && status.visit && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditDialog({ open: true, visitId: status.visit!.id, elevatorId: status.visit!.elevatorId })}
                          className="w-full"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Maintenance
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Maintenance Dialog */}
      {editDialog.visitId && editDialog.elevatorId && (
        <MonthlyMaintenanceDialog
          contractId={contract.id}
          projectNumber={contract.projectNumber || `M-${contract.id.substring(0, 8).toUpperCase()}`}
          pricePerMonth={contract.pricePerMonth}
          freeMonths={contract.freeMonths}
          isOpen={editDialog.open}
          onClose={() => setEditDialog({ open: false, visitId: null, elevatorId: null })}
          onSuccess={() => {
            fetchMonthlyHistory()
            setEditDialog({ open: false, visitId: null, elevatorId: null })
          }}
          editMode={true}
          visitId={editDialog.visitId}
          elevatorId={editDialog.elevatorId}
        />
      )}

    </div>
  )
}

