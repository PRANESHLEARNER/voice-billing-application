"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Package, Users, FileText, BarChart3, Settings, Clock, Menu, X, Tag } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"


interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isSidebarOpen: boolean
  onSidebarToggle: (open: boolean) => void
}

export function Navigation({ activeTab, onTabChange, isSidebarOpen, onSidebarToggle }: NavigationProps) {
  const { user, isAdmin } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigationItems = [
    { id: "billing", label: "Billing", icon: ShoppingCart, roles: ["admin", "cashier"] },
    { id: "products", label: "Products", icon: Package, roles: ["admin"] },
    { id: "bills", label: "Bill History", icon: FileText, roles: ["admin", "cashier"] },
    { id: "shifts", label: "Shifts", icon: Clock, roles: ["admin", "cashier"] },
    { id: "reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
    { id: "discounts", label: "Discounts", icon: Tag, roles: ["admin"] },
    { id: "users", label: "Cashiers", icon: Users, roles: ["admin"] },
    { id: "settings", label: "Settings", icon: Settings, roles: ["admin"] },
  ]

  const userRole = isAdmin ? "admin" : "cashier"
  const availableItems = navigationItems.filter((item) => item.roles.includes(userRole))

  const NavButton = ({ item }: { item: (typeof navigationItems)[0] }) => {
    const Icon = item.icon
    const isActive = activeTab === item.id

    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "justify-start w-full text-white hover:text-white",
          isActive && "bg-secondary text-secondary-foreground"
        )}
        onClick={() => {
          onTabChange(item.id)
          setIsMobileMenuOpen(false) // close on nav click
        }}
      >
        <Icon className="mr-2 h-4 w-4 text-white" />
        {item.label}
        {item.id === "billing" && (
          <Badge variant="outline" className="ml-auto text-white">
            Active
          </Badge>
        )}
      </Button>
    )
  }

  // Close sidebar when pressing Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false)
        onSidebarToggle(false)
      }
    }
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("keydown", handleEsc)
    }
  }, [])

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden bg-card border-b p-4">
        <Button variant="outline" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Menu
        </Button>
      </div>

      {/* Desktop Navigation */}
      <nav className={`hidden lg:block bg-[#1e293B] border-r border-slate-600 min-h-screen transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-4">
            {isSidebarOpen && (
              <h2 className="text-lg font-semibold text-white">Navigation</h2>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onSidebarToggle(!isSidebarOpen)}
              className="ml-auto"
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
          {isSidebarOpen && availableItems.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
          {!isSidebarOpen && (
            <div className="space-y-2">
              {availableItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full justify-center text-white hover:text-white",
                    activeTab === item.id && "bg-secondary text-secondary-foreground"
                  )}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 text-white" />
                </Button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-64 bg-[#1e293B] border-r border-slate-600 shadow-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Navigation</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-4 w-4 " />
                </Button>
              </div>
              {availableItems.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
                          