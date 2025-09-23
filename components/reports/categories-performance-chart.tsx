"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react"
import { apiClient } from "@/lib/api"
import { CategoryPerformance } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300"]

interface CategoriesPerformanceChartProps {
  startDate?: string
  endDate?: string
}

export function CategoriesPerformanceChart({ startDate, endDate }: CategoriesPerformanceChartProps) {
  const [data, setData] = useState<CategoryPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"bar" | "pie">("bar")

  useEffect(() => {
    fetchCategoriesPerformance()
  }, [startDate, endDate])

  const fetchCategoriesPerformance = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiClient.getCategoriesPerformance({ startDate, endDate })
      setData(result)
    } catch (err) {
      console.error("Error fetching categories performance:", err)
      setError("Failed to fetch categories performance data")
    } finally {
      setLoading(false)
    }
  }

  const renderChart = () => {
    if (chartType === "bar") {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="category" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === "totalRevenue") return formatCurrency(value)
              return value.toLocaleString()
            }}
          />
          <Legend />
          <Bar dataKey="totalRevenue" fill="#8884d8" name="Total Revenue" />
          <Bar dataKey="totalQuantity" fill="#82ca9d" name="Total Quantity" />
        </BarChart>
      )
    } else {
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ category, totalRevenue }) => `${category}: ${formatCurrency(totalRevenue)}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="totalRevenue"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Product Categories Performance
          </CardTitle>
          <CardDescription>Loading categories performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Product Categories Performance
          </CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Categories Performance Chart - Takes 1/2 width on large screens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Product Categories Performance
              </CardTitle>
              <CardDescription>Revenue and quantity by product category</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                Bar
              </Button>
              <Button
                variant={chartType === "pie" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("pie")}
              >
                Pie
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Categories Details - Takes 1/2 width on large screens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Category Details
          </CardTitle>
          <CardDescription>Detailed breakdown of each category's performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(category.totalRevenue)}</div>
                  <div className="text-sm text-muted-foreground">
                    {category.totalQuantity.toLocaleString()} items • {category.totalOrders} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
