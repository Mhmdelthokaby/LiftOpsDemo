"use client"

import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/lib/i18n/context"

const payments = [
  {
    project: "Grand Plaza Tower",
    milestone: "Phase 2 Completion",
    amount: "$253,000",
    status: "pending",
    dueDate: "2024-04-15",
  },
  {
    project: "Riverside Mall",
    milestone: "Foundation Complete",
    amount: "$211,000",
    status: "paid",
    dueDate: "2024-02-28",
  },
  {
    project: "Central Mall Expansion",
    milestone: "Contract Signing",
    amount: "$250,000",
    status: "paid",
    dueDate: "2024-06-01",
  },
  {
    project: "Harbor View Complex",
    milestone: "Monthly Maintenance",
    amount: "$12,500",
    status: "overdue",
    dueDate: "2024-11-30",
  },
]

const statusColors = {
  paid: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
  overdue: "bg-destructive text-destructive-foreground",
}

export default function FinancePage() {
  const { t } = useTranslation();
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{t.finance.title}</h1>
              <p className="text-muted-foreground">{t.finance.subtitle}</p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2,458,000</div>
                  <p className="text-xs text-success">+18% from last year</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <AlertCircle className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$465,500</div>
                  <p className="text-xs text-muted-foreground">Across 8 projects</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$12,500</div>
                  <p className="text-xs text-destructive">1 invoice overdue</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-chart-1" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$384,000</div>
                  <p className="text-xs text-success">+22% from last month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Schedule</CardTitle>
                <CardDescription>Milestone-based payment tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Milestone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{payment.project}</TableCell>
                        <TableCell>{payment.milestone}</TableCell>
                        <TableCell className="font-semibold">{payment.amount}</TableCell>
                        <TableCell>{payment.dueDate}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[payment.status as keyof typeof statusColors]}>
                            {payment.status === "paid" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
          <DemoGuidePanel
            title={t.demoGuide.finance.title}
            description={t.demoGuide.finance.description}
            features={[
              { icon: "💰", label: "Revenue Summary", description: "Total revenue, due, overdue, and collected amounts" },
              { icon: "📅", label: "Payment Schedule", description: "Table of upcoming and past payment installments" },
            ]}
            tip={t.demoGuide.finance.tip}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}
