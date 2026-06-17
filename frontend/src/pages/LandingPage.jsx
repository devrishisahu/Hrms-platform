import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, HelpCircle, BookOpen, Globe, Users, Clock, CheckSquare, FileText } from 'lucide-react';

function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Create particles
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        speedX: Math.random() * 0.3 - 0.15,
        speedY: Math.random() * -0.4 - 0.05, // Float upwards
        opacity: Math.random() * 0.4 + 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(197, 3, 55, ${p.opacity})`; // Crimson tinted particles
        ctx.fill();

        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Reset if offscreen
        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < 0 || p.x > canvas.width) {
          p.speedX *= -1;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0" 
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen text-slate-200 overflow-x-hidden relative select-none flex flex-col justify-between" style={{
      background: 'radial-gradient(circle at 50% 30%, #3d0f17 0%, #150407 55%, #02060e 100%)',
    }}>
      {/* Moving Particles */}
      <ParticleBackground />

      {/* Top Navbar */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-noir/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white tracking-widest relative z-10">HRVerse</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
          </div>

          <div>
            <Link 
              to="/login" 
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-white/5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Container */}
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center relative min-h-[85vh] justify-center z-10 flex-1">
        
        {/* Main Avatar & Float Cards Container */}
        <div className="relative w-full max-w-3xl flex justify-center mb-10 pt-10">
          
          {/* Avatar Image */}
          <motion.img 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            src="/avatar.png" 
            alt="AI Assistant" 
            className="w-full max-w-md h-[460px] object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(197,3,55,0.15)]"
          />

          {/* Floating Card 1: Attendance (Top-Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -30, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute top-12 left-0 sm:left-10 z-20 glass-card p-4 w-44 bg-noir-950/90 border-white/10 shadow-2xl"
            >
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attendance</p>
              <h4 className="text-2xl font-black text-white mt-1 font-mono">98.4%</h4>
              <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="w-[98.4%] h-full bg-crimson-500 rounded-full" />
              </div>
            </motion.div>
          </motion.div>

          {/* Floating Card 2: Payroll Sync (Mid-Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -30, y: 30 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.5 }}
              className="absolute bottom-32 left-4 sm:left-16 z-20 glass-card px-4 py-2.5 flex items-center gap-3 bg-noir-950/90 border-white/10 shadow-2xl"
            >
              <div className="w-7 h-7 rounded-full bg-crimson-500/10 border border-crimson-500/20 flex items-center justify-center text-[10px] text-crimson-400 font-extrabold">$</div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payroll Sync</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] font-semibold text-white">Completed</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating Card 3: Performance (Mid-Right) */}
          <motion.div 
            initial={{ opacity: 0, x: 30, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 0.2 }}
              className="absolute top-44 right-0 sm:right-10 z-20 glass-card p-4 w-44 bg-noir-950/90 border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance</p>
              </div>
              <div className="flex items-baseline justify-between mt-1.5">
                <h4 className="text-xl font-bold text-white">Optimal</h4>
                <span className="text-[10px] text-green-400 font-bold font-mono">+12%</span>
              </div>
            </motion.div>
          </motion.div>

        </div>

        {/* Center Bottom Text Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-20 w-full max-w-xl bg-gradient-to-b from-[#1b090c]/90 to-[#0e0305]/95 backdrop-blur-xl border border-white/5 px-8 py-10 rounded-[32px] text-center shadow-3xl shadow-black/60 -mt-16"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Where Strategy Meets <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson-400 to-crimson-300">Intelligence —</span> <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson-500 to-crimson-400">HRVerse.</span>
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8 font-medium">
            Step into the future of people operations with HRVerse. An intelligent, all-in-one ecosystem designed to automate workflows, optimize talent strategies, and scale modern enterprises seamlessly.
          </p>

          <div className="flex justify-center">
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-12 py-4 bg-crimson-600 hover:bg-crimson-500 text-white rounded-full font-bold transition-all hover:shadow-lg hover:shadow-crimson-500/20 text-sm text-center"
            >
              Get Started
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Core Strengths Section */}
      <section id="features" className="py-24 px-8 max-w-7xl mx-auto relative z-10">
        <div className="mb-16">
          <span className="text-crimson-500 font-bold uppercase tracking-widest text-xs">Core Strengths</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            Unrivaled <span className="text-crimson-500">Capabilities</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            The future of human resources is predictive, automated, and intelligent. HRVerse delivers the tools you need to stay ahead.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 bg-noir-900/40 flex flex-col justify-between h-[300px]">
            <div>
              <div className="w-10 h-10 rounded-xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 flex items-center justify-center mb-6">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-3">Workforce Directory</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Manage the entire employee lifecycle. Access comprehensive profiles, departments, designations, and organized structure details.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 bg-noir-900/40 flex flex-col justify-between h-[300px]">
            <div>
              <div className="w-10 h-10 rounded-xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 flex items-center justify-center mb-6">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-3">Attendance Muster</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track check-in and check-out times, view daily presence status, and compute Loss of Pay (LOP) pre-processing reports automatically.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 bg-noir-900/40 flex flex-col justify-between h-[300px]">
            <div>
              <div className="w-10 h-10 rounded-xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 flex items-center justify-center mb-6">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-3">Leave &amp; Approvals</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Submit time-off requests, view automated leave balance tracking, and streamline manager actions with a centralized approvals board.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card p-6 bg-noir-900/40 flex flex-col justify-between h-[300px]">
            <div>
              <div className="w-10 h-10 rounded-xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 flex items-center justify-center mb-6">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-3">Real-Time Reports</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Generate dynamic reports on headcount statistics, visualize leave distribution, and track vital metrics for organizational insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="border-t border-white/5 bg-noir-950/40 backdrop-blur-md relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Branding */}
          <div className="space-y-4">
            <span className="text-xl font-black text-white tracking-widest">HRVerse</span>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Next-generation people operations ecosystem. Streamlined workforce management, live attendance muster, and AI-driven intelligence.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="text-slate-500 hover:text-white transition-colors"><Globe className="w-4 h-4" /></a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors"><HelpCircle className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li><a href="#features" className="hover:text-white transition-colors">Workforce Directory</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Attendance Muster</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Leave &amp; Approvals</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Real-Time Reports</a></li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> API Reference</a></li>
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GDPR &amp; Compliance</a></li>
            </ul>
          </div>

        </div>

        {/* Copyright Panel */}
        <div className="border-t border-white/5 py-6 bg-black/10">
          <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <p>&copy; {new Date().getFullYear()} HRVerse. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Crafted with <Heart className="w-3 h-3 text-crimson-500 fill-crimson-500" /> for the modern enterprise.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
