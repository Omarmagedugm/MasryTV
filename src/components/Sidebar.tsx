import { useState, useEffect } from 'react';
import { doc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { X, LayoutDashboard, Flag, MessageSquare, Info, Mail, Home, LogOut, ShieldCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, UserProfile } from '../store';
import { getOptimizedImage } from '../lib/cloudinary';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export default function Sidebar({ isOpen, onClose, profile }: SidebarProps) {
  const { appSettings, customPages } = useAppStore();
  const navigate = useNavigate();
  
  // No longer needing local fetch as it's synced in useFirestoreSync
  
  // High-level admin check
  const isOmar = auth.currentUser?.email?.toLowerCase() === 'omarmagedugm@gmail.com' || 
                 auth.currentUser?.email?.toLowerCase() === 'itthadalexchannel2@gmail.com' ||
                 auth.currentUser?.email?.toLowerCase() === 'itthadalexchannel2@masry.club' ||
                 auth.currentUser?.email?.toLowerCase()?.startsWith('itthadalexchannel2@') ||
                 profile?.username?.toLowerCase() === 'itthadalexchannel2';
  const isDev = auth.currentUser?.email?.toLowerCase() === 'copyrightofficialco@gmail.com';
  const isAdmin = profile.role === 'admin' || profile.role === 'writer' || (profile.roles && profile.roles.length > 0) || isOmar || isDev;
  const isAnonymous = !auth.currentUser || auth.currentUser.isAnonymous;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      onClose();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth', { replace: true });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-4/5 max-w-sm h-full bg-white dark:bg-[#040805] shadow-2xl flex flex-col border-l border-slate-100 dark:border-white/5"
          >
            {/* Sidebar Header */}
            <div className="p-6 pb-8 bg-gradient-to-br from-[#005F30] via-[#020703] to-[#010301] text-white relative overflow-hidden rounded-bl-[40px] border-b border-white/5">
              <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/15 blur-[60px] rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 blur-[50px] rounded-full"></div>
              <button 
                onClick={onClose}
                className="absolute top-4 left-4 h-9 w-9 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90 backdrop-blur-md border border-white/10"
              >
                <X size={18} />
              </button>
              <Link to="/profile" onClick={onClose} className="flex items-center gap-4 relative z-10 pt-6 cursor-pointer hover:opacity-90 transition-opacity">
                <div className="h-16 w-16 rounded-[22px] bg-white/10 p-1 ring-2 ring-accent/30 shadow-2xl overflow-hidden flex items-center justify-center backdrop-blur-md">
                  <img src={getOptimizedImage((isAnonymous ? appSettings.appLogo : profile.avatar), 200) || undefined} onError={(e) => { e.currentTarget.src = 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777716805/favicon_gd0ic4.png'; }} alt="Profile" className="w-full h-full object-contain rounded-[18px]" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {isAnonymous ? "أهلاً بك" : profile.name || 'مشجع مصراوي'}
                  </h3>
                  <p className="text-[9px] font-black text-accent uppercase tracking-widest mt-1">AL MASRY CLUB FAN</p>
                </div>
              </Link>
            </div>

            {/* Sidebar Links */}
            <div className="flex-1 overflow-y-auto p-5 space-y-1.5 custom-scrollbar">
              {isAdmin && (
                <Link to="/admin" onClick={onClose} className="flex items-center gap-3 p-4 rounded-3xl bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary-light border border-primary/10 pressable mb-6 shadow-sm">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <LayoutDashboard size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black italic tracking-tighter">ADMIN CONSOLE</span>
                    <span className="text-[9px] font-bold opacity-60">Control Panel</span>
                  </div>
                </Link>
              )}

              <div className="py-2 px-4">
                 <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-[0.2em]">Navigation</p>
              </div>
              
              <Link to="/" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">home</span>
                </div>
                <span className="text-sm font-bold">الرئيسية</span>
              </Link>

              <Link to="/news" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">newspaper</span>
                </div>
                <span className="text-sm font-bold">أخبار النسور الخضراء</span>
              </Link>

              <Link to="/matches" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">sports_soccer</span>
                </div>
                <span className="text-sm font-bold">مباريات الدوري</span>
              </Link>

              <Link to="/live" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                  <span className="material-symbols-outlined !text-[20px] animate-pulse">live_tv</span>
                </div>
                <span className="text-sm font-bold">البث المباشر</span>
              </Link>

              <Link to="/fan-zone" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-all">
                  <span className="material-symbols-outlined !text-[20px]">stadium</span>
                </div>
                <span className="text-sm font-black">مجتمع المشجعين</span>
              </Link>

              <Link to="/jersey-tryon" onClick={onClose} className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors text-slate-700 dark:text-slate-300 pressable group border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined !text-[20px] group-hover:rotate-12 transition-transform">bolt</span>
                  </div>
                  <span className="text-sm font-black">جرب التيشيرت (AI)</span>
                </div>
                <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full animate-pulse uppercase">NEW</span>
              </Link>

              <Link to="/media" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">movie</span>
                </div>
                <span className="text-sm font-bold">فيديو وملخصات</span>
              </Link>

              <Link to="/store" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">shopping_bag</span>
                </div>
                <span className="text-sm font-bold">Store</span>
              </Link>

              <div className="py-2 px-4 mt-2">
                 <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-[0.2em]">Personal</p>
              </div>

              <Link to="/profile" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">person</span>
                </div>
                <span className="text-sm font-bold">الحساب الشخصي</span>
              </Link>

              <Link to="/bookmarks" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 pressable group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">bookmark</span>
                </div>
                <span className="text-sm font-bold">المحفوظات</span>
              </Link>
              <button onClick={() => { 
                toast((t) => (
                  <div className="flex flex-col gap-2 p-1">
                    <p className="font-black text-sm text-slate-800">يمكنك مراسلتنا عبر:</p>
                    <p className="text-xs font-bold text-primary">info@almasrysc.tv</p>
                    <p className="text-[10px] font-bold text-slate-500">أو عبر رسائل الصفحة الرسمية على فيسبوك</p>
                    <button 
                      onClick={() => toast.dismiss(t.id)}
                      className="mt-2 bg-slate-100 py-1.5 rounded-lg text-[10px] font-black uppercase"
                    >
                      إغلاق
                    </button>
                  </div>
                ), { duration: 6000 });
                onClose(); 
              }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-surface-dark transition-colors text-slate-700 dark:text-slate-300 pressable text-right">
                <Mail size={20} />
                <span className="text-sm font-bold">اتصل بنا</span>
              </button>
              
              {!isAnonymous ? (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-red-50 text-red-500 dark:hover:bg-red-500/10 transition-colors pressable text-right mt-4"
                >
                  <LogOut size={20} />
                  <span className="text-sm font-black">تسجيل الخروج</span>
                </button>
              ) : (
                <Link 
                  to="/auth"
                  onClick={onClose}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary text-white hover:bg-primary-dark transition-colors pressable text-right mt-4"
                >
                  <span className="material-symbols-outlined !text-[20px]">login</span>
                  <span className="text-sm font-black">تسجيل الدخول</span>
                </Link>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-card-dark">
              <div className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    {(appSettings.logoType || 'image') === 'image' ? (
                      <img src={getOptimizedImage(appSettings.appLogo, 100) || undefined} onError={(e) => { e.currentTarget.src = 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777716805/favicon_gd0ic4.png'; }} className="h-6 w-6 opacity-40 grayscale" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-sm font-black text-slate-400 opacity-60">M</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{appSettings.appName || 'Al Masry App'}</p>
                    <p className="text-[9px] font-bold text-slate-300">V 1.2.0 • OFFICIAL</p>
                  </div>
                </div>
                <div className="h-6 w-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-green-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
