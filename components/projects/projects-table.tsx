"use client"

import { useState } from "react"
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
import { ArrowUpDown, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ProjectDetail } from "./project-detail"

export type Project = {
  id: string
  name: string
  client: string
  status: "new" | "in-progress" | "handed-over" | "maintenance"
  units: number
  location: string
  startDate: string
  value: string
}

const projects: Project[] = [
  {
    id: "PRJ-2045",
    name: "Grand Plaza Tower",
    client: "Apex Developers Ltd",
    status: "in-progress",
    units: 12,
    location: "Downtown District",
    startDate: "2024-01-15",
    value: "$845,000",
  },
  {
    id: "PRJ-2038",
    name: "Harbor View Complex",
    client: "Seaside Properties",
    status: "maintenance",
    units: 8,
    location: "Harbor Bay",
    startDate: "2023-08-20",
    value: "$520,000",
  },
  {
    id: "PRJ-2051",
    name: "Skyline Residential",
    client: "Metro Housing Corp",
    status: "handed-over",
    units: 6,
    location: "West End",
    startDate: "2024-03-10",
    value: "$380,000",
  },
  {
    id: "PRJ-2052",
    name: "Central Mall Expansion",
    client: "Retail Ventures Inc",
    status: "new",
    units: 15,
    location: "City Center",
    startDate: "2024-06-01",
    value: "$1,250,000",
  },
  {
    id: "PRJ-2046",
    name: "Riverside Mall",
    client: "Shopping District LLC",
    status: "in-progress",
    units: 8,
    location: "Riverside",
    startDate: "2024-02-12",
    value: "$625,000",
  },
]

const statusColors = {
  new: "bg-chart-1 text-primary-foreground",
  "in-progress": "bg-warning text-warning-foreground",
  "handed-over": "bg-success text-success-foreground",
  maintenance: "bg-secondary text-secondary-foreground",
}

export function ProjectsTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "id",
      header: "Project ID",
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Project Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => <div className="text-sm">{row.getValue("client")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof statusColors
        return (
          <Badge className={statusColors[status]} variant="secondary">
            {status.replace("-", " ")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "units",
      header: "Units",
      cell: ({ row }) => <div className="text-center">{row.getValue("units")}</div>,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => <div className="text-sm">{row.getValue("location")}</div>,
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Contract Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-semibold">{row.getValue("value")}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSelectedProject(row.original)}>
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Project Details</DialogTitle>
            </DialogHeader>
            {selectedProject && <ProjectDetail project={selectedProject} />}
          </DialogContent>
        </Dialog>
      ),
    },
  ]

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter projects..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  )
}
