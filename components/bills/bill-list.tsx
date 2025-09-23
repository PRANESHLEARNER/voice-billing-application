"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, FileText, Loader2, Printer, RefreshCw, Trash2 } from "lucide-react"
import { apiClient, type Bill, type BillsResponse } from "@/lib/api"
import { BillSearch, type BillSearchFilters } from "./bill-search"
import { BillDetailsDialog } from "./bill-details-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export function BillList() {
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBills, setTotalBills] = useState(0)
  const [filters, setFilters] = useState<BillSearchFilters>({})
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [showBillDetails, setShowBillDetails] = useState(false)

  const loadBills = async (page = 1, searchFilters = filters) => {
    try {
      setIsLoading(true)
      setError("")

      const params = {
        page,
        limit: 20,
        ...searchFilters,
      }

      const response: BillsResponse = await apiClient.getBills(params)
      setBills(response.bills)
      setTotalPages(response.totalPages)
      setCurrentPage(response.currentPage)
      setTotalBills(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [])

  const handleSearch = (searchFilters: BillSearchFilters) => {
    setFilters(searchFilters)
    setCurrentPage(1)
    loadBills(1, searchFilters)
  }

  const handleViewBill = async (bill: Bill) => {
    try {
      const fullBill = await apiClient.getBill(bill._id)
      setSelectedBill(fullBill)
      setShowBillDetails(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bill details")
    }
  }


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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "💵"
      case "card":
        return "💳"
      case "upi":
        return "📱"
      case "mixed":
        return "🔄"
      default:
        return "💰"
    }
  }

  return (
    <div className="space-y-6">
      <BillSearch onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bill History
              </CardTitle>
              <CardDescription>
                {totalBills > 0 ? `Showing ${bills.length} of ${totalBills} bills` : "No bills found"}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => loadBills(currentPage)} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading bills...
                    </TableCell>
                  </TableRow>
                ) : bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No bills found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-mono font-medium">{bill.billNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(bill.createdAt).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">{new Date(bill.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {bill.customer?.name ? (
                            <>
                              <div className="font-medium">{bill.customer.name}</div>
                              {bill.customer.phone && (
                                <div className="text-muted-foreground">{bill.customer.phone}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Walk-in Customer</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{bill.items.length} items</div>
                          <div className="text-muted-foreground">
                            Qty: {bill.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{formatCurrency(bill.grandTotal)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span>{getPaymentMethodIcon(bill.paymentMethod)}</span>
                          <span className="capitalize">{bill.paymentMethod}</span>
                        </div>
                        {bill.changeDue > 0 && (
                          <div className="text-xs text-muted-foreground">Change: {formatCurrency(bill.changeDue)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{bill.cashierName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(bill.status)}>{bill.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewBill(bill)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • {totalBills} total bills
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadBills(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadBills(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <BillDetailsDialog
        bill={selectedBill}
        isOpen={showBillDetails}
        onClose={() => {
          setShowBillDetails(false)
          setSelectedBill(null)
        }}
      />

    </div>
  )
}
