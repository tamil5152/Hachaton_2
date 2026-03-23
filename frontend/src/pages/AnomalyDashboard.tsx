import { Activity, ShieldAlert, AlertTriangle, Monitor, Globe, Clock } from "lucide-react";

export default function AnomalyDashboard() {
  const sessions = [
    { id: 1, user: "Alex Johnson", ip: "192.168.1.45", device: "MacBook Pro", location: "San Francisco, US", score: 12, status: "safe" },
    { id: 2, user: "Sarah Smith", ip: "10.0.0.12", device: "Windows PC", location: "London, UK", score: 8, status: "safe" },
    { id: 3, user: "Unknown", ip: "45.22.19.88", device: "Linux Server", location: "Moscow, RU", score: 94, status: "critical" },
    { id: 4, user: "Mike Davis", ip: "172.16.0.5", device: "iPhone 13", location: "New York, US", score: 45, status: "warning" },
    { id: 5, user: "Emma Wilson", ip: "192.168.1.102", device: "iPad Pro", location: "San Francisco, US", score: 5, status: "safe" },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Anomaly Detection</h1>
          <p className="text-sm text-zinc-400 mt-1">ML-powered monitoring for suspicious activities and sessions.</p>
        </div>
        <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-medium text-zinc-300">ML Engine Active</span>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-medium text-zinc-400">Average Risk Score</h3>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-4xl font-bold text-zinc-100">24</span>
            <span className="text-sm font-medium text-emerald-400 mb-1">/ 100</span>
          </div>
          <div className="mt-4 h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 w-1/4"></div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-medium text-zinc-400">Critical Sessions</h3>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-4xl font-bold text-red-400">1</span>
            <span className="text-sm font-medium text-zinc-500 mb-1">Active</span>
          </div>
          <p className="text-xs text-zinc-400 mt-4 relative z-10">Requires immediate attention</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-medium text-zinc-400">Suspicious Events</h3>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-4xl font-bold text-amber-400">12</span>
            <span className="text-sm font-medium text-zinc-500 mb-1">Last 24h</span>
          </div>
          <p className="text-xs text-zinc-400 mt-4 relative z-10">+3 compared to yesterday</p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-100">Active Sessions Monitoring</h2>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">All</button>
            <button className="px-3 py-1.5 text-xs font-medium bg-zinc-950 text-zinc-400 rounded-lg hover:text-white transition-colors">High Risk</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">User</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">IP Address</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Device & Location</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Risk Score</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {sessions.map((session) => (
                <tr key={session.id} className={`hover:bg-zinc-800/30 transition-colors ${session.status === 'critical' ? 'bg-red-500/5' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${session.status === 'critical' ? 'bg-red-500' : 'bg-zinc-700'}`}>
                        {session.user.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{session.user}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2 text-sm text-zinc-300 font-mono">
                      <Globe className="w-4 h-4 text-zinc-500" />
                      <span>{session.ip}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 text-sm text-zinc-300">
                        <Monitor className="w-4 h-4 text-zinc-500" />
                        <span>{session.device}</span>
                      </div>
                      <span className="text-xs text-zinc-500 mt-1 ml-6">{session.location}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${session.status === 'critical' ? 'bg-red-500' : session.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${session.score}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-bold ${session.status === 'critical' ? 'text-red-400' : session.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {session.score}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {session.status === 'critical' ? (
                      <button className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-medium transition-colors">
                        Block IP
                      </button>
                    ) : (
                      <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors">
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
