"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { DialogDescription } from "@/components/ui/dialog"
import { DialogHeader } from "@/components/ui/dialog"
import { DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { FileText, Printer, Download, X, Mail, Loader2 } from "lucide-react"
import type { Bill } from "@/lib/api"
import { sendBillByEmail } from "@/lib/api"

interface BillDetailsDialogProps {
  bill: Bill | null
  isOpen: boolean
  onClose: () => void
}

export function BillDetailsDialog({ bill, isOpen, onClose }: BillDetailsDialogProps) {
  if (!bill) return null

  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailInput, setEmailInput] = useState(bill.customer?.email || "")
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailError, setEmailError] = useState("")

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
    const billHTML = generateBillHTML(bill)
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    
    // Write the bill HTML to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (iframeDoc) {
      iframeDoc.open()
      iframeDoc.write(billHTML)
      iframeDoc.close()
      
      // Print the iframe content
      iframe.contentWindow?.print()
      
      // Remove the iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }
  }

  const handleDownload = async () => {
    try {
      // Import the API client
      const { apiClient } = await import("@/lib/api")
      
      // Generate PDF using the backend service
      const pdfBlob = await apiClient.generateBillPDF(bill._id)
      
      // Create a blob URL for the PDF
      const blobUrl = window.URL.createObjectURL(pdfBlob)
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `bill_${bill.billNumber}.pdf`
      document.body.appendChild(link)
      
      // Trigger the download
      link.click()
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)
      
    } catch (error) {
      console.error('Error downloading PDF:', error)
      // Fallback to the old method if PDF generation fails
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const billHTML = generateBillHTML(bill)
        printWindow.document.write(billHTML)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleSendEmail = async () => {
    if (!emailInput.trim()) {
      setEmailError("Please enter an email address")
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput)) {
      setEmailError("Please enter a valid email address")
      return
    }
    
    setEmailError("")
    setIsSendingEmail(true)
    
    try {
      await sendBillByEmail(bill._id, emailInput)
      setShowEmailDialog(false)
      setEmailInput(bill.customer?.email || "")
      // You could show a success toast here
      console.log("Bill sent successfully to:", emailInput)
    } catch (error) {
      console.error('Error sending bill:', error)
      setEmailError("Failed to send bill. Please try again.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const generateBillHTML = (billData: Bill) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
      }).format(amount)
    }
  
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  
    // Helper function to pad strings for receipt alignment
    const padRight = (str: string, length: number) => {
      return str + ' '.repeat(Math.max(0, length - str.length))
    }
  
    const padLeft = (str: string, length: number) => {
      return ' '.repeat(Math.max(0, length - str.length)) + str
    }
  
    // Helper function to create aligned rows with proper spacing
    const createAlignedRow = (left: string, right: string, totalWidth: number = 38) => {
      const rightStr = right.toString()
      const leftStr = left.toString()
      const spaces = totalWidth - leftStr.length - rightStr.length
      return leftStr + ' '.repeat(Math.max(1, spaces)) + rightStr
    }
  
    // Helper function to center text within a given width
    const centerText = (text: string, width: number = 42) => {
      const textLength = text.length
      const leftPadding = Math.floor((width - textLength) / 2)
      const rightPadding = width - textLength - leftPadding
      return ' '.repeat(Math.max(0, leftPadding)) + text + ' '.repeat(Math.max(0, rightPadding))
    }
  
    // Generate receipt content as plain text with basic formatting
    let receiptContent = `
       *************************************
       *${centerText('SUPERMARKET STORE', 35)}*
       *${centerText('123 Main Street, City', 35)}*
       *${centerText('State, Country - 123456', 35)}*
       *${centerText('Phone: +1 234 567 8900', 35)}*
       *************************************
       
       BILL #: ${billData.billNumber}
       DATE:  ${formatDate(billData.createdAt)}
       CASHIER: ${billData.cashierName}
       -------------------------------------
      `
  
    if (billData.customer) {
      receiptContent += `
       CUSTOMER: ${billData.customer.name || 'Walk-in Customer'}
       ${billData.customer.phone ? `PHONE: ${billData.customer.phone}` : ''}
       ${billData.customer.email ? `EMAIL: ${billData.customer.email}` : ''}
      --------------------------------------
        `
    }
  
    // Add items header
    receiptContent += `     ITEMS                  AMOUNT\n`
    receiptContent += `      --------------------------------------\n`
    
    billData.items.forEach(item => {
      const itemName = ` ${item.productName} ${item.size ? `(${item.size})` : ''}`
      const truncatedName = itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName
      const itemTotal = formatCurrency(item.totalAmount)
      const qtyRate = ` ${item.quantity} x ${formatCurrency(item.rate)}`
      
      // Item name on first line
      receiptContent += `     ${truncatedName}\n`
      
      // Quantity x Rate aligned to right with total amount
      receiptContent += `     ${createAlignedRow(qtyRate, itemTotal)}\n`
      
      receiptContent += `\n`
    })
  
    receiptContent += `     ---------------------------------------\n`
    receiptContent += `     ${createAlignedRow('SUBTOTAL:', formatCurrency(billData.subtotal))}\n`
  
    if (billData.totalDiscount > 0) {
      receiptContent += `     ${createAlignedRow('TOTAL DISCOUNT:', '-' + formatCurrency(billData.totalDiscount))}\n`
    }
  
    receiptContent += `     ${createAlignedRow('TOTAL TAX:', formatCurrency(billData.totalTax))}\n`
  
    if (Math.abs(billData.roundOff) > 0.01) {
      const roundOffAmount = (billData.roundOff > 0 ? '+' : '') + formatCurrency(billData.roundOff)
      receiptContent += `     ${createAlignedRow('ROUND OFF:', roundOffAmount)}\n`
    }
  
    receiptContent += `     =======================================\n`
    receiptContent += `     ${createAlignedRow('TOTAL:', formatCurrency(billData.grandTotal))}\n`
    receiptContent += `     =======================================\n`
    receiptContent += `     \n`
    receiptContent += `     PAYMENT METHOD: ${billData.paymentMethod.toUpperCase()}\n`
  
    if (billData.paymentMethod === 'cash') {
      receiptContent += `     ${createAlignedRow('CASH TENDERED:', formatCurrency(billData.cashTendered))}\n`
      receiptContent += `     ${createAlignedRow('CHANGE:', formatCurrency(billData.changeDue))}\n`
    }
  
    receiptContent += `
    ---------------------------------------
         THANK YOU FOR YOUR PURCHASE!
              PLEASE VISIT AGAIN
           ${billData.status === 'completed' ? '     *** PAID ***' : ''}
    ****************************************
      `
  
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill ${billData.billNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            line-height: 1.2;
            background: white;
            color: black;
            padding: 2px;
            max-width: 280px;
            margin: 0 auto;
            white-space: pre;
          }
          
          .no-print {
            margin-top: 20px;
            text-align: center;
            white-space: normal;
          }
          
          .no-print button {
            padding: 8px 16px;
            margin: 5px;
            cursor: pointer;
            border: 1px solid #ccc;
            background: #f5f5f5;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 12px;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
              font-size: 8px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        ${receiptContent}
        
        <div class="no-print">
          <button onclick="window.print()">Print Receipt</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `
  }
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Email
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
                          <span className="font-mono text-right break-all">{bill.customer.gstNumber}</span>
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
            <Table className="w-full table-fixed">
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
                        <div className="font-medium break-words whitespace-normal">
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
                          <span className="font-mono text-xs break-all">{bill.paymentDetails.razorpayPaymentId}</span>
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

    {/* Email Dialog */}
    <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Bill via Email</DialogTitle>
          <DialogDescription>
            Enter the email address to send the bill PDF to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailDialog(false)
                setEmailError("")
              }}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Bill
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
