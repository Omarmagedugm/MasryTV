import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';
import { useAppStore } from './store';
import { useFirestoreSync } from './hooks/useFirestore';
import { auth, requestNotificationPermission } from './lib/firebase';

import Auth from './pages/Auth';
import Home from './pages/Home';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Media from './pages/Media';
import Live from './pages/Live';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import FanZone from './pages/FanZone';
import JerseyTryOn from './pages/JerseyTryOn';
import History from './pages/History';
import Store from './pages/Store';
import Bookmarks from './pages/Bookmarks';
import Library from './pages/Library';
import CustomPage from './pages/CustomPage';

import BottomNav from './components/BottomNav';
import TopHeader from './components/TopHeader';
import MusicPlayer from './components/MusicPlayer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import GoalCelebration from './components/GoalCelebration';
import WinCelebration from './components/WinCelebration';

export default function App() {
  useFirestoreSync();
  const matches = useAppStore(state => state.matches);
  const [showGoal, setShowGoal] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [scoredTeam, setScoredTeam] = useState('');
  const [activeMatch, setActiveMatch] = useState<any>(null);
  
  const lastGoalCheck = useRef<Record<string, number>>({});
  const lastMatchStatus = useRef<Record<string, string>>({});
  const isInitialized = useRef(false);

  useEffect(() => {
    // Check for Al-Masry goals in live matches
    const masryMatches = matches.filter(m => 
      m.status === 'live' && (m.homeTeam.includes('مصري') || m.awayTeam.includes('masry') || m.homeTeam.includes('Masry') || m.awayTeam.includes('Masry'))
    );

    if (!isInitialized.current && masryMatches.length > 0) {
      masryMatches.forEach(m => {
        const isHome = m.homeTeam.includes('مصري') || m.homeTeam.includes('Masry');
        lastGoalCheck.current[m.id] = isHome ? parseInt(m.homeScore || "0") : parseInt(m.awayScore || "0");
      });
      isInitialized.current = true;
      return;
    }

    masryMatches.forEach(match => {
      const isHome = match.homeTeam.includes('مصري') || match.homeTeam.includes('Masry');
      const currentScore = isHome ? parseInt(match.homeScore || "0") : parseInt(match.awayScore || "0");
      const prevScore = lastGoalCheck.current[match.id];

      // Only trigger if we already had a record for this match (app was open)
      if (prevScore !== undefined && currentScore > prevScore) {
        setScoredTeam(isHome ? match.homeTeam : match.awayTeam);
        setActiveMatch(match);
        setShowGoal(true);
      }
      
      // Update check state
      if (currentScore !== prevScore) {
        lastGoalCheck.current[match.id] = currentScore;
      }
    });

    // Victory Detection
    matches.forEach(match => {
      const prevStatus = lastMatchStatus.current[match.id];
      if (prevStatus === 'live' && match.status === 'finished') {
        const homeScore = parseInt(match.homeScore || "0");
        const awayScore = parseInt(match.awayScore || "0");
        
        const isMasryHome = match.homeTeam.includes('مصري') || match.homeTeam.includes('Masry');
        const isMasryAway = match.awayTeam.includes('مصري') || match.awayTeam.includes('Masry');
        
        if ((isMasryHome && homeScore > awayScore) || (isMasryAway && awayScore > homeScore)) {
          setActiveMatch(match);
          setShowWin(true);
        }
      }
      if (prevStatus !== match.status) {
        lastMatchStatus.current[match.id] = match.status;
      }
    });
  }, [matches]);

  const handleGoalComplete = () => {
    setShowGoal(false);
  };
  useEffect(() => {
    // If permission is already granted, refresh the token and update metadata
    if ('Notification' in window && Notification.permission === 'granted') {
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 5000); // Wait a bit after load
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const seedRequestedMatches = async () => {
      const isSeeded = localStorage.getItem('user_requested_matches_seeded_v2');
      if (isSeeded) return;

      try {
        const { collection, addDoc, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        const requestedMatches = [
          { date: "2026-05-20", homeTeam: "المصري", awayTeam: "الأهلي", homeScore: "-", awayScore: "-", status: "upcoming", stadium: "ستاد برج العرب", time: "20:00" },
          { date: "2026-05-01", homeTeam: "سيراميكا كليوباترا", awayTeam: "المصري", homeScore: "0", awayScore: "1", status: "finished" },
          { date: "2026-03-10", homeTeam: "المصري", awayTeam: "الجونة", homeScore: "1", awayScore: "0", status: "finished" },
          { date: "2026-03-01", homeTeam: "إنبي", awayTeam: "المصري", homeScore: "2", awayScore: "3", status: "finished" },
          { date: "2026-02-25", homeTeam: "المصري", awayTeam: "مودرن سبورت", homeScore: "0", awayScore: "1", status: "finished" },
          { date: "2026-02-19", homeTeam: "المقاولون العرب", awayTeam: "المصري", homeScore: "1", awayScore: "1", status: "finished" },
        ];

        for (const m of requestedMatches) {
          const q = query(
            collection(db, 'matches'), 
            where('homeTeam', '==', m.homeTeam), 
            where('awayTeam', '==', m.awayTeam), 
            where('date', '==', m.date)
          );
          const snap = await getDocs(q);
          if (snap.empty) {
            await addDoc(collection(db, 'matches'), {
              ...m,
              homeLogo: (m.homeTeam === 'المصري' || m.homeTeam.includes('المصري')) ? 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777720049/admin_homeLogo/bsxn6a8jxy6yfbyh56df.png' : 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Al_Ahly_SC_logo.png/150px-Al_Ahly_SC_logo.png',
              awayLogo: (m.awayTeam === 'المصري' || m.awayTeam.includes('المصري')) ? 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777720049/admin_homeLogo/bsxn6a8jxy6yfbyh56df.png' : 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Al_Ahly_SC_logo.png/150px-Al_Ahly_SC_logo.png',
              competition: 'الدوري المصري',
              time: m.time || "20:00",
              stadium: m.stadium || 'إستاد برج العرب',
              channel: 'OnTime Sports',
              isMatchDay: false,
              createdAt: new Date().toISOString(),
              sport: 'football'
            });
          }
        }
        localStorage.setItem('user_requested_matches_seeded_v2', 'true');
      } catch (err) {
        console.error("Auto Seeder Error:", err);
      }
    };
    
    seedRequestedMatches();
  }, []);

  const theme = useAppStore(state => state.theme);
  const setIsAuthReady = useAppStore(state => state.setIsAuthReady);
  const updateProfile = useAppStore(state => state.updateProfile);

  useEffect(() => {
    // We already have testConnection in firebase.ts which logs to console.
    // Let's add a global listener for firebase errors
    const handleFirebaseError = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.code === 'unavailable') {
        toast.error('عذراً، تعذر الاتصال بخادم البيانات. يرجى التحقق من اتصالك بالإنترنت.', {
          id: 'firestore-unavailable',
          duration: 5000
        });
      }
    };
    window.addEventListener('firestore-error', handleFirebaseError);
    return () => window.removeEventListener('firestore-error', handleFirebaseError);
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        // Optimistically set UID in profile so Redirector knows we are logged in
        updateProfile({ uid: user.uid, email: user.email || '' });
      } else {
        updateProfile({ uid: undefined });
      }
      setIsAuthReady(true);
    });
    return unsub;
  }, [setIsAuthReady, updateProfile]);

  useEffect(() => {
    const root = window.document.documentElement;
    const themeColorMeta = document.getElementById('theme-color-meta');
    
    if (theme === 'dark') {
      root.classList.add('dark');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#052212'); // background-dark
    } else {
      root.classList.remove('dark');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#F8FAFC'); // background-light
    }
  }, [theme]);

  useEffect(() => {
    const handleFcmMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { title, body } = customEvent.detail;
      toast.success(
        <div className="flex flex-col gap-1 cursor-pointer">
          <div className="font-bold text-sm">{title}</div>
          {body && <div className="text-xs opacity-90">{body}</div>}
        </div>,
        { duration: 6000 }
      );
    };

    window.addEventListener('fcm-message', handleFcmMessage);
    return () => window.removeEventListener('fcm-message', handleFcmMessage);
  }, []);

  // Auth Redirection Logic
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthRedirector />
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 4000,
          className: 'bg-white dark:bg-card-dark text-slate-800 dark:text-white font-bold font-display shadow-2xl rounded-2xl border border-border-light dark:border-border-dark',
        }}
      />
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex flex-col font-display antialiased transition-colors duration-200">
        <TopHeader />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<FanZone />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/media" element={<Media />} />
          <Route path="/live" element={<Live />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/fan-zone" element={<FanZone />} />
          <Route path="/jersey-tryon" element={<JerseyTryOn />} />
          <Route path="/history" element={<History />} />
          <Route path="/store" element={<Store />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/library" element={<Library />} />
          <Route path="/page/:slug" element={<CustomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AppNav />
        <MusicPlayer />
        <PWAInstallPrompt />
        <WinCelebration
          show={showWin}
          onComplete={() => setShowWin(false)}
          match={activeMatch}
        />
        <GoalCelebration 
          show={showGoal} 
          onComplete={handleGoalComplete} 
          teamName={scoredTeam} 
          match={activeMatch}
        />
      </div>
    </BrowserRouter>
  );
}

function AuthRedirector() {
  const profile = useAppStore(state => state.profile);
  const isAuthReady = useAppStore(state => state.isAuthReady);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthReady) return;

    // If logged in and on auth page, go home
    if (profile.uid && location.pathname === '/auth') {
      navigate('/', { replace: true });
    }
    // If not logged in and on a protected page like admin or profile, go to auth
    const protectedPaths = ['/admin', '/profile', '/bookmarks', '/store']; 
    if (!profile.uid && protectedPaths.includes(location.pathname)) {
      navigate('/auth', { replace: true });
    }
  }, [profile.uid, location.pathname, navigate, isAuthReady]);

  return null;
}

function AppNav() {
  const location = useLocation();
  const hideNavPaths = ['/auth'];
  const isSplashOrAuth = hideNavPaths.includes(location.pathname);
  if (isSplashOrAuth) return null;
  return <BottomNav />;
}
