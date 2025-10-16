import { Home, Video, Share2, Settings, Upload } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: "projects", label: "Projects", icon: Home },
    { id: "editor", label: "Video Editor", icon: Video },
    { id: "social", label: "Social Media", icon: Share2 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

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

        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-black text-white hover:bg-black/90 transition-colors">
            <Upload size={20} />
            <span>Upload Photos</span>
          </button>
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
                <span className="text-xs truncate w-full text-center">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl tracking-tight">zencourt</h1>
          <button className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-sm">
            <Upload size={16} />
            <span className="hidden xs:inline">Upload</span>
          </button>
        </div>
      </div>
    </>
  );
}
