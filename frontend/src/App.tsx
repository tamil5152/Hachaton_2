import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TeamWorkspace from "./pages/TeamWorkspace";
import CodeEditor from "./pages/CodeEditor";
import SecurityScanner from "./pages/SecurityScanner";
import AnomalyDashboard from "./pages/AnomalyDashboard";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspace" element={<TeamWorkspace />} />
          <Route path="/editor" element={<CodeEditor />} />
          <Route path="/scanner" element={<SecurityScanner />} />
          <Route path="/anomaly" element={<AnomalyDashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
