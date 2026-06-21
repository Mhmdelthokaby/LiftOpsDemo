'use client'

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { AdminManagement } from "@/components/settings/admin-management"
import { CategoryManagement } from "@/components/settings/category-management"
import { hasRole } from "@/lib/user"
import { useTranslation } from "@/lib/i18n/context"

export default function SettingsPage() {
  const { t } = useTranslation();
  const isManager = hasRole('Manager')

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
              <p className="text-muted-foreground">{t.settings.subtitle}</p>
            </div>

            <div className="grid gap-6 max-w-4xl">
              {isManager && (
                <>
                  <AdminManagement />
                  <CategoryManagement />
                </>
              )}

              {/* Company Information section disabled */}
              {/* <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Update your company details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input id="company" defaultValue="LiftOps" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="admin@elevationmaster.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" defaultValue="+1 (555) 000-0000" />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card> */}

              {/* Notifications section disabled */}
              {/* <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Configure how you receive alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Emergency Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified for high-priority tickets</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Reminders</Label>
                      <p className="text-sm text-muted-foreground">Daily summary of scheduled visits</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Inventory Alerts</Label>
                      <p className="text-sm text-muted-foreground">Low stock notifications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card> */}
            </div>
          </main>
          <DemoGuidePanel
            title={t.demoGuide.settings.title}
            description={t.demoGuide.settings.description}
            features={[
              { icon: "👤", label: "Admin Management", description: "Add and manage system administrators" },
              { icon: "🏷️", label: "Category Management", description: "Create categories for projects, parts, and more" },
            ]}
            tip={t.demoGuide.settings.tip}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}
