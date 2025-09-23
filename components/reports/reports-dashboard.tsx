"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays } from "lucide-react"
import { SalesOverview } from "./sales-overview"
import { TopProducts } from "./top-products"
import { InventorySummary } from "./inventory-summary"
import { SalesTrendsChart } from "./sales-trends-chart"
import { CategoriesPerformanceChart } from "./categories-performance-chart"

export function ReportsDashboard() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const clearDateFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  const setQuickDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    setStartDate(start.toISOString().split("T")[0])
    setEndDate(end.toISOString().split("T")[0])
  }

  return (
    <div className="space-y-6">
      {/* Header and Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>Comprehensive business insights and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                Last 30 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                Last 90 Days
              </Button>
              <Button variant="outline" size="sm" onClick={clearDateFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <SalesOverview startDate={startDate} endDate={endDate} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <SalesTrendsChart startDate={startDate} endDate={endDate} />
            </div>
            <TopProducts startDate={startDate} endDate={endDate} limit={10} />
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <TopProducts startDate={startDate} endDate={endDate} limit={20} />
          
          <CategoriesPerformanceChart startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventorySummary />
        </TabsContent>
      </Tabs>
    </div>
  )
}
