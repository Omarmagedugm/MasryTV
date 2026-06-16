import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useMemo } from 'react';

export interface HomeSection {
  id: string;
  type: 'hero' | 'matches' | 'news' | 'media' | 'history' | 'stadiums' | 'store' | 'polls' | 'live' | 'custom' | 'widget' | 'city' | 'ads' | 'advertise' | 'image' | 'ai_banner' | 'tickets';
  title?: string;
  active: boolean;
  order: number;
  htmlCode?: string;
  imageUrl?: string;
  link?: string;
  spacing?: number;
  pinned?: boolean;
}

export interface NewsTag {
  id: string;
  name: string;
  color: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  image: string;
  date: string;
  type: 'manual' | 'rss';
  category?: string;
  author?: string;
  editorName?: string;
  rssUrl?: string;
  rssSource?: string;
  tagIds?: string[];
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'photo';
  source?: 'upload' | 'youtube';
  url: string;
  thumbnailUrl: string;
  videoUrl?: string;
  date: string;
  duration?: string;
  views?: string;
  likes?: string[];
  playlistId?: string;
}

export interface MediaPlaylist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  createdAt: string;
}

export interface MatchItem {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: string;
  awayScore: string;
  date: string;
  status: 'live' | 'upcoming' | 'finished';
  competition: string;
  stadium?: string;
  stadiumImage?: string;
  isMatchDay?: boolean;
  isTimerRunning?: boolean;
  timerStartTime?: string | null;
  timerBaseMinute?: number;
  sport: 'football';
  featured?: boolean;
  stadiumOpacity?: number;
}

export interface CityInfo {
  id: string;
  cityName: string;
  useAutoWeather?: boolean;
  temperature: string;
  condition: string;
  sunset: string;
  sunrise: string;
  description: string;
  image: string;
  weatherBg?: string;
  active: boolean;
}

export interface ClubItem {
  id: string;
  name: string;
  logo: string;
}

export interface PollItem {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  voters?: string[];
  voterChoices?: Record<string, number>;
  active: boolean;
  createdAt: string;
}

export interface PredictionItem {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
}

export interface FanPostItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image?: string;
  location?: string;
  date?: string;
  poll?: {
    options: string[];
    votes: Record<number, number>;
    voters?: string[];
    voterChoices?: Record<string, number>;
  };
  likes: number;
  likedBy?: string[];
  commentsCount?: number;
  createdAt: string;
}

export interface LiveStream {
  isActive: boolean;
  url: string;
  title: string;
  viewers: number;
}

export interface ClubTitle {
  id: string;
  name: string;
  count: number;
  icon: string;
  category: 'football';
  hidden?: boolean;
}

export interface ClubStat {
  id: string;
  label: string;
  value: number;
  icon: string;
  hidden?: boolean;
}

export interface HistoryEvent {
  id: string;
  year: string;
  title: string;
  desc: string;
  hidden?: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumId?: string;
  audioUrl: string;
  coverUrl: string;
  duration?: string;
  category: 'anthem' | 'chant' | 'song';
  lyrics?: string;
  hidden?: boolean;
  createdAt?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: string;
  hidden?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  coverUrl: string;
  songIds: string[];
  hidden?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  pdfUrl: string;
  desc: string;
  category: string;
  hidden?: boolean;
}

