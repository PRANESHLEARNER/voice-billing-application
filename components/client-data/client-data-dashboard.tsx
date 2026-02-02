"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, CheckCircle2, AlertTriangle, RefreshCcw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiClient, ClientData } from "@/lib/api"
import ClientDataWizard from "./client-data-wizard"

export default function ClientDataDashboard() {
  const { user, isAdmin } = useAuth()
  const [data, setData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const clientData = await apiClient.getClientData()
        setData(clientData)
        setError(null)
      } catch (err: any) {
        setError(err.message || "Failed to load client data")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Data Intake</h1>
          <p className="text-muted-foreground">
            Complete your business setup to unlock billing features
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {data?.status === "complete" ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Your client data has been approved and setup is complete. All features are now available.
          </AlertDescription>
        </Alert>
      ) : data?.status === "pending_review" ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your data is currently under review. You'll be notified once it's approved.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>
            Please complete the client data intake form to enable billing and inventory features.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>Store information and contact details</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.businessProfile ? (
              <div className="space-y-2">
                <p><strong>Store Name:</strong> {data.businessProfile.storeName}</p>
                <p><strong>Contact:</strong> {data.businessProfile.contactName}</p>
                <p><strong>Phone:</strong> {data.businessProfile.contactPhone}</p>
                <p><strong>Email:</strong> {data.businessProfile.contactEmail}</p>
                <Badge variant={data.businessProfile.completed ? "default" : "secondary"}>
                  {data.businessProfile.completed ? "Complete" : "Incomplete"}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">Not provided</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Configuration</CardTitle>
            <CardDescription>Tax settings and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.taxConfig ? (
              <div className="space-y-2">
                <p><strong>Regime:</strong> {data.taxConfig.regime}</p>
                <p><strong>GSTIN:</strong> {data.taxConfig.gstin || "Not provided"}</p>
                <p><strong>Rounding:</strong> {data.taxConfig.roundingPreference}</p>
                <Badge variant={data.taxConfig.completed ? "default" : "secondary"}>
                  {data.taxConfig.completed ? "Complete" : "Incomplete"}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">Not provided</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Item Master</CardTitle>
            <CardDescription>Product catalog and pricing</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.itemMaster ? (
              <div className="space-y-2">
                <p><strong>Total SKUs:</strong> {data.itemMaster.totalSkuCount}</p>
                <p><strong>Categories:</strong> {data.itemMaster.categories?.join(", ") || "None"}</p>
                <Badge variant={data.itemMaster.completed ? "default" : "secondary"}>
                  {data.itemMaster.completed ? "Complete" : "Incomplete"}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">Not provided</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt Sample</CardTitle>
            <CardDescription>Bill format and layout</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.receiptSample ? (
              <div className="space-y-2">
                <p><strong>Format:</strong> {data.receiptSample.useSystemDefault ? "System Default" : "Custom"}</p>
                {data.receiptSample.notes && (
                  <p><strong>Notes:</strong> {data.receiptSample.notes}</p>
                )}
                <Badge variant={data.receiptSample.completed ? "default" : "secondary"}>
                  {data.receiptSample.completed ? "Complete" : "Incomplete"}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">Not provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button 
          size="lg" 
          onClick={() => window.location.href = "/client-data"}
          disabled={data?.status === "pending_review" || data?.status === "complete"}
        >
          {data?.status === "pending_review" || data?.status === "complete" 
            ? "Already Submitted" 
            : "Complete Data Intake"
          }
        </Button>
      </div>
    </div>
  )
}
