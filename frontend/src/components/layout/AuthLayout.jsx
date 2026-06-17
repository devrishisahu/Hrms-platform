import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-noir text-slate-200">
      {/* Left side: Branding / Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-crimson-noir overflow-hidden items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-crimson-500 rounded-full mix-blend-screen filter blur-[100px] opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-crimson-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30" />
        
        <div className="relative z-10 max-w-lg px-8 flex flex-col items-center text-center">
          <Link to="/" className="inline-block mb-8 self-center">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-10 h-10 rounded bg-crimson-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-crimson-500/30">H</div>
              <span className="text-3xl font-bold text-white tracking-wide">HRVerse</span>
            </div>
          </Link>

          {/* Floating AI Avatar */}
          <div className="relative w-full flex justify-center mb-6">
            <motion.img 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -10, 0]
              }}
              transition={{
                opacity: { duration: 0.6 },
                scale: { duration: 0.6 },
                y: {
                  repeat: Infinity,
                  duration: 4,
                  ease: 'easeInOut'
                }
              }}
              src="/avatar.png" 
              alt="AI Assistant" 
              className="h-[280px] object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(197,3,55,0.25)]"
            />
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Where Strategy Meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson-400 to-crimson-300">Intelligence.</span>
          </h2>
          
          <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-md font-medium">
            Step into the next-generation people operations ecosystem. Monitor live attendance muster, search the workforce directory, and manage leave approvals seamlessly.
          </p>

          <div className="flex items-center gap-2 py-2.5 px-5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs font-semibold text-slate-300">Live attendance sync active</p>
          </div>
        </div>
      </div>

      {/* Right side: Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded bg-crimson-500 flex items-center justify-center font-bold text-white shadow-lg shadow-crimson-500/30">H</div>
            <span className="text-xl font-bold text-white tracking-wide">HRVerse</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
