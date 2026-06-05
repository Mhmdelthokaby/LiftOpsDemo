"use client"
import {
  LayoutDashboard,
  FolderKanban,
  Wrench,
  Calendar,
  AlertCircle,
  Package,
  DollarSign,
  Settings,
  ChevronUp,
  Users,
  UserCog,
} from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"
import { logout } from "@/lib/auth"
import {
  canManageTechnicians,
  canViewClients,
  canViewProjects,
  canViewInstallation,
  canViewInventory,
  canViewMaintenance,
  canViewEmergency,
  canViewFinance,
  canViewSettings,
  isManager,
  isTechnician,
  canViewTechnicianVisits
} from "@/lib/user"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems: Array<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  canAccess: () => boolean;
}> = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      canAccess: () => !isTechnician(), // Technicians cannot see dashboard
    },
    {
      title: "My Visits",
      icon: Calendar,
      href: "/technician/visits",
      canAccess: canViewTechnicianVisits, // Only technicians can see this
    },
    {
      title: "Clients",
      icon: Users,
      href: "/clients",
      canAccess: canViewClients,
    },
    {
      title: "Projects",
      icon: FolderKanban,
      href: "/projects",
      canAccess: canViewProjects,
    },
    {
      title: "Installation Pipeline",
      icon: Wrench,
      href: "/installation",
      canAccess: canViewInstallation,
    },
    {
      title: "Inventory",
      icon: Package,
      href: "/inventory",
      canAccess: canViewInventory,
    },
    {
      title: "Technicians",
      icon: UserCog,
      href: "/technicians",
      canAccess: canManageTechnicians,
    },
    {
      title: "Maintenance",
      icon: Calendar,
      href: "/maintenance?view=projects",
      canAccess: canViewMaintenance,
    },
    {
      title: "Emergency Tickets",
      icon: AlertCircle,
      href: "/emergency",
      canAccess: canViewEmergency,
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
      canAccess: canViewSettings,
    },
  ]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<{ name: string, email: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image 
              src="/icon.svg" 
              alt="LiftOps" 
              width={32} 
              height={32} 
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">LiftOps</span>
            <span className="text-xs text-muted-foreground">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                // Filter menu items based on user roles
                if (!item.canAccess()) {
                  return null;
                }
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={
                      pathname === item.href || 
                      (item.href === "/technicians" && pathname?.startsWith("/technicians")) || 
                      (item.href === "/maintenance?view=projects" && pathname === "/maintenance" && searchParams?.get("view") === "projects")
                    }>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12" id="sidebar-user-menu-button">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/icon.svg" />
                    <AvatarFallback>{user?.name ? user.name.substring(0, 2).toUpperCase() : "AD"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "Admin User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || "admin@elevation.com"}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-(--radix-popper-anchor-width)">
                <DropdownMenuItem onClick={() => {
                  logout();
                }}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
