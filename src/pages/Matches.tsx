import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ar } from 'date-fns/locale';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Trophy, MapPin, Edit2, Play, Users, Send, Target, X, FileText, Dribbble, TrendingUp } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import ScoreSelector from '../components/ScoreSelector';
import { getOptimizedImage } from '../lib/cloudinary';

export default function Matches() {
  const { matches, profile } = useAppStore();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<'all' | 'football'>('all');
  const [showPredictionsList, setShowPredictionsList] = useState<string | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});
  const [predictionMatchId, setPredictionMatchId] = useState<string | null>(null);
  const [homePrediction, setHomePrediction] = useState('0');
  const [awayPrediction, setAwayPrediction] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userPredictions, setUserPredictions] = useState<Record<string, any>>({});

  // Fetch all predictions for a specific match
  useEffect(() => {
    if (!showPredictionsList) {
      setMatchPredictions([]);
      return;
    }
    const q = query(collection(db, 'predictions'), where('matchId', '==', showPredictionsList));
    return onSnapshot(q, (snap) => {
      const allPreds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatchPredictions(allPreds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `predictions/${showPredictionsList}`);
    });
  }, [showPredictionsList]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch existing predictions for this user
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'predictions'), where('userId', '==', auth.currentUser.uid));
    return onSnapshot(q, (snap) => {
      const preds: Record<string, any> = {};
      snap.forEach(doc => {
        const data = doc.data();
        preds[data.matchId] = { id: doc.id, ...data };
      });
      setUserPredictions(preds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'predictions-user');
    });
  }, [auth.currentUser]);

  const handleSavePrediction = async () => {
    if (!auth.currentUser || !predictionMatchId) return;
    
    const hScore = parseInt(homePrediction);
    const aScore = parseInt(awayPrediction);
    
    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      setSubmitError('يرجى إدخال أرقام صحيحة');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const predData = {
        matchId: predictionMatchId,
        userId: auth.currentUser.uid,
        userName: profile.name || auth.currentUser.displayName || 'مشجع',
        userEmail: auth.currentUser.email,
        homeScore: hScore,
        awayScore: aScore,
        createdAt: new Date().toISOString()
      };

      // Check if already exists to update or create
      const existing = userPredictions[predictionMatchId];
      if (existing) {
        await setDoc(doc(db, 'predictions', existing.id), predData);
      } else {
        await addDoc(collection(db, 'predictions'), predData);
      }

      setPredictionMatchId(null);
    } catch (error) {
      setSubmitError('حدث خطأ أثناء حفظ التوقع. يرجى المحاولة مرة أخرى.');
      handleFirestoreError(error, OperationType.WRITE, 'predictions');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const sortedMatches = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getNewestMatch = (sportMatches: any[]) => {
    return sportMatches.find(m => m.status === 'live') || sportMatches.find(m => m.status === 'upcoming') || sportMatches[0];
  };

  const footballMatches = sortedMatches.filter(m => m.sport === 'football' || !m.sport);

  const sportSections = [
    { 
      id: 'football', 
      title: 'مباريات', 
      subtitle: 'Football Matches', 
      matches: footballMatches, 
      newestMatch: getNewestMatch(footballMatches),
      icon: <Trophy size={16} className="text-primary" /> 
    }
  ].filter(section => selectedSport === 'all' || section.id === selectedSport);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 100, 
        damping: 15,
        mass: 1
      }
    }
  };

  const seasonStats = matches.filter(m => m.status === 'finished' && (m.homeTeam === 'المصري' || m.awayTeam === 'المصري')).reduce((acc, match) => {
    const isHome = match.homeTeam === 'المصري';
    const homeScore = parseInt(match.homeScore);
    const awayScore = parseInt(match.awayScore);
    
    if (homeScore === awayScore) {
      acc.draws += 1;
    } else if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) {
      acc.wins += 1;
    } else {
      acc.losses += 1;
    }
    return acc;
  }, { wins: 0, draws: 0, losses: 0 });

  const totalGames = (seasonStats.wins + seasonStats.draws + seasonStats.losses) || 1;
  const winRate = (seasonStats.wins / totalGames) * 100;
  const drawRate = (seasonStats.draws / totalGames) * 100;
  const lossRate = (seasonStats.losses / totalGames) * 100;

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col pb-32 px-0 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="sticky top-[65px] z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl px-4 py-2 border-b border-border-light/40 dark:border-border-dark/40 flex flex-col gap-2">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-surface-dark rounded-2xl">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'football', label: 'كرة القدم' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setSelectedSport(tab.id as any)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all duration-300 ${
                selectedSport === tab.id 
                  ? 'bg-white dark:bg-primary text-primary-dark dark:text-white shadow-premium' 
                  : 'text-slate-500 hover:text-primary-dark dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <motion.main 
        key={selectedSport}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-x-hidden p-6 flex flex-col gap-12"
      >
        {/* Season Statistics Summary */}
        <motion.section variants={itemVariants} className="grid grid-cols-4 gap-3 mb-2">
          <div className="bg-white dark:bg-card-dark p-4 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col items-center gap-1 shadow-sm group hover:border-primary/30 transition-all">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums group-hover:scale-110 transition-transform">{seasonStats.wins}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">فوز</span>
            <div className="w-6 h-1 bg-green-500 rounded-full mt-1"></div>
          </div>
          <div className="bg-white dark:bg-card-dark p-4 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col items-center gap-1 shadow-sm group hover:border-primary/30 transition-all">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums group-hover:scale-110 transition-transform">{seasonStats.draws}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">تعادل</span>
            <div className="w-6 h-1 bg-amber-500 rounded-full mt-1"></div>
          </div>
          <div className="bg-white dark:bg-card-dark p-4 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col items-center gap-1 shadow-sm group hover:border-primary/30 transition-all">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums group-hover:scale-110 transition-transform">{seasonStats.losses}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">خسارة</span>
            <div className="w-6 h-1 bg-red-500 rounded-full mt-1"></div>
          </div>
          <div className="bg-primary p-4 rounded-[32px] flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 group hover:scale-105 transition-all">
            <span className="text-2xl font-black text-white tabular-nums">{seasonStats.wins * 3 + seasonStats.draws}</span>
            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">نقطة</span>
            <TrendingUp size={10} className="text-white mt-1" />
          </div>
        </motion.section>

        {/* Matches Feed Upgrade */}
        <motion.section variants={itemVariants} className="space-y-16">
          {sportSections.map((section) => (
            section.matches.length > 0 && (
              <div key={section.id} className="space-y-8">
                <div className="flex items-center justify-between px-1">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white leading-none uppercase flex items-center gap-2">
                       {section.icon}
                       {section.title}
                    </h2>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">{section.subtitle}</span>
                  </div>
                </div>

                {section.newestMatch && (
                  <motion.div variants={itemVariants}>
                    <div className={`relative w-full rounded-[40px] overflow-hidden shadow-2xl stadium-gradient border border-white/5 cinematic-glow animate-shimmer`}>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay rounded-[inherit]"></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary-light/20 pointer-events-none"></div>
                      
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[9px] font-black text-white ring-1 ring-white/20 uppercase tracking-widest">
                            <Trophy size={10} className="text-accent" />
                            {section.newestMatch.competition}
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-white/60 text-[9px] font-black uppercase tracking-tighter">
                              <Calendar size={10} />
                              {format(new Date(section.newestMatch.date), 'dd MMMM yyyy', { locale: ar })}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center items-center gap-4 sm:gap-8 my-2">
                          <div className="flex flex-col items-center gap-2 sm:gap-4 w-20 sm:w-32">
                            <div className="w-18 h-18 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-[24px] sm:rounded-[32px] p-2.5 sm:p-4 flex items-center justify-center ring-1 ring-white/20 shadow-premium animate-float">
                              <img src={getOptimizedImage(section.newestMatch.homeLogo, 200) || undefined} alt={section.newestMatch.homeTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain filter drop-shadow-2xl" />
                            </div>
                            <span className="text-white font-black text-[9px] sm:text-[10px] text-center uppercase tracking-widest line-clamp-2">{section.newestMatch.homeTeam}</span>
                          </div>

                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`font-black text-white tracking-widest flex items-center justify-center gap-1 sm:gap-2 tabular-nums ${String(section.newestMatch.homeScore).length > 2 || String(section.newestMatch.awayScore).length > 2 ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-5xl'} drop-shadow-[0_5px_15px_rgba(46,204,113,0.3)]`}>
                              {section.newestMatch.status === 'upcoming' ? (
                                <span className="text-2xl opacity-40 italic">VS</span>
                              ) : (
                                <>
                                  <span>{section.newestMatch.homeScore}</span>
                                  <span className={`text-accent opacity-50`}>:</span>
                                  <span>{section.newestMatch.awayScore}</span>
                                </>
                              )}
                            </div>
                            {section.newestMatch.status === 'live' && (
                               <div className="mt-4 flex flex-col items-center gap-2">
                                 <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full animate-pulse shadow-glow">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                    <span className="text-white text-[9px] font-black tracking-widest">بث مباشر</span>
                                 </div>
                               </div>
                            )}
                            {section.newestMatch.status === 'live' && (
                              <div className="mt-2 text-white font-digital font-black text-[12px] tabular-nums text-center tracking-widest">
                                {calculateCurrentTimeFormat(section.newestMatch)}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-2 sm:gap-4 w-20 sm:w-32">
                            <div className="w-18 h-18 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-[24px] sm:rounded-[32px] p-2.5 sm:p-4 flex items-center justify-center ring-1 ring-white/20 shadow-premium animate-float [animation-delay:0.5s]">
                              <img src={getOptimizedImage(section.newestMatch.awayLogo, 200) || undefined} alt={section.newestMatch.awayTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain filter drop-shadow-2xl" />
                            </div>
                            <span className="text-white font-black text-[9px] sm:text-[10px] text-center uppercase tracking-widest line-clamp-2">{section.newestMatch.awayTeam}</span>
                          </div>
                        </div>

                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {section.newestMatch.status === 'live' && (
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/live')}
                                className="h-12 bg-red-600 text-white font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-premium animate-pulse shadow-red-500/20"
                              >
                                  <Play size={16} fill="white" />
                                  البث المباشر
                              </motion.button>
                            )}
                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              onClick={() => navigate('/news')}
                              className={`h-12 font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-2xl transition-all ${
                                section.newestMatch.status === 'live' 
                                  ? 'bg-white/10 backdrop-blur-md text-white border border-white/20' 
                                  : 'bg-white text-primary-dark'
                              }`}
                            >
                                <span className="material-symbols-outlined font-variation-settings-fill !text-[20px]">article</span>
                                تغطية المباراة
                            </motion.button>
                            {section.newestMatch.status === 'finished' && (
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/media')}
                                className="h-12 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 transition-all"
                              >
                                  <Play size={16} fill="white" />
                                  ملخص المباراة
                              </motion.button>
                            )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col gap-8 pt-6">
                  {section.matches.slice(0, visibleCount[section.id] || 5).map((match) => (
                    <motion.div 
                      key={match.id} 
                      className={`flex flex-col bg-white dark:bg-card-dark p-8 rounded-[40px] border shadow-xl group transition-all duration-500 hover:-translate-y-1 ${match.status === 'live' ? 'border-red-500/30' : 'border-slate-100 dark:border-white/5 hover:border-primary/40'}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(match.status === 'live' ? '/live' : '/matches')}
                    >
                      {match.status === 'live' && (
                        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse rounded-t-full"></div>
                      )}
                      
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                            <Trophy size={12} className="text-primary-light" />
                            {match.competition}
                          </div>
                          {match.isMatchDay && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-xl text-[9px] font-black uppercase tracking-tighter ring-1 ring-primary/20">
                              يوم المباراة
                            </div>
                          )}
                        </div>
                        <div className={`text-[9px] font-black px-3 py-1 rounded-xl shadow-sm ${
                          match.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                          match.status === 'finished' ? 'bg-slate-100 dark:bg-white/10 text-slate-500' : 
                          'bg-primary text-white'
                        }`}>
                          {match.status === 'live' ? 'بث مباشر' : match.status === 'finished' ? 'انتهت' : 'مرتقبة'}
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-6 sm:gap-10">
                        <div className="flex flex-col items-center gap-3 sm:gap-4 w-24 sm:w-32 group/team">
                          <div className="w-18 h-18 sm:w-24 sm:h-24 bg-slate-50 dark:bg-background-dark rounded-3xl p-3 sm:p-4 shadow-inner ring-1 ring-slate-100 dark:ring-white/10 flex items-center justify-center transition-all duration-500 group-hover/team:scale-105 group-hover/team:shadow-lg">
                            <img src={getOptimizedImage(match.homeLogo, 150) || undefined} alt={match.homeTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain filter drop-shadow-md" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase text-center line-clamp-1 transition-colors group-hover/team:text-primary">{match.homeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`font-black text-slate-900 dark:text-white tabular-nums flex items-center justify-center gap-2 sm:gap-4 drop-shadow-sm ${String(match.homeScore).length > 2 || String(match.awayScore).length > 2 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>
                            {match.status === 'upcoming' ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm sm:text-base opacity-20 italic font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-1 rounded-full mb-2">VS</span>
                                <span className="text-[10px] font-bold text-slate-400">لم تبدأ بعد</span>
                              </div>
                            ) : (
                              <>
                                <span className="drop-shadow-lg">{match.homeScore}</span>
                                <span className="opacity-20 text-3xl sm:text-4xl">:</span>
                                <span className="drop-shadow-lg">{match.awayScore}</span>
                              </>
                            )}
                          </div>
                          {match.status === 'live' && (
                            <div className="mt-4 flex flex-col items-center">
                              <span className="text-[14px] font-digital font-black text-red-500 tracking-[0.2em] shadow-glow-red">{calculateCurrentTimeFormat(match)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-3 sm:gap-4 w-24 sm:w-32 group/team">
                          <div className="w-18 h-18 sm:w-24 sm:h-24 bg-slate-50 dark:bg-background-dark rounded-3xl p-3 sm:p-4 shadow-inner ring-1 ring-slate-100 dark:ring-white/10 flex items-center justify-center transition-all duration-500 group-hover/team:scale-105 group-hover/team:shadow-lg [animation-delay:0.5s]">
                            <img src={getOptimizedImage(match.awayLogo, 150) || undefined} alt={match.awayTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain filter drop-shadow-md" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase text-center line-clamp-1 transition-colors group-hover/team:text-primary">{match.awayTeam}</span>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                         <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-9 px-4 items-center justify-center bg-slate-50 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-500 dark:text-slate-400 gap-2">
                              <Calendar size={14} className="text-primary-light" />
                              {format(new Date(match.date), 'EEEE, dd MMM', { locale: ar })}
                            </div>
                            {auth.currentUser && match.status === 'upcoming' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPredictionMatchId(match.id);
                                  const existing = userPredictions[match.id];
                                  setHomePrediction(existing ? String(existing.homeScore) : '0');
                                  setAwayPrediction(existing ? String(existing.awayScore) : '0');
                                }}
                                className={`h-9 px-4 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${userPredictions[match.id] ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white'}`}
                              >
                                <Target size={14} />
                                {userPredictions[match.id] ? 'توقعك مسجل' : 'توقع النتيجة'}
                              </button>
                            )}
                         </div>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-premium">
                              <span className="material-symbols-outlined !text-[20px] rotate-180">
                                arrow_back
                              </span>
                            </div>
                          </div>
                      </div>

                      {profile?.role === 'admin' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin', { state: { editCategory: 'matches', editId: match.id } });
                          }}
                          className="absolute top-4 right-4 p-2.5 bg-accent text-white rounded-2xl shadow-xl pressable opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                  {section.matches.length > (visibleCount[section.id] || 5) && (
                    <button 
                      onClick={() => setVisibleCount(prev => ({ ...prev, [section.id]: (prev[section.id] || 5) + 5 }))}
                      className="w-full h-12 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl flex items-center justify-center font-black text-xs text-primary shadow-sm hover:scale-[1.02] active:scale-95 transition-all mt-2"
                    >
                      المزيد من المباريات
                    </button>
                  )}
                </div>
              </div>
            )
          ))}
          
          {sortedMatches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 glass-card rounded-[40px] border-dashed border-2 border-slate-200 dark:border-border-dark text-slate-400">
                <span className="material-symbols-outlined !text-4xl mb-4 opacity-20">sports_soccer</span>
                <span className="font-bold text-sm">لا توجد مواجهات مسجلة حالياً</span>
              </div>
          )}
        </motion.section>

        {/* Season Statistics Upgrade */}
        <motion.section variants={itemVariants} className="mt-4">
           <div className="glass-card p-6 rounded-[32px] shadow-premium">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  تحليل أداء الموسم
                </h4>
                <div className="h-8 px-3 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-[9px] font-black text-slate-500">
                  Total Games: {totalGames}
                </div>
              </div>
              
              <div className="space-y-8">
                 {[
                   { label: 'انتصارات', count: seasonStats.wins, rate: winRate, color: 'bg-accent' },
                   { label: 'تعادلات', count: seasonStats.draws, rate: drawRate, color: 'bg-slate-400' },
                   { label: 'هزائم', count: seasonStats.losses, rate: lossRate, color: 'bg-red-500' }
                 ].map((stat, i) => (
                   <div key={i}>
                     <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">{stat.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{Math.round(stat.rate)}%</span>
                          <span className={`text-xs font-black text-white px-2.5 py-1 rounded-xl shadow-premium ${stat.color}`}>{stat.count}</span>
                        </div>
                     </div>
                     <div className="w-full h-2.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stat.rate}%` }} 
                          transition={{ duration: 1.5, delay: i * 0.2, ease: 'circOut' }} 
                          className={`h-full rounded-full shadow-glow ${stat.color}`}
                        />
                     </div>
                   </div>
                 ))}
              </div>
           </div>
        </motion.section>
      </motion.main>
      
      {/* Prediction Modal */}
      <AnimatePresence>
        {predictionMatchId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPredictionMatchId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-card-dark rounded-[32px] p-6 shadow-2xl overflow-hidden"
            >
               <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary"></div>
               
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">توقع النتيجة</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Make your prediction</p>
                  </div>
                  <button onClick={() => { setPredictionMatchId(null); setSubmitError(null); }} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
               </div>

               {submitError && (
                 <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold">
                   <span className="material-symbols-outlined !text-lg">error</span>
                   {submitError}
                 </div>
               )}

                {(() => {
                  const match = matches.find(m => m.id === predictionMatchId);
                  if (!match) return null;
                  const isBasketball = false;
                  
                  return (
                    <div className="flex flex-col gap-8">
                      {isBasketball ? (
                        <div className="flex flex-col gap-6">
                           <div className="text-center font-black text-[10px] text-slate-400 uppercase tracking-widest">اختر الفريق الفائز</div>
                           <div className="flex gap-4">
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setHomePrediction('1'); setAwayPrediction('0'); }}
                                className={`flex-1 flex flex-col items-center gap-4 p-5 rounded-[28px] border-2 transition-all duration-300 ${homePrediction === '1' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border-light dark:border-border-dark opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                              >
                                <div className="w-14 h-14 bg-white dark:bg-surface-dark rounded-2xl p-2.5 flex items-center justify-center border border-border-light dark:border-border-dark shadow-sm">
                                  <img src={getOptimizedImage(match.homeLogo, 150) || undefined} alt={match.homeTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-center line-clamp-1 h-3">{match.homeTeam}</span>
                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${homePrediction === '1' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>فوز</div>
                              </motion.button>

                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setHomePrediction('0'); setAwayPrediction('1'); }}
                                className={`flex-1 flex flex-col items-center gap-4 p-5 rounded-[28px] border-2 transition-all duration-300 ${awayPrediction === '1' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border-light dark:border-border-dark opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                              >
                                <div className="w-14 h-14 bg-white dark:bg-surface-dark rounded-2xl p-2.5 flex items-center justify-center border border-border-light dark:border-border-dark shadow-sm">
                                  <img src={getOptimizedImage(match.awayLogo, 150) || undefined} alt={match.awayTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-center line-clamp-1 h-3">{match.awayTeam}</span>
                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${awayPrediction === '1' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>فوز</div>
                              </motion.button>
                           </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-4">
                           <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-surface-dark rounded-2xl p-3 flex items-center justify-center border border-border-light dark:border-border-dark">
                                <img src={getOptimizedImage(match.homeLogo, 150) || undefined} alt={match.homeTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-center w-20 line-clamp-1">{match.homeTeam}</span>
                               <ScoreSelector 
                                  value={parseInt(homePrediction) || 0}
                                  onChange={(val) => setHomePrediction(String(val))}
                                  min={0}
                                  max={10}
                               />
                           </div>

                           <div className="text-2xl font-black text-slate-300">VS</div>

                           <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-surface-dark rounded-2xl p-3 flex items-center justify-center border border-border-light dark:border-border-dark">
                                <img src={getOptimizedImage(match.awayLogo, 150) || undefined} alt={match.awayTeam} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-center w-20 line-clamp-1">{match.awayTeam}</span>
                               <ScoreSelector 
                                  value={parseInt(awayPrediction) || 0}
                                  onChange={(val) => setAwayPrediction(String(val))}
                                  min={0}
                                  max={10}
                               />
                           </div>
                        </div>
                      )}

                     <button 
                       onClick={handleSavePrediction}
                       disabled={isSubmitting}
                       className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                     >
                       {isSubmitting ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                       ) : (
                         <>
                           <Send size={18} />
                           حفظ التوقع وتأكيده
                         </>
                       )}
                     </button>
                   </div>
                 );
               })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Predictions list modal */}
      <AnimatePresence>
        {showPredictionsList && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPredictionsList(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-card-dark rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">توقعات الجمهور</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Community Predictions</p>
                  </div>
                  <button onClick={() => setShowPredictionsList(null)} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {matchPredictions.length > 0 ? (
                    matchPredictions.map((pred) => {
                      const match = matches.find(m => m.id === pred.matchId);
                      const isFinished = match?.status === 'finished';
                      const isBasketball = false;
                      const isCorrect = isBasketball 
                        ? (isFinished && ((Number(match.homeScore) > Number(match.awayScore) && Number(pred.homeScore) > Number(pred.awayScore)) || (Number(match.awayScore) > Number(match.homeScore) && Number(pred.awayScore) > Number(pred.homeScore))))
                        : (isFinished && Number(match.homeScore) === Number(pred.homeScore) && Number(match.awayScore) === Number(pred.awayScore));
                      
                      return (
                        <div key={pred.id} className={`p-4 rounded-2xl border ${isCorrect ? 'border-green-500 bg-green-50/20 dark:bg-green-900/10' : 'border-border-light dark:border-border-dark bg-slate-50 dark:bg-surface-dark'} flex items-center justify-between transition-all group`}>
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                               <span className={`text-[11px] font-black uppercase ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>{pred.userName}</span>
                               {isFinished && (
                                  <div className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isCorrect ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-red-100 text-red-700'}`}>
                                    {isCorrect ? (
                                      <>
                                        <span className="material-symbols-outlined !text-[10px]">stars</span>
                                        توقع صحيح
                                      </>
                                    ) : (
                                      <>
                                        <X size={8} />
                                        غير دقيق
                                      </>
                                    )}
                                  </div>
                               )}
                             </div>
                             <span className="text-[9px] font-bold text-slate-400">{format(new Date(pred.createdAt), 'dd/MM HH:mm')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {isBasketball ? (
                               <div className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase shadow-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                                 فوز {pred.homeScore > pred.awayScore ? match?.homeTeam : match?.awayTeam}
                               </div>
                             ) : (
                               <>
                                 <div className="flex flex-col items-center">
                                   <span className={`w-8 h-8 flex items-center justify-center border rounded-lg font-black text-sm ${isCorrect ? 'bg-white dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-800 dark:text-white'}`}>{pred.homeScore}</span>
                                 </div>
                                 <span className={`text-sm font-black ${isCorrect ? 'text-green-400' : 'text-slate-300'}`}>-</span>
                                 <div className="flex flex-col items-center">
                                   <span className={`w-8 h-8 flex items-center justify-center border rounded-lg font-black text-sm ${isCorrect ? 'bg-white dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-800 dark:text-white'}`}>{pred.awayScore}</span>
                                 </div>
                               </>
                             )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center text-slate-400 font-bold text-xs">
                      لا توجد توقعات لهذا اللقاء بعد
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

