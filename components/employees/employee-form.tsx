"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth"
import { Employee } from "@/types/employee"

interface EmployeeFormProps {
  employee?: Employee | null
  onSuccess: () => void
  onCancel: () => void
}

export function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    // User details
    email: employee?.user.email || "",
    password: "",
    role: "cashier", // Hardcoded to cashier only
    employeeId: employee?.user.employeeId || "",
    
    // Personal details
    firstName: employee?.personalDetails.firstName || "",
    lastName: employee?.personalDetails.lastName || "",
    dateOfBirth: employee?.personalDetails.dateOfBirth ? new Date(employee.personalDetails.dateOfBirth).toISOString().split('T')[0] : "",
    gender: employee?.personalDetails.gender || "",
    bloodGroup: employee?.personalDetails.bloodGroup || "",
    
    // Contact details
    phone: employee?.contactDetails.phone || "",
    emergencyPhone: employee?.contactDetails.emergencyPhone || "",
    street: employee?.contactDetails.address.street || "",
    city: employee?.contactDetails.address.city || "",
    state: employee?.contactDetails.address.state || "",
    postalCode: employee?.contactDetails.address.postalCode || "",
    country: employee?.contactDetails.address.country || "India",
    
    // Identification
    aadhaarNumber: employee?.identification.aadhaarNumber || "",
    panNumber: employee?.identification.panNumber || "",
    
    // Employment details
    department: "cashier", // Hardcoded to cashier only
    position: employee?.employmentDetails.position || "Cashier",
    dateOfJoining: employee?.employmentDetails.dateOfJoining ? new Date(employee.employmentDetails.dateOfJoining).toISOString().split('T')[0] : "",
    salary: employee?.employmentDetails.salary || 0,
    
    status: employee?.status || "active"
  })

  const [files, setFiles] = useState({
    aadhaarCard: null as File | null,
    panCard: null as File | null,
    photo: null as File | null
  })

  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileChange = (field: keyof typeof files, file: File | null) => {
    setFiles(prev => ({
      ...prev,
      [field]: file
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      
      // Append basic user data
      formDataToSend.append('email', formData.email)
      formDataToSend.append('password', formData.password)
      formDataToSend.append('role', formData.role)
      formDataToSend.append('employeeId', formData.employeeId)

      // Append structured data
      formDataToSend.append('personalDetails', JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup
      }))

      formDataToSend.append('contactDetails', JSON.stringify({
        phone: formData.phone,
        emergencyPhone: formData.emergencyPhone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country
        }
      }))

      formDataToSend.append('identification', JSON.stringify({
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber
      }))

      formDataToSend.append('employmentDetails', JSON.stringify({
        department: formData.department,
        position: formData.position,
        dateOfJoining: formData.dateOfJoining,
        salary: formData.salary || 0 // Default salary for cashiers
      }))

      // Append files
      if (files.aadhaarCard) {
        formDataToSend.append('aadhaarCard', files.aadhaarCard)
      }
      if (files.panCard) {
        formDataToSend.append('panCard', files.panCard)
      }
      if (files.photo) {
        formDataToSend.append('photo', files.photo)
      }

      const url = employee ? `http://localhost:5001/api/employees/${employee._id}` : 'http://localhost:5001/api/employees'
      const method = employee ? 'PUT' : 'POST'

      const token = authService.getToken()
      const response = await fetch(url, {
        method,
        body: formDataToSend,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error response:', errorData)
        throw new Error(errorData.message || errorData.error || `Failed to save employee (Status: ${response.status})`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: employee ? "Employee updated successfully" : "Employee created successfully",
      })
      onSuccess()
    } catch (error) {
      console.error('Form submission error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save employee'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Account Details */}
        <Card>
          <CardHeader>
            <CardTitle>User Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            {!employee && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required={!employee}
                />
              </div>
            )}
            <div>
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select value={formData.bloodGroup} onValueChange={(value) => handleInputChange('bloodGroup', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input
                id="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
              <Input
                id="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={(e) => handleInputChange('aadhaarNumber', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => handleInputChange('panNumber', e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label>Aadhaar Card</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('aadhaarCard', e.target.files?.[0] || null)}
                  />
                  {files.aadhaarCard && (
                    <span className="text-sm text-muted-foreground">{files.aadhaarCard.name}</span>
                  )}
                </div>
              </div>
              <div>
                <Label>PAN Card</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('panCard', e.target.files?.[0] || null)}
                  />
                  {files.panCard && (
                    <span className="text-sm text-muted-foreground">{files.panCard.name}</span>
                  )}
                </div>
              </div>
              <div>
                <Label>Photo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)}
                  />
                  {files.photo && (
                    <span className="text-sm text-muted-foreground">{files.photo.name}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="e.g., Senior Cashier, Junior Cashier"
                required
              />
            </div>
            <div>
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input
                id="dateOfJoining"
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : (employee ? "Update Cashier" : "Create Cashier")}
        </Button>
      </div>
    </form>
  )
}

