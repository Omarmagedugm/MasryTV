import { useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit, updateDoc, where, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAppStore } from '../store';

export function useFirestoreSync() {
  const { 
    setNews, setMedia, setMatches, setClubs, setPolls, setPredictions, setFanPosts,
    setUsers, setSettings, updateLiveStream, updateProfile, setCityInfo, setAds, setCustomPages,
    setNewsCategories, setNewsTags, setHomeSections, setProducts, setSongs, setAlbums, setPlaylists, setMediaPlaylists, setBooks,
    setClubStats, setClubTitles, setHistoryEvents, setStadiums
  } = useAppStore();

  useEffect(() => {
    // Sync Current User Profile first (Real-time)
    let unsubProfile = () => {};
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Throttle lastActive updates (only once every 4 hours per session)
      const lastUpdateKey = `last_active_update_${currentUser.uid}`;
      const lastUpdate = localStorage.getItem(lastUpdateKey);
      const now = Date.now();
      
      if (!lastUpdate || now - parseInt(lastUpdate) > 4 * 60 * 60 * 1000) {
        setDoc(doc(db, 'users', currentUser.uid), { lastActive: new Date().toISOString() }, { merge: true })
          .then(() => localStorage.setItem(lastUpdateKey, now.toString()))
          .catch(err => console.error('Failed to update activity:', err));
      }

      unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as any;
          updateProfile(userData);
          
          const email = currentUser.email?.toLowerCase();
          const isBootstrap = email === 'copyrightofficialco@gmail.com' || 
                              email === 'omarmagedugm@gmail.com' ||
                              email === 'itthadalexchannel2@gmail.com' ||
                              email === 'itthadalexchannel2@masry.club' ||
                              email?.startsWith('itthadalexchannel2@') ||
                              userData.username?.toLowerCase() === 'itthadalexchannel2';
          if (isBootstrap && userData.role !== 'admin') {
            updateDoc(doc(db, 'users', currentUser.uid), { role: 'admin' })
              .catch(err => console.error('Failed to auto-upgrade admin:', err));
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`));
    }

    // Sync Live Stream (Real-time)
    const unsubLive = onSnapshot(doc(db, 'settings', 'liveStream'), (docSnap) => {
      if (docSnap.exists()) {
        updateLiveStream(docSnap.data() as any);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/liveStream'));

    // Sync Matches (Real-time - essential for live tracking)
    const matchesQuery = query(collection(db, 'matches'), orderBy('date', 'desc'));
    const unsubMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matches = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setMatches(matches);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));

    // Sync Home Layout (Real-time for admins to see changes immediately)
    const unsubLayout = onSnapshot(doc(db, 'settings', 'homeLayout'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.sections) {
          const uniqueSectionsMap = new Map();
          data.sections.forEach((s: any) => { if (s && s.id) uniqueSectionsMap.set(s.id, s); });
          const mergedSections = Array.from(uniqueSectionsMap.values());
          const initialSections = [
            { id: 'hero', type: 'hero', active: true, order: 0 },
            { id: 'ads', type: 'ads', active: true, order: 0.5 },
            { id: 'matches', type: 'matches', active: true, order: 1 },
            { id: 'ai_banner', type: 'ai_banner', active: true, order: 1.2 },
            { id: 'city', type: 'city', active: true, order: 1.5, title: 'بورسعيد الباسلة' },
            { id: 'news', type: 'news', active: true, order: 2 },
            { id: 'media', type: 'media', active: true, order: 3 },
          ];
          initialSections.forEach(ds => { if (!uniqueSectionsMap.has(ds.id)) mergedSections.push(ds); });
          setHomeSections(mergedSections);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/homeLayout'));

    // Static/Infrequent data moved to fetchStaticData (non-realtime) to save costs

    // Sync News (Real-time with limit)
    const newsQuery = query(collection(db, 'news'), orderBy('date', 'desc'), limit(50));
    const unsubNews = onSnapshot(newsQuery, (snapshot) => {
      const news = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setNews(news);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'news'));

    // Sync Media (Real-time with limit)
    const mediaQuery = query(collection(db, 'media'), orderBy('date', 'desc'), limit(50));
    const unsubMedia = onSnapshot(mediaQuery, (snapshot) => {
      const mediaItems = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setMedia(mediaItems);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'media'));

    // Sync Media Playlists (Real-time)
    const unsubMediaPlaylists = onSnapshot(collection(db, 'media_playlists'), (snapshot) => {
      const playlists = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setMediaPlaylists(playlists);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'media_playlists'));

    // Sync Fan Posts (Real-time)
    const fanPostsQuery = query(collection(db, 'fan_posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubFanPosts = onSnapshot(fanPostsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setFanPosts(posts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'fan_posts'));

    // Sync Orders (Real-time)
    let unsubOrders = () => {};
    if (currentUser) {
      setTimeout(() => {
        const isAdminProfile = useAppStore.getState().profile?.role === 'admin';
        try {
          const ordersQuery = isAdminProfile 
            ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
            : query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
            
          unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
            if (!isAdminProfile) {
              items.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              });
            }
            useAppStore.getState().setOrders(items);
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
        } catch (e) {
          console.error('Orders Query Setup Error:', e);
        }
      }, 1000); // slight delay to allow profile load
    }

    // One-time Fetch for Static/Infrequent Data with Stale-While-Revalidate
    const fetchWithCache = async (cacheKey: string, setter: (data: any) => void, fetcher: () => Promise<any>) => {
      let cachedData: any = null;
      let hasCache = false;
      
      // 1. Instantly load from cache to keep UI responsive and prevent data loss
      try {
        const cached = localStorage.getItem(`fs_cache_${cacheKey}`);
        if (cached) {
          const { data } = JSON.parse(cached);
          cachedData = data;
          hasCache = true;
          setter(data);
        }
      } catch (e) { /* ignore */ }

      // 2. Fetch fresh data to avoid showing old out-dated content
      try {
        const data = await fetcher();
        try {
          localStorage.setItem(`fs_cache_${cacheKey}`, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) { /* ignore cache write error */ }
        setter(data);
        return data;
      } catch (err: any) {
        console.warn(`Fetch for '${cacheKey}' failed. Error:`, err?.message || err);
        if (!hasCache) {
          throw err;
        }
        return cachedData;
      }
    };

    const fetchStaticData = async () => {
      try {
        const catchErr = (path: string) => (err: any) => handleFirestoreError(err, OperationType.GET, path);
        
        // Helper for fetching collections
        const fetchCol = async (colName: string, setter: (data: any) => void, q?: any, mapFn?: (data: any[]) => any[]) => {
          try {
            await fetchWithCache(colName, setter, async () => {
              const snap = await getDocs(q || collection(db, colName));
              const items = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
              return mapFn ? mapFn(items) : items;
            });
          } catch (err) {
            setter([]); // Fallback to empty array to prevent state from remaining undefined
            catchErr(colName)(err);
          }
        };

        // Helper for fetching docs
        const fetchDoc = async (docPath: string, setter: (data: any) => void, mapFn?: (data: any) => any) => {
          try {
            await fetchWithCache(docPath.replace('/', '_'), (data) => {
              if (data) setter(data);
            }, async () => {
              const paths = docPath.split('/');
              const snap = await getDoc(doc(db, paths[0], paths[1]));
              if (snap.exists()) {
                const docData = { id: snap.id, ...snap.data() };
                return mapFn ? mapFn(docData) : docData;
              }
              return null;
            });
          } catch (err) {
            catchErr(docPath)(err);
          }
        };

        // Settings (stale-while-revalidate means we read cache instantly, and sync live)
        fetchDoc('settings/global', setSettings);
        fetchDoc('settings/newsCategories', d => setNewsCategories(d.list || []));
        fetchDoc('settings/newsTags', d => setNewsTags(d.tags || []));
        fetchDoc('city_info/portsaid', setCityInfo);
        
        // Content
        fetchCol('clubs', setClubs);
        fetchCol('polls', setPolls);
        fetchCol('predictions', setPredictions);
        fetchCol('products', setProducts);
        fetchCol('ads', setAds, undefined, (items) => {
          return items
            .filter(item => item.active === true)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        });
        fetchCol('custom_pages', setCustomPages);
        fetchCol('club_stats', setClubStats);
        fetchCol('club_titles', setClubTitles);
        fetchCol('club_timeline', setHistoryEvents, query(collection(db, 'club_timeline'), orderBy('year', 'asc')));
        fetchCol('club_stadiums', setStadiums);
        const profile = useAppStore.getState().profile;
        const email = auth.currentUser?.email?.toLowerCase();
        const isAdminOrManager = (profile?.role === 'admin') || 
                                 (profile?.roles && (profile.roles.includes('admin') || profile.roles.includes('user_manager'))) ||
                                 email === 'copyrightofficialco@gmail.com' || 
                                 email === 'omarmagedugm@gmail.com' ||
                                 email === 'itthadalexchannel2@gmail.com' ||
                                 email === 'itthadalexchannel2@masry.club' ||
                                 email?.startsWith('itthadalexchannel2@') ||
                                 profile?.username?.toLowerCase() === 'itthadalexchannel2';

        if (isAdminOrManager) {
          fetchCol('users', setUsers);
        }
        
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'static_data');
      }
    };

    fetchStaticData();

    return () => {
      unsubProfile();
      unsubLive();
      unsubMatches();
      unsubLayout();
      unsubNews();
      unsubMedia();
      unsubMediaPlaylists();
      unsubFanPosts();
      unsubOrders();
    };
  }, [auth.currentUser?.uid]); // Deliberately small dependency array to avoid re-renders triggering refetches
}
