"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Navigation } from "@/components/layout/navigation"
import { ProductList } from "@/components/products/product-list"
import { POSBilling } from "@/components/pos/pos-billing"
import { ShiftManagement } from "@/components/shifts/shift-management"
import { BillList } from "@/components/bills/bill-list"
import { ReportsDashboard } from "@/components/reports/reports-dashboard"
import { InventorySummary } from "@/components/reports/inventory-summary"
import { EmployeeList } from "@/components/employees/employee-list"
import { DiscountList } from "@/components/discounts/discount-list"
import { SettingsManagement } from "@/components/settings/settings-management"
import { ProfileView } from "@/components/profile/profile-view"
import ClientDataWizard from "@/components/client-data/client-data-wizard"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useFullscreen } from "@/hooks/use-fullscreen"

// Placeholder components for different tabs
function BillingTab({ isFullscreen = false }: { isFullscreen?: boolean }) {
  return (
    <div className={isFullscreen ? "h-full w-full" : "p-6"}>
      <POSBilling />
    </div>
  )
}

function ProductsTab() {
  return (
    <div className="p-6">
      <ProductList />
    </div>
  )
}

function BillsTab() {
  return (
    <div className="p-6">
      <BillList />
    </div>
  )
}

function ShiftsTab() {
  return (
    <div className="p-6">
      <ShiftManagement />
    </div>
  )
}

function InventoryTab() {
  return (
    <div className="p-6">
      <InventorySummary />
    </div>
  )
}


function ReportsTab() {
  return (
    <div className="p-6">
      <ReportsDashboard />
    </div>
  )
}

function DiscountsTab() {
  return (
    <div className="p-6">
      <DiscountList />
    </div>
  )
}

function UsersTab() {
  return (
    <div className="p-6">
      <EmployeeList />
    </div>
  )
}

function SettingsTab() {
  return (
    <div className="p-6">
      <SettingsManagement />
    </div>
  )
}

function ClientDataTab() {
  return (
    <div className="p-6">
      <ClientDataWizard />
    </div>
  )
}

function ProfileTab() {
  return (
    <div className="p-6">
      <ProfileView />
    </div>
  )
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("billing")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const {
    isFullscreen,
    showExitConfirmation,
    toggleFullscreen,
    exitFullscreen,
    setShowExitConfirmation
  } = useFullscreen()

  const renderTabContent = () => {
    switch (activeTab) {
      case "billing":
        return <BillingTab isFullscreen={isFullscreen} />
      case "client-data":
        return <ClientDataTab />
      case "products":
        return <ProductsTab />
      case "inventory":
        return <InventoryTab />
      case "bills":
        return <BillsTab />
      case "shifts":
        return <ShiftsTab />
      case "reports":
        return <ReportsTab />
      case "discounts":
        return <DiscountsTab />
      case "users":
        return <UsersTab />
      case "settings":
        return <SettingsTab />
      case "profile":
        return <ProfileTab />
      default:
        return <BillingTab />
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Only show Header and Navigation when not in fullscreen */}
        {!isFullscreen && <Header onTabChange={setActiveTab} />}

        <div className="flex">
          {/* Only show Navigation when not in fullscreen */}
          {!isFullscreen && (
            <Navigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isSidebarOpen={isSidebarOpen}
              onSidebarToggle={setIsSidebarOpen}
            />
          )}

          <main className={`flex-1 ${isFullscreen ? 'w-screen h-screen' : ''}`}>

            {renderTabContent()}
          </main>
        </div>
      </div>

      {/* Fullscreen Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Fullscreen Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit fullscreen mode? You can press F11 to toggle fullscreen again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={exitFullscreen}>
              Exit Fullscreen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}
