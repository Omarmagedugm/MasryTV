import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, AtSign, ArrowLeft, Loader2, ShieldCheck, HelpCircle, Copy, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { getOptimizedImage } from '../lib/cloudinary';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [domainError, setDomainError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { updateProfile: updateLocalProfile, appSettings } = useAppStore();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let resetEmail = email.trim();
      if (!resetEmail.includes('@') && resetEmail) {
        resetEmail = `${resetEmail.toLowerCase()}@masry.club`;
      }
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
    } catch (err: any) {
      console.error(err);
      setError('فشل إرسال البريد. تأكد من صحة البريد المدخل');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setDomainError(false);
    setCopiedIndex(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (err: any) {
        // If we are offline, we can still proceed with a temporary local profile from the user object
        const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
        if (isOffline) {
          console.warn('Operating in offline mode. Using temporary profile.');
          const isAdmin = user.email?.toLowerCase() === 'copyrightofficialco@gmail.com' || 
                          user.email?.toLowerCase() === 'omarmagedugm@gmail.com' ||
                          user.email?.toLowerCase() === 'itthadalexchannel2@gmail.com' ||
                          user.email?.toLowerCase() === 'itthadalexchannel2@masry.club' ||
                          user.email?.toLowerCase()?.startsWith('itthadalexchannel2@');
          const tempUserData = {
            uid: user.uid,
            name: user.displayName || 'مشجع مصراوي',
            email: user.email,
            role: (isAdmin ? 'admin' : 'user') as 'user' | 'admin',
            username: user.email?.split('@')[0].toLowerCase() || `user_${user.uid.substring(0, 5)}`,
            tier: 'new' as const,
            bio: 'مشجع مصراوي (وضع غير متصل)',
            joinDate: new Date().getFullYear().toString(),
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`,
            stats: { predictions: 0, comments: 0, favorites: 0 }
          };
          updateLocalProfile(tempUserData);
          navigate('/profile');
          return;
        }
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        throw err;
      }

      if (!userDoc.exists()) {
        const isAdmin = user.email?.toLowerCase() === 'copyrightofficialco@gmail.com' || 
                        user.email?.toLowerCase() === 'omarmagedugm@gmail.com' ||
                        user.email?.toLowerCase() === 'itthadalexchannel2@gmail.com' ||
                        user.email?.toLowerCase() === 'itthadalexchannel2@masry.club' ||
                        user.email?.toLowerCase()?.startsWith('itthadalexchannel2@');
        const userData = {
          uid: user.uid,
          name: user.displayName || 'مشجع مصراوي',
          email: user.email,
          role: (isAdmin ? 'admin' : 'user') as 'user' | 'admin',
          username: user.email?.split('@')[0].toLowerCase() || `user_${user.uid.substring(0, 5)}`,
          tier: 'new' as 'new' | 'diamond' | 'bronze' | 'silver' | 'gold',
          bio: 'مشجع مصراوي جديد',
          joinDate: new Date().getFullYear().toString(),
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`,
          stats: { predictions: 0, comments: 0, favorites: 0 }
        };
        try {
          await setDoc(doc(db, 'users', user.uid), userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
        updateLocalProfile(userData);
      } else {
        const userData = userDoc.data();
        // Ensure bootstrap admins are set as admin if not already
        const isUserBootstrap = user.email?.toLowerCase() === 'omarmagedugm@gmail.com' || 
                                user.email?.toLowerCase() === 'itthadalexchannel2@gmail.com' ||
                                user.email?.toLowerCase() === 'itthadalexchannel2@masry.club' ||
                                user.email?.toLowerCase()?.startsWith('itthadalexchannel2@');
        if (isUserBootstrap && userData?.role !== 'admin') {
          try {
            await setDoc(doc(db, 'users', user.uid), { ...userData, role: 'admin' }, { merge: true });
            userData!.role = 'admin';
          } catch (e) {}
        }
        updateLocalProfile(userData);
      }
      navigate('/profile');
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const code = err.code || '';
      if (code === 'auth/configuration-not-found') {
        setError('خطأ في تكوين المصادقة: يرجى التأكد من تمويل تسجيل دخول جوجل في لوحة تحكم Firebase وتفعيل Authorized Domains.');
      } else if (code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة. يرجى تفعيل النوافذ المنبثقة لهذا الموقع.');
      } else if (code === 'auth/cancelled-popup-request') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (code === 'auth/unauthorized-domain') {
        setDomainError(true);
        setError('unauthorized-domain');
      } else {
        setError('فشل تسجيل الدخول بجوجل: ' + (err.message || code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalEmail = email.trim();
      let finalUsername = username.trim() || email.split('@')[0];

      // Handle login mode transformation
      if (mode === 'login') {
        if (finalEmail.toLowerCase() === 'omarmagedugm') {
          finalEmail = 'omarmagedugm@gmail.com';
        } else if (!finalEmail.includes('@')) {
          // If it's a username, try to find the linked email in Firestore
          try {
            const q = query(collection(db, 'users'), where('username', '==', finalEmail.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              if (userData && userData.email) {
                finalEmail = userData.email;
              }
            } else {
              // If not found in DB, fallback to legacy auto-email or throw error later
              finalEmail = `${finalEmail.toLowerCase()}@masry.club`;
            }
          } catch (err) {
            console.warn("Username lookup failed, trying direct email", err);
            finalEmail = `${finalEmail.toLowerCase()}@masry.club`;
          }
        }
      } else {
        // Signup mode: if email field didn't contain @, treat it as part of an auto-email
        // This handles cases where user tries to put a username in the email field too
        if (!finalEmail.includes('@')) {
          finalEmail = `${finalUsername.toLowerCase() || finalEmail.toLowerCase()}@masry.club`;
        }
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          setError('يجب أن تكون كلمة المرور ٦ أحرف على الأقل');
          setLoading(false);
          return;
        }

        // Basic username validation
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(finalUsername)) {
          setError('اسم المستخدم يجب أن يكون بالإنجليزي، من ٣-٢٠ حرف، وبدون مسافات');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        // Create user doc in Firestore
        const joinDate = new Date().getFullYear().toString();
        // Check if bootstrap admin
        const isAdmin = finalEmail.toLowerCase() === 'copyrightofficialco@gmail.com' || 
                        finalEmail.toLowerCase() === 'omarmagedugm@gmail.com' ||
                        finalEmail.toLowerCase() === 'itthadalexchannel2@gmail.com' ||
                        finalEmail.toLowerCase() === 'itthadalexchannel2@masry.club' ||
                        finalEmail.toLowerCase()?.startsWith('itthadalexchannel2@') ||
                        finalUsername.toLowerCase() === 'itthadalexchannel2' ||
                        finalUsername.toLowerCase() === 'admin' ||
                        finalEmail.toLowerCase() === 'admin@masry.club';
        
        const userData: any = {
          uid: user.uid,
          name,
          username: finalUsername.toLowerCase(),
          email: finalEmail,
          role: (isAdmin ? 'admin' : 'user') as 'user' | 'admin',
          tier: 'new',
          bio: 'مشجع جديد في عائلة النادي المصري - النسور الخضراء',
          joinDate,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=ffffff&background=10b981`,
          stats: {
            predictions: 0,
            comments: 0,
            favorites: 0
          }
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
        
        // If admin, also add to admins collection for security rules
        if (isAdmin) {
          try {
            await setDoc(doc(db, 'admins', user.uid), { email: finalEmail, grantedAt: new Date().toISOString() });
          } catch (e) {
            console.warn("Could not set extra admin record", e);
          }
        }
        
        updateLocalProfile(userData);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
        const user = userCredential.user;
        
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', user.uid));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          throw err;
        }

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Ensure bootstrap admins are set as admin if not already
          const isUserBootstrap = finalEmail.toLowerCase() === 'omarmagedugm@gmail.com' ||
                                  finalEmail.toLowerCase() === 'itthadalexchannel2@gmail.com' ||
                                  finalEmail.toLowerCase() === 'itthadalexchannel2@masry.club' ||
                                  finalEmail.toLowerCase()?.startsWith('itthadalexchannel2@') ||
                                  userData?.username?.toLowerCase() === 'itthadalexchannel2' ||
                                  userData?.username?.toLowerCase() === 'admin' ||
                                  finalEmail.toLowerCase() === 'admin@masry.club';
          if (isUserBootstrap && userData.role !== 'admin') {
            try {
              await setDoc(doc(db, 'users', user.uid), { ...userData, role: 'admin' }, { merge: true });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
            }
            try {
              await setDoc(doc(db, 'admins', user.uid), { email: finalEmail, grantedAt: new Date().toISOString() });
            } catch (e) {}
            userData.role = 'admin';
          }
          updateLocalProfile(userData);
        }
      }
      navigate('/');
    } catch (err: any) {
      console.error('Auth Error Details:', err);
      const code = err.code || '';
      
      if (code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو إنشاء حساب جديد.');
      } else if (code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
        setError('بيانات الدخول غير موجودة. هل قمت بإنشاء حساب بهذا البريد؟');
      } else if (code === 'auth/wrong-password') {
        setError('كلمة المرور غير صحيحة، يرجى المحاولة ثانية');
      } else if (code === 'auth/invalid-email') {
        setError('تنسيق البريد الإلكتروني أو اسم المستخدم غير صحيح');
      } else if (code === 'auth/email-already-in-use') {
        setError('هذا الحساب مسجل بالفعل، جرب تسجيل الدخول بدلاً من التسجيل الجديد');
      } else if (code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً، اختر ٦ أحرف أو أكثر');
      } else if (code === 'auth/network-request-failed') {
        setError('خطأ في الاتصال بالإنترنت، يرجى المحاولة لاحقاً');
      } else if (code === 'auth/too-many-requests') {
        setError('تم حظر المحاولات مؤقتاً لكثرة الأخطاء، حاول بعد قليل');
      } else {
        setError(`خطأ: ${code || 'المستخدم غير موجود'}. برجاء التأكد من صحة البيانات أو إنشاء حساب جديد`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col p-6 items-center justify-center relative overflow-hidden font-display">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -ml-32 -mb-32"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
             {(appSettings.logoType || 'image') === 'image' ? (
                <img src={getOptimizedImage(appSettings.appLogo, 200) || undefined} onError={(e) => { e.currentTarget.src = '/icon.png'; }} alt="Logo" className="h-20 w-20 object-contain drop-shadow-xl" referrerPolicy="no-referrer" />
             ) : (
                <h1 className="text-4xl font-black text-primary-dark drop-shadow-xl">{appSettings.logoText}</h1>
             )}
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10"></div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{appSettings.appName}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">نادي الشعب</p>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-3xl p-8 shadow-2xl border border-border-light dark:border-border-dark text-right">
          <div className="flex bg-slate-100 dark:bg-surface-dark p-1 rounded-2xl mb-8">
            <button 
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${mode === 'login' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-slate-500'}`}
            >
              دخول
            </button>
            <button 
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${mode === 'signup' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-slate-500'}`}
            >
              تسجيل جديد
            </button>
          </div>

          <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'forgot' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <p className="text-xs font-bold text-slate-500 text-center mb-4">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لاستعادة كلمة المرور</p>
                </motion.div>
              )}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pb-2"
                >
                  <div>
                    <label className="text-xs font-black text-slate-500 mb-1.5 block px-1">الاسم الكامل</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أدخل اسمك الشائع"
                        className="w-full bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:border-primary outline-none transition-all font-bold text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 mb-1.5 block px-1">اسم المستخدم</label>
                    <div className="relative">
                      <AtSign className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        dir="ltr"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="w-full bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:border-primary outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-black text-slate-500 mb-1.5 block px-1">
                {mode === 'signup' ? 'البريد الإلكتروني' : 'البريد الإلكتروني أو اسم المستخدم'}
              </label>
              <div className="relative text-left">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="البريد أو اسم المستخدم"
                  className="w-full bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:border-primary outline-none transition-all font-bold"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <label className="text-xs font-black text-slate-500 block">كلمة المرور</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative text-left">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:border-primary outline-none transition-all font-bold"
                  />
                </div>
              </div>
            )}

            {error && error === 'unauthorized-domain' && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 my-3 text-right">
                <div className="flex items-start gap-3">
                  <div className="bg-red-500 text-white rounded-full p-1 mt-0.5 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-red-600 dark:text-red-400 font-black text-xs mb-1">
                      النطاق غير مصرح به في إعدادات Firebase
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                      يرجى إضافة النطاقات التالية في لوحة تحكم Firebase (Authentication 🡨 Settings 🡨 Authorized Domains):
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-3 font-mono text-xs">
                  {Array.from(new Set([
                    window.location.hostname,
                    'masry-tv.vercel.app',
                    'ais-dev-tmoviqflfl2mdtiuodosjm-224432693707.europe-west2.run.app',
                    'ais-pre-tmoviqflfl2mdtiuodosjm-224432693707.europe-west2.run.app'
                  ])).map((domain, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(domain);
                          setCopiedIndex(index);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={12} className="text-green-500 animate-bounce" />
                            <span className="text-green-500">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="text-slate-400" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                      <span className="text-slate-800 dark:text-slate-250 select-all font-bold tracking-tight text-[11px] text-left break-all font-mono">{domain}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && error !== 'unauthorized-domain' && (
              <p className="text-red-500 text-[10px] font-bold bg-red-50 dark:bg-red-900/10 p-2 rounded-lg text-center">{error}</p>
            )}

            {success && (
              <p className="text-green-500 text-[10px] font-bold bg-green-50 dark:bg-green-900/10 p-2 rounded-lg text-center">{success}</p>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 pressable disabled:opacity-70 mt-4 active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : mode === 'forgot' ? (
                'استعادة كلمة المرور'
              ) : mode === 'login' ? (
                'تسجيل الدخول'
              ) : (
                'إنشاء حساب'
              )}
            </button>

            {mode === 'forgot' && (
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-bold text-slate-500 mt-4 hover:text-primary transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            )}

            {mode !== 'forgot' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-border-dark"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-card-dark text-slate-500 font-bold">أو</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-700 dark:text-white py-4 rounded-2xl font-black text-sm shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
                  الدخول بواسطة Google
                </button>


              </>
            )}
          </form>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="mt-8 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors mx-auto font-black text-sm"
        >
          <ArrowLeft size={16} />
          التصفح كزائر
        </button>
      </motion.div>
    </div>
  );
}
