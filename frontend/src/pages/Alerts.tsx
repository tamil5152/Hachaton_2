import { Bell, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export default function Alerts() {
  const alerts = [
    { id: 1, type: "warning", title: "High Memory Usage", message: "Server memory usage exceeded 90%", time: "10 mins ago" },
    { id: 2, type: "info", title: "New Team Member", message: "Alex joined the workspace", time: "1 hour ago" },
    { id: 3, type: "success", title: "Deployment Successful", message: "Production deployment completed", time: "2 hours ago" },
    { id: 4, type: "warning", title: "Failed Login Attempts", message: "Multiple failed logins detected from IP 192.168.1.1", time: "5 hours ago" },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'info': return 'bg-blue-500/10 border-blue-500/20';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      default: return 'bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">System Alerts</h1>
          <p className="text-zinc-400 mt-1">Notifications and system events</p>
        </div>
        <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
          Mark all as read
        </button>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start space-x-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getBgColor(alert.type)}`}>
                {getIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-100">{alert.title}</h3>
                  <span className="text-xs text-zinc-500">{alert.time}</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
