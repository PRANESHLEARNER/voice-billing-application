"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Store, User, LogOut, Settings, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import Logo from "@/assets/image.png"
import { ThemeToggle } from "@/components/ui/theme-toggle"
interface HeaderProps {
  onTabChange?: (tab: string) => void
}

export function Header({ onTabChange }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (!user) {
    return (
      <header className="bg-[#1e293B] text-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-[#1e293B]  text-primary p-2 rounded-lg">
            <img src={Logo.src} alt="Logo" className="h-10 w-50 bg-[#1e293B]" />
          </div>
            <div>
              <h1 className="text-xl font-bold">SUPERMARKET BILLING SOFTWARE</h1>
              <p className="text-sm text-white/80">Point of Sale System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(currentTime)}</span>
          </div>
          <div>
            <Button variant="ghost" disabled>
              Loading...
            </Button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-[#1e293B] text-white shadow-lg">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-[#1e293B] text-primary p-2 rounded-lg">
            <img src={Logo.src} alt="Logo" className="h-10 w-50 bg-[#1e293B]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">SUPERMARKET BILLING SOFTWARE</h1>
            <p className="text-sm text-white/80">Point of Sale System</p>
          </div>
        </div>

        {/* Center - Current Time */}
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{formatTime(currentTime)}</span>
        </div>

        {/* User Info and Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          <div className="text-right">
            <p className="font-medium">{user.name}</p>
            <div className="flex items-center space-x-2">
              <Badge variant={isAdmin ? "secondary" : "outline"} className="text-white text-xs">
                {user.role.toUpperCase()}
              </Badge>
              <span className="text-xs text-white">ID: {user.employeeId}</span>
            </div>
          </div>

          <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      className="p-2 rounded-full hover:bg-primary-foreground/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-foreground"
      aria-label="User Menu"
    >
      <User className="h-5 w-5 text-white" />
    </button>
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end" className="w-56">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    {user.role !== 'cashier' && (
      <DropdownMenuItem onClick={() => onTabChange?.("profile")}>
        <User className="mr-2 h-4 w-4" />
        Profile
      </DropdownMenuItem>
    )}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={logout} className="text-destructive">
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

        </div>
      </div>
    </header>
  )
}
