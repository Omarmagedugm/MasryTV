import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit, updateDoc, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAppStore } from '../store';

export function useFirestoreSync() {
  const { 
    setNews, setMedia, setMatches, setClubs, setPolls, setPredictions, setFanPosts,
    setUsers, setSettings, updateLiveStream, updateProfile, setCityInfo, setAds, setCustomPages,
    setNewsCategories, setNewsTags, setHomeSections, setProducts, setSongs, setAlbums, setPlaylists, setMediaPlaylists, setBooks,
    setClubStats, setClubTitles, setHistoryEvents, setStadiums
  } = useAppStore();

  const isFetchedRef = useRef(false);

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
        updateDoc(doc(db, 'users', currentUser.uid), { lastActive: new Date().toISOString() })
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
            : query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
            
          unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
            useAppStore.getState().setOrders(items);
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
        } catch (e) {
          console.error('Orders Query Setup Error:', e);
        }
      }, 1000); // slight delay to allow profile load
    }

    // One-time Fetch for Static/Infrequent Data
    if (!isFetchedRef.current) {
      isFetchedRef.current = true;

      const fetchWithCache = async (cacheKey: string, fetcher: () => Promise<any>, ttlHours = 24) => {
        const isAdmin = useAppStore.getState().profile?.role === 'admin';
        // Always try to load from cache first for immediate UI updates
        try {
          const cached = localStorage.getItem(`fs_cache_${cacheKey}`);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Return cached data immediately if not admin (admins need fresh data)
            if (!isAdmin && Date.now() - timestamp < ttlHours * 60 * 60 * 1000) {
              return data;
            }
            // For admins or expired cache, return data but we'll fetch fresh in background
            if (!isAdmin) return data; 
          }
        } catch (e) { /* ignore */ }

        const data = await fetcher();
        
        try {
          localStorage.setItem(`fs_cache_${cacheKey}`, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
          // ignore cache save errors
        }
        
        return data;
      };

      const fetchStaticData = async () => {
        try {
          const catchErr = (path: string) => (err: any) => handleFirestoreError(err, OperationType.GET, path);
          
          // Helper for fetching collections
          const fetchCol = async (colName: string, setter: (data: any) => void, q?: any) => {
            try {
              const data = await fetchWithCache(colName, async () => {
                const snap = await getDocs(q || collection(db, colName));
                return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
              });
              setter(data as any);
            } catch (err) {
              catchErr(colName)(err);
            }
          };

          // Helper for fetching docs
          const fetchDoc = async (docPath: string, setter: (data: any) => void, mapFn?: (data: any) => any) => {
            try {
              const data = await fetchWithCache(docPath.replace('/', '_'), async () => {
                const paths = docPath.split('/');
                const snap = await getDoc(doc(db, paths[0], paths[1]));
                if (snap.exists()) {
                  const docData = { id: snap.id, ...snap.data() };
                  return mapFn ? mapFn(docData) : docData;
                }
                return null;
              });
              if (data) setter(data);
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, docPath);
            }
          };

          // Settings (No longer real-time to save quota)
          fetchDoc('settings/global', setSettings);
          fetchDoc('settings/newsCategories', d => setNewsCategories(d.list || []));
          fetchDoc('settings/newsTags', d => setNewsTags(d.tags || []));
          fetchDoc('city_info/portsaid', setCityInfo);
          
          // Content
          fetchCol('clubs', setClubs);
          fetchCol('polls', setPolls);
          fetchCol('predictions', setPredictions);
          fetchCol('products', setProducts);
          fetchCol('ads', setAds, query(collection(db, 'ads'), where('active', '==', true), orderBy('order', 'asc')));
          fetchCol('custom_pages', setCustomPages);
          
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'static_data');
        }
      };

      fetchStaticData();
    }

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
