"use client"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShiftStatus } from "./shift-status"
import { ShiftHistory } from "./shift-history"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Users, TrendingUp, AlertTriangle, Clock, DollarSign, Timer, BarChart3, Target } from "lucide-react"

export function ShiftManagement() {
  const { user } = useAuth()
  const [shiftSummary, setShiftSummary] = useState<any>(null)
  const [activeShifts, setActiveShifts] = useState<any[]>([])
  const [availableCashiers, setAvailableCashiers] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [forceEndShiftDialog, setForceEndShiftDialog] = useState({
    isOpen: false,
    shiftId: "",
    shiftDetails: null as any
  })
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  })

  const isAdmin = user?.role === "admin"

  // Utility functions

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const loadAdminData = async () => {
    if (!isAdmin) return

    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append("startDate", dateRange.startDate)
      if (dateRange.endDate) params.append("endDate", dateRange.endDate)
      
      const [summary, activeShiftsData, cashiersData] = await Promise.all([
        apiClient.getShiftSummary(dateRange),
        apiClient.getActiveShifts(),
        apiClient.getAvailableCashiers()
      ])
      
      console.log('🔍 Available Cashiers Data:', cashiersData)
      console.log('🔍 Available Cashiers Data structure:', {
        hasData: !!cashiersData,
        hasAvailableCashiers: !!(cashiersData && cashiersData.availableCashiers),
        availableCashiersLength: cashiersData?.availableCashiers?.length || 0,
        allCashiersLength: cashiersData?.allCashiers?.length || 0,
        activeShiftCashiers: cashiersData?.activeShiftCashiers || 0,
        fullData: JSON.stringify(cashiersData, null, 2)
      })
      console.log('🔍 Active Shifts Data:', activeShiftsData)
      
      setShiftSummary(summary)
      setActiveShifts(activeShiftsData)
      setAvailableCashiers(cashiersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdminData()
    }
  }, [isAdmin])

  const handleForceEndShift = (shiftId: string, shiftDetails: any) => {
    setForceEndShiftDialog({
      isOpen: true,
      shiftId,
      shiftDetails
    })
  }

  const confirmForceEndShift = async () => {
    try {
      await apiClient.forceEndShift(forceEndShiftDialog.shiftId)
      await loadAdminData()
      setForceEndShiftDialog({
        isOpen: false,
        shiftId: "",
        shiftDetails: null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end shift")
    }
  }

  const cancelForceEndShift = () => {
    setForceEndShiftDialog({
      isOpen: false,
      shiftId: "",
      shiftDetails: null
    })
  }


  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={isAdmin ? "overview" : "status"} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
          {!isAdmin && <TabsTrigger value="status">Current Shift</TabsTrigger>}
          <TabsTrigger value="history">Shift History</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="active">Active Shifts</TabsTrigger>
            </>
          )}
        </TabsList>
        
        {!isAdmin && (
          <TabsContent value="status" className="space-y-6">
            <ShiftStatus />
          </TabsContent>
        )}
        
        <TabsContent value="history" className="space-y-6">
          <ShiftHistory />
        </TabsContent>
        
        {isAdmin && (
          <>
            <TabsContent value="overview" className="space-y-6">
              {/* Date Range Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>Date Range Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded-md"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded-md"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={loadAdminData}
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Apply Filter"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {loading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading overview...</span>
                  </CardContent>
                </Card>
              ) : shiftSummary ? (
                <>
                  {/* Enhanced Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="flex items-center p-6">
                        <Clock className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Shifts</p>
                          <p className="text-2xl font-bold">{shiftSummary.totalShifts}</p>
                          <p className="text-xs text-muted-foreground">
                            {shiftSummary.activeShifts} active • {shiftSummary.closedShifts} closed
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="flex items-center p-6">
                        <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Sales</p>
                          <p className="text-2xl font-bold">{formatCurrency(shiftSummary.totalSales)}</p>
                          <p className="text-xs text-muted-foreground">
                            {shiftSummary.totalBills} bills • {formatCurrency(shiftSummary.totalSales / shiftSummary.totalBills || 0)} avg/bill
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="flex items-center p-6">
                        <Timer className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Duration</p>
                          <p className="text-2xl font-bold">{formatDuration(shiftSummary.averageShiftDuration)}</p>
                          <p className="text-xs text-muted-foreground">
                            Per closed shift
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="flex items-center p-6">
                        <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm text-muted-foreground">Cash Variance</p>
                          <p className={`text-2xl font-bold ${shiftSummary.totalCashVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(shiftSummary.totalCashVariance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(shiftSummary.averageCashVariance)} avg/shift
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Peak Hours Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Peak Sales Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {shiftSummary.peakHours && shiftSummary.peakHours.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {shiftSummary.peakHours.map((peak: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                  #{index + 1}
                                </Badge>
                                <span className="font-semibold">{peak.hour}</span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm">Sales: {formatCurrency(peak.totalSales)}</p>
                                <p className="text-xs text-muted-foreground">{peak.shiftCount} shifts</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No peak hours data available</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Enhanced Cashier Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Detailed Cashier Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(shiftSummary.shiftsByCashier).map(([cashierName, data]: [string, any]) => (
                          <div key={cashierName} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-semibold text-lg">{cashierName}</p>
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                  <span>{data.totalShifts} total shifts</span>
                                  <span>{data.activeShifts} active</span>
                                  <span>{data.closedShifts} closed</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{formatCurrency(data.totalSales)}</p>
                                <p className="text-sm text-muted-foreground">Total Sales</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Bills</p>
                                <p className="font-medium">{data.totalBills}</p>
                                <p className="text-xs text-muted-foreground">{data.averageBillsPerShift.toFixed(1)}/shift</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg Sales</p>
                                <p className="font-medium">{formatCurrency(data.averageSalesPerShift)}</p>
                                <p className="text-xs text-muted-foreground">per shift</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Duration</p>
                                <p className="font-medium">{formatDuration(data.averageDuration)}</p>
                                <p className="text-xs text-muted-foreground">avg shift</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Cash Variance</p>
                                <p className={`font-medium ${data.cashVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(data.cashVariance)}
                                </p>
                                <p className="text-xs text-muted-foreground">total variance</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </TabsContent>
            
            <TabsContent value="active" className="space-y-6">
              {loading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading active shifts...</span>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Available Cashiers */}
                  {console.log('🔍 Rendering available cashiers section:', {
                    availableCashiers: !!availableCashiers,
                    hasAllCashiers: !!(availableCashiers && availableCashiers.allCashiers),
                    allCashiersArray: availableCashiers?.allCashiers,
                    allCashiersLength: availableCashiers?.allCashiers?.length || 0,
                    availableCashiersLength: availableCashiers?.availableCashiers?.length || 0
                  })}
                  {availableCashiers && availableCashiers.allCashiers && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>All Cashiers</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {availableCashiers.allCashiers.length} total
                            </Badge>
                            <Badge variant="outline">
                              {availableCashiers.availableCashiers.length} available
                            </Badge>
                            <Badge variant="destructive">
                              {availableCashiers.activeShiftCashiers} on shift
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {availableCashiers.allCashiers.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableCashiers.allCashiers.map((cashier: any) => {
                              // Check if this cashier is currently on an active shift
                              const isOnActiveShift = !availableCashiers.availableCashiers.some(
                                (availableCashier: any) => availableCashier._id === cashier._id
                              );
                              
                              return (
                                <div 
                                  key={cashier._id} 
                                  className={`p-4 border rounded-lg ${isOnActiveShift ? 'bg-destructive/10 border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40' : 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700'}`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium">{cashier.user.name}</p>
                                    <Badge variant={isOnActiveShift ? "destructive" : "default"}>
                                      {isOnActiveShift ? "On Shift" : "Available"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{cashier.user.employeeId}</p>
                                  <p className="text-sm text-muted-foreground">{cashier.user.email}</p>
                                  <Badge variant="outline" className="mt-2">
                                    {cashier.employmentDetails.department}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            No cashiers found in the system.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Active Shifts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Currently Active Shifts</span>
                        <Badge variant="destructive">
                          {activeShifts.length} active
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activeShifts.length > 0 ? (
                        <div className="space-y-4">
                          {activeShifts.map((shift) => (
                            <div key={shift._id} className="flex items-center justify-between p-4 border rounded-lg bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="font-medium text-lg">{shift.cashier?.name || "Unknown"}</p>
                                  <Badge className="bg-green-600 dark:bg-green-700">Active Shift</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Employee ID: {shift.cashier?.employeeId || "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Started: {new Date(shift.startTime).toLocaleString()}
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                  <div className="text-center p-2 bg-background rounded border">
                                    <p className="text-xs text-muted-foreground">Opening Cash</p>
                                    <p className="font-semibold">{formatCurrency(shift.openingCash)}</p>
                                  </div>
                                  <div className="text-center p-2 bg-background rounded border">
                                    <p className="text-xs text-muted-foreground">Total Sales</p>
                                    <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(shift.totalSales)}</p>
                                  </div>
                                  <div className="text-center p-2 bg-background rounded border">
                                    <p className="text-xs text-muted-foreground">Bills</p>
                                    <p className="font-semibold">{shift.totalBills}</p>
                                  </div>
                                  <div className="text-center p-2 bg-background rounded border">
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-semibold">
                                      {formatDuration((new Date().getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60))}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleForceEndShift(shift._id, shift)}
                                  className="whitespace-nowrap"
                                >
                                  Force End Shift
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-muted-foreground mb-2">No active shifts at the moment.</div>
                          <div className="text-sm text-muted-foreground">
                            All cashiers are currently available to start their shifts.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
          </>
        )}
      </Tabs>

      {/* Force End Shift Confirmation Dialog */}
      <Dialog open={forceEndShiftDialog.isOpen} onOpenChange={cancelForceEndShift}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Force End Shift
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to force end the shift for {forceEndShiftDialog.shiftDetails?.employeeName}? 
              This action cannot be undone and may affect the employee's current session.
            </DialogDescription>
          </DialogHeader>
          
          {forceEndShiftDialog.shiftDetails && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Shift Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Employee:</span>
                  <span>{forceEndShiftDialog.shiftDetails.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Time:</span>
                  <span>{new Date(forceEndShiftDialog.shiftDetails.startTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Sales:</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(forceEndShiftDialog.shiftDetails.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bills Created:</span>
                  <span>{forceEndShiftDialog.shiftDetails.totalBills}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelForceEndShift}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmForceEndShift}>
              Force End Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
