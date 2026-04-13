import { useThemeStore } from '../../store';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-lightSidebar dark:hover:bg-darkCard transition-colors border border-borderLight dark:border-borderDark"
      title="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-accentCyan" />
      ) : (
        <Moon className="w-5 h-5 text-accentCyan" />
      )}
    </button>
  );
}
