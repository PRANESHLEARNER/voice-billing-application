"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Calendar as CalendarIcon, Tag, Target, Percent, DollarSign, Clock, Users } from "lucide-react"
import { apiClient, type Discount, type Product } from "@/lib/api"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface DiscountFormProps {
  discount?: Discount | null
  onSuccess: () => void
  onCancel: () => void
}

export function DiscountForm({ discount, onSuccess, onCancel }: DiscountFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "percentage",
    value: "",
    targetType: "all",
    targetCategory: "",
    targetProduct: "",
    minPurchaseAmount: "",
    maxDiscountAmount: "",
    usageLimit: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    isActive: true,
  })

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    if (discount) {
      setFormData({
        name: discount.name,
        description: discount.description || "",
        type: discount.type,
        value: discount.value.toString(),
        targetType: discount.targetType,
        targetCategory: discount.targetCategory || "",
        targetProduct: discount.targetProduct?._id || "",
        minPurchaseAmount: discount.minPurchaseAmount?.toString() || "",
        maxDiscountAmount: discount.maxDiscountAmount?.toString() || "",
        usageLimit: discount.usageLimit?.toString() || "",
        startDate: new Date(discount.startDate),
        endDate: new Date(discount.endDate),
        isActive: discount.isActive,
      })
    }
  }, [discount])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const products = await apiClient.getProducts({ active: true })
      setProducts(products || [])
      
      // Extract unique categories
      const uniqueCategories = [...new Set(products.map((p) => p.category))] as string[]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value),
        minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        type: formData.type as "percentage" | "fixed",
        targetType: formData.targetType as "all" | "category" | "product",
        targetProduct: formData.targetType === "product" && formData.targetProduct 
          ? products.find(p => p._id === formData.targetProduct) 
          : undefined,
      }

      if (discount) {
        await apiClient.updateDiscount(discount._id, payload)
      } else {
        await apiClient.createDiscount(payload)
      }
      
      onSuccess()
    } catch (error) {
      console.error("Error saving discount:", error)
      alert(error instanceof Error ? error.message : "Error saving discount")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Set the basic details for your discount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Discount Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale 2024"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Discount Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the discount and its terms..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Discount Value *</Label>
            <Input
              id="value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder={formData.type === "percentage" ? "e.g., 10" : "e.g., 100"}
              min="0"
              max={formData.type === "percentage" ? "100" : undefined}
              step={formData.type === "percentage" ? "0.1" : "0.01"}
              required
            />
            <p className="text-sm text-muted-foreground">
              {formData.type === "percentage" 
                ? "Enter percentage value (e.g., 10 for 10%)" 
                : "Enter fixed amount in INR"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Target Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Target Configuration
          </CardTitle>
          <CardDescription>
            Choose which products this discount applies to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetType">Target Type *</Label>
            <Select value={formData.targetType} onValueChange={(value) => setFormData({ ...formData, targetType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="category">Specific Category</SelectItem>
                <SelectItem value="product">Specific Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.targetType === "category" && (
            <div className="space-y-2">
              <Label htmlFor="targetCategory">Category *</Label>
              <Select value={formData.targetCategory} onValueChange={(value) => setFormData({ ...formData, targetCategory: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {loadingProducts ? (
                    <SelectItem value="loading-categories" disabled>Loading categories...</SelectItem>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.targetType === "product" && (
            <div className="space-y-2">
              <Label htmlFor="targetProduct">Product *</Label>
              <Select value={formData.targetProduct} onValueChange={(value) => setFormData({ ...formData, targetProduct: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {loadingProducts ? (
                    <SelectItem value="loading-products" disabled>Loading products...</SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditions and Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions and Limits</CardTitle>
          <CardDescription>
            Set conditions and usage limits for the discount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPurchaseAmount">Minimum Purchase Amount</Label>
              <Input
                id="minPurchaseAmount"
                type="number"
                value={formData.minPurchaseAmount}
                onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Minimum purchase amount to qualify for discount
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxDiscountAmount">Maximum Discount Amount</Label>
              <Input
                id="maxDiscountAmount"
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                placeholder="No limit"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Maximum discount amount per transaction
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageLimit">Usage Limit</Label>
            <Input
              id="usageLimit"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              placeholder="No limit"
              min="1"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of times this discount can be used
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Duration</CardTitle>
          <CardDescription>
            Set the validity period for this discount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        setFormData({ 
                          ...formData, 
                          startDate: date,
                          endDate: formData.endDate && formData.endDate < date ? date : formData.endDate
                        })
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        setFormData({ ...formData, endDate: date })
                      }
                    }}
                    disabled={(date: Date) => date < formData.startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Inactive discounts will not be applied to purchases
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 p-4 bg-background rounded-lg border">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving..." : discount ? "Update Discount" : "Create Discount"}
        </Button>
      </div>
    </form>
  )
}
