"use client"

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MaintenanceCalendar } from "@/components/maintenance/maintenance-calendar"
import { MaintenanceList } from "@/components/maintenance/maintenance-list"
import { ChecklistItemsTable } from "@/components/maintenance/checklist-items-table"
import { MaintenanceProjectsView } from "@/components/maintenance/maintenance-projects-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Plus } from "lucide-react"
import { useState, useRef, useEffect, Suspense } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChecklistItemForm } from "@/components/maintenance/checklist-item-form"
import { createMaintenanceChecklistItem, type CreateMaintenanceChecklistItemDto } from "@/lib/api"
import { toast } from "sonner"
import { canManageMaintenance } from "@/lib/user"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n/context"

function MaintenancePageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const refreshTableRef = useRef<(() => void) | null>(null)
  const canManage = canManageMaintenance()
  
  // Get the view from URL params, default to list
  const viewParam = searchParams.get('view') || 'list'
  const [activeTab, setActiveTab] = useState(viewParam)
  
  // Update active tab when URL param changes
  useEffect(() => {
    const view = searchParams.get('view') || 'list'
    setActiveTab(view)
  }, [searchParams])

  const handleCreate = async (data: CreateMaintenanceChecklistItemDto) => {
    try {
      await createMaintenanceChecklistItem(data)
      toast.success("Checklist item created successfully")
      setIsAddDialogOpen(false)
      
      // Trigger refresh of the checklist items table
      setTimeout(() => {
        if (refreshTableRef.current) {
          refreshTableRef.current()
        }
      }, 500)
    } catch (error: any) {
      console.error("Failed to create checklist item:", error)
      toast.error(error.message || "Failed to create checklist item")
    }
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
                <h1 className="text-3xl font-bold tracking-tight">{t.maintenance.title}</h1>
                <p className="text-muted-foreground">{t.maintenance.subtitle}</p>
              </div>
              {activeTab === 'calendar' && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Visit
                </Button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value)
              router.push(`/maintenance?view=${value}`)
            }} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="projects">{t.maintenance.projects}</TabsTrigger>
                  <TabsTrigger value="calendar">{t.maintenance.calendar}</TabsTrigger>
                  <TabsTrigger value="list">{t.maintenance.list}</TabsTrigger>
                  {/* <TabsTrigger value="checklist">Mobile Checklist</TabsTrigger> Disabled for now */}
                  {canManage && <TabsTrigger value="manage-checklist">{t.maintenance.checklist}</TabsTrigger>}
                </TabsList>
                {activeTab === 'calendar' && (
                  <div className="flex gap-2">
                    <Link href="/maintenance/elevators">
                      <Button variant="outline">
                        View Elevators
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <TabsContent value="projects">
                <MaintenanceProjectsView />
              </TabsContent>

              <TabsContent value="calendar">
                <MaintenanceCalendar />
              </TabsContent>

              <TabsContent value="list">
                <MaintenanceList />
              </TabsContent>

              {/* Mobile checklist disabled for now */}
              {/* <TabsContent value="checklist">
                <div className="rounded-lg border bg-card p-6">
                  <p className="text-center text-muted-foreground">
                    Mobile checklist view - optimized for technician field use
                  </p>
                </div>
              </TabsContent> */}

              {canManage && (
                <TabsContent value="manage-checklist">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">Maintenance Checklist Items</h2>
                        <p className="text-muted-foreground">Manage checklist items that can be used during maintenance visits</p>
                      </div>
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Checklist Item
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add Checklist Item</DialogTitle>
                          </DialogHeader>
                          <ChecklistItemForm
                            item={null}
                            onSubmit={handleCreate}
                            onCancel={() => setIsAddDialogOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <ChecklistItemsTable onRefreshReady={(fn) => { refreshTableRef.current = fn }} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default function MaintenancePage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-6">
              <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    }>
      <MaintenancePageContent />
      <DemoGuidePanel
        title={t.demoGuide.maintenance.title}
        description={t.demoGuide.maintenance.description}
        features={[
          { icon: "📁", label: "Projects Tab", description: "All maintenance contracts by client" },
          { icon: "📅", label: "Calendar Tab", description: "Visual monthly view of all scheduled visits" },
          { icon: "📋", label: "List Tab", description: "Detailed list of all visits with status" },
          { icon: "✅", label: "Checklist Tab", description: "Per-visit checklist for technicians" },
          { icon: "👨‍🔧", label: "Assign Visits", description: "Assign technicians to specific visits" },
          { icon: "🔧", label: "Elevator Status", description: "Freeze, stop, or activate individual elevators" },
        ]}
        tip={t.demoGuide.maintenance.tip}
      />
    </Suspense>
  )
}
