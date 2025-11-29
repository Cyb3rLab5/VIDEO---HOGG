import { LOGO_B64_JPG } from './src/assets';
import { setupPlayerControls, playVideo } from './src/components/player';
import { MockVideoAPIService, TikTokVideoService, TwitchVideoService } from './src/services/videoService';
import { formatTime, showNotification } from './src/utils/helpers';
import { renderDashboardColumn, rerenderColumn, renderMobileFeed, updatePlayerFeedDisplay } from './src/views/feedView';
import { openPlayerView, openLiveView, openBuffetView, openMudHoleView, openWatchAgainView, closePlayerView, startHoggWildStream } from './src/views/playerView';
import { openNewsroomView, initializeNewsroom } from './src/views/newsroomView';

declare var Masonry: any;

document.addEventListener('DOMContentLoaded', async () => {
    
    const VIDEOS_PER_PAGE = 20;

    const state = {
        allVideos: {} as {[key: string]: any[]},
        liveVideos: [] as any[],
        watchHistory: [] as any[],
        hoggWildPlaylist: [] as any[],
        buffetPlaylist: [] as any[],

        isLoading: false,
        currentAppView: 'feed', // 'feed', 'player', 'live', 'buffet', 'hoggwild', 'history', 'mudhole'
        currentPlayerPlatform: null as string | null,
        currentHoggWildIndex: 0,
        currentBuffetIndex: 0,
        currentlyPlayingVideoId: null as string | null,
        pageTrackers: {} as {[key: string]: number},
        platforms: [
            { id: 'youtube', name: 'YouTube', query: 'Viral' },
            { id: 'tiktok', name: 'TikTok', query: 'Trending' },
            { id: 'twitch', name: 'Twitch', query: 'Live' },
            { id: 'x', name: 'X', query: 'Breaking' }
        ],
        
        liveUpdateInterval: 0,
        playerUpdateInterval: 0,
        previousActiveElement: null as HTMLElement | null,
        mobileActivePlatform: 'all',
        notificationTimeout: 0,
        formatTime: formatTime
    };

    // Main Layout
    const desktopDashboard = document.getElementById('platform-dashboard') as HTMLElement;
    const mobileDashboard = document.getElementById('mobile-dashboard') as HTMLElement;
    const playerView = document.getElementById('player-view') as HTMLElement;
    const loader = document.getElementById('loader') as HTMLElement;
    
    // Header
    const headerTitle = document.getElementById('header-title') as HTMLElement;
    const navButtons = document.querySelectorAll('#main-nav .nav-btn') as NodeListOf<HTMLElement>;
    const primeCutsBtn = document.getElementById('prime-cuts-btn') as HTMLElement;
    const hoggWildBtn = document.getElementById('hogg-wild-btn') as HTMLElement;
    const livePenBtn = document.getElementById('live-pen-btn') as HTMLElement;
    const buffetBtn = document.getElementById('buffet-btn') as HTMLElement;
    const mudHoleBtn = document.getElementById('mud-hole-btn') as HTMLElement;
    const leftOversHeaderBtn = document.getElementById('left-overs-header-btn') as HTMLElement;
    const newsroomBtn = document.getElementById('newsroom-btn') as HTMLElement;
    
    // Player Action Buttons
    const backToFeedBtn = document.getElementById('back-to-feed-btn') as HTMLElement;
    const watchAgainBtn = document.getElementById('watch-again-btn') as HTMLElement;
    
    // Add Feed Modal
    const addFeedModal = document.getElementById('add-feed-modal') as HTMLElement;
    const addFeedBtn = document.getElementById('add-feed-btn') as HTMLElement;
    const closeModalBtn = document.getElementById('close-modal-btn') as HTMLElement;
    const customFeedForm = document.getElementById('custom-feed-form') as HTMLFormElement;
    const customFeedNameInput = document.getElementById('custom-feed-name') as HTMLInputElement;
    
    // Mobile Elements
    const moreMenuModal = document.getElementById('more-menu-modal') as HTMLElement;
    const openMoreMenuBtn = document.getElementById('more-menu-btn') as HTMLElement;
    const closeMoreMenuBtn = document.getElementById('close-more-menu-btn') as HTMLElement;
    const leftOversMenuBtn = document.getElementById('left-overs-menu-btn') as HTMLElement;
    const mudHoleMenuBtn = document.getElementById('mud-hole-menu-btn') as HTMLElement;
    const feedMeMenuBtn = document.getElementById('feed-me-menu-btn') as HTMLElement;

    const updateNavStates = (view: string) => {
        headerTitle.textContent = 'OINK';
        const mobileView = (view === 'history' || view === 'mudhole') ? 'more' : view;

        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const allBottomNavButtons = document.querySelectorAll('#mobile-bottom-nav .bottom-nav-btn, #mobile-bottom-nav-player .bottom-nav-btn') as NodeListOf<HTMLElement>;
        allBottomNavButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mobileView);
        });
    };

    const loadMoreVideos = async (specificPlatform: {id: string, name: string, query: string} | null = null) => {
        if (state.isLoading) return;
        state.isLoading = true;
        loader.classList.remove('hidden');

        const platformsToLoad = specificPlatform ? [specificPlatform] : state.platforms;

        try {
            for (const platform of platformsToLoad) {
                if (platform.id === 'tiktok') {
                    state.allVideos['tiktok'] = await TikTokVideoService.fetchTrending();
                } else if (platform.id === 'twitch') {
                    state.allVideos['twitch'] = await TwitchVideoService.fetchTopStreams();
                } else {
                     const page = state.pageTrackers[platform.id] || 1;
                     const newVideos = await MockVideoAPIService.fetchVideos(platform, page, VIDEOS_PER_PAGE);
                     state.pageTrackers[platform.id] = page + 1;
                     state.allVideos[platform.id] = [...(state.allVideos[platform.id] || []), ...newVideos];
                }
                
                if (state.currentAppView === 'feed') {
                    rerenderColumn(platform.id, state);
                    renderMobileFeed(state);
                } else if (state.currentAppView === 'player' && state.currentPlayerPlatform === platform.id) {
                    updatePlayerFeedDisplay(state);
                }
            }
        } finally {
            state.isLoading = false;
            loader.classList.add('hidden');
        }
    };

    const checkForNewLiveVideos = async () => {
        const newLiveList = await MockVideoAPIService.fetchLiveVideos();
        if (newLiveList.length > 0 && (newLiveList.length !== state.liveVideos.length || newLiveList[0].id !== state.liveVideos[0]?.id)) {
            state.liveVideos = newLiveList;
            if (state.currentAppView === 'live') {
                updatePlayerFeedDisplay(state);
            }
        }
    };

    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const videoCard = target.closest('.grid-item, .live-card');

        if (videoCard) {
            const htmlCard = videoCard as HTMLElement;
            const videoId = htmlCard.dataset.videoId;
            const platform = htmlCard.dataset.platform;
            if (!videoId || !platform) return;

            if (state.currentAppView === 'feed') {
                openPlayerView(platform, state);
            }

            let videoData;
            if (state.currentAppView === 'live') {
                videoData = state.liveVideos.find(v => v.id === videoId);
            } else if (state.currentAppView === 'history') {
                videoData = state.watchHistory.find(v => v.id === videoId);
            } else if (state.currentAppView === 'hoggwild') {
                videoData = state.hoggWildPlaylist.find(v => v.id === videoId);
            } else if (state.currentAppView === 'buffet') {
                videoData = state.buffetPlaylist.find(v => v.id === videoId);
            } else {
                videoData = (state.allVideos[platform] || []).find(v => v.id === videoId);
            }
            
            if (videoData) {
                playVideo(videoData, state);
            }
        }
    });

    primeCutsBtn.addEventListener('click', () => closePlayerView(state));
    hoggWildBtn.addEventListener('click', () => startHoggWildStream(state));
    livePenBtn.addEventListener('click', () => openLiveView(state));
    buffetBtn.addEventListener('click', () => openBuffetView(state));
    newsroomBtn.addEventListener('click', () => openNewsroomView(state));
    mudHoleBtn.addEventListener('click', () => openMudHoleView(state));
    leftOversHeaderBtn.addEventListener('click', () => openWatchAgainView(state));

    backToFeedBtn.addEventListener('click', () => closePlayerView(state));
    watchAgainBtn.addEventListener('click', () => openWatchAgainView(state));

    const openModal = (modal: HTMLElement) => {
        state.previousActiveElement = document.activeElement as HTMLElement;
        modal.classList.remove('hidden');
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
        if (firstFocusable) firstFocusable.focus();
    };

    const closeModal = (modal: HTMLElement) => {
        modal.classList.add('hidden');
        if (state.previousActiveElement) state.previousActiveElement.focus();
    };
    
    addFeedBtn.addEventListener('click', () => openModal(addFeedModal));
    closeModalBtn.addEventListener('click', () => closeModal(addFeedModal));
    addFeedModal.addEventListener('click', (e) => {
        if (e.target === addFeedModal) closeModal(addFeedModal);
    });

    customFeedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedName = customFeedNameInput.value.trim();
        if (feedName) {
            const newPlatform = { id: feedName.toLowerCase().replace(/\s/g, '-'), name: feedName, query: feedName };
            const exists = state.platforms.some(p => p.id === newPlatform.id);
            if (!exists) {
                state.platforms.push(newPlatform);
                renderDashboardColumn(newPlatform);
                loadMoreVideos(newPlatform);
                 showNotification(`Custom feed "${feedName}" added!`);
            } else {
                showNotification(`Feed "${feedName}" already exists.`);
            }
            customFeedNameInput.value = '';
            closeModal(addFeedModal);
        }
    });

    openMoreMenuBtn.addEventListener('click', () => openModal(moreMenuModal));
    closeMoreMenuBtn.addEventListener('click', () => closeModal(moreMenuModal));
    moreMenuModal.addEventListener('click', (e) => {
        if (e.target === moreMenuModal) closeModal(moreMenuModal);
    });
    
    leftOversMenuBtn.addEventListener('click', () => {
        closeModal(moreMenuModal);
        openWatchAgainView(state);
    });
    
    mudHoleMenuBtn.addEventListener('click', () => {
        closeModal(moreMenuModal);
        openMudHoleView(state);
    });

    feedMeMenuBtn.addEventListener('click', () => {
        closeModal(moreMenuModal);
        openBuffetView(state);
    });

    document.getElementById('mobile-bottom-nav')?.addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest('.bottom-nav-btn');
        if (button) {
            const view = button.getAttribute('data-view');
            switch (view) {
                case 'feed': closePlayerView(state); break;
                case 'hoggwild': startHoggWildStream(state); break;
                case 'live': openLiveView(state); break;
                case 'buffet': openBuffetView(state); break;
                case 'more': openModal(moreMenuModal); break;
            }
        }
    });

    document.getElementById('mobile-bottom-nav-player')?.addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest('.bottom-nav-btn');
        if (button) {
            const view = button.getAttribute('data-view');
             switch (view) {
                case 'feed': closePlayerView(state); break;
                case 'hoggwild': startHoggWildStream(state); break;
                case 'live': openLiveView(state); break;
                case 'buffet': openBuffetView(state); break;
                case 'more': openModal(moreMenuModal); break;
            }
        }
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('#mobile-platform-filters button');
        if (button && button.parentElement?.id === 'mobile-platform-filters' && button.hasAttribute('data-platform')) {
            document.querySelectorAll('#mobile-platform-filters button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            state.mobileActivePlatform = button.getAttribute('data-platform') as string;
            renderMobileFeed(state);
        }
    });

    const initializeApp = async () => {
        const favicon = document.getElementById('favicon') as HTMLLinkElement;
        const loadingLogo = document.getElementById('loading-logo') as HTMLImageElement;
        const logoDataUri = `data:image/jpeg;base64,${LOGO_B64_JPG}`;
        if (favicon) favicon.href = logoDataUri;
        if (loadingLogo) loadingLogo.src = logoDataUri;
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if(loadingScreen) {
                loadingScreen.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => loadingScreen.classList.add('hidden'), 500);
            }
        }, 300);

        const mobileDashboardContainer = document.getElementById('mobile-dashboard');
        if (mobileDashboardContainer) {
            const platformFilters = document.createElement('div');
            platformFilters.id = 'mobile-platform-filters';
            platformFilters.className = 'sticky top-0 bg-gray-900/80 backdrop-blur-sm z-30 flex justify-center items-center gap-2 p-2 overflow-x-auto no-scrollbar';

            const allBtn = document.createElement('button');
            allBtn.dataset.platform = 'all';
            allBtn.className = 'mobile-toggle-btn p-2 font-semibold text-sm whitespace-nowrap active';
            allBtn.textContent = 'All';
            platformFilters.appendChild(allBtn);

            state.platforms.forEach(p => {
                const btn = document.createElement('button');
                btn.dataset.platform = p.id;
                btn.className = 'mobile-toggle-btn p-2 font-semibold text-sm whitespace-nowrap';
                btn.textContent = p.name;
                platformFilters.appendChild(btn);
            });

            const mobileFeedContent = document.createElement('div');
            mobileFeedContent.id = 'mobile-feed-content';
            
            mobileDashboardContainer.append(platformFilters, mobileFeedContent);
        }

        state.platforms.forEach(renderDashboardColumn);
        await loadMoreVideos();

        state.liveUpdateInterval = window.setInterval(checkForNewLiveVideos, 15000);
        checkForNewLiveVideos();
        updateNavStates('feed');
        setupPlayerControls(state);
        initializeNewsroom();
    };

    initializeApp();
});