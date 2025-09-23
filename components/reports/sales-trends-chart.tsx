"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"

interface SalesTrendsChartProps {
  startDate?: string
  endDate?: string
}

interface ChartDataPoint {
  date: string
  sales: number
  bills: number
  items: number
  discount: number
  tax: number
}

interface PaymentMethodData {
  method: string
  count: number
  amount: number
  percentage: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function SalesTrendsChart({ startDate, endDate }: SalesTrendsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [paymentData, setPaymentData] = useState<PaymentMethodData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const loadChartData = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Load sales summary data
      const salesResponse = await apiClient.getSalesSummary({ startDate, endDate, period })
      
      // Transform data for chart
      const transformedData = salesResponse.salesData.map((item: any) => {
        let dateLabel = ''
        
        if (period === 'daily') {
          dateLabel = `${item._id.day}/${item._id.month}/${item._id.year}`
        } else if (period === 'weekly') {
          dateLabel = `Week ${item._id.week}, ${item._id.year}`
        } else if (period === 'monthly') {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          dateLabel = `${monthNames[item._id.month - 1]} ${item._id.year}`
        }

        return {
          date: dateLabel,
          sales: item.totalSales,
          bills: item.totalBills,
          items: item.totalItems,
          discount: item.totalDiscount,
          tax: item.totalTax
        }
      })

      setChartData(transformedData)

      // Load payment methods data
      const paymentResponse = await apiClient.getPaymentMethodsReport({ startDate, endDate })
      
      const totalAmount = paymentResponse.reduce((sum: number, method: any) => sum + method.totalAmount, 0)
      
      const transformedPaymentData = paymentResponse.map((method: any) => ({
        method: method._id,
        count: method.totalTransactions,
        amount: method.totalAmount,
        percentage: totalAmount > 0 ? (method.totalAmount / totalAmount) * 100 : 0
      }))

      setPaymentData(transformedPaymentData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadChartData()
  }, [startDate, endDate, period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'sales' && `Sales: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'bills' && `Bills: ${entry.value}`}
              {entry.dataKey === 'items' && `Items: ${entry.value}`}
              {entry.dataKey === 'discount' && `Discount: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'tax' && `Tax: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="sales" fill="#8884d8" name="Sales Amount" />
            <Bar dataKey="discount" fill="#82ca9d" name="Discount" />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="sales" stackId="1" stroke="#8884d8" fill="#8884d8" name="Sales Amount" />
            <Area type="monotone" dataKey="discount" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Discount" />
          </AreaChart>
        )
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Sales Amount" strokeWidth={2} />
            <Line type="monotone" dataKey="bills" stroke="#82ca9d" name="Number of Bills" strokeWidth={2} />
          </LineChart>
        )
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sales Trends
          </CardTitle>
          <CardDescription>Daily sales performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded mb-4"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-muted rounded w-20"></div>
              <div className="h-8 bg-muted rounded w-20"></div>
              <div className="h-8 bg-muted rounded w-20"></div>
            </div>
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
            <Activity className="h-5 w-5" />
            Sales Trends
          </CardTitle>
          <CardDescription>Daily sales performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Sales Trends Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sales Trends
              </CardTitle>
              <CardDescription>Daily sales performance over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                Area
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Period Selection */}
            <div className="flex gap-2">
              <Button
                variant={period === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('daily')}
              >
                Daily
              </Button>
              <Button
                variant={period === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('weekly')}
              >
                Weekly
              </Button>
              <Button
                variant={period === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('monthly')}
              >
                Monthly
              </Button>
            </div>

            {/* Main Sales Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Payment Methods Distribution
          </CardTitle>
          <CardDescription>Breakdown of payment methods used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ method, percentage }) => `${method}: ${percentage.toFixed(1)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold">Payment Method Details</h4>
              {paymentData.map((method, index) => (
                <div key={method.method} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(method.amount)}</div>
                    <div className="text-sm text-muted-foreground">{method.count} bills</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
