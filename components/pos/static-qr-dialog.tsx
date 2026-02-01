"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download } from "lucide-react"

interface StaticQrDialogProps {
    isOpen: boolean
    onClose: () => void
    amount: number
    onPaymentComplete?: () => void
}

export function StaticQrDialog({
    isOpen,
    onClose,
    amount,
    onPaymentComplete,
}: StaticQrDialogProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(val)
    }

    const UPI_ID = "merchant@upi" // Replace with actual Merchant UPI ID
    const merchantName = "SuperMarket Billing"

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        `upi://pay?pa=${UPI_ID}&pn=${merchantName}&am=${amount}&cu=INR`
    )}`

    const handleDownloadQr = () => {
        window.open(qrUrl, "_blank")
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center">Scan to Pay</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="w-48 h-48 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border">
                            <img
                                src={qrUrl}
                                alt="Payment QR"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=QR+Error"
                                }}
                            />
                        </div>
                    </div>

                    <div className="text-center space-y-1">
                        <p className="text-sm text-muted-foreground">Amount to Pay</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(amount)}</p>
                    </div>

                    <Separator />

                    <div className="text-sm text-muted-foreground text-center">
                        Accepting payments via UPI <br />
                        (GPay, PhonePe, Paytm, etc.)
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadQr} className="gap-2">
                        <Download className="w-4 h-4" />
                        Save QR
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={() => {
                            if (onPaymentComplete) onPaymentComplete()
                            onClose()
                        }} className="gap-2 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4" />
                            Mark Paid
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
