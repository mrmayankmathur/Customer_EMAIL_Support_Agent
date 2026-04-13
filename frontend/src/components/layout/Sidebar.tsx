import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  MailOpen,
  ListChecks,
  Settings,
  Bot,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  const routes = [
    { name: "Workflow Monitor", path: "/dashboard", icon: LayoutDashboard },
    { name: "Compose Email", path: "/compose", icon: MailOpen },
    { name: "Email Inbox", path: "/inbox", icon: Inbox },
    { name: "Review Queue", path: "/review", icon: ListChecks },
    { name: "Configuration", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 min-w-64 flex flex-col justify-between border-r border-borderLight dark:border-borderDark bg-lightSidebar dark:bg-darkBg">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="w-10 h-10 bg-accentCyan/20 rounded-xl flex items-center justify-center text-accentCyan shadow-glow-cyan border border-accentCyan/50">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight dark:text-darkText">
              Support Agent
            </h1>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              AI-Powered Email
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 flex flex-col gap-2 mt-4">
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? "bg-accentCyan/10 text-accentCyan border-accentCyan/30 shadow-glow-cyan"
                    : "text-gray-600 dark:text-gray-400 border-transparent hover:bg-white dark:hover:bg-darkCard hover:text-gray-900 dark:hover:text-gray-200"
                }`
              }
            >
              <route.icon size={20} />
              <span className="font-medium">{route.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-6 border-t border-borderLight dark:border-borderDark flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accentGreen opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accentGreen"></span>
          </span>
          System Online
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
