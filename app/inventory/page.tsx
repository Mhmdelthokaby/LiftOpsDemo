"use client"

import { AppHeader } from "@/components/app-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryOverview, type InventoryOverviewRef } from "@/components/inventory/inventory-overview"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { Button } from "@/components/ui/button"
import { DemoGuidePanel } from "@/components/demo-guide-panel"
import { Plus, Download } from "lucide-react"
import { canManageInventory, canViewInventory } from "@/lib/user"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InventoryItemForm } from "@/components/inventory/inventory-item-form"
import { CategoryForm } from "@/components/inventory/category-form"
import { createInventoryItem, createCategory, type CreateInventoryItemDto, type CreateCategoryDto } from "@/lib/api"
import { toast } from "sonner"
import { FolderPlus } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function InventoryPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const refreshTableRef = useRef<(() => void) | null>(null)
  const refreshOverviewRef = useRef<InventoryOverviewRef | null>(null)
  const canManage = canManageInventory()
  const canView = canViewInventory()

  useEffect(() => {
    if (!canView) {
      router.push("/")
    }
  }, [canView, router])

  const handleCreate = async (data: CreateInventoryItemDto) => {
    try {
      console.log("Creating inventory item with data:", data)
      const itemId = await createInventoryItem(data)
      console.log("Item created with ID:", itemId)
      toast.success("Item created successfully")
      setIsAddDialogOpen(false)
      
      // Small delay to ensure backend has processed the request
      setTimeout(() => {
        // Trigger refresh of the inventory table and overview
        if (refreshTableRef.current) {
          console.log("Refreshing inventory table...")
          refreshTableRef.current()
        }
        if (refreshOverviewRef.current) {
          console.log("Refreshing inventory overview...")
          refreshOverviewRef.current.refresh()
        }
        if (!refreshTableRef.current && !refreshOverviewRef.current) {
          console.log("Refresh functions not available, reloading page...")
          // Fallback: reload page if refs not available
          window.location.reload()
        }
      }, 500)
    } catch (error: any) {
      console.error("Error creating inventory item:", error)
      console.error("Error details:", {
        message: error?.message,
        status: error?.status,
        data: error?.data
      })
      toast.error(error?.message || "Failed to create item")
    }
  }

  const handleCreateCategory = async (data: CreateCategoryDto) => {
    try {
      const categoryId = await createCategory(data)
      toast.success("Category created successfully")
      setIsAddCategoryDialogOpen(false)
      // Refresh the page to update category lists in forms
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } catch (error: any) {
      console.error("Error creating category:", error)
      toast.error(error?.message || "Failed to create category")
    }
  }

  if (!canView) {
    return null
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
                <h1 className="text-3xl font-bold tracking-tight">{t.inventory.title}</h1>
                <p className="text-muted-foreground">{t.inventory.subtitle}</p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t.inventory.export}
                  </Button>
                  <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <FolderPlus className="mr-2 h-4 w-4" />
                        {t.inventory.addCategory}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                      </DialogHeader>
                      <CategoryForm
                        onSubmit={handleCreateCategory}
                        onCancel={() => setIsAddCategoryDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t.inventory.addItem}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Inventory Item</DialogTitle>
                      </DialogHeader>
                      <InventoryItemForm
                        onSubmit={handleCreate}
                        onCancel={() => setIsAddDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <InventoryOverview ref={refreshOverviewRef} />
            <InventoryTable onRefreshReady={(refreshFn) => { refreshTableRef.current = refreshFn }} />
          </main>
          <DemoGuidePanel
            title={t.demoGuide.inventory.title}
            description={t.demoGuide.inventory.description}
            features={[
              { icon: "📦", label: "Parts Overview", description: "Full catalog of spare parts with quantities" },
              { icon: "⚠️", label: "Low Stock Alerts", description: "Automatic warnings when stock falls below threshold" },
              { icon: "➕", label: "Add Items & Categories", description: "Organize your inventory your way" },
              { icon: "📤", label: "Export", description: "Download inventory data anytime" },
            ]}
            tip={t.demoGuide.inventory.tip}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}
