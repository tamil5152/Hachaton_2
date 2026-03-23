import { Activity, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AnomalyDetection() {
  const anomalies = [
    { id: 1, type: "Unusual Login Location", user: "alex@example.com", time: "10 mins ago", status: "investigating" },
    { id: 2, type: "Mass File Deletion", user: "sarah@example.com", time: "1 hour ago", status: "resolved" },
    { id: 3, type: "High CPU Usage", user: "System", time: "2 hours ago", status: "monitoring" },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Anomaly Detection</h1>
          <p className="text-zinc-400 mt-1">AI-powered behavioral analysis and threat detection</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>System Normal</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-zinc-400" />
            Network Traffic Analysis
          </h2>
          <div className="h-48 border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center bg-zinc-950/50">
            <p className="text-zinc-500 text-sm">Traffic visualization graph</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-zinc-400" />
            User Behavior Score
          </h2>
          <div className="h-48 border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center bg-zinc-950/50">
            <p className="text-zinc-500 text-sm">Behavior score timeline</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col min-h-0">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Recent Anomalies</h2>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
              <div className="flex items-start space-x-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${
                  anomaly.status === 'resolved' ? 'text-emerald-500' : 
                  anomaly.status === 'investigating' ? 'text-amber-500' : 'text-blue-500'
                }`} />
                <div>
                  <h4 className="text-sm font-medium text-zinc-100">{anomaly.type}</h4>
                  <p className="text-xs text-zinc-400 mt-1">User: {anomaly.user} • {anomaly.time}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                anomaly.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                anomaly.status === 'investigating' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {anomaly.status.charAt(0).toUpperCase() + anomaly.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
