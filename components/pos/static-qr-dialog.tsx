"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode, Download } from "lucide-react"

interface StaticQRDialogProps {
    isOpen: boolean
    onClose: () => void
}

export function StaticQRDialog({ isOpen, onClose }: StaticQRDialogProps) {
    // In a real app, this URL would come from settings or client configuration
    // For this demo, we can use a placeholder or a generic asset path
    // If the user uploads a QR code in Client Data, we would fetch it here.
    const qrCodeUrl = "/assets/upi-qr-placeholder.png" // We would need to ensure this asset exists or use a placeholder

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = qrCodeUrl;
        link.download = "store-qr-code.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Store QR Code
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="border-4 border-white shadow-lg rounded-xl overflow-hidden bg-white p-2">
                        {/* Using a placeholder div if image is missing, otherwise img */}
                        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center text-gray-400">
                            {/* Replace this with actual <img> tag when asset is available */}
                            <div className="text-center p-4">
                                <QrCode className="h-16 w-16 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Scan to Pay via UPI</p>
                                <p className="text-xs mt-1 text-muted-foreground">(Store UPI QR Placeholder)</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-1">
                        <h3 className="font-semibold text-lg">Scan to Pay</h3>
                        <p className="text-sm text-muted-foreground">Accepting GPay, PhonePe, Paytm, BHIM</p>
                    </div>

                    <div className="flex w-full gap-2">
                        <Button variant="outline" className="flex-1" onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4" />
                            Save Image
                        </Button>
                        <Button className="flex-1" onClick={onClose}>
                            Done
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
