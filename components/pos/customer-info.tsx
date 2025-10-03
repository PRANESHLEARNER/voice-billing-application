"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { User, X } from "lucide-react"

interface CustomerInfo {
  name?: string
  phone?: string
  email?: string
  address?: string
  gstNumber?: string
}

interface CustomerInfoProps {
  customerInfo: CustomerInfo
  onCustomerInfoChange: (info: CustomerInfo) => void
}

export function CustomerInfo({ customerInfo, onCustomerInfoChange }: CustomerInfoProps) {
  const [editValues, setEditValues] = useState(customerInfo)

  // Sync parent state changes to local edit state
  useEffect(() => {
    setEditValues(customerInfo)
  }, [customerInfo])

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    const newValues = {
      ...editValues,
      [field]: value,
    }
    setEditValues(newValues)
    onCustomerInfoChange(newValues)
  }

  const clearCustomerInfo = () => {
    onCustomerInfoChange({})
    setEditValues({})
  }

  // Check if any customer info exists
  const hasCustomerInfo = Object.values(customerInfo).some(value => value && value.trim() !== "")

  return (
    <div className="flex items-center gap-2 p-3 bg-card border rounded-lg shadow-sm">
      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <Input
          value={editValues.name || ""}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Customer Name"
          className="h-10 text-base w-40"
        />
        <Input
          value={editValues.phone || ""}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          placeholder="Customer Phone"
          className="h-10 text-base w-40"
        />
        <Input
          value={editValues.email || ""}
          onChange={(e) => handleInputChange("email", e.target.value)}
          type="email"
          placeholder="Customer Email"
          className="h-10 text-base w-40"
        />
        <Input
          value={editValues.address || ""}
          onChange={(e) => handleInputChange("address", e.target.value)}
          placeholder="Customer Address"
          className="h-10 text-base w-48"
        />
        <Input
          value={editValues.gstNumber || ""}
          onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
          placeholder="Customer GST"
          className="h-10 text-base w-36"
        />
      </div>
      {hasCustomerInfo && (
        <button
          onClick={clearCustomerInfo}
          className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
