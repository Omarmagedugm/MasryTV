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
    // Dynamic Fallback loader if Firestore collections are empty or offline
    const loadBackupAsFallback = async () => {
      try {
        console.log('Fetching backup_data.json as fallback...');
        const res = await fetch('/backup_data.json');
        if (res.ok) {
          const data = await res.json();
          console.log('Successfully loaded backup fallback data in-memory');
          
          if (data.news && data.news.length > 0) setNews(data.news.map((item: any) => ({ id: item.id, ...item })));
          if (data.matches && data.matches.length > 0) setMatches(data.matches.map((item: any) => ({ id: item.id, ...item })));
          if (data.media && data.media.length > 0) setMedia(data.media.map((item: any) => ({ id: item.id, ...item })));
          if (data.products && data.products.length > 0) setProducts(data.products.map((item: any) => ({ id: item.id, ...item })));
          if (data.songs && data.songs.length > 0) setSongs(data.songs.map((item: any) => ({ id: item.id, ...item })));
          if (data.albums && data.albums.length > 0) setAlbums(data.albums.map((item: any) => ({ id: item.id, ...item })));
          if (data.playlists && data.playlists.length > 0) setPlaylists(data.playlists.map((item: any) => ({ id: item.id, ...item })));
          if (data.media_playlists && data.media_playlists.length > 0) setMediaPlaylists(data.media_playlists.map((item: any) => ({ id: item.id, ...item })));
          if (data.books && data.books.length > 0) setBooks(data.books.map((item: any) => ({ id: item.id, ...item })));
          if (data.club_stats && data.club_stats.length > 0) setClubStats(data.club_stats.map((item: any) => ({ id: item.id, ...item })));
          if (data.club_titles && data.club_titles.length > 0) setClubTitles(data.club_titles.map((item: any) => ({ id: item.id, ...item })));
          if (data.club_timeline && data.club_timeline.length > 0) setHistoryEvents(data.club_timeline.map((item: any) => ({ id: item.id, ...item })));
          if (data.club_stadiums && data.club_stadiums.length > 0) setStadiums(data.club_stadiums.map((item: any) => ({ id: item.id, ...item })));
          if (data.ads && data.ads.length > 0) setAds(data.ads.map((item: any) => ({ id: item.id, ...item })));
          if (data.custom_pages && data.custom_pages.length > 0) setCustomPages(data.custom_pages.map((item: any) => ({ id: item.id, ...item })));
          if (data.city_info && data.city_info.length > 0) {
            const portsaidInfo = data.city_info.find((item: any) => item.id === 'portsaid') || data.city_info[0];
            if (portsaidInfo) setCityInfo(portsaidInfo);
          }
          if (data.settings) {
            const globalSettings = data.settings.find((item: any) => item.id === 'global');
            if (globalSettings) setSettings(globalSettings);
            const liveStreamSettings = data.settings.find((item: any) => item.id === 'liveStream');
            if (liveStreamSettings) updateLiveStream(liveStreamSettings);
            const categories = data.settings.find((item: any) => item.id === 'newsCategories');
            if (categories) setNewsCategories(categories.list || []);
            const tags = data.settings.find((item: any) => item.id === 'newsTags');
            if (tags) setNewsTags(tags.tags || []);
          }
        }
      } catch (err) {
        console.error('Failed to load backup data fallback:', err);
      }
    };

    const tryAutoSeedFirebase = async (isUserAdmin: boolean) => {
      if (!isUserAdmin) return;
      try {
        const newsCheck = await getDocs(query(collection(db, 'news'), limit(1)));
        if (newsCheck.empty) {
          console.log('Admin logged in and empty database detected. Auto-seeding Firestore from backup...');
          const res = await fetch('/backup_data.json');
          if (res.ok) {
            const backup = await res.json();
            const collections = Object.keys(backup);
            for (const col of collections) {
              const items = backup[col];
              if (Array.isArray(items)) {
                for (const item of items) {
                  const { id, ...docData } = item;
                  if (id) {
                    try {
                      await setDoc(doc(db, col, id), docData);
                    } catch (e) {
                      console.warn(`Auto-seed doc ${id} warning:`, e);
                    }
                  }
                }
              }
            }
            console.log('Auto-seeding Firestore complete!');
            // Notify user before reloading to avoid surprising them
            if (typeof window !== 'undefined') {
              console.info('Database seeded. Reloading to apply data...');
              setTimeout(() => window.location.reload(), 1500);
            }
          }
        }
      } catch (err) {
        console.error('Auto-seed check failed:', err);
      }
    };

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
          if (isBootstrap && (userData.role !== 'admin' || userData.tier !== 'premium')) {
            updateDoc(doc(db, 'users', currentUser.uid), { role: 'admin', tier: 'premium' })
              .catch(err => console.error('Failed to auto-upgrade admin and premium tier:', err));
          }

          // Load members list immediately once we verify this user is an authorized admin or manager
          const userRole = userData.role || 'user';
          const userRoles = userData.roles || [];
          const canAccessUsers = userRole === 'admin' || userRoles.includes('admin') || userRoles.includes('user_manager') || isBootstrap;
          
          if (canAccessUsers) {
            getDocs(collection(db, 'users'))
              .then(snap => {
                const fetchedUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
                setUsers(fetchedUsers);
              })
              .catch(err => console.error('Failed to fetch members list dynamically:', err));

            // Auto-seed if database is blank
            tryAutoSeedFirebase(true);
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
      if (snapshot.empty) {
        console.warn('Matches collection is empty in Firestore, trying backup data fallback...');
        loadBackupAsFallback();
      } else {
        const matches = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
        setMatches(matches);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
      loadBackupAsFallback();
    });

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
      if (snapshot.empty) {
        console.warn('News collection is empty in Firestore, trying backup data fallback...');
        loadBackupAsFallback();
      } else {
        const news = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
        setNews(news);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'news');
      loadBackupAsFallback();
    });

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

    // Sync Songs (Real-time) — was missing, data was only loaded from backup JSON
    const songsQuery = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
    const unsubSongs = onSnapshot(songsQuery, (snapshot) => {
      const songs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setSongs(songs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'songs'));

    // Sync Albums (Real-time) — was missing
    const unsubAlbums = onSnapshot(collection(db, 'albums'), (snapshot) => {
      const albums = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setAlbums(albums);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'albums'));

    // Sync Music Playlists (Real-time) — was missing
    const unsubPlaylists = onSnapshot(collection(db, 'playlists'), (snapshot) => {
      const playlists = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setPlaylists(playlists);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'playlists'));

    // Sync Books (Real-time) — was missing
    const unsubBooks = onSnapshot(collection(db, 'books'), (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setBooks(books);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'books'));

    // Sync Fan Posts (Real-time)
    const fanPostsQuery = query(collection(db, 'fan_posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubFanPosts = onSnapshot(fanPostsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any;
      setFanPosts(posts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'fan_posts'));

    // Sync Orders (Real-time)
    let unsubOrders = () => {};
    if (currentUser) {
      // Listen to profile snapshot to set up orders query reactively (avoids setTimeout race condition)
      const setupOrdersQuery = (isAdmin: boolean) => {
        try {
          const ordersQuery = isAdmin
            ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
            : query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));

          unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
            useAppStore.getState().setOrders(items);
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
        } catch (e) {
          console.error('Orders Query Setup Error:', e);
        }
      };

      // Start with user-scoped query immediately, upgrade to admin query if profile confirms admin role
      setupOrdersQuery(false);
      const profileUnsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
        if (snap.exists()) {
          const role = snap.data()?.role;
          if (role === 'admin') {
            unsubOrders(); // cancel user-scoped query
            setupOrdersQuery(true);
            profileUnsub(); // no need to keep watching
          }
        }
      }, () => {});
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
        const fetchCol = async (colName: string, setter: (data: any) => void, q?: any) => {
          try {
            await fetchWithCache(colName, setter, async () => {
              const snap = await getDocs(q || collection(db, colName));
              return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
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
        fetchCol('ads', setAds, query(collection(db, 'ads'), where('active', '==', true), orderBy('order', 'asc')));
        fetchCol('custom_pages', setCustomPages);
        
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
      unsubSongs();
      unsubAlbums();
      unsubPlaylists();
      unsubBooks();
      unsubFanPosts();
      unsubOrders();
    };
  }, [auth.currentUser?.uid]); // Deliberately small dependency array to avoid re-renders triggering refetches
}
