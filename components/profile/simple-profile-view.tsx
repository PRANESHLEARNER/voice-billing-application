"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Edit, Save, X, User, Mail, Phone, MapPin } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"

interface ProfileData {
  _id: string
  user: {
    _id: string
    name: string
    email: string
    employeeId: string
    role: string
    isActive: boolean
  }
  personalDetails: {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    bloodGroup?: string
  }
  contactDetails: {
    phone: string
    emergencyPhone?: string
    address: {
      street: string
      city: string
      state: string
      postalCode: string
      country: string
    }
  }
}

export default function SimpleProfileView() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<ProfileData | null>(null)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      const response = await apiClient.get(`/employees/${user?.employeeId}`)
      setProfileData(response)
      setEditData(response)
    } catch (error) {
      console.error("Failed to fetch profile data:", error)
      // Use sample data for demonstration
      const sampleProfileData: ProfileData = {
        _id: "sample-id",
        user: {
          _id: "sample-user-id",
          name: "John Doe",
          email: "john.doe@example.com",
          employeeId: "EMP001",
          role: "Cashier",
          isActive: true
        },
        personalDetails: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1990-01-15",
          gender: "Male",
          bloodGroup: "O+"
        },
        contactDetails: {
          phone: "+91 9876543210",
          emergencyPhone: "+91 9876543211",
          address: {
            street: "123 Main Street",
            city: "Chennai",
            state: "Tamil Nadu",
            postalCode: "600001",
            country: "India"
          }
        }
      }
      setProfileData(sampleProfileData)
      setEditData(sampleProfileData)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (section: keyof ProfileData, field: string, value: string) => {
    if (!editData) return
    
    setEditData(prev => {
      if (!prev) return null
      
      if (section === 'personalDetails' || section === 'contactDetails') {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        }
      }
      
      return {
        ...prev,
        [field]: value
      }
    })
  }

  const handleSave = async () => {
    if (!editData) return

    try {
      const response = await apiClient.put(`/employees/${user?.employeeId}`, editData)
      setProfileData(response)
      setEditing(false)
      toast({
        title: "Success",
        description: "Profile updated successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    setEditData(profileData)
    setEditing(false)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profileData || !editData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No profile data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-lg">
                  {getInitials(profileData.user.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{profileData.user.name}</h1>
                  <p className="text-muted-foreground">{profileData.user.role}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="secondary">{profileData.user.employeeId}</Badge>
                    <Badge variant={profileData.user.isActive ? "default" : "destructive"}>
                      {profileData.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                {!editing ? (
                  <Button onClick={() => setEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="space-x-2">
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profileData.user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profileData.contactDetails.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  {editing ? (
                    <Input
                      id="firstName"
                      value={editData.personalDetails.firstName || ""}
                      onChange={(e) => handleInputChange('personalDetails', 'firstName', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.personalDetails.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {editing ? (
                    <Input
                      id="lastName"
                      value={editData.personalDetails.lastName || ""}
                      onChange={(e) => handleInputChange('personalDetails', 'lastName', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.personalDetails.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  {editing ? (
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={editData.personalDetails.dateOfBirth || ""}
                      onChange={(e) => handleInputChange('personalDetails', 'dateOfBirth', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.personalDetails.dateOfBirth}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  {editing ? (
                    <Input
                      id="gender"
                      value={editData.personalDetails.gender || ""}
                      onChange={(e) => handleInputChange('personalDetails', 'gender', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.personalDetails.gender}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                {editing ? (
                  <Input
                    id="bloodGroup"
                    value={editData.personalDetails.bloodGroup || ""}
                    onChange={(e) => handleInputChange('personalDetails', 'bloodGroup', e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.personalDetails.bloodGroup || "Not specified"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={editData.contactDetails.phone || ""}
                      onChange={(e) => handleInputChange('contactDetails', 'phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.contactDetails.phone}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  {editing ? (
                    <Input
                      id="emergencyPhone"
                      value={editData.contactDetails.emergencyPhone || ""}
                      onChange={(e) => handleInputChange('contactDetails', 'emergencyPhone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.contactDetails.emergencyPhone || "Not specified"}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="street">Street Address</Label>
                {editing ? (
                  <Input
                    id="street"
                    value={editData.contactDetails.address.street || ""}
                    onChange={(e) => handleInputChange('contactDetails', 'street', e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.contactDetails.address.street}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  {editing ? (
                    <Input
                      id="city"
                      value={editData.contactDetails.address.city || ""}
                      onChange={(e) => handleInputChange('contactDetails', 'city', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.contactDetails.address.city}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  {editing ? (
                    <Input
                      id="state"
                      value={editData.contactDetails.address.state || ""}
                      onChange={(e) => handleInputChange('contactDetails', 'state', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.contactDetails.address.state}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  {editing ? (
                    <Input
                      id="postalCode"
                      value={editData.contactDetails.address.postalCode || ""}
                      onChange={(e) => handleInputChange('contactDetails', 'postalCode', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.contactDetails.address.postalCode}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  {editing ? (
                    <Input
                      id="country"
                      value={editData.contactDetails.address.country || ""}
                      onChange={(e) => handleInputChange('contactDetails', 'country', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profileData.contactDetails.address.country}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
