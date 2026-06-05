"use client"

import { useState, useEffect } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Edit, Power, PowerOff, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getInventoryItems, getActiveInventoryItems, updateInventoryItem, disableInventoryItem, type InventoryItem, type UpdateInventoryItemDto } from "@/lib/api"
import { canManageInventory, canViewInventory } from "@/lib/user"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { InventoryItemForm } from "./inventory-item-form"
import { ApiError } from "@/lib/api-client"

interface InventoryTableProps {
  onRefreshReady?: (refreshFn: () => void) => void
}

export function InventoryTable({ onRefreshReady }: InventoryTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDisabling, setIsDisabling] = useState<string | null>(null)

  const canManage = canManageInventory()
  const canView = canViewInventory()

  useEffect(() => {
    if (!canView) {
      router.push("/")
      return
    }
    fetchItems()
  }, [canView, router])

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchItems)
    }
  }, [onRefreshReady])

  const fetchItems = async () => {
    try {
      setLoading(true)
      let data: InventoryItem[] = []
      
      // Manager and InventoryAdmin see all items, others see only active
      if (canManage) {
        try {
          data = await getInventoryItems()
        } catch (error: any) {
          // If 403, user might have lost permission - fall back to active items
          if (error instanceof ApiError && error.status === 403) {
            if (canView) {
              data = await getActiveInventoryItems()
            } else {
              throw error
            }
          } else {
            throw error
          }
        }
      } else if (canView) {
        data = await getActiveInventoryItems()
      } else {
        // No permission - set empty array
        setItems([])
        setLoading(false)
        return
      }
      
      console.log("Fetched inventory items:", data)
      console.log("Number of items:", data?.length || 0)
      
      if (Array.isArray(data)) {
        setItems(data)
      } else {
        console.error("Expected array but got:", typeof data, data)
        setItems([])
        toast.error("Invalid data format received from server")
      }
    } catch (error: any) {
      console.error("Error fetching inventory items:", error)
      console.error("Error details:", {
        message: error?.message,
        status: error?.status,
        data: error?.data
      })
      
      // Handle permission errors gracefully
      if (error instanceof ApiError && error.status === 403) {
        setItems([])
        // Don't show toast for permission errors - user shouldn't be on this page anyway
      } else {
        toast.error(error?.message || "Failed to load inventory items")
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, data: UpdateInventoryItemDto) => {
    try {
      await updateInventoryItem(id, data)
      toast.success("Item updated successfully")
      setIsEditDialogOpen(false)
      setSelectedItem(null)
      fetchItems()
    } catch (error: any) {
      toast.error(error?.message || "Failed to update item")
    }
  }

  const handleDisable = async (id: string, disable: boolean) => {
    try {
      setIsDisabling(id)
      await disableInventoryItem(id, disable)
      toast.success(`Item ${disable ? "disabled" : "enabled"} successfully`)
      fetchItems()
    } catch (error: any) {
      toast.error(error?.message || "Failed to update item status")
    } finally {
      setIsDisabling(null)
    }
  }

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "itemNumber",
      header: "Number/Serial",
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("itemNumber") || "N/A"}</div>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("categoryName")}</Badge>,
    },
    {
      accessorKey: "stockQuantity",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const stock = row.getValue("stockQuantity") as number
        const isLow = stock < 10
        return (
          <div className={isLow ? "font-semibold text-orange-600" : ""}>
            {stock}
          </div>
        )
      },
    },
    {
      accessorKey: "unitPrice",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.getValue("unitPrice") as number
        return <div className="font-semibold">${price.toLocaleString()}</div>
      },
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => <div className="text-sm">{row.getValue("supplierName")}</div>,
    },
    ...(canManage ? [{
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const isDisabled = row.original.isDisabled
        return (
          <Badge variant={isDisabled ? "destructive" : "default"}>
            {isDisabled ? "Disabled" : "Active"}
          </Badge>
        )
      },
    } as ColumnDef<InventoryItem>] : []),
    ...(canManage ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original
        const isDisabled = item.isDisabled
        return (
          <div className="flex items-center gap-2">
            <Dialog open={isEditDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
              setIsEditDialogOpen(open)
              if (!open) setSelectedItem(null)
            }}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedItem(item)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Inventory Item</DialogTitle>
                </DialogHeader>
                {selectedItem && (
                  <InventoryItemForm
                    item={selectedItem}
                    onSubmit={(data) => handleUpdate(selectedItem.id, data)}
                    onCancel={() => {
                      setIsEditDialogOpen(false)
                      setSelectedItem(null)
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisable(item.id, !isDisabled)}
              disabled={isDisabling === item.id}
            >
              {isDisabled ? (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Enable
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Disable
                </>
              )}
            </Button>
          </div>
        )
      },
    } as ColumnDef<InventoryItem>] : []),
  ]

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: 100, // Show 100 items per page instead of default 10
      },
    },
    state: {
      sorting,
      columnFilters,
    },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading inventory items...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search items..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchItems}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          {items.filter((item) => item.stockQuantity < 10).length} Low Stock Items
        </Badge>
      </div>
      <div className="rounded-md border">
        <div className="relative max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-muted/50">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No inventory items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              items.length
            )}{" "}
            of {items.length} items
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
