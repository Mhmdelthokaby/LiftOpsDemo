"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"
import { getInventoryItems, getActiveInventoryItems, getInventoryTotalValue, type InventoryItem } from "@/lib/api"
import { canManageInventory, canViewInventory } from "@/lib/user"
import { ApiError } from "@/lib/api-client"

export interface InventoryOverviewRef {
  refresh: () => void
}

export const InventoryOverview = forwardRef<InventoryOverviewRef>((props, ref) => {
  const [totalItems, setTotalItems] = useState<number>(0)
  const [lowStockCount, setLowStockCount] = useState<number>(0)
  const [inventoryValue, setInventoryValue] = useState<number>(0)
  const [categoryCount, setCategoryCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const fetchInventoryStats = async () => {
    try {
      setLoading(true)
      
      // Check permissions - use appropriate endpoint based on user role
      let items: InventoryItem[] = []
      let totalValue = 0
      
      // Try to fetch inventory data based on permissions
      if (canManageInventory()) {
        // User has full access - use getAll endpoint
        try {
          [items, totalValue] = await Promise.all([
            getInventoryItems(),
            getInventoryTotalValue()
          ])
        } catch (error: any) {
          // If 403, user might have lost permission - fall back to active items
          if (error instanceof ApiError && error.status === 403) {
            if (canViewInventory()) {
              items = await getActiveInventoryItems()
              // Try to get total value, but don't fail if it's also forbidden
              try {
                totalValue = await getInventoryTotalValue()
              } catch {
                totalValue = 0
              }
            } else {
              throw error
            }
          } else {
            throw error
          }
        }
      } else if (canViewInventory()) {
        // User has view-only access - use active items endpoint
        items = await getActiveInventoryItems()
        // Try to get total value, but don't fail if it's forbidden
        try {
          totalValue = await getInventoryTotalValue()
        } catch (error: any) {
          // Silently handle 403 for value endpoint
          if (!(error instanceof ApiError && error.status === 403)) {
            console.error("Failed to fetch inventory value:", error)
          }
          totalValue = 0
        }
      } else {
        // User has no inventory access - set everything to 0
        setTotalItems(0)
        setLowStockCount(0)
        setInventoryValue(0)
        setCategoryCount(0)
        setLoading(false)
        return
      }

      console.log("Inventory stats fetched:", { itemsCount: items.length, totalValue })

      // Calculate stats
      const activeItems = items.filter(item => !item.isDisabled)
      const totalItemsCount = activeItems.length
      
      // Count unique categories
      const uniqueCategories = new Set(activeItems.map(item => item.categoryId))
      const categoryCountValue = uniqueCategories.size

      // Low stock items (stockQuantity < 10, based on dashboard logic)
      const lowStockItems = activeItems.filter(item => item.stockQuantity < 10)
      const lowStockCountValue = lowStockItems.length

      // Debug: Calculate value manually to verify
      const manualCalculation = activeItems.reduce((sum, item) => {
        const itemValue = (item.unitPrice || 0) * (item.stockQuantity || 0)
        if (itemValue > 0) {
          console.log(`Item: ${item.name}, Price: ${item.unitPrice}, Qty: ${item.stockQuantity}, Value: ${itemValue}`)
        }
        return sum + itemValue
      }, 0)
      console.log("Manual calculation:", manualCalculation, "API value:", totalValue)
      
      // Use manual calculation if API returns 0 but we have items with value
      const finalValue = (totalValue === 0 && manualCalculation > 0) ? manualCalculation : totalValue

      setTotalItems(totalItemsCount)
      setLowStockCount(lowStockCountValue)
      setInventoryValue(finalValue)
      setCategoryCount(categoryCountValue)
    } catch (error: any) {
      console.error("Failed to fetch inventory stats:", error)
      // Set values to 0 on error (unless it's a permission error, which we handle above)
      if (error instanceof ApiError && error.status === 403) {
        // Permission denied - user shouldn't see inventory data
        setTotalItems(0)
        setLowStockCount(0)
        setInventoryValue(0)
        setCategoryCount(0)
      } else {
        // Other errors - still set to 0 but log the error
        setTotalItems(0)
        setLowStockCount(0)
        setInventoryValue(0)
        setCategoryCount(0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryStats()
  }, [])

  useImperativeHandle(ref, () => ({
    refresh: fetchInventoryStats
  }))

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : totalItems}</div>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading..." : categoryCount > 0 ? `Across ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}` : "No categories"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : lowStockCount}</div>
          <p className={`text-xs ${lowStockCount > 0 ? "text-warning" : "text-muted-foreground"}`}>
            {loading ? "Loading..." : lowStockCount > 0 ? "Requires immediate attention" : "All items in stock"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <TrendingUp className="h-4 w-4 text-chart-1" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">No pending orders</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          <DollarSign className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : `$${(inventoryValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <p className="text-xs text-muted-foreground">Current stock value</p>
        </CardContent>
      </Card>
    </div>
  )
})

InventoryOverview.displayName = "InventoryOverview"
