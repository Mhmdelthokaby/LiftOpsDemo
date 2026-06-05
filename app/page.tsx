"use client"

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { KPICard } from "@/components/dashboard/kpi-card"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ProjectProgressChart } from "@/components/dashboard/project-progress-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { FolderKanban, Wrench, Calendar, AlertCircle, Package, AlertTriangle, Navigation2, CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"
import { getDashboardSummary, DashboardSummary, getEmergencyTickets } from "@/lib/api"
import { canViewDashboard } from "@/lib/user"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyStats, setEmergencyStats] = useState({
    open: 0,
    enRoute: 0,
    inProgress: 0,
    resolved: 0,
  });

  useEffect(() => {
    // Redirect technicians to their visits page
    if (!canViewDashboard()) {
      router.push('/technician/visits');
      return;
    }
    async function fetchSummary() {
      try {
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (error: any) {
        console.error("Failed to load dashboard summary", error);
        // If unauthorized, the auth guard will handle redirect
        if (error?.status === 401) {
          // Auth guard will redirect, just stop loading
          return;
        }
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchEmergencyStats() {
      try {
        const tickets = await getEmergencyTickets();
        setEmergencyStats({
          open: tickets.filter(t => t.status === "Open").length,
          enRoute: tickets.filter(t => t.status === "EnRoute").length,
          inProgress: tickets.filter(t => t.status === "InProgress").length,
          resolved: tickets.filter(t => t.status === "Resolved").length,
        });
      } catch (error) {
        console.error("Failed to load emergency stats", error);
      }
    }
    
    fetchSummary();
    fetchEmergencyStats();
  }, []);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's an overview of your operations.</p>
            </div>

            {/* KPI Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <KPICard
                title="Total Projects"
                value={summary?.totalProjects ?? 0}
                change={loading ? "Loading..." : "+0% from last month"}
                changeType="neutral"
                icon={FolderKanban}
              />
              <KPICard
                title="Active Installations"
                value={summary?.activeInstallations ?? 0}
                description="Ongoing projects"
                icon={Wrench}
              />
              <KPICard
                title="Maintenance Due"
                value={summary?.maintenanceDue ?? 0}
                change="Scheduled visits"
                changeType="neutral"
                icon={Calendar}
              />
              <KPICard
                title="Low Stock Items"
                value={summary?.lowStockItems ?? 0}
                change="Reorder recommended"
                changeType="negative"
                icon={Package}
              />
            </div>

            {/* Emergency Status Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-destructive/20 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open</p>
                    <p className="text-2xl font-bold text-destructive">{emergencyStats.open}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
              <div className="rounded-lg border border-chart-1/20 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">En Route</p>
                    <p className="text-2xl font-bold text-chart-1">{emergencyStats.enRoute}</p>
                  </div>
                  <Navigation2 className="h-5 w-5 text-chart-1" />
                </div>
              </div>
              <div className="rounded-lg border border-warning/20 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold text-warning">{emergencyStats.inProgress}</p>
                  </div>
                  <Wrench className="h-5 w-5 text-warning" />
                </div>
              </div>
              <div className="rounded-lg border border-success/20 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                    <p className="text-2xl font-bold text-success">{emergencyStats.resolved}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <RevenueChart data={summary?.revenueData} />
              <ProjectProgressChart data={summary?.projectStatusData} />
            </div>

            {/* Activity Feed */}
            <div className="grid gap-4">
              <ActivityFeed activities={summary?.recentActivities} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
