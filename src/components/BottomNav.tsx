import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Newspaper, Zap, Trophy, User } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'الرئيسية' },
    { path: '/news', icon: <Newspaper size={24} />, label: 'الأخبار' },
    { path: '/fan-zone', icon: <Zap size={28} />, label: 'فان زون' },
    { path: '/matches', icon: <Trophy size={24} />, label: 'المباريات' },
    { path: '/profile', icon: <User size={24} />, label: 'ملفي' },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.2rem)] max-w-md bg-white/90 dark:bg-[#070E08]/90 backdrop-blur-2xl border border-slate-150 dark:border-white/10 rounded-[28px] px-2 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-black/[0.03] dark:ring-white/5">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto relative">
        {navItems.map((item, idx) => {
          const isActive = path === item.path || (item.path !== '/' && path.startsWith(item.path));
          const isCenter = idx === 2;

          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`group relative flex flex-1 flex-col items-center justify-center p-0.5 transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}`}
            >
              {isCenter ? (
                <div className="relative -mt-10 flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-premium ${isActive ? 'bg-gradient-to-tr from-primary to-[#00FF84] text-white scale-110 shadow-glow rotate-[360deg]' : 'bg-white dark:bg-card-dark text-slate-500 border border-slate-100 dark:border-white/5 group-hover:border-primary/50'}`}>
                    <div className={`transition-all duration-500 ${isActive ? 'scale-110 filter drop-shadow-[0_2px_8px_rgba(0,255,132,0.5)]' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-[10px] mt-1 font-black text-primary uppercase tracking-widest drop-shadow-sm font-sans"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <div className="relative flex h-10 w-10 items-center justify-center transition-all duration-300">
                     {isActive && (
                       <motion.div 
                         layoutId="nav-glow-indicator"
                         className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-full"
                         transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                       />
                     )}
                     <div className={`relative z-20 transition-all duration-500 ${isActive ? 'text-primary scale-110' : 'group-hover:scale-110'}`}>
                       {item.icon}
                     </div>
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 3 }}
                        className="text-[9px] mt-0.5 font-black text-primary"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
