"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type InventoryItem = {
  id: string
  partNumber: string
  name: string
  category: string
  quantity: number
  minStock: number
  unit: string
  location: string
  supplier: string
  unitPrice: string
}

interface PartRequestFormProps {
  item: InventoryItem
}

export function PartRequestForm({ item }: PartRequestFormProps) {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label>Part Name</Label>
        <Input value={item.name} disabled />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Part Number</Label>
          <Input value={item.partNumber} disabled />
        </div>
        <div className="space-y-2">
          <Label>Current Stock</Label>
          <Input value={`${item.quantity} ${item.unit}`} disabled />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">Request Quantity</Label>
        <Input id="quantity" type="number" placeholder="Enter quantity" min="1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select defaultValue="normal">
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgent">Urgent - Needed Immediately</SelectItem>
            <SelectItem value="high">High - Within 1 week</SelectItem>
            <SelectItem value="normal">Normal - Standard Delivery</SelectItem>
            <SelectItem value="low">Low - No Rush</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="project">Related Project (Optional)</Label>
        <Select>
          <SelectTrigger id="project">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prj-2045">Grand Plaza Tower</SelectItem>
            <SelectItem value="prj-2038">Harbor View Complex</SelectItem>
            <SelectItem value="prj-2051">Skyline Residential</SelectItem>
            <SelectItem value="prj-2052">Central Mall Expansion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional information or special requirements..." rows={3} />
      </div>

      <div className="rounded-lg bg-muted p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated Cost:</span>
          <span className="font-semibold">
            {item.unitPrice} per {item.unit}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Supplier:</span>
          <span className="font-medium">{item.supplier}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Submit Request
        </Button>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  )
}
