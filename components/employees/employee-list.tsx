"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Eye, Trash2, UserCheck, UserX } from "lucide-react"
import { EmployeeForm } from "./employee-form"
import { EmployeeDetails } from "./employee-details"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { authService } from "@/lib/auth"
import { Employee } from "@/types/employee"

export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
  const { toast } = useToast()
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, statusFilter])

  const fetchEmployees = async () => {
    try {
      const token = authService.getToken()
      const response = await fetch("http://localhost:5001/api/employees", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch employees",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    if (searchTerm) {
      filtered = filtered.filter(
        (employee) =>
          (employee.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (employee.user?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          employee.personalDetails.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.personalDetails.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.contactDetails.phone.includes(searchTerm)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((employee) => employee.status === statusFilter)
    }

    setFilteredEmployees(filtered)
  }

  const handleEmployeeCreated = () => {
    fetchEmployees()
    setIsDialogOpen(false)
    setEditingEmployee(null)
  }

  const handleEmployeeUpdated = () => {
    fetchEmployees()
    setIsDialogOpen(false)
    setEditingEmployee(null)
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsDialogOpen(true)
  }

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsDetailsOpen(true)
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) {
      return
    }

    try {
      const token = authService.getToken()
      const response = await fetch(`http://localhost:5001/api/employees/${employeeId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee deactivated successfully",
        })
        fetchEmployees()
      } else {
        toast({
          title: "Error",
          description: "Failed to deactivate employee",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate employee",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      case "on_leave":
        return "bg-yellow-100 text-yellow-800"
      case "terminated":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cashier Management</h1>
          <p className="text-muted-foreground">Manage cashiers and their details</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingEmployee(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Cashier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Edit Cashier" : "Add New Cashier"}
                </DialogTitle>
              </DialogHeader>
              <EmployeeForm
                employee={editingEmployee}
                onSuccess={editingEmployee ? handleEmployeeUpdated : handleEmployeeCreated}
                onCancel={() => {
                  setIsDialogOpen(false)
                  setEditingEmployee(null)
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cashiers ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell className="font-medium">{employee.user?.employeeId || 'N/A'}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{employee.user?.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{employee.user?.email || 'No email'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employmentDetails.department}</TableCell>
                  <TableCell>{employee.employmentDetails.position}</TableCell>
                  <TableCell>{employee.contactDetails.phone}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(employee)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No cashiers found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cashier Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeDetails
              employee={selectedEmployee}
              onClose={() => setIsDetailsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
