import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  ArrowLeft,
  Users,
  Newspaper,
  Trophy,
  Settings,
  ShoppingBag,
  MapPin,
  Music,
  Shield,
  HelpCircle,
  Play
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import backupData from '../../import_backup_temp.json';

interface CollectionImportStatus {
  name: string;
  label: string;
  icon: any;
  total: number;
  imported: number;
  failed: number;
  status: 'idle' | 'running' | 'success' | 'failed' | 'partial';
  errorMsg?: string;
}

export default function DbSetup() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isImporting, setIsImporting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // Monitor auth state
  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  const [collections, setCollections] = useState<CollectionImportStatus[]>([
    { name: 'users', label: 'حسابات المستخدمين', icon: Users, total: backupData.users?.length || 0, imported: 0, failed: 0, status: 'idle' },
    { name: 'news', label: 'الأخبار والتقارير', icon: Newspaper, total: backupData.news?.length || 0, imported: 0, failed: 0, status: 'idle' },
    { name: 'matches', label: 'المباريات والمواعيد', icon: Trophy, total: backupData.matches?.length || 0, imported: 0, failed: 0, status: 'idle' },
    { name: 'settings', label: 'إعدادات الصفحات والتنسيق', icon: Settings, total: backupData.settings?.length || 0, imported: 0, failed: 0, status: 'idle' },
    { name: 'products', label: 'منتجات المتجر الرسمي', icon: ShoppingBag, total: backupData.products?.length || 0, imported: 0, failed: 0, status: 'idle' },
    { name: 'club_stadiums', label: 'بيانات الملاعب والاستاد', icon: MapPin, total: backupData.club_stadiums?.length || 0, imported: 0, failed: 0, status: 'idle' },
    { name: 'club_titles', label: 'البطولات والألقاب الكروية', icon: Trophy, total: backupData.club_titles?.length || 0, imported: 0, failed: 0, status: 'idle' }
  ]);

  const handleStartImport = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setIsDone(false);
    setOverallProgress(0);

    const updated = [...collections];
    let totalItems = updated.reduce((sum, c) => sum + c.total, 0);
    let cumulativeImported = 0;

    for (let i = 0; i < updated.length; i++) {
      const col = updated[i];
      if (col.total === 0) {
        updated[i].status = 'success';
        setCollections([...updated]);
        continue;
      }

      updated[i].status = 'running';
      updated[i].imported = 0;
      updated[i].failed = 0;
      setCollections([...updated]);

      // Get appropriate array from backup data
      const itemsToImport = (backupData as any)[col.name] || [];

      for (const item of itemsToImport) {
        if (!item.id && !item.uid) {
          updated[i].failed++;
          cumulativeImported++;
          setOverallProgress(Math.round((cumulativeImported / totalItems) * 100));
          setCollections([...updated]);
          continue;
        }

        const docId = item.id || item.uid;
        // Strip out the ID key from active document data
        const { id, uid, ...docData } = item;
        
        try {
          // Write document individually to ensure correct client rules verification 
          await setDoc(doc(db, col.name, docId), docData);
          updated[i].imported++;
        } catch (error: any) {
          console.error(`Error importing to ${col.name} (${docId}):`, error);
          updated[i].failed++;
          updated[i].errorMsg = error?.message || 'Unauthorized / Permission Denied';
        }

        cumulativeImported++;
        setOverallProgress(Math.round((cumulativeImported / totalItems) * 100));
        setCollections([...updated]);
        
        // Minor throttle to keep the browser responsive
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      if (updated[i].failed === 0) {
        updated[i].status = 'success';
      } else if (updated[i].imported === 0) {
        updated[i].status = 'failed';
      } else {
        updated[i].status = 'partial';
      }
      setCollections([...updated]);
    }

    setIsImporting(false);
    setIsDone(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 direction-rtl" dir="rtl">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-8 border-b border-border-light dark:border-border-dark pb-4">
        <Link to="/" className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
          <ArrowLeft size={18} />
          <span>العودة للرئيسية</span>
        </Link>
        <div className="flex items-center gap-2">
          <Database className="text-emerald-600 dark:text-emerald-400" size={24} />
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">تحميل وربط البيانات</h1>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Steps & Warnings */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark p-6 shadow-sm">
            <h2 className="font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Shield className="text-emerald-600" size={20} />
              <span>خطوات هامة للنجاح</span>
            </h2>
            <ul className="space-y-4 text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 font-bold rounded-lg w-6 h-6 shrink-0">١</span>
                <span>تأكد من <strong>تسجيل الدخول</strong> بحساب المشرف الرئيسي (مثل <code>omarmagedugm@gmail.com</code>).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 font-bold rounded-lg w-6 h-6 shrink-0">٢</span>
                <span>تأكد من نشر وتفعيل قواعد الحماية <code>firestore.rules</code> في كونسول Firebase الخاص بالمشروع لتسمح للمشرفين بالكتابة.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 font-bold rounded-lg w-6 h-6 shrink-0">٣</span>
                <span>اضغط على مفتاح <strong>"بدء الاستيراد"</strong> لتغذية قاعدة بياناتك بكافة التقارير، المنتجات، المباريات ومصادر الأخبار وموقعك بالكامل.</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5">
            <div className="flex gap-3 mb-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={20} />
              <h3 className="font-black text-sm text-amber-800 dark:text-amber-400">حالة الاتصال النشطة</h3>
            </div>
            {currentUser ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                أنت مسجل الدخول حالياً بالبريد الالكتروني بصفة مشرف: <br/>
                <span className="font-mono font-bold">{currentUser.email}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                برجاء الدخول لحساب المشرف الخاص بك أولاً عبر صفحة <Link to="/auth" className="underline font-bold text-emerald-600 hover:underline">تسجيل الدخول</Link> لتمتلك صلاحية الكتابة.
              </p>
            )}
          </div>

          {/* Troubleshooting Guidelines (Always visible but highlighted on failure) */}
          <div className={`p-6 rounded-2xl border transition-all duration-300 ${
            collections.some(c => c.status === 'failed' || c.status === 'partial')
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 ring-2 ring-red-500/20'
              : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
          }`}>
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <HelpCircle className="text-red-500 shrink-0" size={18} />
              <span>دليل حل مشكلة الفشل (Permission Denied)</span>
            </h3>
            
            <div className="space-y-4 text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">١. تفعيل Auth في Firebase Console:</p>
                <p className="text-xs">تأكد من تمكين مسار <strong>Email/Password</strong> و <strong>Google</strong> في تبويب Authentication داخل لوحة تحكم مشروع Firebase الخاص بك.</p>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">٢. تعديل قواعد الحماية (Rules):</p>
                <p className="text-xs mb-2">قواعد الحماية تمنع الكتابة العامة حالياً لمنع من يعبث بقاعدتك. اذهب إلى <strong>Console &gt; Firestore &gt; Rules</strong> وضع القواعد التالية مؤقتاً لتسمح للبرنامج بكتابة القائمة الأساسية:</p>
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[10px] select-all overflow-x-auto border border-slate-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1.5">⚠️ تذكر: أعد تنشيط قواعد الحماية الأصلية فور انتهاء الاستيراد لحماية وخصوصية حسابات ومعلومات المستخدمين.</p>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">٣. تسجيل الدخول عبر التطبيق أولاً:</p>
                <p className="text-xs">إذا قمت بتثبيت القواعد الصارمة، يجب عليك النقر على <Link to="/auth" className="underline font-bold text-emerald-600 hover:underline">تسجيل الدخول</Link> واستعمال حساب Google بالبريد <code>{currentUser?.email || 'omarmagedugm@gmail.com'}</code> ليتم منحك دور المشرف الأعلى للكتابة.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Execution progress dashboard */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm flex flex-col">
            <h2 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-1">مركز المزامنة والاستيراد</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-6">
              سوف نقوم بتحميل مجموعات البيانات التالية إلى مشروعك الجديد على Firebase:
            </p>

            {/* Collections Grid */}
            <div className="space-y-4 mb-8">
              {collections.map((col) => {
                const IconComponent = col.icon;
                return (
                  <div key={col.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 p-2.5 rounded-xl">
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{col.label}</h3>
                        <p className="text-xs text-slate-400 font-medium">قاعدة البيانات: {col.name}</p>
                        {col.errorMsg && (
                          <p className="text-xs text-red-500 font-medium mt-1 font-mono max-w-xs break-words">{col.errorMsg}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Count Info */}
                      <span className="text-xs text-slate-500 font-bold">
                        {col.status === 'idle' ? `${col.total} عنصر` : `${col.imported} من ${col.total}`}
                      </span>

                      {/* Status badge */}
                      {col.status === 'idle' && (
                        <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-bold">في الانتظار</span>
                      )}
                      {col.status === 'running' && (
                        <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-600 px-3 py-1 rounded-full font-bold">
                          <RefreshCw className="animate-spin" size={12} />
                          <span>جاري العمل</span>
                        </span>
                      )}
                      {col.status === 'success' && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 px-3 py-1 rounded-full font-bold">
                          <CheckCircle2 size={12} />
                          <span>اكتمل</span>
                        </span>
                      )}
                      {col.status === 'partial' && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-950 text-amber-600 px-3 py-1 rounded-full font-bold">
                          <AlertTriangle size={12} />
                          <span>غير مكتمل ({col.failed} فشل)</span>
                        </span>
                      )}
                      {col.status === 'failed' && (
                        <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-950 text-red-600 px-3 py-1 rounded-full font-bold">
                          <XCircle size={12} />
                          <span>فشل ({col.failed})</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Global progress bar */}
            {isImporting && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
                  <span>نسبة تقدم استيراد البيانات الإجمالية</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="flex flex-col sm:flex-row gap-4 items-center mt-auto justify-between border-t border-border-light dark:border-border-dark pt-6">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-right">
                {isDone ? (
                  <span className="text-green-600 dark:text-green-400 font-bold">✓ تم الانتهاء من عملية تغذية قاعدة البيانات بنجاح!</span>
                ) : (
                  <span>اضغط على الزر للبدء، تستغرق العملية بضع دقائق كأقصى حد.</span>
                )}
              </div>
              
              <button
                onClick={handleStartImport}
                disabled={isImporting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl transition shadow-lg shrink-0"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>جاري الكتابة والمزامنة...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>ابدأ استيراد البيانات الحالية</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
