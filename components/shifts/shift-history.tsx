"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, FileText, Loader2 } from "lucide-react"
import { apiClient, type Shift, type ShiftsResponse } from "@/lib/api"

export function ShiftHistory() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const loadShifts = async (page = 1) => {
    try {
      setIsLoading(true)
      setError("")

      const params: any = { page, limit: 10 }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response: ShiftsResponse = await apiClient.getShifts(params)
      setShifts(response.shifts)
      setTotalPages(response.totalPages)
      setCurrentPage(response.currentPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shifts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadShifts()
  }, [startDate, endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getCashDifference = (shift: Shift) => {
    if (shift.status === "active" || shift.closingCash === undefined) return null
    const expected = shift.openingCash + shift.totalSales
    return shift.closingCash - expected
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift History
          </CardTitle>
          <CardDescription>View and manage shift records</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
              />
            </div>
            <div className="flex-1">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End Date" />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate("")
                setEndDate("")
              }}
            >
              Clear
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Shifts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Bills</TableHead>
                  <TableHead>Cash Difference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading shifts...
                    </TableCell>
                  </TableRow>
                ) : shifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No shifts found
                    </TableCell>
                  </TableRow>
                ) : (
                  shifts.map((shift) => {
                    const cashDifference = getCashDifference(shift)
                    return (
                      <TableRow key={shift._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{shift.cashierName}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(shift.startTime).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(shift.startTime).toLocaleTimeString()}
                            {shift.endTime && (
                              <div className="text-muted-foreground">
                                to {new Date(shift.endTime).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(shift.startTime, shift.endTime)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatCurrency(shift.totalSales)}</div>
                            <div className="text-sm text-muted-foreground">
                              Avg: {shift.totalBills > 0 ? formatCurrency(shift.totalSales / shift.totalBills) : "₹0"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {shift.totalBills}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cashDifference !== null ? (
                            <div
                              className={`font-medium ${
                                Math.abs(cashDifference) < 0.01
                                  ? "text-green-600 dark:text-green-400"
                                  : cashDifference < 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {Math.abs(cashDifference) < 0.01
                                ? "Balanced"
                                : `${cashDifference > 0 ? "+" : ""}${formatCurrency(cashDifference)}`}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={shift.status === "active" ? "default" : "secondary"}>
                            {shift.status === "active" ? "Active" : "Closed"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadShifts(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadShifts(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
