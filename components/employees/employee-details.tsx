"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Phone, MapPin, Calendar, User, Briefcase, CreditCard, FileText, Download } from "lucide-react"
import { authService } from "@/lib/auth"
import { Employee } from "@/types/employee"

interface EmployeeDetailsProps {
  employee: Employee
  onClose: () => void
}

export function EmployeeDetails({ employee, onClose }: EmployeeDetailsProps) {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loadingLeaves, setLoadingLeaves] = useState(true)

  useEffect(() => {
    fetchEmployeeLeaves()
  }, [employee._id])

  const fetchEmployeeLeaves = async () => {
    try {
      const token = authService.getToken()
      const response = await fetch(`http://localhost:5001/api/employees/${employee._id}/leaves`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLeaves(data)
      }
    } catch (error) {
      console.error("Failed to fetch employee leaves:", error)
    } finally {
      setLoadingLeaves(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const downloadFile = (file: any, filename: string) => {
    if (file && file.path) {
      const link = document.createElement('a')
      link.href = `http://localhost:5001/api/files/download?path=${encodeURIComponent(file.path)}&filename=${encodeURIComponent(filename)}`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {employee.identification.photo ? (
            <img
              src={`http://localhost:5001/api/files/download?path=${encodeURIComponent(employee.identification.photo.path)}&filename=${encodeURIComponent(employee.identification.photo.filename)}`}
              alt={employee.user.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{employee.user.name}</h2>
            <p className="text-muted-foreground">{employee.user.employeeId}</p>
            <Badge className={getStatusColor(employee.status)}>
              {employee.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </div>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">First Name</p>
                    <p className="text-lg">{employee.personalDetails.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                    <p className="text-lg">{employee.personalDetails.lastName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="text-lg">{formatDate(employee.personalDetails.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p className="text-lg capitalize">{employee.personalDetails.gender}</p>
                </div>
                {employee.personalDetails.bloodGroup && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                    <p className="text-lg">{employee.personalDetails.bloodGroup}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg">{employee.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-lg">{employee.contactDetails.phone}</p>
                  </div>
                </div>
                {employee.contactDetails.emergencyPhone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Emergency Phone</p>
                    <p className="text-lg">{employee.contactDetails.emergencyPhone}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-lg">
                      {employee.contactDetails.address.street},<br />
                      {employee.contactDetails.address.city}, {employee.contactDetails.address.state} {employee.contactDetails.address.postalCode}<br />
                      {employee.contactDetails.address.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-lg capitalize">{employee.employmentDetails.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Position</p>
                  <p className="text-lg">{employee.employmentDetails.position}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Joining</p>
                    <p className="text-lg">{formatDate(employee.employmentDetails.dateOfJoining)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-lg capitalize">{employee.user.role}</p>
                </div>
              </CardContent>
            </Card>

          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{employee.leaveBalance?.casual || 0}</p>
                  <p className="text-sm text-muted-foreground">Casual Leaves</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{employee.leaveBalance?.sick || 0}</p>
                  <p className="text-sm text-muted-foreground">Sick Leaves</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{employee.leaveBalance?.earned || 0}</p>
                  <p className="text-sm text-muted-foreground">Earned Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Identification Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aadhaar Number</p>
                <p className="text-lg">{employee.identification.aadhaarNumber}</p>
              </div>
              {employee.identification.panNumber && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">PAN Number</p>
                  <p className="text-lg">{employee.identification.panNumber}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employee.identification.aadhaarCard && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Aadhaar Card</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(employee.identification.aadhaarCard!, employee.identification.aadhaarCard!.filename)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {formatDate(employee.identification.aadhaarCard!.uploadedAt)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {employee.identification.panCard && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">PAN Card</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(employee.identification.panCard!, employee.identification.panCard!.filename)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {formatDate(employee.identification.panCard!.uploadedAt)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {employee.identification.photo && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Photo</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(employee.identification.photo!, employee.identification.photo!.filename)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {formatDate(employee.identification.photo!.uploadedAt)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaves ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : leaves.length > 0 ? (
                <div className="space-y-4">
                  {leaves.map((leave) => (
                    <div key={leave._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">{leave.totalDays} days</p>
                      </div>
                      <Badge className={
                        leave.status === "approved" ? "bg-green-100 text-green-800" :
                        leave.status === "rejected" ? "bg-red-100 text-red-800" :
                        leave.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {leave.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No leave records found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
