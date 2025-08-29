import { Bell, User, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  onMobileMenuClick?: () => void;
}

export function Header({ 
  className, 
  title = "Dashboard",
  onMobileMenuClick,
  ...props 
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center gap-2">
        {onMobileMenuClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mobile-menu-button mr-2" 
            onClick={onMobileMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
          <span className="sr-only">Profile</span>
        </Button>
      </div>
    </header>
  )
}
