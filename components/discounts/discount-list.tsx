"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Filter, Edit, Trash2, ToggleLeft, ToggleRight, Calendar, Tag, Target, AlertCircle } from "lucide-react"
import { apiClient, type Discount } from "@/lib/api"
import { DiscountForm } from "./discount-form"
import { DiscountDetails } from "./discount-details"

export function DiscountList() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [targetTypeFilter, setTargetTypeFilter] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false)
  const [discountToToggle, setDiscountToToggle] = useState<Discount | null>(null)

  const fetchDiscounts = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getDiscounts({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        targetType: targetTypeFilter,
        isActive: isActiveFilter !== "" ? isActiveFilter : undefined,
      })
      
      setDiscounts(response.discounts)
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error("Error fetching discounts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscounts()
  }, [currentPage, searchTerm, targetTypeFilter, isActiveFilter])

  const handleToggleStatus = async (discountId: string) => {
    const discount = discounts.find(d => d._id === discountId)
    if (discount) {
      setDiscountToToggle(discount)
      setConfirmToggleOpen(true)
    }
  }

  const confirmToggleStatus = async () => {
    if (!discountToToggle) return

    try {
      await apiClient.toggleDiscountStatus(discountToToggle._id)
      await fetchDiscounts()
      setConfirmToggleOpen(false)
      setDiscountToToggle(null)
    } catch (error) {
      console.error("Error toggling discount status:", error)
    }
  }

  const handleDeleteDiscount = async (discountId: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) {
      return
    }

    try {
      await apiClient.deleteDiscount(discountId)
      await fetchDiscounts()
    } catch (error) {
      console.error("Error deleting discount:", error)
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingDiscount(null)
    fetchDiscounts()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getTargetTypeDisplay = (targetType: string, targetCategory?: string, targetProduct?: any) => {
    switch (targetType) {
      case "all":
        return "All Products"
      case "category":
        return `Category: ${targetCategory}`
      case "product":
        return `Product: ${targetProduct?.name || "Unknown"}`
      default:
        return targetType
    }
  }

  const getDiscountTypeDisplay = (type: string, value: number) => {
    return type === "percentage" ? `${value}%` : formatCurrency(value)
  }

  const isDiscountActive = (discount: Discount) => {
    const now = new Date()
    const startDate = new Date(discount.startDate)
    const endDate = new Date(discount.endDate)
    return discount.isActive && now >= startDate && now <= endDate
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Discount Management</h1>
          <p className="text-muted-foreground">
            Create and manage discounts for products, categories, or all items
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingDiscount(null)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDiscount ? "Edit Discount" : "Create New Discount"}
              </DialogTitle>
              <DialogDescription>
                {editingDiscount
                  ? "Update the discount details below."
                  : "Create a new discount for your products."}
              </DialogDescription>
            </DialogHeader>
            <DiscountForm
              discount={editingDiscount}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingDiscount(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search discounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by target type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-targets">All Target Types</SelectItem>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="product">Specific Product</SelectItem>
              </SelectContent>
            </Select>
            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discounts</CardTitle>
          <CardDescription>
            Manage your product discounts and promotions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading discounts...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No discounts found. Create your first discount to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      discounts.map((discount) => (
                        <TableRow key={discount._id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{discount.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {discount.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getDiscountTypeDisplay(discount.type, discount.value)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {getTargetTypeDisplay(
                                  discount.targetType,
                                  discount.targetCategory,
                                  discount.targetProduct
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatDate(discount.startDate)}</div>
                              <div className="text-muted-foreground">to {formatDate(discount.endDate)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                {discount.usedCount || 0} of {discount.usageLimit || "∞"}
                              </div>
                              <div className="text-muted-foreground">
                                {discount.usageLimit
                                  ? `${Math.round(
                                      ((discount.usedCount || 0) / discount.usageLimit) * 100
                                    )}% used`
                                  : "No limit"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isDiscountActive(discount) ? "default" : "secondary"}
                            >
                              {isDiscountActive(discount) ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDiscount(discount)
                                  setIsDetailsOpen(true)
                                }}
                              >
                                <Tag className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingDiscount(discount)
                                  setIsFormOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(discount._id)}
                              >
                                {discount.isActive ? (
                                  <ToggleRight className="h-4 w-4" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDiscount(discount._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Discount Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discount Details</DialogTitle>
          </DialogHeader>
          {selectedDiscount && (
            <DiscountDetails discount={selectedDiscount} />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Status Dialog */}
      <Dialog open={confirmToggleOpen} onOpenChange={setConfirmToggleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Status Change
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to change discount from 
              <span className="font-semibold">
                {discountToToggle?.isActive ? " active " : " inactive "}
              </span> to 
              <span className="font-semibold">
                {discountToToggle?.isActive ? " inactive " : " active "}
              </span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmToggleOpen(false)
                setDiscountToToggle(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmToggleStatus}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
