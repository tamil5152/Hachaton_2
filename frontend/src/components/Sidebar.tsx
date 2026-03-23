import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Code2, 
  ShieldAlert, 
  Activity, 
  Bell, 
  UserCircle,
  LogOut
} from "lucide-react";
import { clsx } from "clsx";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Team Workspace", path: "/workspace", icon: Users },
  { name: "Code Editor", path: "/editor", icon: Code2 },
  { name: "Security Scanner", path: "/scanner", icon: ShieldAlert },
  { name: "Anomaly Dashboard", path: "/anomaly", icon: Activity },
  { name: "Alerts", path: "/alerts", icon: Bell },
  { name: "Profile", path: "/profile", icon: UserCircle },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-6 flex items-center space-x-3 border-b border-zinc-800">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Code2 className="w-5 h-5 text-black" />
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">HackCollab</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200",
                isActive 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg transition-colors duration-200 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
