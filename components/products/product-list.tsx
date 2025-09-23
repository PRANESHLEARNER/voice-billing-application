"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Search, Edit, Trash2, Package, Loader2, PlusCircle } from "lucide-react"
import { apiClient, type Product } from "@/lib/api"
import { ProductForm } from "./product-form"

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [activeFilter, setActiveFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [restockVariant, setRestockVariant] = useState<{ product: Product; variantIndex: number } | null>(null)
  const [restockAmount, setRestockAmount] = useState("")
  const [isRestocking, setIsRestocking] = useState(false)

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

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError("")

      const params: any = {}
      if (searchTerm) params.search = searchTerm
      if (categoryFilter !== "all") params.category = categoryFilter
      if (activeFilter !== "all") params.active = activeFilter === "active"

      const data = await apiClient.getProducts(params)
      setProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [searchTerm, categoryFilter, activeFilter])

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteProduct) return

    try {
      setIsDeleting(true)
      await apiClient.deleteProduct(deleteProduct._id)
      await loadProducts()
      setDeleteProduct(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product")
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleVariants = (productId: string) => {
    setExpandedProductId(expandedProductId === productId ? null : productId)
  }

  const handleRestockVariant = (product: Product, variantIndex: number) => {
    setRestockVariant({ product, variantIndex })
    setRestockAmount("")
  }

  const handleConfirmRestock = async () => {
    if (!restockVariant || !restockAmount) return

    try {
      setIsRestocking(true)
      const { product, variantIndex } = restockVariant
      const amount = parseInt(restockAmount)
      
      if (isNaN(amount) || amount <= 0) {
        setError("Please enter a valid restock amount")
        return
      }

      // Create a copy of the product with updated variant stock
      const updatedProduct = { ...product }
      updatedProduct.variants = [...product.variants]
      updatedProduct.variants[variantIndex] = {
        ...product.variants[variantIndex],
        stock: product.variants[variantIndex].stock + amount
      }

      // Update the product
      await apiClient.updateProduct(product._id, updatedProduct)
      await loadProducts()
      setRestockVariant(null)
      setRestockAmount("")
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restock variant")
    } finally {
      setIsRestocking(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (stock < 10) return { label: "Low Stock", variant: "secondary" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Management
              </CardTitle>
              <CardDescription>Manage your product catalog and inventory</CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products by name, code, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Category Cards */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found
              </div>
            ) : (
              Object.entries(
                products.reduce((acc, product) => {
                  const category = product.category || 'Uncategorized'
                  if (!acc[category]) {
                    acc[category] = []
                  }
                  acc[category].push(product)
                  return acc
                }, {} as Record<string, typeof products>)
              ).map(([category, categoryProducts]) => (
                <Card key={category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          {category}
                        </CardTitle>
                        <CardDescription>
                          {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {categoryProducts.reduce((sum, product) => sum + product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0), 0)} total items
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryProducts.map((product) => {
                        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)
                        const stockStatus = getStockStatus(totalStock)
                        const hasVariants = product.variants.length > 0
                        const isExpanded = expandedProductId === product._id
                        
                        return (
                          <div key={product._id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {product.name}
                                  {hasVariants && (
                                    <span 
                                      className="text-xs text-muted-foreground cursor-pointer"
                                      onClick={() => toggleVariants(product._id)}
                                    >
                                      {isExpanded ? "▼" : "▶"}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {product.code}
                                </div>
                                {product.barcode && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    Barcode: {product.barcode}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(product)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteProduct(product)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Price:</span>
                              <span className="font-medium">{formatCurrency(product.variants[0]?.price || product.basePrice || 0)}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Stock:</span>
                              <Badge variant={stockStatus.variant}>
                                {stockStatus.label} ({totalStock} {product.unit})
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            {hasVariants && (
                              <div className="text-xs text-muted-foreground">
                                {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''} {isExpanded ? '(shown)' : '(click to expand)'}
                              </div>
                            )}
                            
                            {hasVariants && isExpanded && (
                              <div className="space-y-2 pt-2 border-t">
                                {product.variants.map((variant, index) => {
                                  const variantStockStatus = getStockStatus(variant.stock)
                                  return (
                                    <div key={index} className="bg-muted/30 rounded p-3 text-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{variant.size}</span>
                                        <Badge variant={variantStockStatus.variant} className="text-xs">
                                          {variantStockStatus.label}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">SKU: </span>
                                          <span className="font-mono">{variant.sku}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Price: </span>
                                          <span>{formatCurrency(variant.price)}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Stock: </span>
                                          <span>{variant.stock} {product.unit}</span>
                                        </div>
                                        <div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleRestockVariant(product, index)
                                            }}
                                          >
                                            <PlusCircle className="h-3 w-3 mr-1" />
                                            Restock
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Product Form Dialog */}
          <ProductForm
            product={selectedProduct}
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={loadProducts}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{deleteProduct?.name}"? This action will deactivate the product and
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Restock Variant Dialog */}
          <Dialog open={!!restockVariant} onOpenChange={() => setRestockVariant(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Restock Variant</DialogTitle>
                <DialogDescription>
                  Add stock to {restockVariant?.product.name} - {restockVariant?.product.variants[restockVariant?.variantIndex || 0].size}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="restock-amount" className="text-right">
                    Amount
                  </Label>
                  <Input
                    id="restock-amount"
                    type="number"
                    min="1"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter restock amount"
                  />
                </div>
                {restockVariant && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <div><strong>Current Stock:</strong> {restockVariant.product.variants[restockVariant.variantIndex].stock} {restockVariant.product.unit}</div>
                    <div><strong>SKU:</strong> {restockVariant.product.variants[restockVariant.variantIndex].sku}</div>
                    <div><strong>Price:</strong> {formatCurrency(restockVariant.product.variants[restockVariant.variantIndex].price)}</div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRestockVariant(null)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmRestock} disabled={!restockAmount || isRestocking}>
                  {isRestocking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Restocking...
                    </>
                  ) : (
                    "Restock"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
