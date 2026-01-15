"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Minus, Trash2 } from "lucide-react"
import { apiClient, type Product, type ProductVariant } from "@/lib/api"

interface ProductFormProps {
  product?: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialValues?: Partial<Product>
}

const categories = [
  "Beverages",
  "Bakery",
  "Groceries",
  "Dairy",
  "Confectionery",
  "Fruits & Vegetables",
  "Meat & Seafood",
  "Frozen Foods",
  "Personal Care",
  "Household",
  "Electronics",
  "Other",
]

const units = ["pcs", "kg", "gm", "liter", "ml", "bottle", "packet", "box", "can", "jar"]

export function ProductForm({ product, isOpen, onClose, onSuccess, initialValues }: ProductFormProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    barcode: "",
    category: "",
    basePrice: "",
    baseCost: "",
    unit: "pcs",
    taxRate: "",
    isActive: true,
  })
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      size: "",
      price: 0,
      cost: 0,
      stock: 0,
      sku: "",
      isActive: true,
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const buildFormDataFromInitial = (values?: Partial<Product>) => ({
    code: values?.code ?? "",
    name: values?.name ?? "",
    barcode: values?.barcode ?? "",
    category: values?.category ?? "",
    basePrice: values?.basePrice !== undefined && values?.basePrice !== null ? values.basePrice.toString() : "",
    baseCost: values?.baseCost !== undefined && values?.baseCost !== null ? values.baseCost.toString() : "",
    unit: values?.unit ?? "pcs",
    taxRate: values?.taxRate !== undefined && values?.taxRate !== null ? values.taxRate.toString() : "",
    isActive: values?.isActive ?? true,
  })

  const buildVariantsFromInitial = (sourceVariants?: ProductVariant[]) => {
    if (sourceVariants && sourceVariants.length > 0) {
      return sourceVariants.map((variant) => ({
        size: variant.size,
        price: variant.price,
        cost: variant.cost,
        stock: variant.stock,
        sku: variant.sku,
        barcode: variant.barcode,
        isActive: variant.isActive,
      }))
    }
    return [
      {
        size: "",
        price: 0,
        cost: 0,
        stock: 0,
        sku: "",
        isActive: true,
      },
    ]
  }

  useEffect(() => {
    if (product) {
      setFormData(buildFormDataFromInitial(product))
      setVariants(buildVariantsFromInitial(product.variants))
    } else {
      const combinedInitials: Partial<Product> | undefined = initialValues
      setFormData(buildFormDataFromInitial(combinedInitials))
      const initialVariants = combinedInitials?.variants?.length
        ? combinedInitials.variants
        : undefined
      setVariants(buildVariantsFromInitial(initialVariants as ProductVariant[] | undefined))
    }
    setError("")
  }, [product, isOpen, initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validate variants
      const validVariants = variants.filter(v => v.size.trim() !== "" && v.sku.trim() !== "")
      if (validVariants.length === 0) {
        setError("At least one variant with size and SKU is required")
        setIsLoading(false)
        return
      }

      // Generate SKUs if not provided
      const variantsWithSKUs = validVariants.map(variant => ({
        ...variant,
        sku: variant.sku.trim() || `${formData.code}-${variant.size}`.toUpperCase()
      }))

      const productData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        barcode: formData.barcode || undefined,
        category: formData.category,
        basePrice: Number.parseFloat(formData.basePrice),
        baseCost: Number.parseFloat(formData.baseCost),
        unit: formData.unit,
        taxRate: Number.parseFloat(formData.taxRate),
        isActive: formData.isActive,
        variants: variantsWithSKUs,
      }

      if (product) {
        await apiClient.updateProduct(product._id, productData)
      } else {
        await apiClient.createProduct(productData)
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number | boolean) => {
    setVariants((prev) => {
      const newVariants = [...prev]
      newVariants[index] = { ...newVariants[index], [field]: value }
      return newVariants
    })
  }

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: "",
        price: 0,
        cost: 0,
        stock: 0,
        sku: "",
        isActive: true,
      }
    ])
  }

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants((prev) => prev.filter((_, i) => i !== index))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update the product information below." : "Enter the details for the new product."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Product Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                placeholder="ABC-001"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange("barcode", e.target.value)}
                placeholder="1234567890123"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter product name"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => handleInputChange("unit", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseCost">Base Cost Price *</Label>
              <Input
                id="baseCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.baseCost}
                onChange={(e) => handleInputChange("baseCost", e.target.value)}
                placeholder="0.00"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Selling Price *</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => handleInputChange("basePrice", e.target.value)}
                placeholder="0.00"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => handleInputChange("taxRate", e.target.value)}
                placeholder="0.00"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Product Variants Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Product Variants</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            </div>
            
            {variants.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Variant {index + 1}</h4>
                  {variants.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`size-${index}`}>Size *</Label>
                    <Input
                      id={`size-${index}`}
                      value={variant.size}
                      onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                      placeholder="250ml, 500ml, 1L"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`sku-${index}`}>SKU *</Label>
                    <Input
                      id={`sku-${index}`}
                      value={variant.sku}
                      onChange={(e) => handleVariantChange(index, 'sku', e.target.value.toUpperCase())}
                      placeholder="AUTO-GENERATED"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`variantCost-${index}`}>Cost Price *</Label>
                    <Input
                      id={`variantCost-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={variant.cost}
                      onChange={(e) => handleVariantChange(index, 'cost', Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`variantPrice-${index}`}>Selling Price *</Label>
                    <Input
                      id={`variantPrice-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, 'price', Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`stock-${index}`}>Stock Quantity *</Label>
                    <Input
                      id={`stock-${index}`}
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(e) => handleVariantChange(index, 'stock', Number.parseInt(e.target.value) || 0)}
                      placeholder="0"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`barcode-${index}`}>Barcode</Label>
                    <Input
                      id={`barcode-${index}`}
                      value={variant.barcode || ''}
                      onChange={(e) => handleVariantChange(index, 'barcode', e.target.value)}
                      placeholder="1234567890123"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`isActive-${index}`}
                    checked={variant.isActive}
                    onCheckedChange={(checked) => handleVariantChange(index, 'isActive', checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`isActive-${index}`}>Active Variant</Label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange("isActive", checked)}
              disabled={isLoading}
            />
            <Label htmlFor="isActive">Active Product</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {product ? "Updating..." : "Creating..."}
                </>
              ) : product ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
