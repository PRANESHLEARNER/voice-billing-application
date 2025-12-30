import { authService } from "./auth"
import type { Employee } from "@/types/employee"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = authService.getToken()
    const url = `${API_BASE_URL}${endpoint}`

    console.log('🌐 API Request:', {
      url,
      method: options.method || "GET",
      body: options.body,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    })

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Network error" }))
      console.error("❌ API Error:", {
        status: response.status,
        statusText: response.statusText,
        error,
        url,
        hasToken: !!token
      })
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ API Response:", data)
    return data
  }

  // -------------------
  // Product API methods
  // -------------------
  async getProducts(params?: { search?: string; category?: string; active?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.category) searchParams.append("category", params.category)
    if (params?.active !== undefined) searchParams.append("active", params.active.toString())
    const query = searchParams.toString()
    return this.request<Product[]>(`/products${query ? `?${query}` : ""}`)
  }

  async getProductByIdentifier(identifier: string) {
    return this.request<Product>(`/products/search/${identifier}`)
  }

  async createProduct(product: Omit<Product, "_id" | "createdAt" | "updatedAt">) {
    return this.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(product),
    })
  }

  async updateProduct(id: string, product: Partial<Product>) {
    return this.request<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(product),
    })
  }

  async deleteProduct(id: string) {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: "DELETE",
    })
  }

  // -------------------
  // Bill API methods
  // -------------------
  async createBill(billData: CreateBillRequest) {
    // Use the frontend's calculated totals to ensure discounts are properly applied
    const calculatedTotals = billData.items.reduce((acc, item) => {
      const baseAmount = item.rate * item.quantity
      let discountAmount = 0
      
      // Use the pre-calculated discountAmount if available, otherwise calculate it
      if (item.discount) {
        if (item.discount.discountAmount !== undefined) {
          // Use the pre-calculated discount amount from the frontend
          discountAmount = item.discount.discountAmount
        } else {
          // Fallback: Calculate discount if discountAmount is not provided
          if (item.discount.discountType === 'percentage') {
            discountAmount = baseAmount * (item.discount.discountValue / 100)
          } else {
            // Fixed amount discount
            discountAmount = Math.min(item.discount.discountValue * item.quantity, baseAmount)
          }
        }
      }
      
      const discountedAmount = baseAmount - discountAmount
      const taxAmount = discountedAmount * (item.taxRate / 100)
      const totalAmount = discountedAmount + taxAmount
      
      return {
        subtotal: acc.subtotal + discountedAmount,
        totalDiscount: acc.totalDiscount + discountAmount,
        totalTax: acc.totalTax + taxAmount,
        grandTotal: acc.grandTotal + totalAmount
      }
    }, {
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 0
    })

    // include cashier from auth
    const tokenUser = authService.getUser()
    if (!tokenUser) throw new Error("Unauthorized: cashier info missing")

    const enrichedData = {
      ...billData,
      cashier: tokenUser.id,
      subtotal: calculatedTotals.subtotal,
      totalDiscount: calculatedTotals.totalDiscount,
      totalTax: calculatedTotals.totalTax,
      grandTotal: calculatedTotals.grandTotal,
      cashTendered: billData.cashTendered || calculatedTotals.grandTotal,
    }

    return this.request<Bill>("/bills", {
      method: "POST",
      body: JSON.stringify(enrichedData),
    })
  }

  async getBills(params?: {
    page?: number
    limit?: number
    search?: string
    startDate?: string
    endDate?: string
    cashier?: string
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.search) searchParams.append("search", params.search)
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    if (params?.cashier) searchParams.append("cashier", params.cashier)
    if (params?.status) searchParams.append("status", params.status)
    const query = searchParams.toString()
    return this.request<BillsResponse>(`/bills${query ? `?${query}` : ""}`)
  }

  async getBill(id: string) {
    return this.request<Bill>(`/bills/${id}`)
  }

  async deleteBill(id: string) {
    return this.request<{ message: string }>(`/bills/${id}`, {
      method: "DELETE",
    })
  }

  async sendBillByEmail(id: string, email: string) {
    return this.request<{ message: string }>(`/bills/${id}/send-email`, {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  }

  // Send bill via WhatsApp
  async sendBillViaWhatsApp(id: string, phoneNumber: string) {
    return this.request<{ 
      success: boolean
      message: string
      whatsappUrl: string
      phoneNumber: string
      billNumber: string
    }>(`/bills/${id}/whatsapp`, {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    })
  }

  // Check customer loyalty status
  async getCustomerLoyaltyStatus(phoneNumber: string) {
    return this.request<{
      phone: string
      purchaseCount: number
      isEligible: boolean
      nextPurchaseForDiscount: number
    }>(`/bills/customer/${phoneNumber}/purchase-count`)
  }


  // Generate PDF for a bill
  async generateBillPDF(billId: string, language: string = 'en'): Promise<Blob> {
    console.log('🌐 API: Generating PDF for bill:', billId, 'with language:', language);
    
    const searchParams = new URLSearchParams()
    searchParams.append('language', language)
    
    const url = `${API_BASE_URL}/bills/${billId}/pdf?${searchParams.toString()}`
    console.log('🌐 API: Full URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Network error" }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return await response.blob()
  }

  // -------------------
  // Shift API methods
  // -------------------
  async startShift(openingCash: number) {
    return this.request<Shift>("/shifts/start", {
      method: "POST",
      body: JSON.stringify({ openingCash }),
    })
  }

  async endShift(closingCash: number, notes?: string) {
    return this.request<Shift>("/shifts/end", {
      method: "POST",
      body: JSON.stringify({ closingCash, notes }),
    })
  }

  async getCurrentShift() {
    return this.request<Shift | null>("/shifts/current")
  }

  async getShifts(params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    const query = searchParams.toString()
    return this.request<ShiftsResponse>(`/shifts${query ? `?${query}` : ""}`)
  }

  // Admin: Get all active shifts
  async getActiveShifts() {
    return this.request<Shift[]>("/shifts/active")
  }

  // Admin: Get shift summary
  async getShiftSummary(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/shifts/summary${query ? `?${query}` : ""}`)
  }

  // Admin: Force end a shift
  async forceEndShift(shiftId: string, closingCash?: number, notes?: string) {
    return this.request<Shift>(`/shifts/${shiftId}/end`, {
      method: "POST",
      body: JSON.stringify({ closingCash, notes }),
    })
  }

  // Admin: Get available cashiers
  async getAvailableCashiers() {
    return this.request<any>("/shifts/available-cashiers")
  }

  // -------------------
  // Employee API methods
  // -------------------
  async getEmployees(params?: {
    page?: number
    limit?: number
    search?: string
    department?: string
    status?: string
    sortBy?: string
    sortOrder?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.search) searchParams.append("search", params.search)
    if (params?.department) searchParams.append("department", params.department)
    if (params?.status) searchParams.append("status", params.status)
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy)
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder)

    const response = await this.request<EmployeesResponse>(
      `/employees?${searchParams.toString()}`
    )
    return response
  }

  async getEmployee(id: string) {
    return await this.request<Employee>(`/employees/${id}`)
  }

  async createEmployee(employee: Omit<Employee, "_id" | "createdAt" | "updatedAt">) {
    return await this.request<Employee>(`/employees`, {
      method: "POST",
      body: JSON.stringify(employee),
    })
  }

  async updateEmployee(id: string, employee: Partial<Employee>) {
    return await this.request<Employee>(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employee),
    })
  }

  async deleteEmployee(id: string) {
    return await this.request<{ message: string }>(`/employees/${id}`, {
      method: "DELETE",
    })
  }

  // -------------------
  // Leave API methods
  // -------------------
  async getLeaves(params?: { status?: string; employee?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status", params.status)
    if (params?.employee) searchParams.append("employee", params.employee)
    const query = searchParams.toString()
    return this.request<any[]>(`/leaves${query ? `?${query}` : ""}`)
  }

  async getMyLeaves() {
    return this.request<any[]>("/leaves/my-leaves")
  }

  async getLeaveById(id: string) {
    return this.request<any>(`/leaves/${id}`)
  }

  async createLeave(leaveData: FormData) {
    return this.request<any>("/leaves", {
      method: "POST",
      body: leaveData,
      headers: {} // Let browser set Content-Type for multipart/form-data
    })
  }

  async approveLeave(id: string) {
    return this.request<any>(`/leaves/${id}/approve`, {
      method: "PUT"
    })
  }

  async rejectLeave(id: string, rejectedReason: string) {
    return this.request<any>(`/leaves/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ rejectedReason })
    })
  }

  async cancelLeave(id: string) {
    return this.request<any>(`/leaves/${id}/cancel`, {
      method: "PUT"
    })
  }

  // -------------------
  // Reports API methods
  // -------------------
  async getSalesSummary(params?: { startDate?: string; endDate?: string; period?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    if (params?.period) searchParams.append("period", params.period)
    const query = searchParams.toString()
    return this.request<SalesSummaryResponse>(`/reports/sales-summary${query ? `?${query}` : ""}`)
  }

  async getTopProducts(params?: { startDate?: string; endDate?: string; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    const query = searchParams.toString()
    return this.request<TopProduct[]>(`/reports/top-products${query ? `?${query}` : ""}`)
  }

  async getCashierPerformance(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    const query = searchParams.toString()
    return this.request<CashierPerformance[]>(`/reports/cashier-performance${query ? `?${query}` : ""}`)
  }

  async getInventoryReport(params?: { category?: string; lowStock?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.append("category", params.category)
    if (params?.lowStock !== undefined) searchParams.append("lowStock", params.lowStock.toString())
    const query = searchParams.toString()
    return this.request<InventoryReport>(`/reports/inventory${query ? `?${query}` : ""}`)
  }

  async getPaymentMethodsReport(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    const query = searchParams.toString()
    return this.request<PaymentMethodReport[]>(`/reports/payment-methods${query ? `?${query}` : ""}`)
  }

  async getCategoriesPerformance(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    const query = searchParams.toString()
    return this.request<CategoryPerformance[]>(`/reports/categories-performance${query ? `?${query}` : ""}`)
  }

  async getTopProductsByCategory(params?: { startDate?: string; endDate?: string; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append("startDate", params.startDate)
    if (params?.endDate) searchParams.append("endDate", params.endDate)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    const query = searchParams.toString()
    return this.request<CategoryTopProducts[]>(`/reports/top-products-by-category${query ? `?${query}` : ""}`)
  }

  async sendLowStockEmail() {
    return this.request<{ message: string; count: number; products: Array<{ id: string; name: string; code: string; stock: number }> }>(`/reports/send-low-stock-email`, {
      method: "POST"
    })
  }

  // -------------------
  // Discount API methods
  // -------------------
  async getDiscounts(params?: {
    page?: number
    limit?: number
    search?: string
    targetType?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.search) searchParams.append("search", params.search)
    if (params?.targetType) searchParams.append("targetType", params.targetType)
    if (params?.isActive !== undefined) searchParams.append("isActive", params.isActive)
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy)
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder)

    const response = await this.request<DiscountsResponse>(
      `/discounts?${searchParams.toString()}`
    )
    return response
  }

  async getDiscount(id: string) {
    return await this.request<Discount>(`/discounts/${id}`)
  }

  async createDiscount(discount: Omit<Discount, "_id" | "createdAt" | "updatedAt" | "usedCount" | "createdBy">) {
    return await this.request<Discount>(`/discounts`, {
      method: "POST",
      body: JSON.stringify(discount),
    })
  }

  async updateDiscount(id: string, discount: Partial<Discount>) {
    return await this.request<Discount>(`/discounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(discount),
    })
  }

  async deleteDiscount(id: string) {
    return await this.request<{ message: string }>(`/discounts/${id}`, {
      method: "DELETE",
    })
  }

  async getApplicableDiscounts(productId: string) {
    console.log("🌐 API: Getting applicable discounts for product:", productId)
    const result = await this.request<Discount[]>(`/discounts/applicable/${productId}`)
    console.log("🌐 API: Response from applicable discounts:", result)
    return result
  }

  async getBestDiscount(productId: string, quantity?: number) {
    const searchParams = new URLSearchParams()
    if (quantity) searchParams.append("quantity", quantity.toString())

    return await this.request<{
      discount: Discount
      discountAmount: number
    } | null>(`/discounts/best/${productId}?${searchParams.toString()}`)
  }

  async getDiscountStats() {
    return await this.request<DiscountStats>(`/discounts/stats/overview`)
  }

  async toggleDiscountStatus(id: string) {
    return await this.request<Discount>(`/discounts/${id}/toggle`, {
      method: "PATCH",
    })
  }

  // -------------------
  // Payment API methods
  // -------------------
  async createPaymentOrder(data: {
    amount: number
    currency: string
    paymentMethod: "card" | "upi"
  }) {
    const response = await this.request<{
      success: boolean
      message: string
      data: {
        id: string
        amount: number
        currency: string
      }
    }>("/payments/create-order", {
      method: "POST",
      body: JSON.stringify(data),
    })
    
    // Extract the order data from the response
    return response.data
  }

  async verifyPayment(data: {
    paymentId: string
    orderId: string
    signature: string
  }) {
    return this.request<{
      success: boolean
      message: string
      paymentId?: string
      orderId?: string
    }>("/payments/verify", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // -------------------
  // Generic API methods
  // -------------------
  async get<T = any>(endpoint: string) {
    return await this.request<T>(endpoint)
  }

  async put<T = any>(endpoint: string, data: any) {
    return await this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // -------------------
  // Type definitions
  // -------------------
}

export interface EmployeesResponse {
  employees: Employee[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ProductVariant {
  _id?: string
  size: string
  price: number
  cost: number
  stock: number
  barcode?: string
  sku: string
  isActive: boolean
}

export interface Product {
  _id: string
  code: string
  name: string
  barcode?: string
  category: string
  basePrice: number
  baseCost: number
  unit: string
  taxRate: number
  isActive: boolean
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface BillItem {
  product: string
  productCode: string
  productName: string
  size?: string
  quantity: number
  rate: number
  taxRate: number
  amount: number
  taxAmount: number
  totalAmount: number
  discount?: {
    discountId: string
    discountName: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    discountAmount: number
  }
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

export interface Bill {
  _id: string
  billNumber: string
  customer: CustomerInfo
  items: BillItem[]
  subtotal: number
  totalDiscount: number
  totalTax: number
  loyaltyDiscount?: {
    discountId: string
    discountName: string
    discountType: string
    discountValue: number
    discountAmount: number
  }
  roundOff: number
  grandTotal: number
  cashTendered: number
  changeDue: number
  paymentMethod: "cash" | "card" | "upi" | "mixed"
  paymentDetails?: {
    razorpayPaymentId?: string
    razorpayOrderId?: string
    razorpaySignature?: string
    cardLast4?: string
    cardType?: string
    upiId?: string
    paymentStatus?: "pending" | "completed" | "failed" | "refunded"
  }
  paymentBreakdown?: Array<{
    method: "cash" | "card" | "upi"
    amount: number
    details?: {
      razorpayPaymentId?: string
      razorpayOrderId?: string
      razorpaySignature?: string
      cardLast4?: string
      cardType?: string
      upiId?: string
    }
  }>
  cashier: string
  cashierName: string
  shift?: string
  status: "completed" | "cancelled" | "refunded"
  createdAt: string
  updatedAt: string
}

export interface CreateBillRequest {
  items: Array<{
    product: string
    size?: string
    quantity: number
    rate: number
    taxRate: number
    discount?: {
      discountId: string
      discountName: string
      discountType: "percentage" | "fixed"
      discountValue: number
      discountAmount?: number
    }
  }>
  customer?: {
    name?: string
    phone?: string
    address?: string
    gstNumber?: string
  }
  cashTendered?: number
  paymentMethod?: "cash" | "card" | "upi" | "mixed"
  paymentDetails?: {
    razorpayPaymentId?: string
    razorpayOrderId?: string
    razorpaySignature?: string
    cardLast4?: string
    cardType?: string
    upiId?: string
    paymentStatus?: "pending" | "completed" | "failed" | "refunded"
  }
  paymentBreakdown?: Array<{
    method: "cash" | "card" | "upi"
    amount: number
    details?: {
      razorpayPaymentId?: string
      razorpayOrderId?: string
      razorpaySignature?: string
      cardLast4?: string
      cardType?: string
      upiId?: string
    }
  }>
}

export interface BillsResponse {
  bills: Bill[]
  totalPages: number
  currentPage: number
  total: number
}

export interface Shift {
  _id: string
  cashier: string
  cashierName: string
  startTime: string
  endTime?: string
  openingCash: number
  closingCash?: number
  totalSales: number
  totalBills: number
  status: "active" | "closed"
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ShiftsResponse {
  shifts: Shift[]
  totalPages: number
  currentPage: number
  total: number
}

export interface SalesSummaryResponse {
  salesData: Array<{
    _id: any
    totalSales: number
    totalBills: number
    totalItems: number
    totalDiscount: number
    totalTax: number
    avgBillValue: number
  }>
  totals: {
    totalSales: number
    totalBills: number
    totalItems: number
    totalDiscount: number
    totalTax: number
    avgBillValue: number
  }
}

export interface TopProduct {
  _id: {
    productId: string
    productName: string
    productCode: string
  }
  totalQuantity: number
  totalRevenue: number
  totalOrders: number
  avgPrice: number
}

export interface CashierPerformance {
  _id: {
    cashierId: string
    cashierName: string
  }
  totalSales: number
  totalBills: number
  totalItems: number
  avgBillValue: number
  totalDiscount: number
}

export interface InventoryReport {
  products: Product[]
  summary: {
    totalProducts: number
    inventoryValue: number
    lowStockCount: number
    outOfStockCount: number
  }
}

export interface PaymentMethodReport {
  _id: string
  totalAmount: number
  totalTransactions: number
  avgTransactionValue: number
}

export interface CategoryPerformance {
  category: string
  totalRevenue: number
  totalQuantity: number
  totalOrders: number
  avgOrderValue: number
  uniqueProductsCount: number
}

export interface TopProductByCategory {
  productName: string
  productId: string
  totalRevenue: number
  totalQuantity: number
  totalOrders: number
  avgPrice: number
}

export interface TopProduct {
  _id: {
    productId: string
    productName: string
    productCode: string
  }
  totalRevenue: number
  totalQuantity: number
  totalOrders: number
  avgPrice: number
}

export interface CategoryTopProducts {
  category: string
  products: TopProductByCategory[]
  categoryRevenue: number
}

export interface Discount {
  _id: string
  name: string
  description?: string
  type: "percentage" | "fixed"
  value: number
  targetType: "all" | "category" | "product"
  targetCategory?: string
  targetProduct?: Product
  minPurchaseAmount: number
  maxDiscountAmount?: number
  usageLimit?: number
  usedCount: number
  startDate: string
  endDate: string
  isActive: boolean
  createdBy: {
    _id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface DiscountsResponse {
  discounts: Discount[]
  totalPages: number
  currentPage: number
  total: number
}

export interface DiscountStats {
  totalDiscounts: number
  activeDiscounts: number
  expiredDiscounts: number
  usageLimitReached: number
  totalUsage: number
  discountTypes: Array<{
    _id: string
    count: number
  }>
  targetTypes: Array<{
    _id: string
    count: number
  }>
}

export const apiClient = new ApiClient()

// Standalone function for sending bill via email
export const sendBillByEmail = async (billId: string, email: string) => {
  return apiClient.sendBillByEmail(billId, email)
}

// Standalone function for sending bill via WhatsApp
export const sendBillViaWhatsApp = async (billId: string, phoneNumber: string) => {
  return apiClient.sendBillViaWhatsApp(billId, phoneNumber)
}
