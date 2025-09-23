"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, DollarSign, FileText, Play, Square, Loader2 } from "lucide-react"
import { apiClient, type Shift } from "@/lib/api"
import { StartShiftDialog } from "./start-shift-dialog"
import { EndShiftDialog } from "./end-shift-dialog"
import { useAuth } from "@/hooks/use-auth"

export function ShiftStatus() {
  const { isAdmin, isCashier } = useAuth()
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)

  const loadCurrentShift = async () => {
    try {
      setIsLoading(true)
      setError("")
      const shift = await apiClient.getCurrentShift()
      setCurrentShift(shift)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shift data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentShift()
  }, [])

  const handleStartShift = async (openingCash: number) => {
    try {
      await apiClient.startShift(openingCash)
      await loadCurrentShift()
      setShowStartDialog(false)
    } catch (err) {
      throw err
    }
  }

  const handleEndShift = async (closingCash: number, notes?: string) => {
    try {
      await apiClient.endShift(closingCash, notes)
      await loadCurrentShift()
      setShowEndDialog(false)
    } catch (err) {
      throw err
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading shift status...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Status
            </div>
            {currentShift ? (
              <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                Active Shift
              </Badge>
            ) : (
              <Badge variant="secondary">No Active Shift</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentShift ? (
            <div className="space-y-6">
              {/* Current Shift Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Shift Started</p>
                  <p className="font-medium">{new Date(currentShift.startTime).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Duration: {formatDuration(currentShift.startTime)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Opening Cash</p>
                  <p className="font-medium text-lg">{formatCurrency(currentShift.openingCash)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="font-medium text-lg text-green-600 dark:text-green-400">{formatCurrency(currentShift.totalSales)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Bills Created</p>
                  <p className="font-medium text-lg">{currentShift.totalBills}</p>
                </div>
              </div>

              {/* Expected Cash */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Cash in Drawer</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(currentShift.openingCash + currentShift.totalSales)}
                    </p>
                  </div>
                  <Button onClick={() => setShowEndDialog(true)} variant="destructive">
                    <Square className="mr-2 h-4 w-4" />
                    End Shift
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Active Shift</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin 
                  ? "Admin users cannot start shifts. Please ask a cashier to start a shift." 
                  : "Start a new shift to begin processing sales"}
              </p>
              {!isAdmin && (
                <Button onClick={() => setShowStartDialog(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Shift
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {currentShift && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Average Sale</p>
                <p className="text-xl font-bold">
                  {currentShift.totalBills > 0
                    ? formatCurrency(currentShift.totalSales / currentShift.totalBills)
                    : formatCurrency(0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Sales per Hour</p>
                <p className="text-xl font-bold">
                  {(() => {
                    const hours = (new Date().getTime() - new Date(currentShift.startTime).getTime()) / (1000 * 60 * 60)
                    return hours > 0 ? Math.round(currentShift.totalBills / hours) : 0
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Shift Duration</p>
                <p className="text-xl font-bold">{formatDuration(currentShift.startTime)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <StartShiftDialog
        isOpen={showStartDialog}
        onClose={() => setShowStartDialog(false)}
        onStartShift={handleStartShift}
      />

      <EndShiftDialog
        isOpen={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onEndShift={handleEndShift}
        currentShift={currentShift}
      />
    </div>
  )
}
