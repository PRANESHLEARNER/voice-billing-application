"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Store, 
  Printer, 
  Database, 
  Download, 
  Upload, 
  Moon, 
  Sun,
  User,
  Palette,
  Bell,
  Shield
} from "lucide-react"

interface SystemSettings {
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail: string
  gstNumber: string
  currency: string
  taxRate: number
  enablePrint: boolean
  autoBackup: boolean
  backupInterval: number
  lowStockThreshold: number
  theme: 'light' | 'dark' | 'system'
  printerType: 'thermal' | 'laser' | 'inkjet'
  paperSize: '80mm' | '58mm' | 'a4'
  printHeader: boolean
  printFooter: boolean
  notifications: boolean
  soundAlerts: boolean
  autoLogout: boolean
  autoLogoutMinutes: number
  language: string
  dateFormat: string
  timeZone: string
}

export function SettingsManagement() {
  const [settings, setSettings] = useState<SystemSettings>({
    storeName: "Supermarket Billing System",
    storeAddress: "",
    storePhone: "",
    storeEmail: "",
    gstNumber: "",
    currency: "INR",
    taxRate: 18,
    enablePrint: true,
    autoBackup: true,
    backupInterval: 24,
    lowStockThreshold: 10,
    theme: 'system',
    printerType: 'thermal',
    paperSize: '80mm',
    printHeader: true,
    printFooter: true,
    notifications: true,
    soundAlerts: true,
    autoLogout: false,
    autoLogoutMinutes: 30,
    language: 'en',
    dateFormat: 'dd/MM/yyyy',
    timeZone: 'Asia/Kolkata'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      // Load settings from localStorage
      const savedSettings = localStorage.getItem('systemSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
      setMessage("")
    } catch (error) {
      console.error('Failed to load settings:', error)
      setMessage("Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      // Save settings to localStorage
      localStorage.setItem('systemSettings', JSON.stringify(settings))
      
      // Apply theme settings
      applyThemeSettings(settings.theme)
      
      setMessage("Settings saved successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Apply theme immediately when theme is changed
    if (field === 'theme') {
      applyThemeSettings(value as 'light' | 'dark' | 'system')
    }
  }

  const applyThemeSettings = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const exportSettings = () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `supermarket-settings-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setMessage("Settings exported successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("Failed to export settings")
    }
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings(prev => ({ ...prev, ...imported }))
        setMessage("Settings imported successfully!")
        setTimeout(() => setMessage(""), 3000)
      } catch (error) {
        setMessage("Failed to import settings: Invalid file format")
      }
    }
    reader.readAsText(file)
    // Reset file input
    event.target.value = ''
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      localStorage.removeItem('systemSettings')
      loadSettings()
      setMessage("Settings reset to defaults!")
      setTimeout(() => setMessage(""), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure your supermarket billing system preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSettings}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <label htmlFor="import-settings">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </span>
            </Button>
          </label>
          <input
            id="import-settings"
            type="file"
            accept=".json"
            className="hidden"
            onChange={importSettings}
          />
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.includes("success") ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="printer">Printer</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Store Information
                </CardTitle>
                <CardDescription>
                  Basic information about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={settings.storeName}
                    onChange={(e) => handleInputChange("storeName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Address</Label>
                  <Input
                    id="storeAddress"
                    value={settings.storeAddress}
                    onChange={(e) => handleInputChange("storeAddress", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Phone</Label>
                    <Input
                      id="storePhone"
                      value={settings.storePhone}
                      onChange={(e) => handleInputChange("storePhone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      value={settings.storeEmail}
                      onChange={(e) => handleInputChange("storeEmail", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={settings.gstNumber}
                    onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Inventory Settings
                </CardTitle>
                <CardDescription>
                  Manage inventory and stock preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    value={settings.lowStockThreshold}
                    onChange={(e) => handleInputChange("lowStockThreshold", Number(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Alert when stock falls below this quantity
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup system data
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => handleInputChange("autoBackup", checked)}
                  />
                </div>
                {settings.autoBackup && (
                  <div className="space-y-2">
                    <Label htmlFor="backupInterval">Backup Interval (hours)</Label>
                    <Input
                      id="backupInterval"
                      type="number"
                      value={settings.backupInterval}
                      onChange={(e) => handleInputChange("backupInterval", Number(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Billing Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Billing Settings
                </CardTitle>
                <CardDescription>
                  Configure billing and tax preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={settings.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      value={settings.taxRate}
                      onChange={(e) => handleInputChange("taxRate", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Printing</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow bill printing functionality
                    </p>
                  </div>
                  <Switch
                    checked={settings.enablePrint}
                    onCheckedChange={(checked) => handleInputChange("enablePrint", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Regional Settings
                </CardTitle>
                <CardDescription>
                  Configure regional and language preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={settings.language} onValueChange={(value) => handleInputChange("language", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                      <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={settings.dateFormat} onValueChange={(value) => handleInputChange("dateFormat", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Select value={settings.timeZone} onValueChange={(value) => handleInputChange("timeZone", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="printer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Printer Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Printer Configuration
                </CardTitle>
                <CardDescription>
                  Configure printer settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="printerType">Printer Type</Label>
                  <Select value={settings.printerType} onValueChange={(value: 'thermal' | 'laser' | 'inkjet') => handleInputChange("printerType", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">Thermal Printer</SelectItem>
                      <SelectItem value="laser">Laser Printer</SelectItem>
                      <SelectItem value="inkjet">Inkjet Printer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paperSize">Paper Size</Label>
                  <Select value={settings.paperSize} onValueChange={(value: '80mm' | '58mm' | 'a4') => handleInputChange("paperSize", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm (Thermal)</SelectItem>
                      <SelectItem value="58mm">58mm (Thermal)</SelectItem>
                      <SelectItem value="a4">A4 (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Print Header</Label>
                    <p className="text-sm text-muted-foreground">
                      Include store header in prints
                    </p>
                  </div>
                  <Switch
                    checked={settings.printHeader}
                    onCheckedChange={(checked) => handleInputChange("printHeader", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Print Footer</Label>
                    <p className="text-sm text-muted-foreground">
                      Include footer in prints
                    </p>
                  </div>
                  <Switch
                    checked={settings.printFooter}
                    onCheckedChange={(checked) => handleInputChange("printFooter", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme Settings
                </CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={settings.theme} onValueChange={(value: 'light' | 'dark' | 'system') => handleInputChange("theme", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show system notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => handleInputChange("notifications", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound for alerts
                    </p>
                  </div>
                  <Switch
                    checked={settings.soundAlerts}
                    onCheckedChange={(checked) => handleInputChange("soundAlerts", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security and session preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Logout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically logout after inactivity
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoLogout}
                    onCheckedChange={(checked) => handleInputChange("autoLogout", checked)}
                  />
                </div>
                {settings.autoLogout && (
                  <div className="space-y-2">
                    <Label htmlFor="autoLogoutMinutes">Auto Logout After (minutes)</Label>
                    <Input
                      id="autoLogoutMinutes"
                      type="number"
                      value={settings.autoLogoutMinutes}
                      onChange={(e) => handleInputChange("autoLogoutMinutes", Number(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
