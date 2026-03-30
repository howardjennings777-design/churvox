import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  MoreHorizontal,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FileText,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_phase1-launch/artifacts/j84zpsqt_1000049586.png";

// Main navigation items
const mainNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Clients", href: "/clients", icon: Users },
];

// More menu items
const moreMenuItems = [
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: DollarSign },
  { label: "Plans", href: "/plans", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="churvox-logo-container" data-testid="logo-link">
              <img src={LOGO_URL} alt="Churvox" className="churvox-logo" />
              <span className="churvox-brand-text hidden sm:block">Churvox</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive(item.href)
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-white hover:bg-secondary/50"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              
              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium",
                      moreMenuItems.some(item => isActive(item.href))
                        ? "text-primary"
                        : "text-muted-foreground hover:text-white"
                    )}
                    data-testid="nav-more"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    More
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  {moreMenuItems.map((item) => (
                    <DropdownMenuItem 
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "cursor-pointer",
                        isActive(item.href) && "text-primary"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-white"
                    data-testid="user-menu-trigger"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                      <span className="text-sm font-semibold text-primary">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
                    <ChevronDown className="h-4 w-4 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      <p className="text-xs leading-none text-primary capitalize mt-1">
                        {user?.plan} Plan {user?.role === "admin" && "(Admin)"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem 
                    onClick={() => navigate("/settings")}
                    className="cursor-pointer"
                    data-testid="menu-settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-button"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Slide Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl">
            <nav className="px-4 py-3 space-y-1">
              {[...mainNavItems, ...moreMenuItems].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-white hover:bg-secondary"
                  )}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border mobile-nav z-40">
        <div className="flex items-center justify-around py-2">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors relative",
                isActive(item.href)
                  ? "text-primary bottom-nav-active"
                  : "text-muted-foreground"
              )}
              data-testid={`bottom-nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          {/* More button for mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                  moreMenuItems.some(item => isActive(item.href))
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                data-testid="bottom-nav-more"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span>More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 bg-card border-border mb-2">
              {moreMenuItems.map((item) => (
                <DropdownMenuItem 
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "cursor-pointer",
                    isActive(item.href) && "text-primary"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-20" />
    </div>
  );
}
