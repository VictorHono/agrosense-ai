import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Leaf, Bug, FlaskConical, Globe, 
  Bell, BarChart3, Settings, LogOut, Menu, X, ChevronRight,
  Brain, FileText, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const sidebarItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { path: '/admin/crops', icon: Leaf, label: 'Cultures' },
  { path: '/admin/diseases', icon: Bug, label: 'Maladies & Ravageurs' },
  { path: '/admin/treatments', icon: FlaskConical, label: 'Traitements' },
  { path: '/admin/ai', icon: Brain, label: 'Supervision IA' },
  { path: '/admin/languages', icon: Globe, label: 'Langues' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analyses' },
  { path: '/admin/content', icon: FileText, label: 'Contenus' },
  { path: '/admin/database', icon: Database, label: 'Base de données' },
  { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">🌱</span>
          </div>
          <span className="font-bold text-sidebar-foreground">AgroCamer Admin</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-sidebar-foreground"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 lg:z-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">🌱</span>
            </div>
            <span className="font-bold text-sidebar-foreground">AgroCamer</span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {sidebarItems.map(({ path, icon: Icon, label, exact }) => {
              const isActive = exact 
                ? location.pathname === path 
                : location.pathname.startsWith(path);
              
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-sidebar-border">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Retour à l'app</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
