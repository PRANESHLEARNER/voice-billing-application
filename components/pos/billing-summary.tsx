"use client"

import { Separator } from "@/components/ui/separator"
import type { BillItem } from "./billing-table"

interface BillingSummaryProps {
  items: BillItem[]
}

export function BillingSummary({ items }: BillingSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const calculations = items.reduce(
    (acc, item) => {
      const baseAmount = item.quantity * item.rate
      acc.subtotal += baseAmount
      acc.totalTax += item.taxAmount
      acc.totalDiscount += item.discount?.discountAmount || 0
      acc.totalItems += item.quantity
      return acc
    },
    { subtotal: 0, totalTax: 0, totalDiscount: 0, totalItems: 0 },
  )

  const discountedSubtotal = calculations.subtotal - calculations.totalDiscount
  const grandTotal = discountedSubtotal + calculations.totalTax
  const roundOff = Math.round(grandTotal) - grandTotal
  const finalTotal = Math.round(grandTotal)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span>Total Items:</span>
        <span className="font-medium">{calculations.totalItems}</span>
      </div>

      <div className="flex justify-between text-xs">
        <span>Subtotal:</span>
        <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
      </div>

      {calculations.totalDiscount > 0 && (
        <div className="flex justify-between text-xs text-green-600">
          <span>Total Discount:</span>
          <span className="font-medium">-{formatCurrency(calculations.totalDiscount)}</span>
        </div>
      )}

      <div className="flex justify-between text-xs">
        <span>Discounted Subtotal:</span>
        <span className="font-medium">{formatCurrency(discountedSubtotal)}</span>
      </div>

      <div className="flex justify-between text-xs font-semibold text-blue-600">
        <span>Total Tax ({calculations.totalTax > 0 ? ((calculations.totalTax / discountedSubtotal) * 100).toFixed(1) : 0}%):</span>
        <span className="font-bold">{formatCurrency(calculations.totalTax)}</span>
      </div>

      {Math.abs(roundOff) > 0.01 && (
        <div className="flex justify-between text-xs">
          <span>Round Off:</span>
          <span className="font-medium">
            {roundOff > 0 ? "+" : ""}
            {formatCurrency(roundOff)}
          </span>
        </div>
      )}

      <Separator className="my-2" />

      <div className="flex justify-between text-xs font-bold">
        <span>Grand Total:</span>
        <span className="text-primary">{formatCurrency(finalTotal)}</span>
      </div>

    </div>
  )
}
