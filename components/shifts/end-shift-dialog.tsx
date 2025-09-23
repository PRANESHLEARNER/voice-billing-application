"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Loader2, Square, AlertTriangle } from "lucide-react"
import type { Shift } from "@/lib/api"

interface EndShiftDialogProps {
  isOpen: boolean
  onClose: () => void
  onEndShift: (closingCash: number, notes?: string) => Promise<void>
  currentShift: Shift | null
}

export function EndShiftDialog({ isOpen, onClose, onEndShift, currentShift }: EndShiftDialogProps) {
  const [closingCash, setClosingCash] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const expectedCash = currentShift ? currentShift.openingCash + currentShift.totalSales : 0
  const actualCash = Number.parseFloat(closingCash) || 0
  const difference = actualCash - expectedCash
  const hasDifference = Math.abs(difference) > 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isNaN(actualCash) || actualCash < 0) {
      setError("Please enter a valid closing cash amount")
      return
    }

    setIsLoading(true)
    try {
      await onEndShift(actualCash, notes || undefined)
      setClosingCash("")
      setNotes("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end shift")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setClosingCash("")
      setNotes("")
      setError("")
      onClose()
    }
  }

  if (!currentShift) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Square className="h-5 w-5" />
            End Shift
          </DialogTitle>
          <DialogDescription>
            Count the cash in the register and enter the closing amount to end your shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Shift Summary */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">Shift Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Opening Cash:</span>
                <span>{formatCurrency(currentShift.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sales:</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(currentShift.totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bills Created:</span>
                <span>{currentShift.totalBills}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Expected Cash:</span>
                <span>{formatCurrency(expectedCash)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closingCash">Actual Cash in Register</Label>
            <Input
              id="closingCash"
              type="number"
              step="0.01"
              min="0"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              placeholder="0.00"
              required
              disabled={isLoading}
              className="text-lg"
            />
          </div>

          {/* Cash Difference Alert */}
          {closingCash && hasDifference && (
            <Alert variant={difference < 0 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>Cash Difference:</span>
                  <span className={`font-medium ${difference < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {difference > 0 ? "+" : ""}
                    {formatCurrency(difference)}
                  </span>
                </div>
                {difference < 0 ? "Cash shortage detected" : "Cash overage detected"}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the shift..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} variant="destructive">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  End Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
