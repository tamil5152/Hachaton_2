import { Search, Bell, User, FileCode2, LayoutDashboard, ShieldCheck, Users, Settings, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, onSnapshot } from "firebase/firestore";

export default function Topbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  const appRoutes = [
    { id: 'route-dashboard', name: 'Dashboard', type: 'Route', path: '/', icon: LayoutDashboard },
    { id: 'route-editor', name: 'Code Editor', type: 'Route', path: '/editor', icon: FileCode2 },
    { id: 'route-team', name: 'Team Workspace', type: 'Route', path: '/team', icon: Users },
    { id: 'route-security', name: 'Security Scanner', type: 'Route', path: '/security', icon: ShieldCheck },
    { id: 'route-profile', name: 'Profile & Settings', type: 'Route', path: '/profile', icon: Settings },
  ];

  const teamMembers = [
    { id: 'team-1', name: 'Alice Smith', type: 'Team Member', path: '/team', icon: User },
    { id: 'team-2', name: 'Bob Jones', type: 'Team Member', path: '/team', icon: User },
  ];

  const vulnerabilities = [
    { id: "VULN-001", name: "Hardcoded API Key found", type: "Vulnerability", path: "/security", icon: AlertTriangle },
    { id: "VULN-002", name: "Outdated dependency: lodash", type: "Vulnerability", path: "/security", icon: AlertTriangle },
    { id: "VULN-003", name: "Missing rate limiting", type: "Vulnerability", path: "/security", icon: AlertTriangle },
    { id: "VULN-004", name: "SQL Injection vulnerability", type: "Vulnerability", path: "/security", icon: AlertTriangle },
    { id: "VULN-005", name: "Cross-Site Scripting (XSS)", type: "Vulnerability", path: "/security", icon: AlertTriangle },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const qFiles = query(collection(db, "files"));
    const unsubFiles = onSnapshot(qFiles, (snapshot) => {
      setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubFiles();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    
    const queryLower = searchQuery.toLowerCase();
    
    const matchedFiles = files.filter(f => 
      f.name?.toLowerCase().includes(queryLower) || 
      f.type?.toLowerCase().includes(queryLower) ||
      f.content?.toLowerCase().includes(queryLower)
    ).map(f => ({ ...f, searchType: 'File', path: `/editor?fileId=${f.id}`, icon: FileCode2 }));

    const matchedRoutes = appRoutes.filter(r => 
      r.name.toLowerCase().includes(queryLower)
    ).map(r => ({ ...r, searchType: 'Route' }));

    const matchedTeam = teamMembers.filter(t => 
      t.name.toLowerCase().includes(queryLower)
    ).map(t => ({ ...t, searchType: 'Team Member' }));

    const matchedVulns = vulnerabilities.filter(v => 
      v.name.toLowerCase().includes(queryLower) || v.id.toLowerCase().includes(queryLower)
    ).map(v => ({ ...v, searchType: 'Vulnerability' }));

    setSearchResults([...matchedRoutes, ...matchedFiles, ...matchedTeam, ...matchedVulns]);
  }, [searchQuery, files]);

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-40 relative">
      <div className="flex items-center flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(!!searchQuery.trim())}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
            placeholder="Search files, routes, team members, vulnerabilities..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-all placeholder-zinc-500"
          />
          {isSearching && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searchResults.map(result => {
                const Icon = result.icon || FileCode2;
                return (
                  <div 
                    key={result.id} 
                    onClick={() => {
                      navigate(result.path);
                      setSearchQuery("");
                      setIsSearching(false);
                    }}
                    className="flex items-center space-x-3 p-3 hover:bg-zinc-800 cursor-pointer transition-colors border-b border-zinc-800/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{result.name}</p>
                      <p className="text-xs text-zinc-500 uppercase">{result.searchType}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {isSearching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-4 text-center z-50">
              <p className="text-sm text-zinc-400">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-zinc-400 hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-800"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-zinc-950 animate-pulse"></span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => { setShowNotifications(false); navigate('/team'); }}>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200"><span className="font-semibold">Admin</span> invited you to <span className="font-semibold">HackCollab Core</span></p>
                      <p className="text-xs text-zinc-500 mt-1">2 hours ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => { setShowNotifications(false); navigate('/team'); }}>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCode2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200"><span className="font-semibold">Alice Smith</span> pushed changes for review in <span className="font-mono text-xs text-blue-400">auth.js</span></p>
                      <p className="text-xs text-zinc-500 mt-1">5 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 text-center">
                <button onClick={() => { setShowNotifications(false); navigate('/team'); }} className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  View all in Team Workspace
                </button>
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={() => navigate("/profile")}
          className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border border-zinc-700 cursor-pointer hover:border-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
          title={user?.displayName || user?.email || "Profile"}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : user?.displayName ? (
            <span className="text-sm font-medium text-white">{user.displayName.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="w-5 h-5 text-zinc-400" />
          )}
        </button>
      </div>
    </header>
  );
}
