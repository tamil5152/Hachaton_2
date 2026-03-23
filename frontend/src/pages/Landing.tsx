import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "motion/react";
import { Code2, ShieldCheck, Activity, Users, Play, ArrowRight, MousePointer2, Terminal, Lock, Zap } from "lucide-react";
import { useRef, useState, useEffect, type FormEvent } from "react";

const AnimatedCursor = ({ x, y, color, name, delay }: { x: number[], y: number[], color: string, name: string, delay: number }) => (
  <motion.div
    className="absolute z-0 pointer-events-none flex items-center gap-2"
    initial={{ x: x[0], y: y[0], opacity: 0 }}
    animate={{ 
      x: x, 
      y: y,
      opacity: [0, 1, 1, 0]
    }}
    transition={{ 
      duration: 8, 
      repeat: Infinity, 
      delay: delay,
      ease: "easeInOut",
      times: [0, 0.1, 0.9, 1]
    }}
  >
    <MousePointer2 className={`w-5 h-5 ${color} fill-current`} />
    <div className={`px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg ${color.replace('text-', 'bg-')}`}>
      {name}
    </div>
  </motion.div>
);

const TimelineNode = ({ title, desc, delay, active }: { title: string, desc: string, delay: number, active: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.5, delay }}
    className="relative pl-8 pb-12 last:pb-0"
  >
    <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 z-10 bg-zinc-950 transition-colors duration-500 ${active ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-zinc-700'}`} />
    <div className={`absolute left-[5px] top-4 bottom-0 w-0.5 -ml-px ${active ? 'bg-gradient-to-b from-blue-500 to-zinc-800' : 'bg-zinc-800'} last:hidden`} />
    <h4 className={`text-lg font-semibold mb-1 transition-colors duration-500 ${active ? 'text-zinc-100' : 'text-zinc-400'}`}>{title}</h4>
    <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">{desc}</p>
  </motion.div>
);

