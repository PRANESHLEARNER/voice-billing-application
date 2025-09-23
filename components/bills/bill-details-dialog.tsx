"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { DialogDescription } from "@/components/ui/dialog"
import { DialogHeader } from "@/components/ui/dialog"
import { DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { FileText, Printer, Download, X } from "lucide-react"
import type { Bill } from "@/lib/api"

interface BillDetailsDialogProps {
  bill: Bill | null
  isOpen: boolean
  onClose: () => void
}

export function BillDetailsDialog({ bill, isOpen, onClose }: BillDetailsDialogProps) {
  if (!bill) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      case "refunded":
        return "secondary"
      default:
        return "outline"
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(bill.status)}>{bill.status.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <div className="text-center">
            <DialogTitle className="text-2xl font-bold mb-2">Supermarket</DialogTitle>
            <DialogDescription className="text-sm">
              123 Main Street, City<br />
              State, Country - 123456<br />
              Phone: +1 234 567 8900
            </DialogDescription>
            <div className="border-b border-dashed border-gray-300 my-4"></div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Bill Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold mb-2">Bill Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Bill Number:</span>
                    <span className="font-mono font-medium">{bill.billNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Date & Time:</span>
                    <span className="text-right">{new Date(bill.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cashier:</span>
                    <span className="text-right">{bill.cashierName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="capitalize text-right">{bill.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  {bill.customer?.name ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="text-right">{bill.customer.name}</span>
                      </div>
                      {bill.customer.phone && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="text-right">{bill.customer.phone}</span>
                        </div>
                      )}
                      {bill.customer.address && (
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground mt-1">Address:</span>
                          <span className="text-right max-w-[60%]">{bill.customer.address}</span>
                        </div>
                      )}
                      {bill.customer.gstNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">GST Number:</span>
                          <span className="font-mono text-right">{bill.customer.gstNumber}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground italic">Walk-in Customer</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <h3 className="font-semibold mb-4">Items ({bill.items.length})</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-[8%]">S.No</TableHead>
                    <TableHead className="w-[32%]">Product</TableHead>
                    <TableHead className="text-right w-[10%]">Qty</TableHead>
                    <TableHead className="text-right w-[12%]">Rate</TableHead>
                    <TableHead className="text-right w-[12%]">Discount</TableHead>
                    <TableHead className="text-right w-[12%]">Tax</TableHead>
                    <TableHead className="text-right w-[14%] font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="align-top py-2">{index + 1}</TableCell>
                      <TableCell className="align-top py-2">
                        <div className="font-medium truncate">
                          {item.productName}
                          {item.size && (
                            <span className="text-xs text-blue-600 ml-2">
                              ({item.size})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle py-2">{item.quantity}</TableCell>
                      <TableCell className="text-right align-middle py-2">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right align-middle py-2">
                        {item.discount && item.discount.discountAmount > 0 ? (
                          <span className="text-green-600">-{formatCurrency(item.discount.discountAmount)}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right align-middle py-2">
                        {item.taxAmount > 0 ? formatCurrency(item.taxAmount) : "-"}
                      </TableCell>
                      <TableCell className="text-right align-middle py-2 font-semibold">{formatCurrency(item.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>

          <Separator />

          {/* Bill Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <h3 className="font-semibold">Payment Details</h3>
              <div className="space-y-3 text-sm">
                {/* Payment Method */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <Badge variant="outline" className="capitalize">
                    {bill.paymentMethod}
                  </Badge>
                </div>

                {/* Payment Breakdown for Mixed Payments */}
                {bill.paymentBreakdown && bill.paymentBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground">Payment Breakdown:</h4>
                    <div className="space-y-1">
                      {bill.paymentBreakdown.map((payment, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="capitalize">
                            {payment.method === "card" && payment.details?.cardLast4
                              ? `Card (**** ${payment.details.cardLast4})`
                              : payment.method === "upi" && payment.details?.upiId
                              ? `UPI (${payment.details.upiId})`
                              : payment.method}
                          </span>
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Details for Card/UPI */}
                {bill.paymentDetails && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground">Payment Information:</h4>
                    <div className="space-y-1">
                      {bill.paymentDetails.razorpayPaymentId && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Transaction ID:</span>
                          <span className="font-mono text-xs">{bill.paymentDetails.razorpayPaymentId}</span>
                        </div>
                      )}
                      {bill.paymentDetails.cardLast4 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Card Number:</span>
                          <span>**** {bill.paymentDetails.cardLast4}</span>
                        </div>
                      )}
                      {bill.paymentDetails.cardType && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Card Type:</span>
                          <span className="capitalize">{bill.paymentDetails.cardType}</span>
                        </div>
                      )}
                      {bill.paymentDetails.upiId && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">UPI ID:</span>
                          <span>{bill.paymentDetails.upiId}</span>
                        </div>
                      )}
                      {bill.paymentDetails.paymentStatus && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Payment Status:</span>
                          <Badge 
                            variant={
                              bill.paymentDetails.paymentStatus === "completed" ? "default" :
                              bill.paymentDetails.paymentStatus === "failed" ? "destructive" :
                              "secondary"
                            }
                            className="capitalize"
                          >
                            {bill.paymentDetails.paymentStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cash Payment Details */}
                {bill.paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Cash Tendered:</span>
                      <span className="font-medium">{formatCurrency(bill.cashTendered)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Change Due:</span>
                      <span className="text-green-600 font-medium">{formatCurrency(bill.changeDue)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Bill Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium text-right">{formatCurrency(bill.subtotal)}</span>
                </div>
                {bill.totalDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Discount:</span>
                    <span className="font-medium text-right text-green-600">-{formatCurrency(bill.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span className="font-medium text-right">{formatCurrency(bill.totalTax)}</span>
                </div>
                {Math.abs(bill.roundOff) > 0.01 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Round Off:</span>
                    <span className="font-medium text-right">
                      {bill.roundOff > 0 ? "+" : ""}
                      {formatCurrency(bill.roundOff)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Grand Total:</span>
                  <span className="text-right">{formatCurrency(bill.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}
