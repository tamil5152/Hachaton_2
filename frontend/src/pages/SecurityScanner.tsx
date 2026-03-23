import { ShieldAlert, ShieldCheck, AlertTriangle, Search, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function SecurityScanner() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(new Date());

  const allVulnerabilities = [
    { id: "VULN-001", severity: "high", file: "src/auth.js", issue: "Hardcoded API Key found", status: "open", description: "A hardcoded API key was detected. This can lead to unauthorized access if the code is exposed." },
    { id: "VULN-002", severity: "medium", file: "package.json", issue: "Outdated dependency: lodash", status: "open", description: "The lodash version has known vulnerabilities. Update to the latest version." },
    { id: "VULN-003", severity: "low", file: "src/api.js", issue: "Missing rate limiting", status: "open", description: "API endpoints should have rate limiting to prevent abuse and DDoS attacks." },
    { id: "VULN-004", severity: "high", file: "src/db.ts", issue: "SQL Injection vulnerability", status: "resolved", description: "Unsanitized user input used directly in SQL query." },
    { id: "VULN-005", severity: "medium", file: "src/components/Form.tsx", issue: "Cross-Site Scripting (XSS)", status: "open", description: "User input is rendered without proper sanitization." },
  ];

  const [vulnerabilities, setVulnerabilities] = useState(allVulnerabilities.filter(v => v.status === 'open'));

  const filteredVulnerabilities = vulnerabilities.filter(vuln => 
    vuln.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vuln.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vuln.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vuln.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRunScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setVulnerabilities([]); // Clear while scanning

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setLastScanTime(new Date());
          // Randomize or reset vulnerabilities to simulate a real scan finding things
          setVulnerabilities(allVulnerabilities.filter(v => v.status === 'open'));
          return 100;
        }
        return prev + Math.floor(Math.random() * 10) + 2; // More realistic progress
      });
    }, 300);
  };

  const criticalCount = vulnerabilities.filter(v => v.severity === 'high').length;
  const warningCount = vulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'low').length;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Security Scanner</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {lastScanTime ? `Last scan: ${lastScanTime.toLocaleTimeString()}` : 'Automated vulnerability detection and code analysis'}
          </p>
        </div>
        <button 
          onClick={handleRunScan}
          disabled={isScanning}
          className="flex items-center space-x-2 bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{isScanning ? "Scanning..." : "Run Full Scan"}</span>
        </button>
      </div>

      {isScanning && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px] opacity-20 pointer-events-none" />
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-blue-400 animate-pulse" />
              </div>
              <div>
                <span className="text-sm font-semibold text-zinc-100 block">Analyzing Codebase</span>
                <span className="text-xs text-zinc-500 font-mono">Running AST checks and dependency audits...</span>
              </div>
            </div>
            <span className="text-2xl font-mono font-bold text-blue-400">{scanProgress}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden relative z-10">
            <motion.div 
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.1 }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/50 blur-sm" />
            </motion.div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center space-x-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Critical Issues</p>
            <h3 className="text-3xl font-bold text-zinc-100">{isScanning ? '-' : criticalCount}</h3>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center space-x-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Warnings</p>
            <h3 className="text-3xl font-bold text-zinc-100">{isScanning ? '-' : warningCount}</h3>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center space-x-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Passed Checks</p>
            <h3 className="text-3xl font-bold text-zinc-100">{isScanning ? '-' : '1,248'}</h3>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col min-h-0 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Detected Vulnerabilities</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, files, IDs..." 
              className="bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 w-72 transition-all placeholder-zinc-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">ID</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Severity</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">File</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Issue</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              <AnimatePresence>
                {filteredVulnerabilities.length > 0 ? (
                  filteredVulnerabilities.map((vuln) => (
                    <motion.tr 
                      key={vuln.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-4 text-sm font-medium text-zinc-300">{vuln.id}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          vuln.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          vuln.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {vuln.severity === 'high' && <XCircle className="w-3 h-3 mr-1.5" />}
                          {vuln.severity === 'medium' && <AlertTriangle className="w-3 h-3 mr-1.5" />}
                          {vuln.severity === 'low' && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
                          {vuln.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-mono text-zinc-400">{vuln.file}</td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-zinc-200">{vuln.issue}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{vuln.description}</p>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100">
                          Review Fix
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">
                      {isScanning ? "Scanning in progress..." : "No vulnerabilities found."}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