export default function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [activeTimelineNode, setActiveTimelineNode] = useState(0);
  const [signupEmail, setSignupEmail] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimelineNode((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLandingSignup = (e: FormEvent) => {
    e.preventDefault();
    const query = signupEmail.trim() ? `?mode=signup&email=${encodeURIComponent(signupEmail.trim())}` : "?mode=signup";
    navigate(`/auth${query}`);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Abstract Background Grid & Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 -z-10 h-[800px] w-[800px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute right-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Animated Cursors (Hero Area) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none hidden md:block">
        <AnimatedCursor x={[150, 350, 450, 250]} y={[250, 180, 450, 350]} color="text-blue-400" name="Alex (Frontend)" delay={0} />
        <AnimatedCursor x={[850, 650, 750, 950]} y={[350, 550, 250, 450]} color="text-emerald-400" name="Sarah (Backend)" delay={2} />
        <AnimatedCursor x={[450, 550, 250, 350]} y={[650, 450, 550, 750]} color="text-purple-400" name="Mike (Security)" delay={4} />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 border-b border-white/5 backdrop-blur-xl bg-black/50">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all duration-500">
            <Code2 className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">HackCollab</span>
        </div>
        <div className="flex items-center space-x-8">
          <Link to="/auth" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden md:block">Sign In</Link>
          <Link to="/auth" className="px-6 py-2.5 text-sm font-semibold text-black bg-white rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 md:px-12 max-w-7xl mx-auto">
          <motion.div style={{ y, opacity }} className="max-w-4xl mx-auto text-center space-y-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4"
            >
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Hackathon Ready Platform</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-6xl md:text-8xl font-extrabold text-white tracking-tighter leading-[1.05]"
            >
              Code at the speed of <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                thought.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light"
            >
              The ultimate real-time collaboration environment with built-in vulnerability scanning and anomaly detection. Engineered for high-performance teams.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            >
              <Link to="/auth" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] active:scale-95 flex items-center justify-center gap-2 group">
                Start Coding Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Demo
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* Video Section */}
        <section id="demo" className="py-20 px-6 md:px-12 max-w-6xl mx-auto relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] bg-black/50 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="aspect-video w-full relative">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&mute=0&controls=1" 
                title="HackCollab Demo" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="w-full h-full relative z-0"
              ></iframe>
            </div>
          </motion.div>
        </section>

        {/* Visionary Timeline & Features Split */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/5 bg-black/20 backdrop-blur-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Timeline */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 tracking-tight">The HackCollab Workflow</h2>
              <div className="relative">
                <TimelineNode 
                  active={activeTimelineNode === 0}
                  delay={0.1}
                  title="1. Instant Provisioning" 
                  desc="Spin up a secure, isolated containerized environment in milliseconds. No local setup required." 
                />
                <TimelineNode 
                  active={activeTimelineNode === 1}
                  delay={0.2}
                  title="2. Real-time Sync" 
                  desc="Collaborate with your team using sub-millisecond latency CRDT-based operational transforms." 
                />
                <TimelineNode 
                  active={activeTimelineNode === 2}
                  delay={0.3}
                  title="3. Continuous Security" 
                  desc="Background AI agents scan your AST for vulnerabilities and hardcoded secrets as you type." 
                />
                <TimelineNode 
                  active={activeTimelineNode === 3}
                  delay={0.4}
                  title="4. One-Click Deploy" 
                  desc="Push your hackathon project to production instantly with zero-downtime deployments." 
                />
              </div>
            </div>

            {/* Right: Feature Bento Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Terminal className="w-8 h-8 text-blue-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Cloud IDE</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Full-featured VS Code compatible environment in your browser.</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Lock className="w-8 h-8 text-emerald-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Zero Trust</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Enterprise-grade security with granular RBAC and audit logs.</p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 shadow-2xl relative overflow-hidden group sm:col-span-2"
              >
                <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Zap className="w-8 h-8 text-purple-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">ML Anomaly Detection</h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-md">Our proprietary models monitor keystroke dynamics and access patterns to prevent intellectual property theft during competitive events.</p>
              </motion.div>
            </div>

          </div>
        </section>

        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_22%),linear-gradient(180deg,rgba(18,18,24,0.96),rgba(8,8,10,0.98))] p-8 md:p-12 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px] opacity-20" />
            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  <Users className="w-3.5 h-3.5" />
                  Team Onboarding
                </div>
                <h2 className="mt-5 text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  Start with a professional signup flow before your team enters the workspace.
                </h2>
                <p className="mt-4 max-w-2xl text-base md:text-lg text-zinc-400 leading-8">
                  Create an account, connect identity providers, and step directly into a live operations dashboard built around real collaboration data.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-2xl font-semibold text-white">Realtime</p>
                    <p className="mt-1 text-sm text-zinc-500">Auth, file activity, and chat events flow directly to the dashboard.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-2xl font-semibold text-white">Secure</p>
                    <p className="mt-1 text-sm text-zinc-500">Google, GitHub, and email authentication in one unified onboarding path.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-2xl font-semibold text-white">Ready</p>
                    <p className="mt-1 text-sm text-zinc-500">Invite teammates, upload files, and begin collaboration immediately.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-xl p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Create your account</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">Sign up for HackCollab</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <Code2 className="w-6 h-6" />
                  </div>
                </div>

                <form onSubmit={handleLandingSignup} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Work email</label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="founder@yourteam.com"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-400/60 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.99]"
                  >
                    Continue to Sign Up
                  </button>
                </form>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/auth?mode=signup"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
                  >
                    Use Email Signup
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                    className="rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-center text-sm font-medium text-blue-100 transition-colors hover:bg-blue-400/15"
                  >
                    Use Google or GitHub
                  </Link>
                </div>

                <p className="mt-4 text-xs leading-6 text-zinc-500">
                  After signup, the dashboard will begin reflecting real member access, file involvement, and collaboration events as your team works.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
