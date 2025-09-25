"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, PieChart as PieChartIcon, Trophy, Star, Package, DollarSign, ShoppingCart, ChevronDown, ChevronRight, Medal } from "lucide-react"
import { apiClient } from "@/lib/api"
import { CategoryPerformance, CategoryTopProducts, TopProduct } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300"]

interface CategoriesPerformanceChartProps {
  startDate?: string
  endDate?: string
}

export function CategoriesPerformanceChart({ startDate, endDate }: CategoriesPerformanceChartProps) {
  const [data, setData] = useState<CategoryPerformance[]>([])
  const [topProductsByCategory, setTopProductsByCategory] = useState<CategoryTopProducts[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"bar" | "pie">("bar")
  const [productChartType, setProductChartType] = useState<"bar" | "pie">("bar")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([fetchCategoriesPerformance(), fetchTopProductsByCategory(), fetchTopProducts()])
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

  const fetchTopProductsByCategory = async () => {
    try {
      const response = await apiClient.get<CategoryTopProducts[]>(`/reports/top-products-by-category?startDate=${startDate || ''}&endDate=${endDate || ''}`)
      setTopProductsByCategory(response)
    } catch (err) {
      console.error('Error fetching top products by category:', err)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const response = await apiClient.get<TopProduct[]>(`/reports/top-products?startDate=${startDate || ''}&endDate=${endDate || ''}&limit=10`)
      setTopProducts(response)
    } catch (err) {
      console.error('Error fetching top products:', err)
    }
  }

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getTopProductsForCategory = (category: string) => {
    const categoryData = topProductsByCategory.find(cat => cat.category === category)
    return categoryData ? categoryData.products : []
  }

  const renderProductChart = () => {
    const chartData = topProducts.map(product => ({
      ...product,
      productId: product._id.productId,
      productName: product._id.productName,
      productCode: product._id.productCode
    }))
    
    if (productChartType === "bar") {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="productName" 
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={10}
            interval={0}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === "totalRevenue") return formatCurrency(value)
              if (name === "avgPrice") return formatCurrency(value)
              return value.toLocaleString()
            }}
            labelFormatter={(label) => `Product: ${label}`}
          />
          <Legend />
          <Bar dataKey="totalRevenue" fill="#10B981" name="Total Revenue" />
          <Bar dataKey="totalQuantity" fill="#3B82F6" name="Quantity Sold" />
        </BarChart>
      )
    } else {
      return (
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ productName, totalRevenue }) => `${productName.substring(0, 15)}...: ${formatCurrency(totalRevenue)}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="totalRevenue"
            nameKey="productName"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => `Product: ${label}`}
          />
          <Legend />
        </PieChart>
      )
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
            {data.map((category, index) => {
              const isTopPerformer = index === 0
              const isGoodPerformer = index === 1
              const revenuePercentage = data.length > 0 ? (category.totalRevenue / data[0].totalRevenue) * 100 : 0
              const topProducts = getTopProductsForCategory(category.category)
              const isExpanded = expandedCategories.has(category.category)
              
              return (
                <Collapsible key={category.category} open={isExpanded} onOpenChange={() => toggleCategoryExpansion(category.category)}>
                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer ${
                      isTopPerformer ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/10 border-yellow-200 dark:border-yellow-800' : 
                      isGoodPerformer ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200 dark:border-blue-800' : 
                      'bg-background'
                    }`}
                    onClick={() => toggleCategoryExpansion(category.category)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Ranking Badge */}
                      <div className="flex flex-col items-center">
                        {isTopPerformer ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            <Trophy className="w-4 h-4" />
                          </div>
                        ) : isGoodPerformer ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            <Star className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                        )}
                        <div 
                          className="w-4 h-4 rounded-full mt-1" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                      
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base text-foreground">{category.category}</span>
                          {isTopPerformer && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-none text-xs">
                              Best Seller
                            </Badge>
                          )}
                          {isGoodPerformer && (
                            <Badge variant="secondary" className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-xs">
                              Top Performer
                            </Badge>
                          )}
                          {topProducts.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {topProducts.length} top products
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>{category.totalQuantity.toLocaleString()} items</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            <span>{category.totalOrders} orders</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            <span>{category.uniqueProductsCount} products</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{formatCurrency(category.totalRevenue / category.totalQuantity)}/item</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="font-bold text-lg text-green-700 dark:text-green-400">{formatCurrency(category.totalRevenue)}</span>
                        </div>
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                            <span>Avg: {formatCurrency(category.avgOrderValue)}/order</span>
                          </div>
                          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                            <span>{(category.totalRevenue / data.reduce((sum, cat) => sum + cat.totalRevenue, 0) * 100).toFixed(1)}% of total</span>
                          </div>
                          {revenuePercentage < 100 && (
                            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                              <span>{revenuePercentage.toFixed(1)}% of top</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isTopPerformer ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400' :
                              isGoodPerformer ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400' :
                              'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                            }`}
                          >
                            #{index + 1} Rank
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="mt-2">
                    <div className="ml-16 p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Medal className="w-4 h-4 text-amber-600" />
                          <span className="font-medium text-sm text-foreground">Top Products in {category.category}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {topProducts.length} products
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                        <div className="text-center">Product</div>
                        <div className="text-center">Revenue</div>
                        <div className="text-center">Avg Price</div>
                      </div>
                      
                      {topProducts.length > 0 ? (
                        <div className="space-y-2">
                          {topProducts.map((product, productIndex) => (
                            <div key={product.productId} className="grid grid-cols-3 gap-2 p-3 bg-background rounded-lg border border-border items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs">
                                  {productIndex + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-sm text-foreground truncate" title={product.productName}>
                                    {product.productName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {product.totalQuantity.toLocaleString()} • {product.totalOrders} orders
                                  </div>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-green-700 dark:text-green-400">
                                  {formatCurrency(product.totalRevenue)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {((product.totalRevenue / category.totalRevenue) * 100).toFixed(1)}% of category
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-blue-700 dark:text-blue-400">
                                  {formatCurrency(product.avgPrice)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  avg price
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No product data available for this category
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Product Performance Charts - Takes full width below */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Best Selling Products Performance
              </CardTitle>
              <CardDescription>Revenue and quantity analysis of top-performing products</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={productChartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setProductChartType("bar")}
              >
                Bar
              </Button>
              <Button
                variant={productChartType === "pie" ? "default" : "outline"}
                size="sm"
                onClick={() => setProductChartType("pie")}
              >
                Pie
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {renderProductChart()}
            </ResponsiveContainer>
          </div>
          
          {/* Top Products Summary Table */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Medal className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-sm">Top 10 Best Selling Products</h3>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded font-medium">
              <div>Rank</div>
              <div>Product Name</div>
              <div className="text-center">Revenue</div>
              <div className="text-center">Quantity</div>
              <div className="text-center">Avg Price</div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topProducts.map((product, index) => {
                const productId = product._id.productId;
                const productName = product._id.productName;
                const productCode = product._id.productCode;
                
                return (
                  <div key={productId} className="grid grid-cols-5 gap-2 p-2 bg-background rounded border border-border text-sm">
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                        index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                        index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                        'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="font-medium truncate" title={productName}>
                      {productName}
                    </div>
                    <div className="text-center font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(product.totalRevenue)}
                    </div>
                    <div className="text-center text-blue-700 dark:text-blue-400">
                      {product.totalQuantity.toLocaleString()}
                    </div>
                    <div className="text-center text-muted-foreground">
                      {formatCurrency(product.avgPrice)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
