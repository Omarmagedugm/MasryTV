import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Music, 
  BookOpen, 
  Play, 
  Pause, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  Star,
  Download,
  Share2,
  Headphones,
  Gamepad2,
  Disc,
  Library as LibraryIcon,
  Book as BookIcon,
  Maximize2,
  X,
  Image as ImageIcon,
  Video,
  Heart,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getOptimizedImage } from '../lib/cloudinary';

export default function Library() {
  const { 
    songs, 
    setSongs, 
    books, 
    setBooks, 
    albums, 
    setAlbums, 
    media,
    setMedia,
    mediaPlaylists = [],
    currentSong, 
    setCurrentSong, 
    setIsPlaying, 
    isPlaying,
    setActivePlaylist 
  } = useAppStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'media' | 'music' | 'books'>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<string | null>(null);

  const getEmbedUrl = (url: string, source?: string) => {
    if (source === 'embed') return url;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('youtube.com/embed/')) {
      return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    } else if (url.includes('facebook.com/')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
    }
    return null;
  };

  const isEmbeddable = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('facebook.com');
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLikeMedia = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!auth.currentUser) return toast.error('يرجى تسجيل الدخول أولاً');
    
    setIsLiking(item.id);
    const hasLiked = item.likes?.includes(auth.currentUser.uid);
    
    try {
      await updateDoc(doc(db, 'media', item.id), {
        likes: hasLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(null);
    }
  };

  useEffect(() => {
    const unsubSongs = onSnapshot(collection(db, 'songs'), (snap) => {
      setSongs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error('Songs sync error:', error);
    });
    const unsubBooks = onSnapshot(collection(db, 'books'), (snap) => {
      setBooks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error('Books sync error:', error);
    });
    const unsubAlbums = onSnapshot(collection(db, 'albums'), (snap) => {
      setAlbums(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error('Albums sync error:', error);
    });
    const unsubMedia = onSnapshot(collection(db, 'media'), (snap) => {
      setMedia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error('Media sync error:', error);
    });
    return () => {
      unsubSongs();
      unsubBooks();
      unsubAlbums();
      unsubMedia();
    };
  }, []);

  const filteredSongs = songs.filter(s => 
    (s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterType === 'all' || s.category === filterType)
  );

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMedia = media.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (mediaTypeFilter === 'all' || m.type === mediaTypeFilter) &&
    (!selectedPlaylistId || m.playlistId === selectedPlaylistId)
  );

  const handlePlaySong = (song: any) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setActivePlaylist(filteredSongs);
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const [isBookLoading, setIsBookLoading] = useState(true);

  useEffect(() => {
    if (selectedBook || selectedMedia) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedBook, selectedMedia]);

  const closeBookModal = () => {
    // Explicitly nullify content if needed, but AnimatePresence covers unmounting
    setSelectedBook(null);
    setIsBookLoading(true);
  };

  useEffect(() => {
    if (selectedBook) {
      setIsBookLoading(true);
    }
  }, [selectedBook]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-32">
      {/* Header */}
      <div className="relative h-[300px] overflow-hidden bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-green-600 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2000')] bg-cover bg-center mix-blend-overlay"></div>
        
        <div className="relative z-10 h-full flex flex-col justify-end p-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <LibraryIcon size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">المكتبة الرقمية</h1>
            </div>
          </motion.div>

          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setActiveTab('media')}
              className={`px-6 py-2.5 rounded-full font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'media' ? 'bg-white text-primary shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <LibraryIcon size={18} />
              الميديا
            </button>
            <button 
              onClick={() => setActiveTab('music')}
              className={`px-6 py-2.5 rounded-full font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'music' ? 'bg-white text-primary shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <Music size={18} />
              الأغاني
            </button>
            <button 
              onClick={() => setActiveTab('books')}
              className={`px-6 py-2.5 rounded-full font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'books' ? 'bg-white text-primary shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <BookOpen size={18} />
              المكتبة
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        {/* Search & Stats */}
        <div className="bg-white dark:bg-card-dark rounded-3xl p-4 shadow-xl border border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="ابحث عن أغنية، فنان، أو كتاب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border-none outline-none focus:ring-2 ring-primary/20 text-sm font-bold"
            />
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-card-dark bg-slate-200 overflow-hidden">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="" />
                 </div>
               ))}
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase">١.٢٤٠ شخص يستمعون الآن</p>
          </div>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === 'media' ? (
              <motion.div
                key="media-tab"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-10"
              >
                {/* Playlists Curved Horizontal Slider */}
                {mediaPlaylists.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex flex-col">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-none">مجموعات الميديا المميزة</h3>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Curated Media Collections</span>
                      </div>
                      {selectedPlaylistId && (
                        <button 
                          onClick={() => setSelectedPlaylistId(null)}
                          className="text-xs font-black text-primary px-3 py-1 bg-primary/10 rounded-full hover:bg-primary/20 transition-all cursor-pointer"
                        >
                          عرض الكل
                        </button>
                      )}
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 -mx-4 sm:mx-0">
                      {mediaPlaylists.map((playlist) => (
                        <button 
                          key={playlist.id} 
                          onClick={() => setSelectedPlaylistId(selectedPlaylistId === playlist.id ? null : playlist.id)}
                          className={`flex-shrink-0 w-36 flex flex-col gap-2 cursor-pointer text-right group transition-all duration-300 ${(!selectedPlaylistId || selectedPlaylistId === playlist.id) ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
                        >
                          <div className={`aspect-square w-full rounded-[28px] overflow-hidden border-2 transition-all duration-300 ${selectedPlaylistId === playlist.id ? 'border-primary ring-4 ring-primary/10 scale-95 shadow-md' : 'border-transparent shadow-lg group-hover:scale-[1.03]'}`}>
                            <img src={getOptimizedImage(playlist.coverUrl || '', 300) || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="px-1">
                            <p className={`text-xs font-black line-clamp-1 transition-colors ${selectedPlaylistId === playlist.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300 group-hover:text-primary'}`}>{playlist.title}</p>
                            <p className="text-[9px] font-bold text-slate-400">{media.filter(m => m.playlistId === playlist.id).length} عنصر</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Media Type Sub-Tabs */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-card-dark p-1.5 rounded-2xl border border-border-light/60 dark:border-border-dark/60">
                    {[
                      { id: 'all', label: 'الكل', icon: null },
                      { id: 'photo', label: 'صور', icon: <ImageIcon size={14} /> },
                      { id: 'video', label: 'فيديو', icon: <Video size={14} /> }
                    ].map((tab) => (
                      <button 
                        key={tab.id}
                        onClick={() => setMediaTypeFilter(tab.id as any)}
                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${mediaTypeFilter === tab.id ? 'bg-white dark:bg-primary text-primary-dark dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {selectedPlaylistId && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-xl">
                      <span>تصفية حسب: {mediaPlaylists.find(p => p.id === selectedPlaylistId)?.title}</span>
                      <button onClick={() => setSelectedPlaylistId(null)} className="hover:text-red-500 cursor-pointer">
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredMedia.map((item) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ y: -6 }}
                      onClick={() => setSelectedMedia(item)}
                      className="group relative h-64 rounded-[32px] overflow-hidden shadow-premium border border-border-light/20 dark:border-border-dark/20 cursor-pointer bg-slate-100 dark:bg-card-dark"
                    >
                      <img src={getOptimizedImage(item.thumbnailUrl, 600) || undefined} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"></div>
                      
                      <div className="absolute top-5 right-5 flex flex-col gap-2 scale-90 group-hover:scale-100 transition-all opacity-0 group-hover:opacity-100 z-10">
                        <button 
                          onClick={(e) => handleLikeMedia(e, item)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all ${item.likes?.includes(auth.currentUser?.uid) ? 'bg-primary text-white border-primary' : 'bg-white/20 text-white border-white/20 hover:bg-primary'}`}
                        >
                          <Heart size={16} fill={item.likes?.includes(auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(item.videoUrl || item.thumbnailUrl, item.title); }}
                          className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 hover:bg-slate-800 transition-all"
                        >
                          <Download size={16} />
                        </button>
                      </div>

                      <div className="absolute inset-0 flex flex-col justify-end p-6 z-0">
                        <span className="text-primary text-[10px] font-black uppercase tracking-wider mb-1">
                          {item.type === 'video' ? 'فيديو' : 'صورة'}
                        </span>
                        <h3 className="text-white text-base font-black leading-tight line-clamp-2 drop-shadow-md group-hover:text-primary transition-colors">{item.title}</h3>
                        <div className="flex items-center justify-between mt-3 text-white/60 text-[10px] font-bold">
                          {item.duration && <span className="flex items-center gap-1"><Clock size={12} /> {item.duration}</span>}
                          <span className="flex items-center gap-1">
                            <Heart size={12} fill="currentColor" className="text-primary" />
                            {item.likes?.length || 0}
                          </span>
                        </div>
                      </div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-all duration-300 shadow-2xl z-10">
                        {item.type === 'video' ? <Play fill="currentColor" size={20} className="ml-1" /> : <Maximize2 size={20} />}
                      </div>
                    </motion.div>
                  ))}
                  {filteredMedia.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark">
                      <LibraryIcon className="mx-auto text-slate-300 mb-2 opacity-50" size={48} />
                      <p className="text-slate-400 font-bold">لا توجد وسائط مضافة في هذا القسم</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'music' ? (
              <motion.div
                key="music-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-12"
              >
                {/* Popular Albums */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black flex items-center gap-2">
                       <Disc className="text-primary" />
                       الألبومات الرسمية
                    </h2>
                    <button className="text-primary text-xs font-black uppercase hover:underline">عرض الكل</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    {albums.map((album) => (
                      <motion.div 
                        key={album.id}
                        whileHover={{ y: -5 }}
                        className="group bg-white dark:bg-card-dark p-4 rounded-[32px] border border-border-light dark:border-border-dark shadow-premium hover:shadow-2xl transition-all"
                      >
                        <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                          {album.coverUrl && album.coverUrl.trim() !== '' ? (
                            <img src={album.coverUrl || undefined} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                              <Disc size={48} className="text-slate-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                               <Play fill="currentColor" size={24} />
                             </button>
                          </div>
                        </div>
                        <h3 className="font-black text-sm truncate">{album.title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold">{album.artist} • {album.year}</p>
                      </motion.div>
                    ))}
                    {albums.length === 0 && (
                      <div className="col-span-full py-12 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark">
                         <Music className="mx-auto text-slate-300 mb-2" size={48} />
                         <p className="text-slate-400 font-bold">لا توجد ألبومات مضافة حالياً</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* All Songs List */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black flex items-center gap-2">
                       <Headphones className="text-primary" />
                       الأغاني
                    </h2>
                    <div className="flex gap-2">
                      {['all', 'anthem', 'chant', 'song'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setFilterType(cat)}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${filterType === cat ? 'bg-primary text-white' : 'bg-white dark:bg-card-dark text-slate-500 border border-border-light dark:border-border-dark'}`}
                        >
                          {cat === 'all' ? 'الكل' : cat === 'anthem' ? 'النشيد' : cat === 'chant' ? 'أهزوجة' : 'أغنية'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {filteredSongs.map((song, index) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all ${currentSong?.id === song.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark hover:shadow-lg'}`}
                      >
                         <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                           {song.coverUrl && song.coverUrl.trim() !== '' ? (
                             <img src={song.coverUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                             <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                               <Music size={24} className="text-slate-300" />
                             </div>
                           )}
                           <button 
                            onClick={() => handlePlaySong(song)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             {currentSong?.id === song.id && isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} />}
                           </button>
                         </div>
                         
                         <div className="flex-1 min-w-0">
                           <h4 className="text-xs font-black truncate">{song.title}</h4>
                           <p className="text-[10px] text-slate-400 font-bold truncate">{song.artist}</p>
                         </div>

                         <div className="flex items-center gap-6 px-4">
                            <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                               <Clock size={12} />
                               {song.duration || '03:45'}
                            </div>
                            <div className="flex items-center gap-2">
                               <button className="p-2 text-slate-400 hover:text-primary transition-all">
                                 <Download size={16} />
                               </button>
                               <button className="p-2 text-slate-400 hover:text-yellow-500 transition-all">
                                 <Star size={16} />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                    {filteredSongs.length === 0 && (
                       <p className="text-center py-10 text-slate-400 font-bold bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark">لا توجد نتائج بحث مطابقة</p>
                    )}
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="books-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              >
                {filteredBooks.map((book) => (
                  <motion.div 
                    key={book.id}
                    whileHover={{ y: -10 }}
                    className="flex flex-col group"
                  >
                    <div className="aspect-[3/4] rounded-[32px] overflow-hidden shadow-premium group-hover:shadow-2xl transition-all relative mb-4">
                      {book.coverUrl && book.coverUrl.trim() !== '' ? (
                        <img src={book.coverUrl || undefined} className="w-full h-full object-cover transition-all duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <BookOpen size={48} className="text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity"></div>
                      
                      <div className="absolute inset-0 flex flex-col justify-end p-6 translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                        <p className="text-white/70 text-[10px] font-black uppercase mb-1">{book.category}</p>
                        <h3 className="text-white text-lg font-black leading-tight mb-4">{book.title}</h3>
                        <button 
                          onClick={() => setSelectedBook(book)}
                          className="w-full bg-white text-primary py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                          <BookIcon size={18} />
                          اقرأ الآن
                        </button>
                      </div>
                    </div>
                    <div className="px-2">
                       <h3 className="font-black text-sm text-slate-800 dark:text-white truncate">{book.title}</h3>
                       <p className="text-[10px] text-slate-400 font-bold">{book.author}</p>
                    </div>
                  </motion.div>
                ))}
                {filteredBooks.length === 0 && (
                   <div className="col-span-full py-12 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark">
                      <BookIcon className="mx-auto text-slate-300 mb-2" size={48} />
                      <p className="text-slate-400 font-bold">لا توجد كتب مضافة حالياً</p>
                   </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Media Detail Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div 
            key="media-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMedia(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-pointer"
          >
            <motion.div 
              key="media-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl flex flex-col gap-4 cursor-default"
            >
              <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                   <h2 className="text-white text-2xl font-black">{selectedMedia.title}</h2>
                   <p className="text-primary text-xs font-bold uppercase tracking-widest">{selectedMedia.type === 'video' ? 'فيديو' : 'صورة'}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleLikeMedia(e, selectedMedia)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all ${selectedMedia.likes?.includes(auth.currentUser?.uid) ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      <Heart size={18} fill={selectedMedia.likes?.includes(auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                      {selectedMedia.likes?.length || 0}
                    </button>
                    <button 
                      onClick={() => handleDownload(selectedMedia.videoUrl || selectedMedia.thumbnailUrl, selectedMedia.title)}
                      className="px-6 py-2.5 bg-white/10 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-white/20 transition-all"
                    >
                      <Download size={18} />
                      تحميل
                    </button>
                    <button 
                     onClick={() => setSelectedMedia(null)}
                     className="p-3 bg-white/10 text-white hover:bg-red-500 rounded-2xl transition-all"
                    >
                     <X size={20} />
                    </button>
                 </div>
              </div>

              <div className="aspect-video w-full rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl relative border border-white/10">
                 {selectedMedia.type === 'video' ? (isEmbeddable(selectedMedia.videoUrl || selectedMedia.url || '') || selectedMedia.source === 'embed' ? <iframe src={getEmbedUrl(selectedMedia.videoUrl || selectedMedia.url || '', selectedMedia.source) || undefined} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" title={selectedMedia.title}></iframe> : (
                   <video 
                     src={selectedMedia.videoUrl || undefined} 
                     controls 
                     autoPlay 
                     className="w-full h-full object-contain"
                   />
                 )) : (
                   <img 
                     src={selectedMedia.thumbnailUrl || undefined} 
                     className="w-full h-full object-contain" 
                     referrerPolicy="no-referrer"
                     alt={selectedMedia.title}
                   />
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book Reader Modal */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div 
            key="book-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 md:p-10"
          >
            <motion.div 
              key="book-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full max-w-6xl bg-white dark:bg-background-dark rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-white dark:bg-surface-dark">
                <div className="flex items-center gap-4">
                  {selectedBook.coverUrl && selectedBook.coverUrl.trim() !== '' ? (
                    <img src={selectedBook.coverUrl || undefined} className="w-12 h-12 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shadow-sm">
                      <BookOpen size={20} className="text-slate-300" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-lg">{selectedBook.title}</h3>
                    <p className="text-xs text-slate-400 font-bold">{selectedBook.author}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                       const link = document.createElement('a');
                       link.href = selectedBook.pdfUrl;
                       link.target = '_blank';
                       link.download = `${selectedBook.title}.pdf`;
                       document.body.appendChild(link);
                       link.click();
                       document.body.removeChild(link);
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-background-dark rounded-xl text-xs font-black hover:bg-slate-200 transition-all"
                   >
                     <Download size={16} />
                     <span className="hidden sm:inline">تحميل PDF</span>
                   </button>
                   <button 
                    onClick={closeBookModal}
                    className="p-3 bg-slate-100 dark:bg-background-dark hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-2xl transition-all"
                   >
                    <X size={20} />
                   </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-800 relative">
                {isBookLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 z-10 text-center p-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white font-black text-xs animate-pulse">جاري تحميل صفحات الكتاب...</p>
                    <p className="text-white/40 text-[10px] font-bold mt-2">قد يستغرق بعض الوقت حسب حجم الملف</p>
                  </div>
                )}
                {selectedBook.pdfUrl.includes('drive.google.com') ? (
                  <iframe 
                    src={selectedBook.pdfUrl.replace('/view', '/preview') || undefined} 
                    className="w-full h-full border-none"
                    title="book-reader"
                    allow="autoplay"
                    onLoad={() => setIsBookLoading(false)}
                    loading="lazy"
                  />
                ) : (
                  <iframe 
                    src={selectedBook.pdfUrl || undefined} 
                    className="w-full h-full border-none"
                    title="book-reader"
                    onLoad={() => setIsBookLoading(false)}
                    loading="lazy"
                  />
                )}
              </div>
              
              <div className="p-6 bg-white dark:bg-surface-dark flex items-center justify-center gap-6">
                 <button className="p-3 hover:bg-slate-100 dark:hover:bg-card-dark rounded-full transition-all text-slate-400">
                    <Maximize2 size={20} />
                 </button>
                 <div className="h-6 w-[1px] bg-border-light dark:border-border-dark"></div>
                 <div className="flex items-center gap-4">
                   <button className="flex items-center gap-2 text-xs font-black text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all">
                     <Share2 size={16} />
                     مشاركة الكتاب
                   </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
