'use client';

import { Home, Video, Share2, Settings, Upload, LogOut } from "lucide-react";
import { useUser } from "@stackframe/stack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const user = useUser();

  const navItems = [
    { id: "projects", label: "Projects", icon: Home }
    // { id: "editor", label: "Video Editor", icon: Video },
    // { id: "social", label: "Social Media", icon: Share2 },
    // { id: "settings", label: "Settings", icon: Settings },
  ];

  const getUserInitials = () => {
    if (!user?.displayName) return "U";
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await user?.signOut();
    window.location.href = '/auth';
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 h-screen bg-white border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl tracking-tight">zencourt</h1>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  activeTab === item.id
                    ? "bg-black text-white"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-border">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.primaryEmail}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log out
              </Button>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
        <nav className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-0 flex-1 transition-colors ${
                  activeTab === item.id
                    ? "bg-black text-white"
                    : "text-foreground"
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="text-xs truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl tracking-tight">zencourt</h1>
          <div className="flex items-center gap-2">
            {user && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
