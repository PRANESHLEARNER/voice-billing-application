"use client"

import { ClientDataDashboard } from "@/components/client-data/client-data-dashboard"

export default function ClientDataPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <ClientDataDashboard />
      </div>
    </div>
  )
}
