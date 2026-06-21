"use client"

import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { InstallationPipeline } from "@/components/installation/installation-pipeline"
import { InspectionList } from "@/components/installation/inspection-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"

export default function InstallationPage() {
  const { t } = useTranslation();
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{t.installation.title}</h1>
              <p className="text-muted-foreground">{t.installation.subtitle}</p>
            </div>

            <Tabs defaultValue="inspections" className="w-full">
              <TabsList>
                <TabsTrigger value="inspections">{t.installation.inspections}</TabsTrigger>
                <TabsTrigger value="pipeline">{t.installation.pipeline}</TabsTrigger>
              </TabsList>

              <TabsContent value="inspections" className="space-y-4">
                <InspectionList />
              </TabsContent>

              <TabsContent value="pipeline" className="space-y-4">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">{t.installation.allUnits}</TabsTrigger>
                    <TabsTrigger value="phase1">{t.installation.phase1}</TabsTrigger>
                    <TabsTrigger value="phase2">{t.installation.phase2}</TabsTrigger>
                    <TabsTrigger value="phase3">{t.installation.phase3}</TabsTrigger>
                    <TabsTrigger value="phase4">{t.installation.phase4}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4">
                    <InstallationPipeline filter="all" />
                  </TabsContent>

                  <TabsContent value="phase1" className="space-y-4">
                    <InstallationPipeline filter="phase1" />
                  </TabsContent>

                  <TabsContent value="phase2" className="space-y-4">
                    <InstallationPipeline filter="phase2" />
                  </TabsContent>

                  <TabsContent value="phase3" className="space-y-4">
                    <InstallationPipeline filter="phase3" />
                  </TabsContent>

                  <TabsContent value="phase4" className="space-y-4">
                    <InstallationPipeline filter="phase4" />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </main>
          <DemoGuidePanel
            title={t.demoGuide.installation.title}
            description={t.demoGuide.installation.description}
            features={[
              { icon: "🔍", label: t.installation.pipelineView, description: t.installation.pipelineViewDesc },
              { icon: "✅", label: t.installation.inspectionsTab, description: t.installation.inspectionsTabDesc },
            ]}
            tip={t.demoGuide.installation.tip}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}
