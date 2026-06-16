import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Bell, Search, ChevronRight, X, Info, Sun, Moon, Settings } from 'lucide-react';
import { useAppStore } from '../store';
import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, theme, toggleTheme, appSettings } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [imageError, setImageError] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const initialLoadRef = useRef(true);

  const lightLogo = appSettings?.headerLogoLight || appSettings?.appLogo;
  const darkLogo = appSettings?.headerLogoDark || appSettings?.appLogo;
  const currentLogo = theme === 'dark' ? darkLogo : lightLogo;

  useEffect(() => {
    setImageError(false);
  }, [currentLogo]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const timer = setInterval(() => {
        if (Notification.permission !== permission) {
          setPermission(Notification.permission);
        }
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [permission]);

  useEffect(() => {
    if (!profile?.uid) return;
    const q1 = query(collection(db, 'notifications'), where('target', 'in', ['all', profile.uid]));
    
    const unsubscribe = onSnapshot(q1, (snap) => {
      const notifs = snap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(n => !n.deletedBy?.includes(profile.uid));
      notifs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);

      if (!initialLoadRef.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (!data.readBy?.includes(profile.uid)) {
              toast((t) => (
                <div onClick={() => { toast.dismiss(t.id); setShowNotifications(true); }} className="flex flex-col gap-1 cursor-pointer">
                  <div className="font-black text-sm text-primary flex items-center gap-2">
                    <Bell size={16} /> إشعار جديد
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{data.title}</div>
                  <div className="text-[10px] font-bold text-slate-500 line-clamp-1 mt-1">{data.body}</div>
                </div>
              ));
            }
          }
        });
      }
      initialLoadRef.current = false;
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'push_notifications'));
    
    return () => unsubscribe();
  }, [profile?.uid]);

  const hideHeaderPaths = ['/auth'];
  if (hideHeaderPaths.includes(location.pathname) || location.pathname.startsWith('/news/')) return null;

  const isHome = location.pathname === '/';
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'قناة المصري البورسعيدي';
    if (path === '/news') return 'مركز الأخبار';
    if (path.startsWith('/news/')) return 'تفاصيل الخبر';
    if (path === '/media') return 'ميديا المصري';
    if (path === '/live') return 'البث المباشر';
    if (path === '/matches') return 'مباريات كرة القدم';
    if (path === '/profile') return 'ملفي الشخصي';
    if (path === '/fan-zone' || path === '/feed') return 'منطقة المشجعين';
    if (path === '/history') return 'تاريخ النادي';
    if (path === '/store') return 'متجر النادي';
    if (path === '/bookmarks') return 'المحفوظات';
    if (path === '/admin') return 'لوحة التحكم';
    return 'المصري البورسعيدي';
  };

  const title = getPageTitle();

  const unreadCount = notifications.filter(n => !n.readBy?.includes(profile?.uid)).length;

  const markAsRead = async (id: string, readBy: string[]) => {
    if (!profile?.uid) return;
    if (readBy?.includes(profile.uid)) return;
    
    const newReadBy = [...(readBy || []), profile.uid];
    try {
      await updateDoc(doc(db, 'notifications', id), { readBy: newReadBy });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  return (
    <>
      <div style={{ height: 'calc(env(safe-area-inset-top) + 68px)' }} className="w-full"></div>
      <header id="global-header" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }} className="fixed top-0 inset-x-0 w-full max-w-md mx-auto z-50 bg-white/90 dark:bg-[#020703]/90 backdrop-blur-3xl border-b border-slate-200/50 dark:border-white/5 px-4 pb-4 shadow-premium">
        <div className="flex items-center justify-between max-w-md mx-auto h-16">
          <div className="flex items-center gap-3">
            {isHome ? (
              <motion.button 
                id="menu-button"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setIsMenuOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white dark:bg-white/5 text-slate-800 dark:text-white hover:bg-primary hover:text-white transition-all duration-500 shadow-premium border border-slate-100 dark:border-white/5"
              >
                <Menu size={22} strokeWidth={2.5} />
              </motion.button>
            ) : (
              <motion.button 
                id="back-button"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(-1)}
                className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white dark:bg-white/5 text-slate-800 dark:text-white hover:bg-primary hover:text-white transition-all duration-500 shadow-premium border border-slate-100 dark:border-white/5"
              >
                <ChevronRight size={28} strokeWidth={2.5} className="rotate-180" />
              </motion.button>
            )}
          </div>

          <div className="flex flex-col items-center justify-center flex-1">
            {currentLogo && !imageError ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img 
                  src={currentLogo} 
                  alt={title} 
                  className="h-10 sm:h-12 w-auto max-w-[140px] object-contain drop-shadow-2xl hover:scale-110 transition-all duration-700 relative z-10" 
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              </motion.div>
            ) : (
              <h1 className="text-lg font-black tracking-tighter text-slate-800 dark:text-white uppercase line-clamp-1 max-w-[140px] text-center font-serif italic">
                {appSettings?.logoText || title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            <motion.button 
              id="notification-button"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleOpenNotifications}
              className="relative flex h-12 w-12 items-center justify-center rounded-[20px] bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-accent hover:text-white transition-all duration-500 shadow-premium border border-slate-100 dark:border-white/5"
            >
              <Bell size={20} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute top-3.5 right-3.5 h-3 w-3 bg-accent rounded-full ring-2 ring-white dark:ring-slate-900 shadow-glow animate-pulse"></span>
              )}
            </motion.button>

            <motion.button 
              id="theme-toggle-button"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={toggleTheme}
              className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white transition-all duration-500 shadow-premium border border-slate-100 dark:border-white/5"
            >
              {theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </motion.button>
          </div>
        </div>
      </header>

      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} profile={profile} />

      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#020617] rounded-t-[48px] sm:rounded-[48px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] border border-slate-100 dark:border-white/5"
            >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight font-serif uppercase leading-none">الإشعارات</h3>
                      <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mt-2">Latest Updates</span>
                    </div>
                    <div className="flex items-center gap-3">
                    <button onClick={() => setShowNotifications(false)} className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all shadow-inner">
                      <X size={22} />
                    </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                 {notifications.length > 0 ? (
                   notifications.map((notif) => {
                     const isRead = notif.readBy?.includes(profile?.uid);
                     return (
                       <motion.div 
                         key={notif.id}
                         whileHover={{ x: -4 }}
                         onClick={() => markAsRead(notif.id, notif.readBy)}
                         className={`group relative p-5 rounded-[28px] border transition-all cursor-pointer ${!isRead ? 'border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/5' : 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-white hover:dark:bg-white/[0.05]'}`}
                       >
                         <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${!isRead ? 'bg-primary text-white shadow-primary/20' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                              <Bell size={20} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                               <h4 className={`text-sm font-black transition-colors ${!isRead ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>{notif.title}</h4>
                               <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mt-2 line-clamp-3">{notif.body}</p>
                               <div className="flex items-center gap-2 mt-3 opacity-60">
                                  <span className="material-symbols-outlined !text-[12px]">schedule</span>
                                  <span className="text-[9px] font-black">{new Date(notif.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                            </div>
                            {!isRead && <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow mt-2"></div>}
                         </div>
                       </motion.div>
                     );
                   })
                 ) : (
                   <div className="py-20 text-center text-slate-400 font-black text-xs flex flex-col items-center gap-4 opacity-40">
                     <div className="h-20 w-20 rounded-[32px] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2">
                        <Bell size={40} strokeWidth={1} />
                     </div>
                     لا توجد تنبيهات جديدة في الوقت الحالي
                   </div>
                 )}
              </div>

              {notifications.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                   <button 
                      onClick={async () => {
                        if (!profile?.uid) return;
                        if (confirm('هل تريد مسح جميع الإشعارات؟')) {
                          try {
                            const batch = notifications.map(n => {
                              const deletedBy = [...(n.deletedBy || []), profile.uid];
                              return updateDoc(doc(db, 'notifications', n.id), { deletedBy });
                            });
                            await Promise.all(batch);
                            toast.success('تم تنظيف صندوق الوارد');
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      مسح جميع الإشعارات
                    </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
