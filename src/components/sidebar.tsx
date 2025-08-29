import { useState, useEffect, useRef } from "react";
import { Menu, X, Home, Settings, Users, BarChart, PieChart, Activity, DollarSign, Briefcase, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Ensure the Window interface is extended
declare global {
  interface Window {
    openMobileSidebar?: () => void;
  }
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultCollapsed?: boolean;
}

export function Sidebar({
  className,
  defaultCollapsed = false,
  ...props
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);

  // Close sidebar when clicking on navigation items on mobile
  const handleNavClick = () => {
    if (window.innerWidth < 768) { // md breakpoint
      closeSidebar();
    }
  };

  // Add escape key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sheetRef.current &&
        !sheetRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.mobile-menu-button')
      ) {
        closeSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Expose the openSidebar function to the parent component
  useEffect(() => {
    // Add the openSidebar function to the window object so it can be called from App.tsx
    window.openMobileSidebar = openSidebar;
    
    return () => {
      // Clean up when component unmounts
      delete window.openMobileSidebar;
    };
  }, []);

  return (
    <>
      {/* Mobile sidebar */}
      <div className="md:hidden">
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            
            {/* Mobile sidebar content */}
            <div 
              ref={sheetRef}
              className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-sm border-r bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-300 ease-in-out data-[state=closed]:translate-x-[-100%] data-[state=open]:translate-x-0 sm:max-w-sm"
              data-state={isOpen ? "open" : "closed"}
            >
              <div className="flex h-full flex-col">
                <div className="flex h-14 items-center border-b border-sidebar-border px-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <BarChart className="h-6 w-6" />
                    <span>Dummy Product</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={closeSidebar}
                  >
                    <X className="h-6 w-6" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
                <nav className="flex-1 overflow-auto py-2">
                  <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight">
                      Overview
                    </h2>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <PieChart className="mr-2 h-4 w-4" />
                        Portfolio
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <Activity className="mr-2 h-4 w-4" />
                        Performance
                      </Button>
                    </div>
                  </div>
                  
                  <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight">
                      Investments
                    </h2>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        Assets
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Markets
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Transactions
                      </Button>
                    </div>
                  </div>
                  
                  <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight">
                      Account
                    </h2>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <Users className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleNavClick}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all",
          collapsed ? "w-16" : "w-64",
          className
        )}
        {...props}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <div
            className={cn(
              "flex items-center gap-2 font-semibold overflow-hidden",
              collapsed && "justify-center"
            )}
          >
            <BarChart className="h-6 w-6 flex-shrink-0" />
            {!collapsed && <span>Dummy Product</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", collapsed && "hidden")}
            onClick={() => setCollapsed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Collapse</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", !collapsed && "hidden")}
            onClick={() => setCollapsed(false)}
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Expand</span>
          </Button>
        </div>
        <nav className="flex-1 overflow-auto py-2">
          <div className="px-3 py-2">
            {!collapsed && (
              <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight">
                Overview
              </h2>
            )}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <Home className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Dashboard</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <PieChart className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Portfolio</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <Activity className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Performance</span>}
              </Button>
            </div>
          </div>
          
          {!collapsed && (
            <h2 className="mb-2 px-7 text-xs font-semibold tracking-tight mt-4">
              Investments
            </h2>
          )}
          <div className="px-3 py-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <Briefcase className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Assets</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <TrendingUp className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Markets</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <DollarSign className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Transactions</span>}
              </Button>
            </div>
          </div>
          
          {!collapsed && (
            <h2 className="mb-2 px-7 text-xs font-semibold tracking-tight mt-4">
              Account
            </h2>
          )}
          <div className="px-3 py-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <Users className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Profile</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <Settings className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>Settings</span>}
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
