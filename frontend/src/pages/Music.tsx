/**
 * SimpleX SMP Monitor - Music Page
 * =================================
 * Copyright (c) 2026 cannatoshi
 * https://github.com/cannatoshi/simplex-smp-monitor
 *
 * Full music library and player interface.
 * Features: Library, Search, Playlists with Pin support, System Playlists (Video Help, News)
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideoWidget } from '../contexts/VideoWidgetContext';
import { useAudioPlayerStore, Track } from '../stores/useAudioPlayerStore';
import {
  fetchTracks,
  fetchPlaylists,
  fetchPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  searchYouTube,
  addTrackFromYouTube,
  deleteTrack,
  cacheTrack,
  fetchCacheStatus,
  SearchResult,
  Playlist,
} from '../api/music';

// Design System Colors
const neonBlue = '#88CED0';
const neonGlow = '0 0 8px rgba(136, 206, 208, 0.4)';
const cyan = '#22D3EE';

const neonButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgb(30, 41, 59)',
  color: neonBlue,
  border: `1px solid ${neonBlue}`,
  boxShadow: neonGlow
};

const neonInputStyle: React.CSSProperties = {
  backgroundColor: 'rgb(30, 41, 59)',
  color: '#fff',
  border: `1px solid ${neonBlue}`,
  boxShadow: neonGlow
};

const PINNED_PLAYLISTS_KEY = 'simplex-music-pinned-playlists';

// Estimate file size based on duration and bitrate (default 192kbps)
const estimateFileSize = (durationSeconds: number | null, bitrateKbps: number = 192): string => {
  if (!durationSeconds) return '?';
  const sizeMB = (durationSeconds * bitrateKbps) / 8 / 1024;
  if (sizeMB < 1) return `${Math.round(sizeMB * 1024)} KB`;
  return `~${sizeMB.toFixed(1)} MB`;
};

// ============================================================================
// SVG Icons - All in Neon Blue theme
// ============================================================================

const IconPin = ({ filled = false }: { filled?: boolean }) => (
  <svg className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconPlaylist = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const IconVideo = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const IconNews = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
  </svg>
);

// Get icon for system playlist
const getSystemIcon = (systemKey: string | null) => {
  switch (systemKey) {
    case 'video_help': return <IconVideo />;
    case 'news': return <IconNews />;
    default: return <IconVideo />;
  }
};

// Get display name for system playlist
const getSystemDisplayName = (playlist: Playlist, t: (key: string) => string) => {
  switch (playlist.system_key) {
    case 'video_help': return t('music.videoHelp') || 'Video Help';
    case 'news': return t('music.news') || 'News';
    default: return playlist.name;
  }
};

export default function Music() {
  const { t } = useTranslation();
  const { openVideo } = useVideoWidget();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [systemPlaylists, setSystemPlaylists] = useState<Playlist[]>([]);
  const [systemPlaylistData, setSystemPlaylistData] = useState<Map<string, Playlist>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('library');
  const [addingTrack, setAddingTrack] = useState<string | null>(null);
  
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(PINNED_PLAYLISTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [columnsCount, setColumnsCount] = useState(5);
  const rowsCount = 3;
  const itemsPerPage = columnsCount * rowsCount;
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  
  const [showPlaylistDetail, setShowPlaylistDetail] = useState(false);
  const [detailPlaylist, setDetailPlaylist] = useState<Playlist | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);

  const [pinnedPlaylistData, setPinnedPlaylistData] = useState<Map<string, Playlist>>(new Map());
  
  // Track which tracks are currently being cached
  const [cachingTrackIds, setCachingTrackIds] = useState<Set<string>>(new Set());

  const { currentTrack, isPlaying, setQueue, play, pause, setCacheStatus, markTrackCached } = useAudioPlayerStore();

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    localStorage.setItem(PINNED_PLAYLISTS_KEY, JSON.stringify(pinnedPlaylistIds));
  }, [pinnedPlaylistIds]);

  const calculateColumns = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1536) return 6;
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    return 2;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const newColumns = calculateColumns();
      if (newColumns !== columnsCount) {
        setColumnsCount(newColumns);
        setCurrentPage(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateColumns, columnsCount]);

  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const paginatedResults = searchResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    loadTracks();
    loadPlaylists();
    loadCacheStatus();
  }, []);

  useEffect(() => {
    if (activeTab.startsWith('playlist-')) {
      const playlistId = activeTab.replace('playlist-', '');
      loadPinnedPlaylistData(playlistId);
    } else if (activeTab.startsWith('system-')) {
      const systemKey = activeTab.replace('system-', '');
      loadSystemPlaylistData(systemKey);
    }
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(loadCacheStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTracks();
      setTracks(data as Track[]);
    } catch (err) {
      console.error('Failed to load tracks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = await fetchPlaylists();
      
      // Separate system playlists from user playlists
      const system = data.filter(p => p.playlist_type === 'system');
      const user = data.filter(p => p.playlist_type !== 'system');
      
      setSystemPlaylists(system);
      setPlaylists(user);
      
      // Load full data for system playlists
      for (const sp of system) {
        if (sp.system_key) {
          const full = await fetchPlaylist(sp.id);
          setSystemPlaylistData(prev => new Map(prev).set(sp.system_key!, full));
        }
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  };

  const loadCacheStatus = async () => {
    try {
      const status = await fetchCacheStatus();
      setCacheStatus(status);
    } catch (err) {
      console.error('Failed to load cache status:', err);
    }
  };

  const loadPinnedPlaylistData = async (playlistId: string) => {
    try {
      const playlist = await fetchPlaylist(playlistId);
      setPinnedPlaylistData(prev => new Map(prev).set(playlistId, playlist));
    } catch (err) {
      console.error('Failed to load playlist:', err);
    }
  };

  const loadSystemPlaylistData = async (systemKey: string) => {
    const existing = systemPlaylists.find(p => p.system_key === systemKey);
    if (!existing) return;
    try {
      const playlist = await fetchPlaylist(existing.id);
      setSystemPlaylistData(prev => new Map(prev).set(systemKey, playlist));
    } catch (err) {
      console.error('Failed to load system playlist:', err);
    }
  };

  const loadPlaylistDetail = async (playlistId: string) => {
    setDetailLoading(true);
    try {
      const playlist = await fetchPlaylist(playlistId);
      setDetailPlaylist(playlist);
      setShowPlaylistDetail(true);
    } catch (err) {
      console.error('Failed to load playlist:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setCurrentPage(1);
    try {
      const results = await searchYouTube(searchQuery, 50);
      setSearchResults(results);
      setActiveTab('search');
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (result: SearchResult) => {
    setAddingTrack(result.video_id);
    try {
      const response = await addTrackFromYouTube(result.video_id);
      if (response.track) {
        setTracks((prev) => [response.track as Track, ...prev]);
        setSearchResults((prev) => prev.filter((r) => r.video_id !== result.video_id));
      }
    } catch (err) {
      console.error('Failed to add track:', err);
    } finally {
      setAddingTrack(null);
    }
  };

  const handlePlayTrack = (track: Track, index: number, queue: Track[] = tracks) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) pause();
      else play();
    } else {
      setQueue(queue, index);
      play();
    }
  };

  const handlePlayPlaylist = (playlist: Playlist, startIndex = 0) => {
    if (!playlist.entries || playlist.entries.length === 0) return;
    const playlistTracks = playlist.entries.map(e => e.track);
    setQueue(playlistTracks, startIndex);
    play();
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Delete this track?')) return;
    try {
      await deleteTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err) {
      console.error('Failed to delete track:', err);
    }
  };

  const handleCacheTrack = async (trackId: string) => {
    // Add to caching set immediately for UI feedback
    setCachingTrackIds(prev => new Set(prev).add(trackId));
    
    try {
      await cacheTrack(trackId);
      loadCacheStatus();
      
      // Poll for completion - check every 2 seconds until done
      const pollInterval = setInterval(async () => {
        const status = await fetchCacheStatus();
        setCacheStatus(status);
        
        // Find if this track is still being cached
        const track = tracks.find(t => t.id === trackId);
        const stillCaching = status.active_downloads.some(
          d => track && d.video_id === track.source_id
        );
        
        if (!stillCaching) {
          clearInterval(pollInterval);
          setCachingTrackIds(prev => {
            const next = new Set(prev);
            next.delete(trackId);
            return next;
          });
          // Mark track as cached in store (triggers MiniPlayer auto-switch)
          markTrackCached(trackId);
          // Reload tracks to get updated is_cached status
          loadTracks();
        }
      }, 2000);
      
      // Safety timeout - stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setCachingTrackIds(prev => {
          const next = new Set(prev);
          next.delete(trackId);
          return next;
        });
        loadTracks();
      }, 300000);
      
    } catch (err) {
      console.error('Failed to cache track:', err);
      setCachingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const playlist = await createPlaylist(newPlaylistName, newPlaylistDesc, 'user');
      setPlaylists((prev) => [playlist, ...prev]);
      setShowCreateModal(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !editName.trim()) return;
    try {
      const updated = await updatePlaylist(editingPlaylist.id, { name: editName, description: editDesc });
      
      // Check if it's a system playlist
      if (editingPlaylist.playlist_type === 'system' && editingPlaylist.system_key) {
        setSystemPlaylistData(prev => new Map(prev).set(editingPlaylist.system_key!, updated));
        setSystemPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      
      if (pinnedPlaylistData.has(editingPlaylist.id)) {
        setPinnedPlaylistData(prev => new Map(prev).set(editingPlaylist.id, updated));
      }
      setShowEditModal(false);
      setEditingPlaylist(null);
    } catch (err) {
      console.error('Failed to update playlist:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Delete this playlist?')) return;
    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      setPinnedPlaylistIds((prev) => prev.filter((id) => id !== playlistId));
      if (detailPlaylist?.id === playlistId) {
        setShowPlaylistDetail(false);
        setDetailPlaylist(null);
      }
      if (activeTab === `playlist-${playlistId}`) {
        setActiveTab('library');
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!trackToAdd) return;
    try {
      await addTrackToPlaylist(playlistId, trackToAdd.id);
      setShowAddToPlaylist(false);
      setTrackToAdd(null);
      loadPlaylists();
      if (pinnedPlaylistIds.includes(playlistId)) {
        loadPinnedPlaylistData(playlistId);
      }
      // Reload system playlist if it was updated
      const systemPlaylist = systemPlaylists.find(p => p.id === playlistId);
      if (systemPlaylist?.system_key) {
        loadSystemPlaylistData(systemPlaylist.system_key);
      }
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    }
  };

  const handleRemoveFromPlaylist = async (playlistId: string, entryId: string) => {
    try {
      await removeTrackFromPlaylist(playlistId, entryId);
      if (pinnedPlaylistIds.includes(playlistId)) {
        loadPinnedPlaylistData(playlistId);
      }
      if (detailPlaylist?.id === playlistId) {
        loadPlaylistDetail(playlistId);
      }
      // Reload system playlist if it was updated
      const systemPlaylist = systemPlaylists.find(p => p.id === playlistId);
      if (systemPlaylist?.system_key) {
        loadSystemPlaylistData(systemPlaylist.system_key);
      }
      loadPlaylists();
    } catch (err) {
      console.error('Failed to remove track:', err);
    }
  };

  const togglePinPlaylist = (playlistId: string) => {
    setPinnedPlaylistIds((prev) => {
      if (prev.includes(playlistId)) {
        if (activeTab === `playlist-${playlistId}`) setActiveTab('playlists');
        return prev.filter((id) => id !== playlistId);
      } else {
        if (prev.length >= 5) {
          alert('Maximum 5 playlists can be pinned');
          return prev;
        }
        loadPinnedPlaylistData(playlistId);
        return [...prev, playlistId];
      }
    });
  };

  const openAddToPlaylist = (track: Track) => {
    setTrackToAdd(track);
    setShowAddToPlaylist(true);
  };

  const openEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setEditName(playlist.name);
    setEditDesc(playlist.description);
    setShowEditModal(true);
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pinnedPlaylists = playlists.filter((p) => pinnedPlaylistIds.includes(p.id));

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // Get first track thumbnail for playlist card
  const getPlaylistThumbnail = (playlist: Playlist): string | null => {
    if (playlist.first_track_thumbnail) {
      return playlist.first_track_thumbnail;
    }
    if (playlist.entries && playlist.entries.length > 0 && playlist.entries[0].track.thumbnail_url) {
      return playlist.entries[0].track.thumbnail_url;
    }
    return playlist.thumbnail_url || null;
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderTrackRow = (track: Track, index: number, queue: Track[], playlistId?: string, entryId?: string) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    const isCaching = cachingTrackIds.has(track.id);
    
    return (
      <div
        key={track.id + (entryId || '')}
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${isCurrentTrack ? 'border' : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'}`}
        style={isCurrentTrack ? { backgroundColor: 'rgba(136, 206, 208, 0.1)', borderColor: 'rgba(136, 206, 208, 0.3)' } : undefined}
      >
        {/* Thumbnail with Play Button */}
        <button onClick={() => handlePlayTrack(track, index, queue)} className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 group/play" style={{ border: `1px solid ${isCurrentTrack ? neonBlue : 'rgba(136, 206, 208, 0.2)'}` }}>
          {track.thumbnail_url ? (
            <img src={track.thumbnail_url} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-700" style={{ color: neonBlue }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            </div>
          )}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${isCurrentTrack && isPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
            {isCurrentTrack && isPlaying ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </div>
        </button>
        
        {/* Title & Artist */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: isCurrentTrack ? neonBlue : 'white' }}>{track.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-slate-500 truncate">{track.artist || t('music.unknownArtist')}</p>
            {track.play_count > 0 && (
              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {track.play_count}
              </span>
            )}
          </div>
        </div>
        
        {/* Action Buttons - hidden until hover */}
        <div className="flex items-center gap-1">
          {/* Add to Playlist */}
          {!playlistId && (
            <button 
              onClick={() => openAddToPlaylist(track)} 
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 hover:bg-slate-700" 
              style={{ color: neonBlue }} 
              title={t('music.addToPlaylist')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          )}
          
          {/* Remove from Playlist */}
          {playlistId && entryId && (
            <button 
              onClick={() => handleRemoveFromPlaylist(playlistId, entryId)} 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" 
              title="Remove"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
          )}
          
          {/* Delete Track */}
          {!playlistId && (
            <button 
              onClick={() => handleDeleteTrack(track.id)} 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
        
        {/* YouTube Link */}
        {track.source_type === 'youtube' && track.source_id && (
          <a 
            href={`https://youtube.com/watch?v=${track.source_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
            style={{ color: '#FF0000' }}
            title="Open on YouTube"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        )}

        {/* Duration */}
        <span className="text-sm text-slate-400 w-14 text-right font-mono">{formatDuration(track.duration)}</span>
        
        {/* Cache Status/Button - Always Visible */}
        <div className="w-24 flex justify-center">
          {track.is_cached ? (
            <span className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5" style={{ backgroundColor: 'rgba(136, 206, 208, 0.15)', color: neonBlue, border: `1px solid ${neonBlue}` }}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
              {t('music.cached')}
            </span>
          ) : isCaching ? (
            <span className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', border: '1px solid #EAB308' }}>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Caching...
            </span>
          ) : (
            <button 
              onClick={() => handleCacheTrack(track.id)} 
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:scale-105 flex items-center gap-1.5"
              style={neonButtonStyle}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t('music.cache')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPlaylistCard = (playlist: Playlist) => {
    const isPinned = pinnedPlaylistIds.includes(playlist.id);
    const thumbnail = getPlaylistThumbnail(playlist);
    
    return (
      <div
        key={playlist.id}
        className="rounded-lg overflow-hidden transition-all flex flex-col"
        style={{ 
          backgroundColor: 'rgb(30, 41, 59)', 
          border: `1px solid rgba(136, 206, 208, ${isPinned ? '0.6' : '0.3'})`,
        }}
      >
        {/* Thumbnail - like search results */}
        <div 
          className="relative aspect-video bg-slate-700 cursor-pointer group/thumb"
          onClick={() => loadPlaylistDetail(playlist.id)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center" style={{ color: neonBlue }}>
              <IconPlaylist />
            </div>
          )}
          
          {/* Hover Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayPlaylist(playlist); }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(136, 206, 208, 0.9)', boxShadow: neonGlow }}
            >
              <svg className="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
          
          {/* Track count badge */}
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: neonBlue }}>
            {playlist.track_count} tracks
          </span>
          
          {/* Pin Badge */}
          {isPinned && (
            <div className="absolute top-1 right-1 p-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: neonBlue }}>
              <IconPin filled />
            </div>
          )}
        </div>
        
        {/* Info + Action Buttons */}
        <div className="p-2 flex-1 flex flex-col">
          <p 
            className="font-medium text-xs truncate cursor-pointer hover:underline" 
            style={{ color: neonBlue }} 
            title={playlist.name}
            onClick={() => loadPlaylistDetail(playlist.id)}
          >
            {playlist.name}
          </p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {playlist.description || `${playlist.track_count} tracks`}
          </p>
          
          {/* Action Buttons - always visible */}
          <div className="flex gap-1 mt-2">
            <button 
              onClick={() => handlePlayPlaylist(playlist)}
              disabled={playlist.track_count === 0}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
              style={neonButtonStyle}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Play
            </button>
            <button 
              onClick={() => togglePinPlaylist(playlist.id)}
              className="px-2 py-1.5 rounded-lg text-xs transition-colors"
              style={{ 
                backgroundColor: isPinned ? 'rgba(136, 206, 208, 0.2)' : 'transparent',
                color: isPinned ? neonBlue : '#64748b',
                border: `1px solid ${isPinned ? neonBlue : '#475569'}`
              }}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <IconPin filled={isPinned} />
            </button>
            <button 
              onClick={() => openEditPlaylist(playlist)}
              className="px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-slate-700"
              style={{ color: '#64748b', border: '1px solid #475569' }}
              title="Edit"
            >
              <IconEdit />
            </button>
            <button 
              onClick={() => handleDeletePlaylist(playlist.id)}
              className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              style={{ border: '1px solid #475569' }}
              title="Delete"
            >
              <IconTrash />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPlaylistContent = (playlistId: string) => {
    const playlist = pinnedPlaylistData.get(playlistId);
    if (!playlist) return <div className="flex items-center justify-center py-12"><svg className="w-8 h-8 animate-spin" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>;
    const playlistTracks = playlist.entries?.map(e => e.track) || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: neonBlue }}>{playlist.name}</h2>
            {playlist.description && <p className="text-sm text-slate-500">{playlist.description}</p>}
            <p className="text-xs text-slate-600 mt-1">{playlist.track_count} tracks · {formatDuration(playlist.total_duration)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePlayPlaylist(playlist)} disabled={!playlist.entries?.length} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2" style={neonButtonStyle}><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Play All</button>
            <button onClick={() => openEditPlaylist(playlist)} className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800" style={{ color: neonBlue }}><IconEdit /></button>
            <button onClick={() => togglePinPlaylist(playlist.id)} className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800" style={{ color: neonBlue }} title="Unpin"><IconPin filled /></button>
          </div>
        </div>
        {!playlist.entries?.length ? <div className="text-center py-12 text-slate-500"><p>Playlist is empty</p><p className="text-sm mt-1">Add tracks from your library</p></div> : <div className="space-y-2">{playlist.entries.map((entry, index) => renderTrackRow(entry.track, index, playlistTracks, playlist.id, entry.id))}</div>}
      </div>
    );
  };

  const renderSystemPlaylistContent = (systemKey: string) => {
    const playlist = systemPlaylistData.get(systemKey);
    if (!playlist) return <div className="flex items-center justify-center py-12"><svg className="w-8 h-8 animate-spin" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>;
    const playlistTracks = playlist.entries?.map(e => e.track) || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(136, 206, 208, 0.1)', color: neonBlue }}>
              {getSystemIcon(systemKey)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: neonBlue }}>{getSystemDisplayName(playlist, t)}</h2>
              {playlist.description && <p className="text-sm text-slate-500">{playlist.description}</p>}
              <p className="text-xs text-slate-600 mt-1">{playlist.track_count} videos · {formatDuration(playlist.total_duration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePlayPlaylist(playlist)} disabled={!playlist.entries?.length} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2" style={neonButtonStyle}><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Play All</button>
            <button onClick={() => openEditPlaylist(playlist)} className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800" style={{ color: neonBlue }}><IconEdit /></button>
          </div>
        </div>
        {!playlist.entries?.length ? (
          <div className="text-center py-12 text-slate-500">
            <div className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: neonBlue }}>
              {getSystemIcon(systemKey)}
            </div>
            <p className="text-lg mb-2">{t('music.noTracks')}</p>
            <p className="text-sm">Search for videos and add them here</p>
          </div>
        ) : (
          <div className="space-y-2">{playlist.entries.map((entry, index) => renderTrackRow(entry.track, index, playlistTracks, playlist.id, entry.id))}</div>
        )}
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold" style={{ color: neonBlue }}>{t('music.title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{tracks.length} {t('music.tracks')} · {playlists.length + systemPlaylists.length} {t('music.playlists')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {activeTab === 'search' && searchResults.length > 0 && (
              <>
                <span className="text-xs text-slate-500 whitespace-nowrap">{t('music.page')} {currentPage}/{totalPages}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1.5 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-30" style={neonButtonStyle}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                  {getPageNumbers().map((pageNum) => <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all" style={currentPage === pageNum ? neonButtonStyle : { color: '#64748b', backgroundColor: 'transparent', border: '1px solid transparent' }}>{pageNum}</button>)}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-2 py-1.5 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-30" style={neonButtonStyle}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={t('music.searchPlaceholder')} className="w-48 lg:w-64 px-4 py-1.5 pl-9 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" style={neonInputStyle} />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50" style={neonButtonStyle}>
                {isSearching ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: cyan, animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: cyan, animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: cyan, animationDelay: '300ms' }} /></span> : t('music.search')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 border-b border-slate-800">
        <div className="flex items-center justify-between overflow-x-auto">
          {/* Left Tabs */}
          <div className="flex gap-1">
            {['library', 'search', 'playlists'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab ? '' : 'text-slate-500 hover:text-white'}`} style={{ color: activeTab === tab ? neonBlue : undefined }}>
                {tab === 'library' && t('music.library')}
                {tab === 'search' && <>{t('music.searchResults')}{searchResults.length > 0 && <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full" style={{ backgroundColor: neonBlue, color: '#0f172a' }}>{searchResults.length}</span>}</>}
                {tab === 'playlists' && t('music.playlists')}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: neonBlue }} />}
              </button>
            ))}
            {pinnedPlaylists.map((playlist) => (
              <button key={`tab-${playlist.id}`} onClick={() => setActiveTab(`playlist-${playlist.id}`)} className={`pb-3 px-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === `playlist-${playlist.id}` ? '' : 'text-slate-500 hover:text-white'}`} style={{ color: activeTab === `playlist-${playlist.id}` ? neonBlue : undefined }}>
                <span style={{ color: neonBlue }}><IconPin filled /></span>{playlist.name}
                {activeTab === `playlist-${playlist.id}` && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: neonBlue }} />}
              </button>
            ))}
          </div>
          
          {/* Right Tabs - System Playlists */}
          <div className="flex gap-1">
            {systemPlaylists.map((playlist) => (
              <button 
                key={`system-tab-${playlist.system_key}`} 
                onClick={() => setActiveTab(`system-${playlist.system_key}`)} 
                className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${activeTab === `system-${playlist.system_key}` ? '' : 'text-slate-500 hover:text-white'}`} 
                style={{ color: activeTab === `system-${playlist.system_key}` ? neonBlue : undefined }}
              >
                {getSystemIcon(playlist.system_key)}
                {getSystemDisplayName(playlist, t)}
                {activeTab === `system-${playlist.system_key}` && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: neonBlue }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        {activeTab === 'library' && (
          <div className="space-y-2">
            {isLoading ? <div className="flex items-center justify-center py-12"><svg className="w-8 h-8 animate-spin" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div> : tracks.length === 0 ? <div className="text-center py-12 text-slate-500"><svg className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg><p className="text-lg mb-2">{t('music.noTracks')}</p><p className="text-sm">{t('music.noTracksHint')}</p></div> : tracks.map((track, index) => renderTrackRow(track, index, tracks))}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}>
            {searchResults.length === 0 ? <div className="col-span-full text-center py-12 text-slate-500"><p>{t('music.noResults')}</p><p className="text-sm mt-1">{t('music.noResultsHint')}</p></div> : paginatedResults.map((result) => (
              <div key={result.video_id} className="rounded-lg overflow-hidden transition-all flex flex-col" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
                <div className="relative aspect-video bg-slate-700 group/thumb">
                  <img src={result.thumbnail_url || `https://img.youtube.com/vi/${result.video_id}/mqdefault.jpg`} alt={result.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${result.video_id}/hqdefault.jpg`; }} />
                  <button onClick={() => openVideo(result.video_id, result.title)} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity"><div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(136, 206, 208, 0.9)', boxShadow: neonGlow }}><svg className="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div></button>
                  {result.duration && <span className="absolute bottom-1 right-1 px-1 py-0.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: neonBlue }}>{formatDuration(result.duration)}</span>}
                </div>
                <div className="p-2 flex-1 flex flex-col">
                  <p className="font-medium text-xs truncate" style={{ color: neonBlue }} title={result.title}>{result.title}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-slate-500 truncate flex-1">{result.artist || 'Unknown'}</p>
                    <span className="text-[10px] text-slate-600 ml-2 flex-shrink-0" title="Estimated file size">{estimateFileSize(result.duration)}</span>
                  </div>
                  <button onClick={() => handleAddTrack(result)} disabled={addingTrack === result.video_id} className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50" style={neonButtonStyle}>{addingTrack === result.video_id ? '...' : t('music.addToLibrary')}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="space-y-4">
            <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 inline-flex items-center gap-2" style={neonButtonStyle}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>{t('music.createPlaylist')}</button>
            {playlists.length === 0 ? <div className="text-center py-12 text-slate-500"><svg className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg><p className="text-lg mb-2">{t('music.noPlaylists')}</p><p className="text-sm">{t('music.noPlaylistsHint')}</p></div> : (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}>
                {playlists.map((playlist) => renderPlaylistCard(playlist))}
              </div>
            )}
          </div>
        )}

        {activeTab.startsWith('playlist-') && renderPlaylistContent(activeTab.replace('playlist-', ''))}
        
        {activeTab.startsWith('system-') && renderSystemPlaylistContent(activeTab.replace('system-', ''))}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: 'rgb(15, 23, 42)', border: `1px solid ${neonBlue}`, boxShadow: neonGlow }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: neonBlue }}>{t('music.createPlaylist')}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">{t('music.playlistName')}</label><input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder={t('music.playlistNamePlaceholder')} className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" style={neonInputStyle} /></div>
              <div><label className="block text-sm text-slate-400 mb-1">{t('music.playlistDesc')}</label><input type="text" value={newPlaylistDesc} onChange={(e) => setNewPlaylistDesc(e.target.value)} placeholder={t('music.playlistDescPlaceholder')} className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" style={neonInputStyle} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-white border border-slate-700">{t('music.cancel')}</button>
              <button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50" style={neonButtonStyle}>{t('music.create')}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingPlaylist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: 'rgb(15, 23, 42)', border: `1px solid ${neonBlue}`, boxShadow: neonGlow }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: neonBlue }}>Edit Playlist</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">{t('music.playlistName')}</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" style={neonInputStyle} /></div>
              <div><label className="block text-sm text-slate-400 mb-1">{t('music.playlistDesc')}</label><input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" style={neonInputStyle} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingPlaylist(null); }} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-white border border-slate-700">{t('music.cancel')}</button>
              <button onClick={handleUpdatePlaylist} disabled={!editName.trim()} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50" style={neonButtonStyle}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showPlaylistDetail && detailPlaylist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[80vh] rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: 'rgb(15, 23, 42)', border: `1px solid ${neonBlue}`, boxShadow: neonGlow }}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: neonBlue }}>{detailPlaylist.name}</h2>
                {detailPlaylist.description && <p className="text-sm text-slate-500">{detailPlaylist.description}</p>}
                <p className="text-xs text-slate-600 mt-1">{detailPlaylist.track_count} tracks · {formatDuration(detailPlaylist.total_duration)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePlayPlaylist(detailPlaylist)} disabled={!detailPlaylist.entries?.length} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2" style={neonButtonStyle}><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Play</button>
                {detailPlaylist.playlist_type !== 'system' && (
                  <button onClick={() => togglePinPlaylist(detailPlaylist.id)} className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800" style={{ color: pinnedPlaylistIds.includes(detailPlaylist.id) ? neonBlue : '#64748b' }} title={pinnedPlaylistIds.includes(detailPlaylist.id) ? 'Unpin' : 'Pin'}><IconPin filled={pinnedPlaylistIds.includes(detailPlaylist.id)} /></button>
                )}
                <button onClick={() => { setShowPlaylistDetail(false); setDetailPlaylist(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors" style={{ color: neonBlue }}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {detailLoading ? <div className="flex items-center justify-center py-12"><svg className="w-8 h-8 animate-spin" style={{ color: neonBlue }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div> : !detailPlaylist.entries?.length ? <div className="text-center py-12 text-slate-500"><p>Playlist is empty</p><p className="text-sm mt-1">Add tracks from your library</p></div> : <div className="space-y-2">{detailPlaylist.entries.map((entry, index) => { const playlistTracks = detailPlaylist.entries!.map(e => e.track); return renderTrackRow(entry.track, index, playlistTracks, detailPlaylist.id, entry.id); })}</div>}
            </div>
          </div>
        </div>
      )}

      {showAddToPlaylist && trackToAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: 'rgb(15, 23, 42)', border: `1px solid ${neonBlue}`, boxShadow: neonGlow }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: neonBlue }}>{t('music.addToPlaylist')}</h2>
            <p className="text-sm text-slate-400 mb-4 truncate">{trackToAdd.title}</p>
            {playlists.length === 0 && systemPlaylists.length === 0 ? <p className="text-slate-500 text-center py-4">{t('music.noPlaylistsCreate')}</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* System Playlists first */}
                {systemPlaylists.map((playlist) => (
                  <button key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)} className="w-full px-4 py-3 rounded-lg text-left transition-all hover:opacity-90 flex items-center gap-3" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
                    <span style={{ color: neonBlue }}>{getSystemIcon(playlist.system_key)}</span>
                    <div className="flex-1 min-w-0"><p style={{ color: neonBlue }}>{getSystemDisplayName(playlist, t)}</p><p className="text-xs text-slate-500">{playlist.track_count} {t('music.tracks')}</p></div>
                  </button>
                ))}
                {/* User Playlists */}
                {playlists.map((playlist) => (
                  <button key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)} className="w-full px-4 py-3 rounded-lg text-left transition-all hover:opacity-90 flex items-center gap-3" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.2)' }}>
                    <span style={{ color: pinnedPlaylistIds.includes(playlist.id) ? neonBlue : '#64748b' }}><IconPin filled={pinnedPlaylistIds.includes(playlist.id)} /></span>
                    <div className="flex-1 min-w-0"><p style={{ color: neonBlue }}>{playlist.name}</p><p className="text-xs text-slate-500">{playlist.track_count} {t('music.tracks')}</p></div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setShowAddToPlaylist(false); setTrackToAdd(null); }} className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-white border border-slate-700">{t('music.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}