import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Users, GraduationCap, Shield, Mic, Briefcase, MessageSquare, User as UserIcon, LayoutDashboard, LogOut, ShieldCheck, Gamepad2, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useSiteSettings } from "@/contexts/site-settings";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, search: undefined },
  { to: "/dashboard", label: "Players", icon: Users, search: { section: "players" as const } },
  { to: "/dashboard", label: "Coaches", icon: GraduationCap, search: { section: "coaches" as const } },
  { to: "/dashboard", label: "Teams", icon: Shield, search: { section: "teams" as const } },
  { to: "/dashboard", label: "Casters", icon: Mic, search: { section: "casters" as const } },
  { to: "/dashboard", label: "Jobs", icon: Briefcase, search: { section: "jobs" as const } },
] as const;

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, signOut } = useAuth();
  const { siteName, logoUrl } = useSiteSettings();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as { section?: string } });

  return (
    <>
      <div className="p-5 flex items-center gap-2 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center overflow-hidden">
          {logoUrl
            ? <img src={logoUrl} alt={siteName} className="w-full h-full object-cover" />
            : <Gamepad2 className="w-5 h-5 text-primary-foreground" />}
        </div>
        <span className="text-xl font-bold tracking-tight text-gradient uppercase">{siteName}</span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Browse</div>
        {NAV.map((item) => {
          const isDashboard = path === "/dashboard";
          const active =
            isDashboard &&
            ((item.search === undefined && !search.section) ||
              (item.search && item.search.section === search.section));
          return (
            <Link
              key={item.label}
              to={item.to}
              search={item.search as never}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Personal</div>
        <Link to="/chat" onClick={onNavigate} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          path.startsWith("/chat") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}>
          <MessageSquare className="w-4 h-4" /> Messages
        </Link>
        {user && (
          <Link to="/profile/$userId" params={{ userId: user.id }} onClick={onNavigate} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            path.startsWith("/profile") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}>
            <UserIcon className="w-4 h-4" /> My Profile
          </Link>
        )}
        {isAdmin && (
          <Link to="/admin" onClick={onNavigate} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            path.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-primary/80 hover:bg-primary/10")}>
            <ShieldCheck className="w-4 h-4" /> Admin Panel
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => { onNavigate?.(); signOut(); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <NavBody />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 border-b border-sidebar-border bg-sidebar/95 backdrop-blur">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button aria-label="Open menu" className="p-2 -ml-2 rounded-lg hover:bg-sidebar-accent/60 text-sidebar-foreground">
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col [&>button]:hidden">
          <NavBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold tracking-tight text-gradient">VALORA</span>
      </div>
    </div>
  );
}
