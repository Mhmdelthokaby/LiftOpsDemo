"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileDown, X } from "lucide-react"
import { generateMaintenanceReportPDF, generateMaintenanceReportHTML } from "@/lib/pdf-utils"
import type { MaintenanceVisitDetails, MaintenanceContract } from "@/lib/api"
import { useState } from "react"
import { toast } from "sonner"

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitDetails: MaintenanceVisitDetails | null
  contract?: MaintenanceContract
}

export function PdfPreviewDialog({ open, onOpenChange, visitDetails, contract }: PdfPreviewDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  if (!visitDetails) return null

  const htmlContent = generateMaintenanceReportHTML(visitDetails, contract)

  const handleDownload = async () => {
    if (!visitDetails) return
    
    try {
      setIsDownloading(true)
      await generateMaintenanceReportPDF(visitDetails, contract)
      toast.success("PDF downloaded successfully")
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to download PDF")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>PDF Preview</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 bg-white">
          <div 
            className="pdf-preview-content"
            style={{
              width: "210mm",
              minHeight: "297mm",
              margin: "0 auto",
              padding: "30px",
              backgroundColor: "#ffffff",
              color: "#000000",
              fontFamily: "Arial, sans-serif"
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
