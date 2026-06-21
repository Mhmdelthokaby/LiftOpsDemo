"use client"

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { EmergencyTickets } from "@/components/emergency/emergency-tickets"
import { EmergencyStats } from "@/components/emergency/emergency-stats"
import { Button } from "@/components/ui/button"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Plus } from "lucide-react"
import { useState } from "react"
import { EmergencyForm } from "@/components/emergency/emergency-form"

export default function EmergencyPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTicketCreated = () => {
    setFormOpen(false)
    // Trigger refresh of tickets and stats
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Emergency Tickets</h1>
                <p className="text-muted-foreground">Track and manage elevator/escalator breakdowns</p>
              </div>
              <Button variant="destructive" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Emergency
              </Button>
            </div>

            <EmergencyStats refreshTrigger={refreshTrigger} />
            <EmergencyTickets refreshTrigger={refreshTrigger} />
            
            <EmergencyForm
              open={formOpen}
              onOpenChange={setFormOpen}
              onSuccess={handleTicketCreated}
            />
          </main>
          <DemoGuidePanel
            title="Emergency Tickets"
            description="Handle urgent breakdown requests fast — from opening a ticket to resolution."
            features={[
              { icon: "📊", label: "Stats Overview", description: "Open, in-progress, and resolved ticket counts" },
              { icon: "📋", label: "Ticket List", description: "All emergency requests with priority and status" },
              { icon: "🚨", label: "New Emergency", description: "Quickly open a new ticket for a breakdown" },
            ]}
            tip="Emergency tickets notify the assigned technician immediately."
          />
        </div>
      </div>
    </SidebarProvider>
  )
}
