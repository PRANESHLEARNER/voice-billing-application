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

      <div className="flex justify-between text-xs">
        <span>Total Tax:</span>
        <span className="font-medium">{formatCurrency(calculations.totalTax)}</span>
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

      {/* Tax Breakdown */}
      {calculations.totalTax > 0 && (
        <div className="mt-2 p-2 bg-muted rounded-md">
          <h4 className="text-xs font-medium mb-1">Tax Breakdown</h4>
          {items.reduce((taxGroups: { [key: number]: { amount: number; tax: number } }, item) => {
            const rate = item.product.taxRate
            if (!taxGroups[rate]) {
              taxGroups[rate] = { amount: 0, tax: 0 }
            }
            taxGroups[rate].amount += item.amount
            taxGroups[rate].tax += item.taxAmount
            return taxGroups
          }, {}) &&
            Object.entries(
              items.reduce((taxGroups: { [key: number]: { amount: number; tax: number } }, item) => {
                const rate = item.product.taxRate
                if (!taxGroups[rate]) {
                  taxGroups[rate] = { amount: 0, tax: 0 }
                }
                taxGroups[rate].amount += item.amount
                taxGroups[rate].tax += item.taxAmount
                return taxGroups
              }, {})
            ).map(([rate, data]) => (
              <div key={rate} className="flex justify-between text-[11px] text-muted-foreground">
                <span>{rate}% Tax:</span>
                <span>{formatCurrency(data.tax)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