export interface AdBanner {
  id: string;
  title: string;
  image: string;
  link: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export interface StadiumItem {
  id: string;
  name: string;
  type: string;
  desc: string;
  imageUrl: string;
  hidden?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'tshirt' | 'mug' | 'scarf' | 'bracelet' | 'other';
  imageUrl: string;
  stock: number;
}

export interface StoreOrder {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  userEmail?: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'ready' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'sold';
  createdAt: string;
}

export type AppRole = 'admin' | 'news_editor' | 'media_editor' | 'matches_editor' | 'store_editor' | 'layout_editor' | 'user_manager';

export interface UserProfile {
  uid?: string;
  name: string;
  username?: string;
  location: string;
  joinDate: string;
  avatar: string;
  isVerified?: boolean;
  role?: 'user' | 'admin' | 'moderator' | 'writer'; // Legacy support
  roles?: AppRole[];
  tier?: 'new' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'premium';
  bio?: string;
  email?: string;
  stats: {
    predictions: number;
    comments: number;
    favorites: number;
  };
}

interface AppState {
  news: NewsItem[];
  media: MediaItem[];
  matches: MatchItem[];
  clubs: ClubItem[];
  polls: PollItem[];
  predictions: PredictionItem[];
  fanPosts: FanPostItem[];
  users: UserProfile[];
  appSettings: {
    appName: string;
    appLogo: string;
    headerLogoLight?: string;
    headerLogoDark?: string;
    logoType?: 'image' | 'text';
    logoText?: string;
    defaultSport?: 'football' | 'auto';
  };
  liveStream: LiveStream;
  theme: 'dark' | 'light';
  profile: UserProfile;
  clubTitles: ClubTitle[];
  clubStats: ClubStat[];
  historyEvents: HistoryEvent[];
  stadiums: StadiumItem[];
  newsCategories: string[];
  newsTags: NewsTag[];
  products: Product[];
  orders: StoreOrder[];
  ads: AdBanner[];
  customPages: any[];
  homeSections: HomeSection[];
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  mediaPlaylists: MediaPlaylist[];
  books: Book[];
  cityInfo: CityInfo | null;
  currentSong: Song | null;
  isPlaying: boolean;
  playerVolume: number;
  stadiumOpacity: number;
  isAuthReady: boolean;
  activePlaylist: Song[];
  undoStack: { collection: string; action: 'add' | 'delete' | 'update'; data: any }[];
  setNews: (news: NewsItem[]) => void;
  addNews: (item: NewsItem) => void;
  deleteNews: (id: string) => void;
  updateNews: (id: string, item: Partial<NewsItem>) => void;
  setMedia: (media: MediaItem[]) => void;
  addMedia: (item: MediaItem) => void;
  deleteMedia: (id: string) => void;
  updateMedia: (id: string, item: Partial<MediaItem>) => void;
  setMatches: (matches: MatchItem[]) => void;
  addMatch: (item: MatchItem) => void;
  deleteMatch: (id: string) => void;
  updateMatch: (id: string, item: Partial<MatchItem>) => void;
  setClubs: (clubs: ClubItem[]) => void;
  setPolls: (polls: PollItem[]) => void;
  setPredictions: (predictions: PredictionItem[]) => void;
  setFanPosts: (posts: FanPostItem[]) => void;
  setUsers: (users: UserProfile[]) => void;
  updateUser: (uid: string, item: Partial<UserProfile>) => void;
  deleteUser: (uid: string) => void;
  setSettings: (settings: any) => void;
  updateLiveStream: (stream: Partial<LiveStream>) => void;
  toggleTheme: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setClubTitles: (titles: ClubTitle[]) => void;
  setClubStats: (stats: ClubStat[]) => void;
  setHistoryEvents: (events: HistoryEvent[]) => void;
  setStadiums: (stadiums: StadiumItem[]) => void;
  setNewsCategories: (categories: string[]) => void;
  setNewsTags: (tags: NewsTag[]) => void;
  setProducts: (products: Product[]) => void;
  setOrders: (orders: StoreOrder[]) => void;
  setAds: (ads: AdBanner[]) => void;
  setCustomPages: (pages: any[]) => void;
  setHomeSections: (sections: HomeSection[]) => void;
  setSongs: (songs: Song[]) => void;
  setAlbums: (albums: Album[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  setMediaPlaylists: (playlists: MediaPlaylist[]) => void;
  setBooks: (books: Book[]) => void;
  setCityInfo: (info: CityInfo | null) => void;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlayerVolume: (volume: number) => void;
  setStadiumOpacity: (opacity: number) => void;
  setIsAuthReady: (ready: boolean) => void;
  setActivePlaylist: (songs: Song[]) => void;
  pushToUndoStack: (op: { collection: string; action: 'add' | 'delete' | 'update'; data: any }) => void;
  popFromUndoStack: () => { collection: string; action: 'add' | 'delete' | 'update'; data: any } | undefined;
}

const defaultNews: NewsItem[] = [
  {
    id: uuidv4(),
    title: 'تأهل المصري لربع نهائي الكونفدرالية',
    content: 'نجح الفريق الأول للكرة بالنادي المصري في التأهل لربع نهائي بطولة الكونفدرالية الأفريقية بعد أداء مشرف نال استحسان الجميع.',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop',
    date: new Date(Date.now() - 1 * 3600000).toISOString(),
    type: 'manual',
  },
  {
    id: uuidv4(),
    title: 'تذبذب نتائج الفريق في الدوري المصري',
    content: 'يعاني الفريق من تذبذب في النتائج خلال الجولات الأخيرة من الدوري، ويسعى الجهاز الفني لتصحيح المسار سريعاً.',
    image: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=1000&auto=format&fit=crop',
    date: new Date(Date.now() - 2 * 3600000).toISOString(),
    type: 'manual',
  },
  {
    id: uuidv4(),
    title: 'استعدادات قوية لمباراة الأهلي القادمة',
    content: 'دخل الفريق في معسكر مغلق استعداداً للمواجهة المرتقبة أمام النادي الأهلي، وسط تركيز كبير من جميع اللاعبين.',
    image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000&auto=format&fit=crop',
    date: new Date(Date.now() - 5 * 3600000).toISOString(),
    type: 'manual',
  }
];

const defaultMedia: MediaItem[] = [
  {
    id: uuidv4(),
    title: 'ملخص مباراة المصري وإنبي - عودة الروح',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510563399035-7140409890a5?q=80&w=1000&auto=format&fit=crop',
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    duration: '06:15',
    views: '200K',
  },
  {
    id: uuidv4(),
    title: 'صور تدريبات نسور بورسعيد اليوم',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000&auto=format&fit=crop',
    date: new Date().toISOString(),
  }
];

const defaultMatches: MatchItem[] = [
  {
    id: uuidv4(),
    homeTeam: 'المصري',
    awayTeam: 'الأهلي',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Al_Masry_SC_logo.svg/1200px-Al_Masry_SC_logo.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ef/Al_Ahly_SC_logo.svg/1200px-Al_Ahly_SC_logo.svg.png',
    homeScore: '-',
    awayScore: '-',
    date: '2026-05-15T20:00:00Z',
    status: 'upcoming',
    competition: 'الدوري المصري الممتاز',
    stadium: 'برج العرب',
    sport: 'football',
    featured: true,
  },
  {
    id: uuidv4(),
    homeTeam: 'المصري',
    awayTeam: 'الإسماعيلي',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Al_Masry_SC_logo.svg/1200px-Al_Masry_SC_logo.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/69/Ismaily_SC_logo.svg/1200px-Ismaily_SC_logo.svg.png',
    homeScore: '0',
    awayScore: '2',
    date: '2026-04-28T19:00:00Z',
    status: 'finished',
    competition: 'الدوري المصري الممتاز',
    sport: 'football',
  },
  {
    id: uuidv4(),
    homeTeam: 'المصري',
    awayTeam: 'إنبي',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Al_Masry_SC_logo.svg/1200px-Al_Masry_SC_logo.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Enppi_SC_logo_2022.png/1200px-Enppi_SC_logo_2022.png',
    homeScore: '3',
    awayScore: '2',
    date: '2026-04-20T19:00:00Z',
    status: 'finished',
    competition: 'الدوري المصري الممتاز',
    sport: 'football',
  },
  {
    id: uuidv4(),
    homeTeam: 'المصري',
    awayTeam: 'مودرن سبورت',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Al_Masry_SC_logo.svg/1200px-Al_Masry_SC_logo.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Modern_Future_FC_logo.svg/1200px-Modern_Future_FC_logo.svg.png',
    homeScore: '0',
    awayScore: '1',
    date: '2026-04-12T19:00:00Z',
    status: 'finished',
    competition: 'الدوري المصري الممتاز',
    sport: 'football',
  },
  {
    id: uuidv4(),
    homeTeam: 'المصري',
    awayTeam: 'المقاولون العرب',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Al_Masry_SC_logo.svg/1200px-Al_Masry_SC_logo.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f0/Al_Mokawloon_Al_Arab_SC_logo.png/1200px-Al_Mokawloon_Al_Arab_SC_logo.png',
    homeScore: '1',
    awayScore: '1',
    date: '2026-04-05T19:00:00Z',
    status: 'finished',
    competition: 'الدوري المصري الممتاز',
    sport: 'football',
  }
];

const defaultLiveStream: LiveStream = {
  isActive: true,
  url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  title: 'مباراة المصري والأهلي - بث مباشر',
  viewers: 15420,
};

const defaultProfile: UserProfile = {
  name: 'مشجع مصراوي',
  username: 'fan_masry',
  location: 'بورسعيد، مصر',
  joinDate: '٢٠٢٤',
  avatar: 'https://ui-avatars.com/api/?name=%D9%85%D8%B4%D8%AC%D8%B9+%D9%85%D8%B5%D8%B1%D8%A7%D9%88%D9%8A&background=random',
  isVerified: false,
  role: 'user',
  tier: 'new',
  bio: 'مشجع عاشق للنادي المصري البورسعيدي - نسور بورسعيد',
  stats: {
    predictions: 0,
    comments: 0,
    favorites: 0
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      news: defaultNews,
      media: defaultMedia,
      matches: defaultMatches,
      clubs: [],
      polls: [],
      predictions: [],
      fanPosts: [],
      users: [],
      appSettings: {
        appName: 'قناة المصري البورسعيدي',
        appLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Al_Masry_SC_logo.svg/1200px-Al_Masry_SC_logo.svg.png',
        headerLogoLight: '',
        headerLogoDark: '',
        logoType: 'image',
        logoText: 'المصري البورسعيدي',
        defaultSport: 'auto'
      },
      liveStream: defaultLiveStream,
      theme: 'dark',
      profile: defaultProfile,
      isAuthReady: false,
      clubTitles: [
        { id: uuidv4(), name: 'كأس مصر', count: 1, icon: 'trophy', category: 'football' },
        { id: uuidv4(), name: 'كأس السلطان حسين', count: 3, icon: 'shield', category: 'football' },
        { id: uuidv4(), name: 'دوري منطقة القنال', count: 17, icon: 'star', category: 'football' },
        { id: uuidv4(), name: 'كأس الاتحاد المصري', count: 1, icon: 'military_tech', category: 'football' },
      ],
      clubStats: [
        { id: uuidv4(), label: 'سنة من المجد', value: new Date().getFullYear() - 1920, icon: 'history' },
        { id: uuidv4(), label: 'بطولات رسمية', value: 22, icon: 'workspace_premium' },
        { id: uuidv4(), label: 'أساطير النادي', value: 50, icon: 'groups' },
        { id: uuidv4(), label: 'قاعدة جماهيرية', value: 2, icon: 'favorite' }, // represent millions or ratio
      ],
      historyEvents: [
        { id: uuidv4(), year: '1920', title: 'تأسيس النادي', desc: 'تأسس النادي المصري البورسعيدي ليكون أول نادٍ للمصريين في بورسعيد ومنطقة القنال لمواجهة أندية الأجانب.' },
        { id: uuidv4(), year: '1923', title: 'كأس السلطان حسين', desc: 'المصري يحقق أولى بطولاته الرسمية بالفوز بكأس السلطان حسين كأول نادٍ مصري يحقق لقباً.' },
        { id: uuidv4(), year: '1948', title: 'الدوري الممتاز', desc: 'المصري يشارك في أول نسخة للدوري المصري الممتاز لكرة القدم كأحد مؤسسي المسابقة.' },
        { id: uuidv4(), year: '1998', title: 'كأس مصر التاريخي', desc: 'المصري يحصد لقب كأس مصر بعد فوز تاريخي على المقاولون العرب بنتيجة 4-3 في النهائي الشهير.' },
        { id: uuidv4(), year: '2020', title: 'مئوية النادي', desc: 'الاحتفال بمرور 100 عام على تأسيس قلعة النسور الخضراء البورسعيدية.' },
      ],
      stadiums: [
        { id: uuidv4(), name: 'إستاد بورسعيد', type: 'الملعب التاريخي', desc: 'المعقل الرئيسي للنادي المصري في قلب مدينة بورسعيد الباسلة.', imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80' },
      ],
      newsCategories: ['أخبار الفريق', 'تقارير', 'انتقالات', 'بورسعيد'],
      newsTags: [
        { id: '1', name: 'مباشر', color: '#ef4444' },
        { id: '2', name: 'عاجل', color: '#eab308' },
        { id: '3', name: 'رائج', color: '#22c55e' },
      ],
      products: [],
      orders: [],
      ads: [],
      customPages: [],
      homeSections: [
        { id: 'hero', type: 'hero', active: true, order: 0 },
        { id: 'matches', type: 'matches', active: true, order: 1 },
        { id: 'city', type: 'city', active: true, order: 1.5, title: 'المدينة الباسلة' },
        { id: 'news', type: 'news', active: true, order: 2 },
        { id: 'media', type: 'media', active: true, order: 3 },
        { id: 'polls', type: 'polls', active: true, order: 4 },
        { id: 'history', type: 'history', active: true, order: 5 },
        { id: 'advertise', type: 'advertise', active: true, order: 10 },
      ],
      songs: [],
      albums: [],
      playlists: [],
      mediaPlaylists: [],
      books: [],
      cityInfo: null,
      currentSong: null,
      isPlaying: false,
      playerVolume: 1,
      stadiumOpacity: 0.2,
      activePlaylist: [],
      undoStack: [],
      setNews: (news) => set({ news }),
      addNews: (item) => set((state) => ({ news: [item, ...state.news] })),
      deleteNews: (id) => set((state) => ({ news: state.news.filter(n => n.id !== id) })),
      updateNews: (id, updatedItem) => set((state) => ({
        news: state.news.map(n => n.id === id ? { ...n, ...updatedItem } : n)
      })),
      setMedia: (media) => set({ media }),
      addMedia: (item) => set((state) => ({ media: [item, ...state.media] })),
      deleteMedia: (id) => set((state) => ({ media: state.media.filter(m => m.id !== id) })),
      updateMedia: (id, updatedItem) => set((state) => ({
        media: state.media.map(m => m.id === id ? { ...m, ...updatedItem } : m)
      })),
      setMatches: (matches) => set({ matches }),
      addMatch: (item) => set((state) => ({ matches: [item, ...state.matches] })),
      deleteMatch: (id) => set((state) => ({ matches: state.matches.filter(m => m.id !== id) })),
      updateMatch: (id, updatedItem) => set((state) => ({
        matches: state.matches.map(m => m.id === id ? { ...m, ...updatedItem } : m)
      })),
      setClubs: (clubs) => set({ clubs }),
      setPolls: (polls) => set({ polls }),
      setPredictions: (predictions) => set({ predictions }),
      setFanPosts: (posts) => set({ fanPosts: posts }),
      setUsers: (users) => set({ users }),
      updateUser: (uid, updatedItem) => set((state) => ({
        users: state.users.map(u => u.uid === uid ? { ...u, ...updatedItem } : u)
      })),
      deleteUser: (uid) => set((state) => ({
        users: state.users.filter(u => u.uid !== uid)
      })),
      setSettings: (settings) => set((state) => ({ appSettings: { ...state.appSettings, ...settings } })),
      updateLiveStream: (stream) => set((state) => ({ liveStream: { ...state.liveStream, ...stream } })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } as UserProfile })),
      setClubTitles: (clubTitles) => set({ clubTitles }),
      setClubStats: (clubStats) => set({ clubStats }),
      setHistoryEvents: (historyEvents) => set({ historyEvents }),
      setStadiums: (stadiums) => set({ stadiums }),
      setNewsCategories: (newsCategories) => set({ newsCategories }),
      setNewsTags: (newsTags) => set({ newsTags }),
      setProducts: (products) => set({ products }),
      setOrders: (orders) => set({ orders }),
      setAds: (ads) => set({ ads }),
      setCustomPages: (customPages) => set({ customPages }),
      setHomeSections: (homeSections) => set({ homeSections }),
      setSongs: (songs) => set({ songs }),
      setAlbums: (albums) => set({ albums }),
      setPlaylists: (playlists) => set({ playlists }),
      setMediaPlaylists: (mediaPlaylists) => set({ mediaPlaylists }),
      setBooks: (books) => set({ books }),
      setCityInfo: (cityInfo) => set({ cityInfo }),
      setCurrentSong: (currentSong) => set({ currentSong }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setPlayerVolume: (playerVolume) => set({ playerVolume }),
      setStadiumOpacity: (stadiumOpacity) => set({ stadiumOpacity }),
      setIsAuthReady: (isAuthReady) => set({ isAuthReady }),
      setActivePlaylist: (activePlaylist) => set({ activePlaylist }),
      pushToUndoStack: (op) => set((state) => ({ 
        undoStack: [op, ...state.undoStack].slice(0, 20) // Keep last 20 operations
      })),
      popFromUndoStack: () => {
        let op: any = undefined;
        set((state) => {
          if (state.undoStack.length === 0) return state;
          const [first, ...rest] = state.undoStack;
          op = first;
          return { undoStack: rest };
        });
        return op;
      },
    }),
    {
      name: 'masry-app-storage',
      partialize: (state) => {
        const { isAuthReady, ...rest } = state;
        localStorage.setItem('masry-app-storage', JSON.stringify(rest));
        return rest;
      },
    }
  )
);

export const useResolvedMatches = () => {
  const matches = useAppStore(state => state.matches);
  const clubs = useAppStore(state => state.clubs);
  return useMemo(() => {
    if (!matches) return [];
    return matches.map(m => {
      const homeClub = clubs?.find(c => c.name.trim().toLowerCase() === m.homeTeam.trim().toLowerCase());
      const awayClub = clubs?.find(c => c.name.trim().toLowerCase() === m.awayTeam.trim().toLowerCase());
      return {
        ...m,
        homeLogo: homeClub?.logo || m.homeLogo,
        awayLogo: awayClub?.logo || m.awayLogo,
      };
    });
  }, [matches, clubs]);
};

