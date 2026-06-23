import { Link, useNavigate } from "react-router-dom";
import { useAppStore, useResolvedMatches } from "../store";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import {
  Menu,
  LayoutDashboard,
  Flag,
  Info,
  ShieldCheck,
  Mail,
  Edit2,
  Bell,
  Search,
  Settings,
  CloudSun,
  Cloud,
  CloudMoon,
  Moon,
  MapPin,
  Sunrise,
  Sunset,
  Thermometer,
  Trophy,
  CloudRain,
  Sun,
  Snowflake,
  CloudLightning,
  Activity,
  BarChart2,
  Dribbble,
  Plus,
  Minus,
  Play,
  Pause,
  StopCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { onSnapshot, doc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import AdvertiseWidget from "../components/AdvertiseWidget";
import TicketsWidget from "../components/TicketsWidget";
import HtmlWidget from "../components/HtmlWidget";
import { SafeImage } from "../components/SafeImage";
import { getOptimizedImage } from "../lib/cloudinary";

export default function Home() {
  const matches = useResolvedMatches();
  const {
    news,
    media,
    liveStream,
    profile,
    homeSections,
    cityInfo,
    ads,
    appSettings,
    newsTags,
    stadiumOpacity,
    setStadiumOpacity,
  } = useAppStore();
  const [tick, setTick] = useState(0);
  const [clarityOpen, setClarityOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<any>({ 
    enabled: true, 
    bannerTitle: 'استوديو النسور الخضراء', 
    bannerDescription: 'حول صورتك بالذكاء الاصطناعي وارتدي تيشيرت النادي المصري في بورسعيد الباسلة',
    bannerImage: ''
  });

  useEffect(() => {
    const unsubAiConfig = onSnapshot(doc(db, 'settings', 'ai_config'), (snap) => {
      if (snap.exists()) setAiConfig(snap.data());
    }, (error) => console.warn('Could not read settings/ai_config:', error));
    return () => unsubAiConfig();
  }, []);

  const isOmar = auth.currentUser?.email?.toLowerCase() === "omarmagedugm@gmail.com" || 
                 auth.currentUser?.email?.toLowerCase() === "itthadalexchannel2@gmail.com" ||
                 auth.currentUser?.email?.toLowerCase() === "itthadalexchannel2@masry.club" ||
                 auth.currentUser?.email?.toLowerCase()?.startsWith("itthadalexchannel2@") ||
                 profile?.username?.toLowerCase() === "itthadalexchannel2";
  const isDev = auth.currentUser?.email?.toLowerCase() === "copyrightofficialco@gmail.com";
  const isAdmin = (auth.currentUser && profile?.role === "admin") || isOmar || isDev;
  const [autoWeather, setAutoWeather] = useState<{
    temp: string;
    condition: string;
    sunrise: string;
    sunset: string;
    isDay?: boolean;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const citySection = homeSections.find(
      (s) => s.type === "city" || s.id === "city",
    );
    if (citySection?.active && (!cityInfo || cityInfo.active !== false)) {
      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=31.2653&longitude=32.3019&current_weather=true&daily=sunrise,sunset&timezone=Africa%2FCairo&forecast_days=1",
      )
        .then(async (r) => {
          if (!r.ok) {
            throw new Error(`Weather API responded with status: ${r.status}`);
          }
          return r.json();
        })
        .then((data) => {
          if (
            !data ||
            !data.current_weather ||
            !data.daily ||
            !data.daily.sunrise ||
            !data.daily.sunset
          )
            return;

          const weatherCodeToText = (code: number) => {
            if (code === 0) return "sun";
            if (code === 1) return "sun";
            if (code === 2) return "partly_cloudy";
            if (code === 3) return "cloudy";
            if (code === 45 || code === 48) return "foggy";
            if (code >= 51 && code <= 55) return "drizzle";
            if (code >= 61 && code <= 65) return "rainy";
            if (code >= 71 && code <= 75) return "snowy";
            if (code >= 80 && code <= 82) return "showers";
            if (code >= 95) return "thunderstorm";
            return "cloudy";
          };

          const formatTime = (timeStr: string) => {
            try {
              if (!timeStr) return "--:--";
              const date = new Date(timeStr);
              if (isNaN(date.getTime())) return "--:--";
              let hours = date.getHours();
              const mins = date.getMinutes().toString().padStart(2, "0");
              const ampm = hours >= 12 ? "PM" : "AM";
              hours = hours % 12;
              hours = hours ? hours : 12;
              return `${hours}:${mins} ${ampm}`;
            } catch (e) {
              return "--:--";
            }
          };

          setAutoWeather({
            temp: Math.round(data.current_weather.temperature ?? 25).toString(),
            condition: weatherCodeToText(data.current_weather.weathercode ?? 0),
            sunrise: formatTime(data.daily.sunrise[0]),
            sunset: formatTime(data.daily.sunset[0]),
            isDay: data.current_weather.is_day === 1,
          });
        })
        .catch((err) => {
          console.warn("Weather fetch suppressed:", err.message);
        });
    }
  }, [homeSections, cityInfo?.active]);

  const calculateCurrentTimeFormat = (match: any) => {
    if (!match.isTimerRunning || !match.timerStartTime) {
      return `${String(match.timerBaseMinute || 0).padStart(2, '0')}:00'`;
    }
    const start = new Date(match.timerStartTime).getTime();
    if (isNaN(start)) {
      return `${String(match.timerBaseMinute || 0).padStart(2, '0')}:00'`;
    }
    const totalSeconds = Math.max(0, Math.floor((new Date().getTime() - start) / 1000));
    const baseSeconds = Number(match.timerBaseMinute || 0) * 60;
    const currentSeconds = baseSeconds + totalSeconds;
    const mm = Math.floor(currentSeconds / 60);
    const ss = currentSeconds % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}'`;
  };

  const handleScoreUpdate = async (matchId: string, team: 'home' | 'away', change: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const currentScore = team === 'home' ? parseInt(match.homeScore || "0") : parseInt(match.awayScore || "0");
    const newScore = Math.max(0, currentScore + change);

    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'matches', matchId), {
        [team === 'home' ? 'homeScore' : 'awayScore']: newScore.toString(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  const handleStatusUpdate = async (matchId: string, newStatus: 'live' | 'finished' | 'upcoming', toggleTimer?: boolean) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (toggleTimer !== undefined) {
        updates.isTimerRunning = !match.isTimerRunning;
        if (updates.isTimerRunning) {
          updates.timerStartTime = new Date().toISOString();
        } else {
          // Store current minute as base before stopping
          const now = new Date();
          const start = match.timerStartTime ? new Date(match.timerStartTime) : now;
          const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
          updates.timerBaseMinute = (match.timerBaseMinute || 0) + diffMinutes;
        }
      } else if (newStatus === 'live' && match.status !== 'live') {
        updates.isTimerRunning = true;
        updates.timerStartTime = new Date().toISOString();
        updates.timerBaseMinute = 0;
      } else if (newStatus === 'finished') {
        updates.isTimerRunning = false;
      }

      await updateDoc(doc(db, 'matches', matchId), updates);
      toast.success(toggleTimer ? (updates.isTimerRunning ? 'تم استئناف الوقت' : 'تم إيقاف الوقت مؤقتاً') : 'تم تحديث حالة المباراة');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('فشل تحديث الحالة');
    }
  };



  const recentNews = news.slice(0, 5);
  const recentMedia = media.slice(0, 5);

  const allFeatured = useMemo(() => matches
    .filter((m) => m.featured === true)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [matches]);

  const allLive = useMemo(() => matches.filter((m) => m.status === "live"), [matches]);

  const sportMatches = useMemo(() => matches.filter(
    (m) =>
      m.sport === 'football' || !m.sport,
  ), [matches]);

  // Strict hero selection that respects active filter without cross-sport fallbacks
  const heroMatch = useMemo(() => 
    sportMatches.find((m) => m.status === "live") ||
    sportMatches.find((m) => m.featured === true) ||
    sportMatches.find((m) => m.status === "upcoming") ||
    sportMatches[0], [sportMatches]); // If there are no matches, this is undefined. We do NOT fallback to another sport here to avoid bugs.

  // Logic for upcoming matches: prioritize the 'current' sport selected by user
  const currentSport = "football";
  
  const upcomingMatches = matches
    .filter(
      (m) =>
        m.status === "upcoming" &&
        m.id !== heroMatch?.id &&
        (m.sport === 'football' || !m.sport),
    )
    .slice(0, 3);

  let timeLeft = { d: 0, h: 0, m: 0, s: 0 };
  let isUpcoming = false;
  if (heroMatch?.status === "upcoming" && heroMatch.date) {
    const diff = new Date(heroMatch.date).getTime() - new Date().getTime();
    if (diff > 0) {
      isUpcoming = true;
      timeLeft = {
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60),
      };
    }
  }

  const renderSection = (section: any) => {
    if (!section.active) return null;

    const hour = new Date().getHours();
    const timePhase = hour >= 6 && hour < 18 ? "day" : "night";

    const cardBg = timePhase === "day" 
        ? "bg-gradient-to-br from-[#0b5c06] via-[#0d6b07] to-[#084a04] border-[#0d6b07]/30" 
        : "bg-gradient-to-br from-[#063503] via-[#094a05] to-[#042802] border-[#094a05]/40";

    switch (
      section.type === "custom" && section.id === "city" ? "city" : section.type
    ) {
      case "hero":
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative"
          >
            {!heroMatch ? (
              <div className="relative bg-slate-50 dark:bg-surface-dark p-16 rounded-[48px] flex flex-col items-center justify-center text-center gap-4 border border-dashed border-slate-300 dark:border-border-dark shadow-premium">
                <Trophy size={56} className="text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-black text-slate-500">
                  لا توجد مباريات كرة قدم حالياً
                </p>
              </div>
            ) : (
              <div className="relative">
                {isAdmin && (
                  <button
                    onClick={() =>
                      navigate("/admin", {
                        state: { editCategory: "matches", editId: heroMatch.id },
                      })
                    }
                    className="absolute -top-4 -right-4 z-40 h-12 w-12 bg-accent text-white rounded-[20px] shadow-glow pressable flex items-center justify-center border-4 border-white dark:border-card-dark"
                  >
                    <Edit2 size={18} />
                  </button>
                )}

                <div className="relative rounded-[56px] shadow-[0_48px_80px_-24px_rgba(0,0,0,0.5)] overflow-hidden group">
                  <div className={`relative w-full h-full cinematic-glow ${cardBg} border-none p-6 sm:p-10 rounded-[56px] transition-all duration-700`}>
                    {/* Background Effects Container */}
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none rounded-[56px]">
                      {/* Stadium Image Background */}
                      <div className="absolute inset-0 z-0 rounded-[56px] overflow-hidden">
                        <img 
                          src={heroMatch?.stadiumImage || "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2000"} 
                          className="w-full h-full object-cover filter saturate-50 transition-all duration-700 group-hover:scale-105 rounded-[56px]" 
                          style={{ 
                            opacity: (heroMatch?.stadiumOpacity ?? stadiumOpacity) * 1.2,
                            filter: `saturate(0.5) blur(${(heroMatch?.stadiumOpacity ?? stadiumOpacity) > 0.5 ? '0px' : '3px'})`
                          }}
                          alt="stadium"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent rounded-[56px]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-black/60 rounded-[56px]" />
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="mb-6 sm:mb-10 flex items-center justify-between w-full relative h-10 px-4">
                        {/* Right: Competition */}
                        <div className="absolute right-0 top-0 text-[9px] font-black text-white px-4 h-9 rounded-2xl backdrop-blur-xl border border-white/15 tracking-[0.2em] flex items-center justify-center gap-2 z-20 bg-white/10 uppercase shadow-glow">
                          <Trophy size={12} className="text-accent shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-none">{heroMatch.competition}</span>
                        </div>
                        
                        {/* Left: Match Status (Live / Finished) / Timer */}
                        <div className="absolute left-0 top-0 flex items-center h-10 gap-2 z-20">
                          {heroMatch.status === "live" ? (
                            <div className="flex shrink-0 items-center justify-center gap-2 px-4 py-1.5 h-9 bg-red-600 rounded-2xl animate-pulse shadow-[0_0_20px_rgba(231,76,60,0.5)] border border-red-500/50">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                              <span className="text-white text-[10px] font-black tracking-[0.2em] leading-none uppercase">LIVE NOW</span>
                            </div>
                          ) : heroMatch.status === "finished" ? (
                            <div className="h-9 px-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center">
                              <span className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase">FINISHED</span>
                            </div>
                          ) : null}

                          {isUpcoming && (
                            <div className="flex shrink-0 items-center gap-1 text-white dir-ltr scale-[0.85] sm:scale-110 bg-black/20 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10" dir="ltr">
                              {[
                                { val: timeLeft.d, label: "D" },
                                { val: timeLeft.h, label: "H" },
                                { val: timeLeft.m, label: "M" },
                                { val: timeLeft.s, label: "S", accent: true }
                              ].map((unit, idx, arr) => (
                                <div key={unit.label} className="flex items-center gap-1">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-[12px] font-black tabular-nums ${unit.accent ? 'text-accent' : 'text-white'}`}>
                                      {unit.val.toString().padStart(2, "0")}
                                    </span>
                                  </div>
                                  {idx < arr.length - 1 && <span className="text-white/20 text-[10px] font-bold">:</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center items-center w-full gap-4 sm:gap-14 py-4 sm:py-10">
                        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-[100px] sm:w-auto group/team shrink-0 z-10">
                          <div className="relative flex items-center justify-center p-3 sm:p-6 h-24 w-24 sm:h-48 sm:w-48">
                            <div className="absolute inset-0 bg-white/10 blur-[50px] rounded-full scale-150 group-hover/team:scale-125 transition-transform duration-1000"></div>
                            <SafeImage alt={heroMatch.homeTeam} className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-1000 group-hover/team:scale-110" src={heroMatch.homeLogo || undefined} width={300} />
                          </div>
                          <h3 className="text-center sm:text-right text-[12px] sm:text-2xl font-black text-white uppercase tracking-tighter line-clamp-1 sm:line-clamp-2 max-w-[100px] sm:max-w-[180px] drop-shadow-2xl font-serif">{heroMatch.homeTeam}</h3>
                        </div>

                        <div className="flex flex-col items-center flex-1 z-10 min-w-0">
                          <div className="flex flex-col items-center w-full">
                            {heroMatch.status === "upcoming" ? (
                              <div className="flex flex-col items-center w-full justify-center gap-2">
                                <div className="text-2xl sm:text-4xl font-black text-white/10 tracking-[0.3em] italic font-serif">VS</div>
                                <div className="px-3 py-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl shadow-xl">
                                  <p className="text-[8px] sm:text-[10px] font-bold text-white text-center whitespace-nowrap">
                                    {heroMatch.date ? format(new Date(heroMatch.date), "d MMMM | h:mm a", { locale: ar }) : "---"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-3 sm:gap-8 text-3xl sm:text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_10px_30px_rgba(46,204,113,0.3)] font-serif italic">
                                  <div className="flex flex-col items-center gap-1">
                                    {isAdmin && heroMatch.status === 'live' && (
                                      <button onClick={(e) => { e.stopPropagation(); handleScoreUpdate(heroMatch.id, "home", 1); }} className="h-6 w-6 bg-white/10 hover:bg-white/25 rounded-lg transition-all scale-75 sm:scale-100 border border-white/15"><Plus size={14} className="text-white mx-auto shadow-glow" /></button>
                                    )}
                                    <span className="leading-none">{heroMatch.homeScore}</span>
                                  </div>
                                  <span className="text-accent scale-75 sm:scale-100 leading-none pb-2 opacity-80">:</span>
                                  <div className="flex flex-col items-center gap-1">
                                    {isAdmin && heroMatch.status === 'live' && (
                                      <button onClick={(e) => { e.stopPropagation(); handleScoreUpdate(heroMatch.id, "away", 1); }} className="h-6 w-6 bg-white/10 hover:bg-white/25 rounded-lg transition-all scale-75 sm:scale-100 border border-white/15"><Plus size={14} className="text-white mx-auto shadow-glow" /></button>
                                    )}
                                    <span className="leading-none">{heroMatch.awayScore}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {heroMatch.status === "live" && (
                              <div className="mt-2 flex flex-col items-center gap-2">
                                <div className="text-2xl sm:text-4xl font-mono font-black text-white tabular-nums tracking-[0.1em] drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                  {calculateCurrentTimeFormat(heroMatch)}
                                </div>
                              </div>
                            ) || heroMatch.status === 'finished' && (
                               <div className="mt-2 px-3 py-1 bg-accent/20 border border-accent/25 rounded-full backdrop-blur-xl">
                                  <p className="text-[8px] sm:text-[10px] font-black text-accent uppercase tracking-[0.3em]">FINISHED</p>
                                </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row-reverse items-center gap-3 sm:gap-6 w-[100px] sm:w-auto group/team shrink-0 z-10">
                          <div className="relative flex items-center justify-center p-3 sm:p-6 h-24 w-24 sm:h-48 sm:w-48">
                            <div className="absolute inset-0 bg-white/10 blur-[40px] rounded-full scale-150 group-hover/team:scale-125 transition-transform duration-1000"></div>
                            <SafeImage alt={heroMatch.awayTeam} className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-1000 group-hover/team:scale-110" src={heroMatch.awayLogo || undefined} width={300} />
                          </div>
                          <h3 className="text-center sm:text-left text-[11px] sm:text-2xl font-black text-white uppercase tracking-tighter line-clamp-1 sm:line-clamp-2 max-w-[90px] sm:max-w-[160px] drop-shadow-2xl font-serif">{heroMatch.awayTeam}</h3>
                        </div>
                      </div>

                      <div className="mt-8 flex gap-4 w-full">
                        <Link
                          to={heroMatch.status === "live" || liveStream.isActive ? "/live" : "/matches"}
                          className="flex-1 h-14 rounded-2xl bg-white text-primary-dark hover:bg-primary-light hover:text-white transition-all duration-500 font-black text-[12px] flex items-center justify-center gap-3 shadow-premium relative z-30 group/btn active:scale-95"
                        >
                          <div className="h-10 w-10 rounded-xl bg-primary/5 group-hover/btn:bg-white/20 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined !text-[20px]">
                              {heroMatch.status === "live" || liveStream.isActive ? "sensors" : "stadium"}
                            </span>
                          </div>
                          {heroMatch.status === "live" || liveStream.isActive ? "شاهد البث" : "التفاصيل"}
                        </Link>

                        {heroMatch.status === "upcoming" && (
                          <Link
                            to="/fan-zone"
                            state={{ activeTab: "predictions" }}
                            className="hidden sm:flex flex-1 h-14 rounded-2xl bg-accent text-white hover:bg-accent-dark transition-all duration-500 font-black text-[12px] flex items-center justify-center gap-3 shadow-premium relative z-30 group/btn active:scale-95"
                          >
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined !text-[20px]">how_to_vote</span>
                            </div>
                            توقع النتيجة
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        );

      case "live":
        if (!liveStream.isActive) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative z-20"
          >
            <Link
              to="/live"
              className="flex items-center justify-between p-4 rounded-[32px] bg-accent/10 border border-accent/20 cinematic-glow pressable relative z-30 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-glow animate-pulse">
                  <span className="material-symbols-outlined font-variation-settings-fill">
                    broadcast_on_home
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    بث مباشر متاح الآن
                  </span>
                  <span className="text-[10px] font-bold text-accent">
                    اضغط للمتابعة الفورية
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined rotate-180">
                  arrow_back
                </span>
              </div>
            </Link>
          </motion.section>
        );

      case "custom":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Link
              to="/fan-zone"
              className="block relative overflow-hidden rounded-[48px] bg-slate-900 shadow-premium group cinematic-glow border border-white/5"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-1000"></div>
              <div className="absolute inset-0 stadium-gradient mix-blend-multiply opacity-60"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-slate-900/95 via-slate-900/50 to-transparent"></div>

              <div className="relative p-10 flex flex-col items-start gap-4">
                <div className="flex items-center gap-3 rounded-full bg-primary/20 backdrop-blur-md px-4 py-1.5 border border-primary/30">
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-glow"></div>
                  <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">
                    {section.title || "FAN COMMUNITY HUB"}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white italic tracking-tighter leading-tight font-serif">
                  منطقة المشجعين
                </h3>
                <p className="text-xs text-slate-300 font-bold max-w-[240px] leading-relaxed">
                  ساهم في النقاشات، توقع نتائج المباريات، وكن المشجع المثالي للنسور الخضراء في كل مكان.
                </p>
                <div className="mt-8 h-14 px-8 bg-white text-primary-dark rounded-[20px] text-[12px] font-black shadow-2xl flex items-center justify-center gap-3 group/cta hover:bg-primary-light hover:text-white transition-all active:scale-95">
                  دخول Fan Zone
                  <span className="material-symbols-outlined !text-xl group-hover:translate-x-2 transition-transform">
                    forum
                  </span>
                </div>
              </div>
            </Link>
          </motion.section>
        );

      case "news":
        if (news.length === 0) return null;
        return (
          <motion.section key={section.id} variants={itemVariants} className="space-y-8">
            <div className="flex flex-col gap-2 px-1">
              <h2 className="text-4xl font-black text-slate-800 dark:text-white font-serif tracking-tighter leading-none">
                {section.title || "أخبار النسور"}
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-primary rounded-full shadow-glow"></div>
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Official Bulletin</span>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto no-scrollbar snap-x scroll-smooth pb-6 -mx-4 px-4">
              {news.slice(0, 10).map((item) => (
                <motion.div
                  key={item.id}
                  className="flex-shrink-0 w-[320px] snap-center group"
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={`/news/${item.id}`}
                    className="block relative overflow-hidden rounded-[48px] bg-white dark:bg-card-dark border border-slate-100 dark:border-white/5 shadow-premium hover:shadow-2xl transition-all duration-700 group-hover:-translate-y-4"
                  >
                    <div className="aspect-[16/10] overflow-hidden relative">
                      <SafeImage
                        src={item.image || undefined}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-125 group-hover:rotate-2 transition-all duration-1000"
                        width={600}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
                      <div className="absolute top-6 left-6">
                        <div className="px-5 py-2 bg-primary/90 backdrop-blur-xl rounded-[20px] flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest shadow-glow border border-white/20">
                          {item.category || "النسور"}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-50 dark:border-white/5 pt-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                          <span className="material-symbols-outlined !text-[18px] text-primary">calendar_today</span>
                          {item.date ? format(new Date(item.date), "d MMM yyyy", { locale: ar }) : "اليوم"}
                        </div>
                        <div className="flex h-12 w-12 rounded-[22px] bg-slate-50 dark:bg-white/5 items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-inner group-hover:shadow-glow">
                          <span className="material-symbols-outlined !text-[22px] rotate-180">north_west</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <div className="pt-2 flex justify-center">
              <Link to="/news" className="h-12 px-8 rounded-full bg-slate-900 dark:bg-white dark:text-black text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
                 مركز الأخبار
              </Link>
            </div>
          </motion.section>
        );

      case "media":
        if (recentMedia.length === 0) return null;
        return (
          <motion.section key={section.id} variants={itemVariants} className="space-y-8">
            <div className="flex flex-col gap-2 px-1">
              <h2 className="text-4xl font-black text-slate-800 dark:text-white font-serif tracking-tighter leading-none">
                {section.title || "ميديا المصري"}
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-accent rounded-full shadow-glow"></div>
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Visual Sanctuary</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {recentMedia.map((item, idx) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -10 }}
                  whileTap={{ scale: 0.98 }}
                  className={idx === 0 ? "col-span-2" : ""}
                >
                  <Link
                    to="/media"
                    className={`group relative flex ${idx === 0 ? "aspect-[16/9]" : "aspect-[9/12]"} overflow-hidden rounded-[40px] shadow-premium cinematic-glow border border-slate-100 dark:border-white/5 bg-slate-200 dark:bg-white/5`}
                  >
                    <SafeImage
                      src={item.thumbnailUrl || undefined}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-125"
                      width={idx === 0 ? 800 : 400}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent group-hover:from-primary/40 transition-colors duration-700"></div>

                    <div className="absolute top-6 right-6 h-14 w-14 rounded-[24px] glass-card flex items-center justify-center text-white ring-1 ring-white/20 group-hover:bg-primary group-hover:scale-110 transition-all duration-500 shadow-2xl">
                      <span className="material-symbols-outlined !text-[32px] font-variation-settings-fill">
                        {item.type === "video" ? "play_circle" : "gallery_thumbnail"}
                      </span>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8">
                      {item.type === "video" && item.duration && (
                        <div className="inline-flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20">
                          <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                          <span className="text-[10px] text-white font-black tracking-widest">{item.duration}</span>
                        </div>
                      )}
                      <h4 className={`font-black text-white leading-tight ${idx === 0 ? "text-2xl sm:text-3xl" : "text-base"} line-clamp-2 drop-shadow-2xl font-serif`}>
                        {item.title}
                      </h4>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        );

      case "matches":
        if (upcomingMatches.length === 0) return null;
        return (
          <motion.section key={section.id} variants={itemVariants} className="space-y-8">
            <div className="flex flex-col gap-2 px-1">
              <h2 className="text-4xl font-black text-slate-800 dark:text-white font-serif tracking-tighter leading-none">
                {section.title || "مباريات مرتقبة"}
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-primary rounded-full shadow-glow"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Upcoming Challenges</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {upcomingMatches.map((match) => (
                <motion.div key={match.id} whileHover={{ y: -4 }} className="group">
                  <Link
                    to="/matches"
                    className="flex items-center justify-between bg-white dark:bg-card-dark p-4 sm:p-6 rounded-[32px] shadow-premium border border-slate-100 dark:border-white/5 hover:border-primary/40 transition-all duration-500 hover:shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-center gap-4 sm:gap-6 relative z-10 flex-1 min-w-0">
                      <div className="flex items-center -space-x-4 rtl:space-x-reverse shrink-0">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center z-10 transition-all group-hover:scale-110">
                          <img src={match.homeLogo || undefined} alt="Home" className="h-full w-full object-contain filter drop-shadow-md" referrerPolicy="no-referrer" />
                        </div>
                        <div className="h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center z-0 scale-90 opacity-40 blur-[1px] transition-all group-hover:scale-100 group-hover:opacity-100 group-hover:blur-0 translate-x-2">
                          <img src={match.awayLogo || undefined} alt="Away" className="h-full w-full object-contain filter drop-shadow-md" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm sm:text-lg font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors font-serif truncate">
                          {match.homeTeam} × {match.awayTeam}
                        </p>
                        <div className="flex items-center gap-3 mt-1 overflow-hidden">
                          <span className="text-[8px] sm:text-[10px] font-black text-primary-light bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 whitespace-nowrap">
                            {match.competition}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                            <span className="material-symbols-outlined !text-[14px] text-primary shrink-0">calendar_month</span>
                            {format(new Date(match.date), "d MMM", { locale: ar })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-inner group-hover:scale-110 shrink-0 mr-2">
                      <span className="material-symbols-outlined !text-[18px] rotate-180 group-hover:translate-x-1 transition-transform">north_west</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        );

      case "history":
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[32px] bg-slate-950 text-white p-6 sm:p-8 shadow-premium transition-all duration-1000 hover:shadow-primary/20"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/60 via-transparent to-black/90"></div>
            
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-accent text-[9px] font-black uppercase tracking-[0.3em] mb-0.5 drop-shadow-glow">Proud Heritage</span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tighter font-serif leading-none italic">
                    {section.title || "قرن من الزعامة"}
                  </h2>
                </div>
                <Link
                  to="/history"
                  className="h-9 px-4 bg-white/10 hover:bg-white backdrop-blur-xl rounded-xl text-[11px] font-black flex items-center justify-center text-white hover:text-black transition-all border border-white/10 group/btn active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined mr-1.5 !text-lg group-hover/btn:rotate-12 transition-transform">history_edu</span>
                  تاريخ النادي
                </Link>
              </div>
              
              <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/10">
                <div className="flex flex-col items-center group/stat">
                  <div className="text-2xl sm:text-3xl font-black text-white group-hover/stat:text-primary-light transition-all transform group-hover/stat:scale-105 drop-shadow-glow">1920</div>
                  <span className="text-[10px] font-bold text-white/50 mt-1">التأسيس</span>
                </div>
                <div className="flex flex-col items-center group/stat border-x border-white/10">
                  <div className="text-2xl sm:text-3xl font-black text-white group-hover/stat:text-primary-light transition-all transform group-hover/stat:scale-105 drop-shadow-glow">106</div>
                  <span className="text-[10px] font-bold text-white/50 mt-1">عام من المجد</span>
                </div>
                <div className="flex flex-col items-center group/stat">
                  <div className="text-2xl sm:text-3xl font-black text-white group-hover/stat:text-primary-light transition-all transform group-hover/stat:scale-105 drop-shadow-glow">22</div>
                  <span className="text-[10px] font-bold text-white/50 mt-1">لقب وبطولة</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="h-8 w-1 flex-shrink-0 bg-primary-light rounded-full shadow-glow"></div>
                <p className="text-xs sm:text-sm font-medium text-white/80 leading-relaxed italic font-serif">
                   "المصري البورسعيدي.. قلب نابض في جسد المدينة الباسلة، وراية خضراء تعانق السماء بأمجاد لا تنطفئ."
                </p>
              </div>
            </div>
          </motion.section>
        );

      case "ads": {
        const activeAds = ads.filter((a) => a.active);
        if (activeAds.length === 0) return null;

        return (
          <motion.section key={section.id} variants={itemVariants} className="relative z-20">
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-4">
              {activeAds.map((ad) => (
                <div key={ad.id} className="flex-shrink-0 w-full group snap-center">
                  {ad.link ? (
                    <a
                      href={ad.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-[21/9] rounded-[40px] overflow-hidden shadow-premium group-hover:shadow-2xl transition-all duration-700 hover:-translate-y-1"
                    >
                      <img src={ad.image} alt={ad.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-2">
                           <span className="text-[8px] font-black uppercase tracking-widest text-white">إعلان</span>
                        </div>
                        <h4 className="text-white text-xl font-black leading-tight drop-shadow-2xl">{ad.title}</h4>
                      </div>
                    </a>
                  ) : (
                    <div className="relative aspect-[21/9] rounded-[40px] overflow-hidden shadow-premium">
                      <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      <div className="absolute bottom-6 left-6 right-6">
                        <h4 className="text-white text-xl font-black leading-tight drop-shadow-2xl">{ad.title}</h4>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        );
      }

      case "polls":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <div className="relative overflow-hidden rounded-[56px] bg-white dark:bg-card-dark p-14 shadow-premium border border-slate-100 dark:border-white/5 group transition-all duration-700 hover:shadow-2xl">
              <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[120px] group-hover:bg-primary/15 transition-all duration-1000"></div>
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-[120px] group-hover:bg-accent/15 transition-all duration-1000"></div>
              
              <div className="relative flex flex-col items-center text-center gap-8">
                <div className="h-24 w-24 rounded-[36px] bg-slate-50 dark:bg-white/5 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 border border-slate-100 dark:border-white/5">
                  <span className="material-symbols-outlined !text-[52px] drop-shadow-sm font-variation-settings-fill">ballot</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                   <span className="text-accent text-[11px] font-black uppercase tracking-[0.5em] drop-shadow-sm">FAN VOICE</span>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter font-serif">
                    صوت الجمهور
                  </h3>
                </div>
                <p className="text-base text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed">
                  رأيك يهمنا دائماً. شارك في استطلاعات الرأي الحصرية والمساهمة في صياغة مستقبل النادي.
                </p>
                <Link
                  to="/fan-zone"
                  className="w-full sm:w-auto h-16 px-14 bg-slate-900 dark:bg-primary text-white rounded-[24px] text-[13px] font-black shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all group/btn gap-3"
                >
                  <span className="material-symbols-outlined !text-2xl group-hover/btn:scale-110 transition-transform">how_to_vote</span>
                  المشاركة في الاستفتاء
                </Link>
              </div>
            </div>
          </motion.section>
        );

      case "widget":
        if (!section.htmlCode) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="overflow-hidden rounded-[40px] shadow-premium border border-slate-100 dark:border-white/5 bg-white dark:bg-card-dark p-2"
          >
            <div className="rounded-[32px] overflow-hidden">
               <HtmlWidget htmlCode={section.htmlCode} id={section.id} />
            </div>
          </motion.section>
        );

      case "image":
        if (!section.imageUrl) return null;
        const ImageContent = (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative overflow-hidden rounded-[40px] shadow-premium border border-slate-100 dark:border-white/5 bg-white dark:bg-card-dark group cursor-pointer"
          >
            <img
              src={section.imageUrl}
              alt={section.title || "Banner"}
              className="w-full h-auto object-cover max-h-[500px] group-hover:scale-105 transition-transform duration-1000"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {section.title && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8">
                <h3 className="text-white text-2xl font-black font-serif tracking-tight drop-shadow-2xl">
                  {section.title}
                </h3>
              </div>
            )}
          </motion.section>
        );

        if (section.link) {
          return (
            <a
              key={section.id}
              href={section.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block active:scale-[0.98] transition-transform"
            >
              {ImageContent}
            </a>
          );
        }
        return ImageContent;

      case "advertise":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <AdvertiseWidget />
          </motion.section>
        );

      case "tickets":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <TicketsWidget title={section.title} link={section.link} />
          </motion.section>
        );

      case "ai_banner":
        if (!aiConfig.enabled) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[48px] bg-slate-950 p-12 shadow-premium group cursor-pointer border border-white/5 active:scale-95 transition-all"
              onClick={() => navigate('/jersey-tryon')}
            >
              <div className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity duration-1000">
                {aiConfig.bannerImage ? (
                  <img src={aiConfig.bannerImage} alt="AI" className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-2000" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-slate-900"></div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent"></div>
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/25 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/40 transition-all duration-1000"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-10">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20 w-fit shadow-glow">
                    <Sparkles size={14} className="text-accent animate-pulse" />
                    <span className="text-[10px] font-black text-white tracking-[0.4em] uppercase">NEURAL EXPERIENCE</span>
                  </div>
                  <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none sm:max-w-md font-serif">
                    {aiConfig.bannerTitle || "صورتك بتيشيرت المصري"}
                  </h3>
                  <p className="text-xs font-bold text-white/50 leading-relaxed max-w-sm">
                    استخدم تقنيات الذكاء الاصطناعي الأحدث لتجربة قميص النادي المصري الجديد على صورتك الشخصية بضغطة واحدة!
                  </p>
                </div>
                <div className="h-20 w-20 rounded-[32px] bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 shrink-0">
                  <span className="material-symbols-outlined !text-[44px] drop-shadow-glow">magic_button</span>
                </div>
              </div>
            </motion.div>
          </motion.section>
        );

      case "city": {
        const isCityActive = cityInfo ? cityInfo.active : true;
        if (!isCityActive) return null;

        const useAuto = cityInfo?.useAutoWeather ?? true;
        
        // Cairo time for manual day/night determination
        const cairoHourStr = new Intl.DateTimeFormat("en-US", {
          timeZone: "Africa/Cairo",
          hour: "numeric",
          hour12: false,
        }).format(new Date());
        const cairoHour = parseInt(cairoHourStr === "24" ? "0" : cairoHourStr);

        const isDay = useAuto ? (autoWeather?.isDay ?? (cairoHour >= 6 && cairoHour < 19)) : (cairoHour >= 6 && cairoHour < 19);
        
        // Simplified mapping for conditions
        const rawCondition = (useAuto ? autoWeather?.condition || "sun" : (cityInfo?.condition || "صافي")).toLowerCase();
        let cond = "sun";
        
        if (rawCondition.includes("rain") || rawCondition.includes("مطر") || rawCondition.includes("زخات")) cond = "rainy";
        else if (rawCondition.includes("storm") || rawCondition.includes("رعد")) cond = "thunderstorm";
        else if (rawCondition.includes("snow") || rawCondition.includes("ثلج")) cond = "snowy";
        else if (rawCondition.includes("cloud") || rawCondition.includes("غائم") || rawCondition.includes("سحب")) cond = "cloudy";
        else if (rawCondition.includes("fog") || rawCondition.includes("ضباب")) cond = "foggy";
        else if (rawCondition.includes("clear") || rawCondition.includes("sunny") || rawCondition.includes("صافي") || rawCondition.includes("شمس")) cond = "sun";

        const displayCity = {
          cityName: cityInfo?.cityName || "بورسعيد",
          temperature:
            useAuto && autoWeather?.temp
              ? autoWeather.temp
              : cityInfo?.temperature || "25",
          conditionText:
            useAuto && autoWeather?.condition
              ? autoWeather.condition === "sun"
                ? "صافي"
                : autoWeather.condition === "mostly_sunny"
                  ? "غالباً صافي"
                  : autoWeather.condition === "partly_cloudy"
                    ? "غائم جزئياً"
                    : autoWeather.condition === "cloudy"
                      ? "غائم"
                      : autoWeather.condition === "foggy"
                        ? "ضباب"
                        : autoWeather.condition === "drizzle"
                          ? "رذاذ"
                          : autoWeather.condition === "rainy"
                            ? "ممطر"
                            : autoWeather.condition === "snowy"
                              ? "ثلوج"
                              : autoWeather.condition === "showers"
                                ? "زخات مطر"
                                : autoWeather.condition === "thunderstorm"
                                  ? "عواصف رعدية"
                                  : "غائم"
              : cityInfo?.condition || "صافي",
          sunrise:
            useAuto && autoWeather?.sunrise
              ? autoWeather.sunrise
              : cityInfo?.sunrise || "06:30 AM",
          sunset:
            useAuto && autoWeather?.sunset
              ? autoWeather.sunset
              : cityInfo?.sunset || "07:15 PM",
          image:
            cityInfo?.image ||
            "https://images.unsplash.com/photo-1572214350916-571eac7bfced?q=80&w=1000&auto=format&fit=crop",
          weatherBg: cityInfo?.weatherBg || "",
          description:
            cityInfo?.description ||
            "عروس البحر الأبيض المتوسط وعاصمة الرياضة والثقافة.",
        };

        const tempInt = parseInt(displayCity.temperature) || 25;
        let cardBg = "";
        let iconBg = "";
        let iconColor = "";
        let IconElement = CloudSun;
        let textColor = "text-white";
        let subtextColor = "text-white/80";
        let effectType:
          | "sun"
          | "stars"
          | "rain"
          | "snow"
          | "storm"
          | "clouds" = "sun";

        // Simplified time phase to Day and Night only as requested
        const timePhase = isDay ? "day" : "night";

        // Theme Logic based on timePhase and condition
        if (cond === "rainy" || cond === "showers" || cond === "drizzle") {
          // Rain
          cardBg =
            timePhase === "night"
              ? "from-slate-900 via-blue-950 to-black border-blue-900/30"
              : "from-blue-600 via-blue-800 to-indigo-900 border-blue-400/40";
          iconBg = "bg-white/10 backdrop-blur-xl ring-1 ring-white/20";
          iconColor = "text-blue-100";
          IconElement = CloudRain;
          effectType = "rain";
        } else if (cond === "thunderstorm") {
          // Storms
          cardBg =
            timePhase === "night"
              ? "from-slate-950 via-gray-900 to-black border-slate-700/50"
              : "from-slate-800 via-slate-900 to-black border-slate-600/50";
          iconBg = "bg-yellow-400/20 backdrop-blur-xl ring-1 ring-yellow-400/30";
          iconColor = "text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]";
          IconElement = CloudLightning;
          effectType = "storm";
        } else if (cond === "snowy") {
          // Snow
          cardBg =
            timePhase === "night"
              ? "from-slate-900 via-blue-950 to-slate-900 border-white/20"
              : "from-sky-50 via-white to-blue-50 border-white/60";
          iconBg = "bg-white/20 backdrop-blur-xl ring-1 ring-white/30";
          iconColor = timePhase === "night" ? "text-blue-200" : "text-sky-600";
          IconElement = Snowflake;
          effectType = "snow";
          if (timePhase === "day") {
            textColor = "text-slate-900";
            subtextColor = "text-slate-600";
          }
        } else if (cond === "cloudy" || cond === "partly_cloudy" || cond === "foggy") {
          // Clouds
          IconElement = timePhase === "night" ? CloudMoon : CloudSun;
          effectType = "clouds";
          if (timePhase === "night") {
            cardBg = "from-slate-900 via-blue-950 to-black border-blue-900/20";
            iconBg = "bg-indigo-500/10 backdrop-blur-xl ring-1 ring-white/10";
            iconColor = "text-indigo-300";
          } else {
            cardBg = "from-sky-300 via-sky-400 to-blue-500 border-sky-200/40";
            iconBg = "bg-white/20 backdrop-blur-xl ring-1 ring-white/30";
            iconColor = "text-white";
          }
        } else {
          // Clear / Sunny
          if (timePhase === "night") {
            cardBg = "from-[#0f172a] via-[#1e3a8a] to-[#020617] border-blue-500/20";
            iconBg = "bg-blue-900/40 backdrop-blur-2xl ring-1 ring-white/20 shadow-lg shadow-blue-500/20";
            iconColor = "text-blue-100";
            IconElement = Moon;
            effectType = "stars";
          } else {
            cardBg = "from-sky-400 via-sky-500 to-blue-600 border-sky-300/40";
            iconBg = "bg-yellow-400/20 backdrop-blur-2xl ring-1 ring-white/30 shadow-lg shadow-yellow-400/20";
            iconColor = "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
            IconElement = Sun;
            effectType = "sun";
          }
        }

        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="p-1" // Add padding to prevent shadow clipping
          >
            <div
              className={`relative overflow-hidden rounded-[40px] bg-gradient-to-br ${cardBg} shadow-2xl transition-all duration-1000 border hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-[1.02]`}
            >
              {/* Optional Background Image */}
              {displayCity.weatherBg && (
                <div className="absolute inset-0 z-0 rounded-[inherit] overflow-hidden">
                  <img
                    src={getOptimizedImage(displayCity.weatherBg, 800) || undefined}
                    className="w-full h-full object-cover opacity-30 mix-blend-overlay rounded-[inherit]"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

                {/* Background Effects Container */}
              <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden select-none rounded-[inherit]">
                {/* Storm Lightning Flash */}
                {effectType === "storm" && (
                  <motion.div
                    animate={{
                      opacity: [0, 0, 0.4, 0, 0.8, 0, 0, 0.3, 0, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                    className="absolute inset-0 bg-white z-[20] pointer-events-none"
                  />
                )}

                {/* Sun Glow Effect */}
                {effectType === "sun" && (
                  <div className="absolute inset-0 z-[5] overflow-hidden rounded-[40px]">
                    {/* The Glow */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0.5, 0.3]
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-24 -right-24 w-80 h-80 bg-yellow-300 blur-[100px] rounded-full"
                    />
                    {/* The Sun Body */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.05, 1],
                        opacity: [0.4, 0.6, 0.4]
                      }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-yellow-200 to-yellow-400 blur-[20px] rounded-full"
                    />
                    {/* Subtle Rays */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ 
                          rotate: [i * 45, i * 45 + 360],
                          opacity: [0.1, 0.3, 0.1]
                        }}
                        transition={{ 
                          rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
                        }}
                        className="absolute top-22 right-22 w-[1px] h-[400px] bg-gradient-to-b from-white/30 to-transparent blur-[1px]"
                        style={{ transformOrigin: 'top center' }}
                      />
                    ))}
                    {/* Floating Sun Particles */}
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={`particle-${i}`}
                        animate={{
                          y: [-20, 20, -20],
                          x: [-10, 10, -10],
                          opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{
                          duration: 3 + i,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i
                        }}
                        className="absolute w-1 h-1 bg-yellow-200 rounded-full blur-[1px]"
                        style={{
                          top: `${20 + i * 15}%`,
                          right: `${10 + i * 20}%`
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Stars for Night */}
                {effectType === "stars" && (
                  <div className="absolute inset-0 z-[6] pointer-events-none">
                    {[...Array(60)].map((_, i) => (
                       <motion.div
                         key={`star-${i}`}
                         animate={{
                           opacity: [0.2, 0.8, 0.2],
                           scale: [1, 1.2, 1]
                         }}
                         transition={{
                           duration: 2 + Math.random() * 3,
                           repeat: Infinity,
                           delay: Math.random() * 5
                         }}
                         className="absolute bg-white rounded-full"
                         style={{
                           width: Math.random() * 2 + 1 + 'px',
                           height: Math.random() * 2 + 1 + 'px',
                           top: Math.random() * 100 + '%',
                           left: Math.random() * 100 + '%',
                           boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)'
                         }}
                       />
                    ))}
                    {/* Shooting Star */}
                    <motion.div 
                      animate={{ 
                        x: [0, 400], 
                        y: [0, 200], 
                        opacity: [0, 1, 0] 
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        repeatDelay: 8,
                        ease: "easeOut"
                      }}
                      className="absolute top-10 left-10 w-24 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[25deg]"
                    />
                  </div>
                )}

                {/* Snow Particles */}
                {effectType === "snow" && (
                  <div className="absolute inset-0 z-[16] overflow-hidden pointer-events-none">
                    {[...Array(80)].map((_, i) => (
                      <motion.div
                        key={`snow-${i}`}
                        className="absolute bg-white rounded-full blur-[0.5px]"
                        style={{
                          width: Math.random() * 4 + 2 + 'px',
                          height: Math.random() * 4 + 2 + 'px',
                          left: `${Math.random() * 100}%`,
                          top: `-10px`,
                        }}
                        animate={{
                          top: ["0%", "110%"],
                          x: [0, Math.random() * 20 - 10, 0],
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 3 + Math.random() * 4,
                          repeat: Infinity,
                          ease: "linear",
                          delay: Math.random() * 5,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Rain Particles */}
                {(effectType === "rain" || effectType === "storm") && (
                  <div className="absolute inset-0 z-[16] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay opacity-30" />
                    {[...Array(120)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute bg-white/40 w-[1.5px] h-[20px]"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-20px`,
                        }}
                        animate={{
                          top: ["0%", "110%"],
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 0.4 + Math.random() * 0.3,
                          repeat: Infinity,
                          ease: "linear",
                          delay: Math.random() * 2,
                        }}
                      />
                    ))}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] animate-rain"
                      style={{ backgroundSize: '100px 100px' }}
                    />
                  </div>
                )}

                {/* Cloud Effects */}
                {effectType === "clouds" && (
                  <div className="absolute inset-0 z-[10] overflow-hidden opacity-40">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          x: i % 2 === 0 ? [-200, 600] : [600, -200],
                        }}
                        transition={{
                          duration: 20 + i * 10,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute bg-white/30 blur-[40px] rounded-full"
                        style={{
                          width: `${150 + Math.random() * 150}px`,
                          height: `${80 + Math.random() * 80}px`,
                          top: `${(i * 20) % 100}%`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Rain Drops Effect */}
                {(effectType === "rain" || effectType === "storm") && (
                  <div className="absolute inset-0 z-[12] overflow-hidden pointer-events-none rounded-[40px]">
                    {/* Background Mist layer during rain */}
                    <motion.div 
                      animate={{ 
                        opacity: [0.45, 0.75, 0.45],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-blue-900/40 backdrop-blur-[3px] rounded-[40px]"
                    />
                    
                    {[...Array(60)].map((_, i) => {
                      const leftPos = Math.random() * 120 - 10;
                      const duration = 0.6 + Math.random() * 0.8;
                      const delay = Math.random() * -5;
                      const isMain = i < 30; // 30 main drops, 30 background ones

                      return (
                        <motion.div
                          key={i}
                          className="absolute bg-gradient-to-t from-white/60 to-transparent rounded-full"
                          style={{
                            left: `${leftPos}%`,
                            top: `-100px`,
                            width: isMain ? '1.5px' : '0.8px',
                            height: isMain ? `${30 + Math.random() * 40}px` : `${15 + Math.random() * 20}px`,
                            transform: "rotate(15deg)",
                            opacity: isMain ? 0.5 + Math.random() * 0.4 : 0.2 + Math.random() * 0.2,
                            filter: isMain ? "none" : "blur(1px)",
                          }}
                          animate={{
                            top: ["-10%", "120%"],
                            x: [0, 30],
                          }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            ease: "linear",
                            delay: delay,
                          }}
                        />
                      );
                    })}

                    {/* Ground Splash effect (simulated) */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/10 to-transparent blur-sm" />
                  </div>
                )}

                {/* Storm Flash Effect */}
                {effectType === "storm" && (
                  <motion.div
                    animate={{ opacity: [0, 0, 0.6, 0, 0.4, 0, 0] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      delay: Math.random() * 8,
                      times: [0, 0.8, 0.82, 0.84, 0.86, 0.9, 1],
                    }}
                    className="absolute inset-0 bg-white/80 z-[15]"
                  />
                )}

                {/* Stars Effect */}
                {effectType === "stars" && (
                  <div className="absolute inset-0 z-[12] overflow-hidden pointer-events-none rounded-[40px]">
                    {[...Array(40)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute h-[1px] w-[1px] bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          opacity: 0.15 + Math.random() * 0.3, // Faint stars as requested
                        }}
                        animate={{
                          opacity: [0.1, 0.4, 0.1],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 2 + Math.random() * 4,
                          repeat: Infinity,
                          delay: Math.random() * 5,
                        }}
                      />
                    ))}
                  </div>
                )}
                {/* Snow Effect */}
                {effectType === "snow" && (
                  <div className="absolute inset-0 rounded-[40px] overflow-hidden z-[12]">
                    {[...Array(30)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute h-1.5 w-1.5 bg-white rounded-full blur-[0.3px]"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-10px`,
                        }}
                        animate={{
                          top: ["0%", "110%"],
                          x: [0, Math.random() * 30 - 15, 0],
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 4 + Math.random() * 6,
                          repeat: Infinity,
                          ease: "linear",
                          delay: Math.random() * 5,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/5 opacity-10 rounded-[40px] z-[8]"></div>
              </div>

              <div className="relative p-5 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                        <MapPin size={14} className={textColor} />
                      </div>
                      <h3
                        className={`text-lg font-black tracking-tight ${textColor} drop-shadow-sm`}
                      >
                        {displayCity.cityName}
                      </h3>
                    </div>

                    <div
                      className={`flex flex-col gap-0.5 ${subtextColor} text-[10px] font-bold mt-1 pr-1`}
                    >
                      <div className="flex items-center gap-2 opacity-100">
                        <span className="material-symbols-outlined !text-[12px]">
                          calendar_today
                        </span>
                        <span>
                          {format(new Date(), "EEEE d MMMM", { locale: ar })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="material-symbols-outlined !text-[14px] animate-pulse">
                          schedule
                        </span>
                        <span className="font-black tracking-wider">
                          {format(new Date(), "h:mm a", { locale: ar })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <div className="flex items-start">
                        <span
                          className={`text-4xl font-black ${textColor} leading-none tracking-tighter drop-shadow-2xl`}
                        >
                          {displayCity.temperature}
                        </span>
                        <span
                          className={`text-xl font-bold ${textColor} mt-1 opacity-60`}
                        >
                          °
                        </span>
                      </div>
                      <span
                        className={`mt-2 text-[9px] font-black uppercase px-3 py-1 bg-white/20 backdrop-blur-md ${textColor} rounded-xl text-center border border-white/10 shadow-lg`}
                      >
                        {displayCity.conditionText}
                      </span>
                    </div>
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        rotate: effectType === "sun" ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className={`h-12 w-12 rounded-[20px] ${iconBg} flex items-center justify-center ${iconColor} shadow-2xl ring-1 ring-white/30`}
                    >
                      <IconElement size={24} strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        );
      }

      default:
        return null;
    }
  };

  const sortedSections = [...homeSections].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 },
    },
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col pb-32 px-0 bg-background-light dark:bg-background-dark prestige-pattern min-h-screen">
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-x-hidden px-4 flex flex-col gap-0 pt-8 pb-6"
      >
        {/* Goal Celebration Trigger is in App.tsx */}
      
      {sortedSections.map((section, index) => {
          const content = renderSection(section);
          if (!content) return null;
          return (
            <div
              key={section.id}
              style={{ marginBottom: `${section.spacing ?? 28}px` }}
            >
              {content}
            </div>
          );
        })}
      </motion.main>
    </div>
  );
}
