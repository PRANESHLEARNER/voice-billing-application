"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash2, Minus, Plus } from "lucide-react"
import type { Product, ProductVariant } from "@/lib/api"

export interface BillItem {
  id: string
  product: Product
  variant: ProductVariant
  quantity: number
  rate: number
  amount: number
  taxAmount: number
  totalAmount: number
  source?: "manual" | "voice"
  discount?: {
    discountId: string
    discountName: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    discountAmount: number
  }
}

interface BillingTableProps {
  items: BillItem[]
  onUpdateItem: (id: string, updates: Partial<BillItem>) => void
  onRemoveItem: (id: string) => void
}

export function BillingTable({ items, onUpdateItem, onRemoveItem }: BillingTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity <= 0) return
    onUpdateItem(id, { quantity })
  }


  return (
    <div className="border rounded-lg bg-card ">
      <Table>
        <TableHeader>
        <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
          <TableHead className="text-primary-foreground">Code</TableHead>
          <TableHead className="text-primary-foreground">Item Name</TableHead>
          <TableHead className="text-primary-foreground w-24">Qty</TableHead>
          <TableHead className="text-primary-foreground w-32">Rate</TableHead>
          <TableHead className="text-primary-foreground w-32">Discount</TableHead>
          <TableHead className="text-primary-foreground w-24">Tax%</TableHead>
          <TableHead className="text-primary-foreground w-32">Amount</TableHead>
          <TableHead className="text-primary-foreground w-16">Action</TableHead>
        </TableRow>
      </TableHeader>

        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No items added. Search and add products to start billing.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {item.product.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.product.category} • {item.variant.size}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {item.variant.sku}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 bg-transparent"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, Number.parseFloat(e.target.value) || 1)}
                      className="h-8 w-16 text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 bg-transparent"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{formatCurrency(item.rate)}</div>
                </TableCell>
                <TableCell>
                  {item.discount ? (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {item.discount.discountType === 'percentage' 
                          ? `${item.discount.discountValue}%` 
                          : formatCurrency(item.discount.discountValue)}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        -{formatCurrency(item.discount.discountAmount)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No discount</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <Badge variant="secondary">{item.product.taxRate}%</Badge>
                    <div className="text-xs text-muted-foreground mt-1">{formatCurrency(item.taxAmount)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(item.totalAmount)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
