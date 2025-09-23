"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  User, Mail, Phone, MapPin, Calendar, Building, Key, Edit, Save, X, 
  Camera, FileText, Download, Upload, Shield, Clock, DollarSign, 
  Briefcase, Award, Activity, Settings, RefreshCw
} from "lucide-react"
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
  identification: {
    aadhaarNumber: string
    panNumber?: string
    aadhaarCard?: {
      filename: string
      path: string
      uploadedAt: string
    }
    panCard?: {
      filename: string
      path: string
      uploadedAt: string
    }
    photo?: {
      filename: string
      path: string
      uploadedAt: string
    }
  }
  documents?: {
    profilePhoto?: string
    aadhaarCard?: string
    panCard?: string
  }
  employmentDetails: {
    department: string
    position: string
    dateOfJoining: string
    salary: number
    bankAccount?: {
      accountNumber: string
      bankName: string
      ifscCode: string
      branchName: string
    }
  }
  status: string
  leaveBalance?: {
    casual: number
    sick: number
    earned: number
  }
  createdAt: string
  updatedAt: string
}

export function ProfileView() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<ProfileData | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [uploading, setUploading] = useState(false)
  const [activeDocumentTab, setActiveDocumentTab] = useState("photo")

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Check if user is admin or has employeeId
      if (user?.role === "admin") {
        // For admin users, create admin profile data
        const adminProfileData: ProfileData = {
          _id: user.id,
          user: {
            _id: user.id,
            name: user.name,
            email: user.email,
            employeeId: "ADMIN",
            role: "admin",
            isActive: true
          },
          personalDetails: {
            firstName: user.name.split(' ')[0] || "Admin",
            lastName: user.name.split(' ')[1] || "User",
            dateOfBirth: "",
            gender: "",
            bloodGroup: ""
          },
          contactDetails: {
            phone: "",
            emergencyPhone: "",
            address: {
              street: "",
              city: "",
              state: "",
              postalCode: "",
              country: ""
            }
          },
          identification: {
            aadhaarNumber: "",
            panNumber: ""
          },
          employmentDetails: {
            department: "Administration",
            position: "Administrator",
            dateOfJoining: new Date().toISOString().split('T')[0],
            salary: 0,
            bankAccount: {
              accountNumber: "",
              bankName: "",
              ifscCode: "",
              branchName: ""
            }
          },
          status: "active",
          leaveBalance: {
            casual: 0,
            sick: 0,
            earned: 0
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setProfileData(adminProfileData)
        setEditData(adminProfileData)
      } else if (user?.employeeId) {
        // For regular employees, fetch from API
        const response = await apiClient.get(`/employees/${user.employeeId}`)
        setProfileData(response)
        setEditData(response)
      } else {
        // No employeeId available
        setProfileData(null)
        setEditData(null)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profile data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editData) return

    try {
      if (user?.role === "admin") {
        // For admin users, just update the local state
        setProfileData(editData)
        setEditing(false)
        toast({
          title: "Success",
          description: "Admin profile updated successfully"
        })
      } else if (user?.employeeId) {
        // For regular employees, update via API
        const response = await apiClient.put(`/employees/${user.employeeId}`, editData)
        setProfileData(response)
        setEditing(false)
        toast({
          title: "Success",
          description: "Profile updated successfully"
        })
      }
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

  const handleInputChange = (section: keyof ProfileData, field: string, value: string | number) => {
    if (!editData) return

    setEditData(prev => {
      if (!prev) return prev
      
      // Handle nested address fields
      if (section === "contactDetails" && ["street", "city", "state", "postalCode", "country"].includes(field)) {
        return {
          ...prev,
          contactDetails: {
            ...prev.contactDetails,
            address: {
              ...prev.contactDetails.address,
              [field]: value
            }
          }
        }
      }
      
      // Handle regular nested fields
      const currentSection = prev[section] as any
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [field]: value
        }
      }
    })
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      })
      return
    }

    try {
      await apiClient.put(`/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      toast({
        title: "Success",
        description: "Password changed successfully"
      })
      
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowPasswordDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive"
      })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)

    try {
      const response = await apiClient.put(`/employees/${user?.employeeId}/upload-document`, formData)
      setProfileData(response)
      setEditData(response)
      toast({
        title: "Success",
        description: `${documentType} uploaded successfully`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to upload ${documentType}`,
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', 'profilePhoto')

    try {
      const response = await apiClient.put(`/employees/${user?.employeeId}/upload-document`, formData)
      setProfileData(response)
      setEditData(response)
      toast({
        title: "Success",
        description: "Profile photo uploaded successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload profile photo",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const calculateServicePeriod = () => {
    if (!profileData?.employmentDetails.dateOfJoining) return "0 days"
    
    const joinDate = new Date(profileData.employmentDetails.dateOfJoining)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - joinDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    const days = diffDays % 30
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ${days} day${days > 1 ? 's' : ''}`
    } else {
      return `${days} day${days > 1 ? 's' : ''}`
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No profile data available</p>
          <p className="text-sm text-muted-foreground">Please contact your administrator</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProfileContent 
        profileData={profileData} 
        editing={editing} 
        setEditing={setEditing} 
        handleSave={handleSave} 
        handleCancel={handleCancel} 
        showPasswordDialog={showPasswordDialog} 
        setShowPasswordDialog={setShowPasswordDialog} 
        passwordData={passwordData} 
        setPasswordData={setPasswordData} 
        handlePasswordChange={handlePasswordChange} 
        activeDocumentTab={activeDocumentTab} 
        setActiveDocumentTab={setActiveDocumentTab} 
        editData={editData} 
        handleInputChange={handleInputChange} 
        uploading={uploading} 
        setUploading={setUploading} 
        handleFileUpload={handleFileUpload} 
        getInitials={getInitials}
        calculateServicePeriod={calculateServicePeriod}
      />
    </div>
  )
}

interface ProfileContentProps {
  profileData: ProfileData
  editing: boolean
  setEditing: (editing: boolean) => void
  handleSave: () => void
  handleCancel: () => void
  showPasswordDialog: boolean
  setShowPasswordDialog: (show: boolean) => void
  passwordData: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }
  setPasswordData: (data: any) => void
  handlePasswordChange: () => void
  activeDocumentTab: string
  setActiveDocumentTab: (tab: string) => void
  editData: ProfileData | null
  handleInputChange: (section: keyof ProfileData, field: string, value: string | number) => void
  uploading: boolean
  setUploading: (uploading: boolean) => void
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => void
  getInitials: (name: string) => string
  calculateServicePeriod: () => string
}

function ProfileContent({ 
  profileData, 
  editing, 
  setEditing, 
  handleSave, 
  handleCancel, 
  showPasswordDialog, 
  setShowPasswordDialog, 
  passwordData, 
  setPasswordData, 
  handlePasswordChange, 
  activeDocumentTab, 
  setActiveDocumentTab, 
  editData, 
  handleInputChange, 
  uploading, 
  setUploading, 
  handleFileUpload,
  getInitials,
  calculateServicePeriod 
}: ProfileContentProps) {
  return (
    <>
      {/* Profile Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileData.identification.photo?.path} alt={profileData.user.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(profileData.user.name)}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={() => setActiveDocumentTab("photo")}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{profileData.user.name}</h1>
                  <p className="text-muted-foreground">{profileData.employmentDetails.position}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="secondary">{profileData.user.employeeId}</Badge>
                    <Badge variant={profileData.user.isActive ? "default" : "destructive"}>
                      {profileData.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{profileData.user.role}</Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and a new password to update your credentials.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData((prev: any) => ({ ...prev, currentPassword: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData((prev: any) => ({ ...prev, newPassword: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData((prev: any) => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handlePasswordChange}>
                            Change Password
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profileData.user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profileData.contactDetails.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profileData.employmentDetails.department}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{calculateServicePeriod()}</span>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  {editing ? (
                    <Input
                      id="firstName"
                      value={editData?.personalDetails.firstName || ""}
                      onChange={(e) => handleInputChange("personalDetails", "firstName", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">{profileData.personalDetails.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {editing ? (
                    <Input
                      id="lastName"
                      value={editData?.personalDetails.lastName || ""}
                      onChange={(e) => handleInputChange("personalDetails", "lastName", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">{profileData.personalDetails.lastName}</p>
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
                      value={editData?.personalDetails.dateOfBirth || ""}
                      onChange={(e) => handleInputChange("personalDetails", "dateOfBirth", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{new Date(profileData.personalDetails.dateOfBirth).toLocaleDateString()}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  {editing ? (
                    <Input
                      id="gender"
                      value={editData?.personalDetails.gender || ""}
                      onChange={(e) => handleInputChange("personalDetails", "gender", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.personalDetails.gender}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                {editing ? (
                  <Input
                    id="bloodGroup"
                    value={editData?.personalDetails.bloodGroup || ""}
                    onChange={(e) => handleInputChange("personalDetails", "bloodGroup", e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm">{profileData.personalDetails.bloodGroup || "Not specified"}</p>
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
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={editData?.contactDetails.phone || ""}
                      onChange={(e) => handleInputChange("contactDetails", "phone", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">{profileData.contactDetails.phone}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  {editing ? (
                    <Input
                      id="emergencyPhone"
                      value={editData?.contactDetails.emergencyPhone || ""}
                      onChange={(e) => handleInputChange("contactDetails", "emergencyPhone", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.emergencyPhone || "Not specified"}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="street">Street Address</Label>
                {editing ? (
                  <Input
                    id="street"
                    value={editData?.contactDetails.address.street || ""}
                    onChange={(e) => handleInputChange("contactDetails", "street", e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm">{profileData.contactDetails.address.street}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  {editing ? (
                    <Input
                      id="city"
                      value={editData?.contactDetails.address.city || ""}
                      onChange={(e) => handleInputChange("contactDetails", "city", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.city}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  {editing ? (
                    <Input
                      id="state"
                      value={editData?.contactDetails.address.state || ""}
                      onChange={(e) => handleInputChange("contactDetails", "state", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.state}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  {editing ? (
                    <Input
                      id="postalCode"
                      value={editData?.contactDetails.address.postalCode || ""}
                      onChange={(e) => handleInputChange("contactDetails", "postalCode", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.postalCode}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  {editing ? (
                    <Input
                      id="country"
                      value={editData?.contactDetails.address.country || ""}
                      onChange={(e) => handleInputChange("contactDetails", "country", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.country}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium">Change Password</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update your password to keep your account secure
                  </p>
                  <Button 
                    onClick={() => setShowPasswordDialog(true)}
                    className="w-full"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profile
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={profileData?.documents?.profilePhoto} alt={profileData?.user?.name} />
                    <AvatarFallback>
                      {profileData?.user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Profile Photo</DialogTitle>
                    <DialogDescription>
                      Upload a new profile photo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profileData?.documents?.profilePhoto} alt={profileData?.user?.name} />
                        <AvatarFallback className="text-lg">
                          {profileData?.user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <Label htmlFor="photo">Choose Photo</Label>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handlePhotoUpload} disabled={uploading}>
                        {uploading ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profileData.user.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profileData.contactDetails.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profileData.employmentDetails.department}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{calculateServicePeriod()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  {editing ? (
                    <Input
                      id="firstName"
                      value={editData?.personalDetails.firstName || ""}
                      onChange={(e) => handleInputChange("personalDetails", "firstName", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">{profileData.personalDetails.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {editing ? (
                    <Input
                      id="lastName"
                      value={editData?.personalDetails.lastName || ""}
                      onChange={(e) => handleInputChange("personalDetails", "lastName", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">{profileData.personalDetails.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                {editing ? (
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={editData?.personalDetails.dateOfBirth || ""}
                    onChange={(e) => handleInputChange("personalDetails", "dateOfBirth", e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm">{profileData.personalDetails.dateOfBirth || "Not specified"}</p>
                )}
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                {editing ? (
                  <select
                    id="gender"
                    className="w-full p-2 border rounded-md"
                    value={editData?.personalDetails.gender || ""}
                    onChange={(e) => handleInputChange("personalDetails", "gender", e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <p className="mt-1 text-sm">{profileData.personalDetails.gender || "Not specified"}</p>
                )}
              </div>
              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                {editing ? (
                  <select
                    id="bloodGroup"
                    className="w-full p-2 border rounded-md"
                    value={editData?.personalDetails.bloodGroup || ""}
                    onChange={(e) => handleInputChange("personalDetails", "bloodGroup", e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p className="mt-1 text-sm">{profileData.personalDetails.bloodGroup || "Not specified"}</p>
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
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {editing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={editData?.contactDetails.phone || ""}
                    onChange={(e) => handleInputChange("contactDetails", "phone", e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm">{profileData.contactDetails.phone || "Not specified"}</p>
                )}
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                {editing ? (
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={editData?.contactDetails.emergencyPhone || ""}
                    onChange={(e) => handleInputChange("contactDetails", "emergencyPhone", e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm">{profileData.contactDetails.emergencyPhone || "Not specified"}</p>
                )}
              </div>
              <div>
                <Label htmlFor="street">Street Address</Label>
                {editing ? (
                  <Input
                    id="street"
                    value={editData?.contactDetails.address.street || ""}
                    onChange={(e) => handleInputChange("contactDetails", "street", e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm">{profileData.contactDetails.address.street}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  {editing ? (
                    <Input
                      id="city"
                      value={editData?.contactDetails.address.city || ""}
                      onChange={(e) => handleInputChange("contactDetails", "city", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.city}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  {editing ? (
                    <Input
                      id="state"
                      value={editData?.contactDetails.address.state || ""}
                      onChange={(e) => handleInputChange("contactDetails", "state", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.state}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  {editing ? (
                    <Input
                      id="postalCode"
                      value={editData?.contactDetails.address.postalCode || ""}
                      onChange={(e) => handleInputChange("contactDetails", "postalCode", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.postalCode}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  {editing ? (
                    <Input
                      id="country"
                      value={editData?.contactDetails.address.country || ""}
                      onChange={(e) => handleInputChange("contactDetails", "country", e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{profileData.contactDetails.address.country}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium">Change Password</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update your password to keep your account secure
                  </p>
                  <Button 
                    onClick={() => setShowPasswordDialog(true)}
                    className="w-full"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePasswordChange}>
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
