"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type MaintenanceChecklistItem, type UpdateMaintenanceChecklistItemDto, type CreateMaintenanceChecklistItemDto } from "@/lib/api"

interface ChecklistItemFormProps {
  item?: MaintenanceChecklistItem | null
  onSubmit: (data: UpdateMaintenanceChecklistItemDto | CreateMaintenanceChecklistItemDto) => void
  onCancel: () => void
}

export function ChecklistItemForm({ item, onSubmit, onCancel }: ChecklistItemFormProps) {
  const [formData, setFormData] = useState({
    title: item?.title || "",
    description: item?.description || "",
    order: item?.order ?? 0,
    isActive: item?.isActive ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Motor inspection and lubrication"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description or instructions"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order">Order *</Label>
        <Input
          id="order"
          type="number"
          min="0"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          required
        />
        <p className="text-xs text-muted-foreground">Lower numbers appear first in the checklist</p>
      </div>

      {item && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isActive" className="text-sm font-normal">
            Active (uncheck to disable this item)
          </Label>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {item ? "Update" : "Create"} Checklist Item
        </Button>
      </div>
    </form>
  )
}

