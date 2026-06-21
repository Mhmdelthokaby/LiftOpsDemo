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
import { useTranslation } from "@/lib/i18n/context"

export default function EmergencyPage() {
  const { t } = useTranslation();
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
                <h1 className="text-3xl font-bold tracking-tight">{t.emergency.title}</h1>
                <p className="text-muted-foreground">{t.emergency.subtitle}</p>
              </div>
              <Button variant="destructive" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t.emergency.newEmergency}
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
            title={t.demoGuide.emergency.title}
            description={t.demoGuide.emergency.description}
            features={[
              { icon: "📊", label: t.emergency.statsOverview, description: t.emergency.statsOverviewDesc },
              { icon: "📋", label: t.emergency.ticketList, description: t.emergency.ticketListDesc },
              { icon: "🚨", label: t.emergency.newEmergency, description: t.emergency.newEmergencyDesc },
            ]}
            tip={t.demoGuide.emergency.tip}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}
