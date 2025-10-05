/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";

// This declares the Masonry and YouTube Player libraries loaded from CDN scripts in index.html
declare var Masonry: any;
declare var YT: any;

// --- YOUTUBE PLAYER API CALLBACK ---
/**
 * This global function is called by the YouTube Iframe API script when it's ready.
 * It dispatches a custom event to signal that the API can be used.
 */
(window as any).onYouTubeIframeAPIReady = () => {
    document.dispatchEvent(new Event('youtube-api-ready'));
};

document.addEventListener('DOMContentLoaded', async () => {
    
    // =================================================================================
    // --- CONFIG, CONSTANTS & STATE ---
    // =================================================================================

    const AI_INSTANCE = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        
        masonryPlayer: null as any,
        liveUpdateInterval: 0,
        ytPlayer: null as any,
        playerUpdateInterval: 0,
        isYtPlayerReady: false,
        queuedYouTubeVideo: null as any | null,
        previousActiveElement: null as HTMLElement | null,
        mobileActivePlatform: 'all',
        notificationTimeout: 0,
    };

    // =================================================================================
    // --- DOM ELEMENTS ---
    // =================================================================================

    // Main Layout
    const desktopDashboard = document.getElementById('platform-dashboard') as HTMLElement;
    const mobileDashboard = document.getElementById('mobile-dashboard') as HTMLElement;
    const playerView = document.getElementById('player-view') as HTMLElement;
    const loader = document.getElementById('loader') as HTMLElement;
    const notification = document.getElementById('notification') as HTMLElement;
    
    // Header
    const headerTitle = document.getElementById('header-title') as HTMLElement;
    const navButtons = document.querySelectorAll('#main-nav .nav-btn') as NodeListOf<HTMLElement>;
    const primeCutsBtn = document.getElementById('prime-cuts-btn') as HTMLElement;
    const hoggWildBtn = document.getElementById('hogg-wild-btn') as HTMLElement;
    const livePenBtn = document.getElementById('live-pen-btn') as HTMLElement;
    const buffetBtn = document.getElementById('buffet-btn') as HTMLElement;
    const mudHoleBtn = document.getElementById('mud-hole-btn') as HTMLElement;
    const leftOversHeaderBtn = document.getElementById('left-overs-header-btn') as HTMLElement;
    
    // Player View
    const playerFeed = document.getElementById('player-feed') as HTMLElement;
    const platformTroughTitle = document.getElementById('platform-trough-title') as HTMLElement;
    const playerContainer = document.getElementById('player-container') as HTMLElement;
    const embedPlayer = document.getElementById('embed-player') as HTMLElement;
    const playerTitle = document.getElementById('player-title') as HTMLElement;
    const playerAuthor = document.getElementById('player-author') as HTMLElement;
    
    // Player Action Buttons
    const backToFeedBtn = document.getElementById('back-to-feed-btn') as HTMLElement;
    const shareBtn = document.getElementById('share-btn') as HTMLElement;
    const watchAgainBtn = document.getElementById('watch-again-btn') as HTMLElement;
    const buffetAddFeedBtn = document.getElementById('buffet-add-feed-btn') as HTMLElement;
    
    // Player Controls
    const playPauseBtn = document.getElementById('play-pause-btn') as HTMLElement;
    const playIcon = document.getElementById('play-icon') as HTMLElement;
    const pauseIcon = document.getElementById('pause-icon') as HTMLElement;
    const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
    const currentTimeEl = document.getElementById('current-time') as HTMLElement;
    const durationEl = document.getElementById('duration') as HTMLElement;
    const volumeBtn = document.getElementById('volume-btn') as HTMLElement;
    const volumeHighIcon = document.getElementById('volume-high-icon') as HTMLElement;
    const volumeMutedIcon = document.getElementById('volume-muted-icon') as HTMLElement;
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLElement;

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
    const mobilePlayerTitle = document.getElementById('mobile-player-title') as HTMLElement;
    const mobilePlayerAuthor = document.getElementById('mobile-player-author') as HTMLElement;
    const mobileShareBtn = document.getElementById('mobile-share-btn') as HTMLElement;

    // =================================================================================
    // --- ASSETS & HELPERS ---
    // =================================================================================

    const platformLogos: {[key: string]: string} = {
        youtube: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"></path></svg>`,
        tiktok: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525,2.007c-0.104-0.033-0.213-0.05-0.323-0.05C8.831,1.957,6,4.789,6,8.161v7.402c0,0.113,0.016,0.224,0.046,0.33c-0.021,0.081-0.034,0.165-0.034,0.253c0,0.822,0.667,1.488,1.488,1.488 c0.821,0,1.488-0.667,1.488-1.488c0-0.038-0.002-0.076-0.005-0.113C8.98,16.035,9,16.01,9,15.986V8.161c0-2.228,1.808-4.037,4.037-4.037 c0.162,0,0.32,0.01,0.475,0.029v3.251c0,2.155-1.742,3.896-3.896,3.896c-0.093,0-0.185-0.003-0.276-0.009v3.085 c0,0.003,0,0.005,0.001,0.008c0.09,0.006,0.182,0.009,0.275,0.009c2.909,0,5.271-2.362,5.271-5.271V5.424 C14.993,3.593,13.911,2.181,12.525,2.007z"></path></svg>`,
        twitch: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M4.265 3 3 6.204v11.592h4.265V21l3.199-3.199h3.199L21 10.998V3H4.265zM17.801 10.463 15.6 12.667h-3.199l-2.666 2.666v-2.666H6.4v-8.53h11.401v6.33z"/><path d="m14.532 6.331-1.066 2.133h-2.133v-2.133zm-4.265 0-1.066 2.133H7.068v-2.133z"/></svg>`,
        x: `<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`,
        news: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`,
        default: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`
    };
    
    /** Formats a number into a compact string (e.g., 1200 -> 1K, 1500000 -> 1.5M). */
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num.toString();
    };

    /** Formats seconds into a MM:SS string. */
    const formatTime = (time: number): string => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // =================================================================================
    // --- API & DATA FUNCTIONS ---
    // =================================================================================

    /**
     * A collection of mock services to provide data for development and as a fallback
     * when live APIs are unavailable.
     */
    const MockVideoAPIService = {
        _idCounter: 0,
        _liveIdCounter: 1000,
        _liveFeed: [] as any[],
        _adjectives: ['Awesome', 'Viral', 'Crazy', 'Incredible', 'Shocking', 'Funny', 'Cute', 'Epic', 'Mind-Blowing'],
        _nouns: ['Cats', 'Dogs', 'Tech', 'Lifehacks', 'Dances', 'Challenges', 'News', 'Goals', 'Pranks', 'Recipes'],
        _authors: ['ViralVids', 'TrendSetter', 'MemeMachine', 'DailyDoseOfNet', 'ContentKing', 'InfluencerHub'],
        _newsNouns: ['Market', 'Election', 'Weather', 'Tech Launch', 'Global Summit', 'Sports Final', 'Science Discovery'],
        _newsTemplates: [
            'BREAKING: Unprecedented Event Shakes The {noun}',
            'LIVE COVERAGE: Press Conference on the Latest {noun}',
        ],
        _titleTemplates: {
            x: [ "This clip is breaking the internet. A {noun} doing something {adjective}.", "Everyone is talking about this video right now. #{noun}", "Can't believe I just saw a {noun} go totally {adjective}!"],
            default: ["{adjective} {noun} Clip Goes Viral" ]
        },
        _streamerNames: ['StreamOink', 'ProGamerX', 'PixelQueen', 'RageQuitRoy', 'SnackStreamz'],
        _gameNames: ['Oinkcraft', 'Call of Duty: Modern Boarfare', 'League of Legends', 'Fortnite', 'Valorant', 'Apex Legends'],

        _generateMockStream: function() {
            this._liveIdCounter++;
            const author = this._streamerNames[Math.floor(Math.random() * this._streamerNames.length)];
            const game = this._gameNames[Math.floor(Math.random() * this._gameNames.length)];
            return {
                id: `twitch-${this._liveIdCounter}`, platform: 'twitch',
                user_name: author.toLowerCase(),
                title: `${game} with ${author}! | Chill Stream`,
                author: author,
                gameName: game,
                thumbnailUrl: `https://picsum.photos/seed/twitch${this._liveIdCounter}/640/360`,
                viewCount: Math.floor(Math.random() * 25000) + 500,
                orientation: 'landscape', isLive: true
            };
        },

        _generateMockTikTok: function() {
            this._idCounter++;
            const randomAdjective = this._adjectives[Math.floor(Math.random() * this._adjectives.length)];
            const randomNoun = this._nouns[Math.floor(Math.random() * this._nouns.length)];
            const randomAuthor = this._authors[Math.floor(Math.random() * this._authors.length)];
            const title = `${randomAdjective} ${randomNoun} TikTok Dance!`;
            return {
                id: `tiktok-${this._idCounter}`, platform: 'tiktok', title: title, author: randomAuthor,
                thumbnailUrl: `https://picsum.photos/seed/tiktok${this._idCounter}/360/640`,
                orientation: 'portrait',
                viralityScore: Math.floor(Math.random() * 1000),
                viewCount: Math.floor(Math.random() * 15000000) + 100000,
                embedHtml: `<div class="w-full h-full bg-black flex items-center justify-center text-white p-4 text-center"><p>Mock TikTok Player for "<span class="font-semibold">${title}</span>"</p></div>`
            };
        },

        fetchVideos: async function(platform: {id: string, query: string}, page: number, perPage: number): Promise<any[]> {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500)); 
            const videos = [];
            for (let i = 0; i < perPage; i++) {
                this._idCounter++;
                const randomAdjective = this._adjectives[Math.floor(Math.random() * this._adjectives.length)];
                const randomNoun = this._nouns[Math.floor(Math.random() * this._nouns.length)];
                const randomAuthor = this._authors[Math.floor(Math.random() * this._authors.length)];

                if (platform.id === 'x') {
                    const hasMedia = Math.random() > 0.3; // 70% chance of having media
                    let text = this._titleTemplates.x[Math.floor(Math.random() * this._titleTemplates.x.length)];
                    text = text.replace('{noun}', randomNoun).replace('{adjective}', randomAdjective);
                    
                    videos.push({
                        id: `${platform.id}-${this._idCounter}`, platform: 'x', author: randomAuthor,
                        authorHandle: `@${randomAuthor.toLowerCase()}`, text: text,
                        thumbnailUrl: hasMedia ? `https://picsum.photos/seed/x${this._idCounter}/500/280` : null,
                        likes: Math.floor(Math.random() * 5000) + 100,
                        retweets: Math.floor(Math.random() * 1500) + 50,
                        title: text, // for compatibility
                        viewCount: Math.floor(Math.random() * 100000) + 1000,
                        orientation: 'landscape', author_name: randomAuthor
                    });
                } else { // Handles youtube and custom feeds
                    const isPortrait = platform.id === 'tiktok';
                    const viewCount = Math.floor(Math.random() * 8000000) + 10000;
                    const viralityScore = Math.floor(Math.random() * 1000);
                    
                    let templates = this._titleTemplates.default;
                    let title = templates[Math.floor(Math.random() * templates.length)];
                    title = title.replace('{noun}', randomNoun).replace('{adjective}', randomAdjective);

                    videos.push({
                        id: `${platform.id}-${this._idCounter}`, platform: platform.id, title: title, author: randomAuthor,
                        thumbnailUrl: `https://picsum.photos/seed/${this._idCounter}/${isPortrait ? '360/640' : '640/360'}`,
                        orientation: isPortrait ? 'portrait' : 'landscape', viralityScore, viewCount
                    });
                }
            }
            return videos;
        },

        fetchLiveVideos: async function(): Promise<any[]> {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (Math.random() < 0.1 && this._liveFeed.length > 5) this._liveFeed.pop();
            if (this._liveFeed.length < 8 && Math.random() < 0.35) {
                this._liveIdCounter++;
                const randomNoun = this._newsNouns[Math.floor(Math.random() * this._newsNouns.length)];
                let title = this._newsTemplates[Math.floor(Math.random() * this._newsTemplates.length)].replace('{noun}', randomNoun);
                
                this._liveFeed.unshift({
                    id: `live-${this._liveIdCounter}`, platform: 'live', title, author: 'Global News Network',
                    thumbnailUrl: `https://picsum.photos/seed/live${this._liveIdCounter}/640/360`, orientation: 'landscape',
                    viewCount: Math.floor(Math.random() * 150000) + 5000, isLive: true,
                });
            }
            return [...this._liveFeed];
        }
    };

    const TikTokVideoService = {
        fetchTrending: async (): Promise<any[]> => {
            try {
                const videoUrls = [
                    'https://www.tiktok.com/@zachking/video/7314220791646391595', 'https://www.tiktok.com/@jamescharles/video/6790333339028901126',
                    'https://www.tiktok.com/@addisonre/video/6794921679332216070', 'https://www.tiktok.com/@therock/video/7325234932374637867',
                    'https://www.tiktok.com/@charlidamelio/video/6793399039983946962', 'https://www.tiktok.com/@bellapoarch/video/6862153931888200965',
                    'https://www.tiktok.com/@justmaiko/video/6824962154563931397', 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
                    'https://www.tiktok.com/@dancemachine/video/7331942365384609067', 'https://www.tiktok.com/@mrbeast/video/7174099433433648430',
                    'https://www.tiktok.com/@lorengray/video/6795431969348980000', 'https://www.tiktok.com/@cznburak/video/7321821867147775274',
                    'https://www.tiktok.com/@willsmith/video/6738337351887326470', 'https://www.tiktok.com/@kyliejenner/video/7325515324888255790'
                ];

                const oEmbedPromises = videoUrls.map(url =>
                    fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
                        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch oEmbed'))
                );
                
                const results = await Promise.allSettled(oEmbedPromises);
                const successfulEmbeds: any[] = [];
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        const data = result.value;
                        const videoIdMatch = data.html.match(/data-video-id="(\d+)"/);
                        const videoId = videoIdMatch ? videoIdMatch[1] : `tiktok-${Math.random()}`;

                        successfulEmbeds.push({
                            id: videoId, platform: 'tiktok', title: data.title, author: data.author_name,
                            thumbnailUrl: data.thumbnail_url, orientation: 'portrait',
                            viralityScore: Math.floor(Math.random() * 1000), // TikTok doesn't provide this
                            viewCount: Math.floor(Math.random() * 15000000) + 100000, // Or this
                            embedHtml: data.html
                        });
                    }
                });

                if (successfulEmbeds.length === 0) {
                    // Throw an error to trigger the catch block if API returns nothing.
                    throw new Error("No videos returned from TikTok oEmbed API.");
               }
               return successfulEmbeds;
            } catch (error) {
                console.warn('Failed to fetch real TikTok videos, falling back to mock data:', error);
                showNotification('Could not load TikTok feed. Showing mock content.');
                const mockVideos = [];
                for (let i = 0; i < 15; i++) {
                    mockVideos.push(MockVideoAPIService._generateMockTikTok());
                }
                return mockVideos;
            }
        }
    };

    const TwitchVideoService = {
        fetchTopStreams: async (): Promise<any[]> => {
            // Replaced live API call with mock data to avoid dependency on API keys.
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400)); // Simulate network delay
            try {
                const mockStreams = [];
                for (let i = 0; i < 12; i++) {
                    mockStreams.push(MockVideoAPIService._generateMockStream());
                }
                return mockStreams;
            } catch (error) {
                 console.error('Failed to generate mock Twitch streams:', error);
                 showNotification('Could not load Twitch mock feed.');
                 return [];
            }
        }
    };

    // =================================================================================
    // --- RENDER FUNCTIONS ---
    // =================================================================================

    /** Creates and returns an HTML element for a standard video card. */
    const renderVideoCard = (video: any): HTMLElement => {
        const card = document.createElement('div');
        const aspectRatio = video.orientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video';
        card.className = `group relative overflow-hidden rounded-lg shadow-md cursor-pointer ${aspectRatio} bg-gray-700 grid-item`;
        card.dataset.videoId = video.id;
        card.dataset.platform = video.platform;

        const trendingUpSvg = `<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>`;

        card.innerHTML = `
            <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" loading="lazy">
            <div class="absolute top-2 left-2 md:hidden">
                <span class="font-brand text-pink-400 text-sm bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">${video.platform.toUpperCase()}</span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-center">
                <div class="transform scale-100 group-hover:scale-110 transition-transform duration-300 opacity-80 group-hover:opacity-100">
                    ${platformLogos[video.platform] || platformLogos.default}
                </div>
            </div>
            <div class="absolute top-2 right-2">
                 <div class="flex items-center gap-1 p-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    ${video.isTrendingUp ? trendingUpSvg : ''}
                    <svg class="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l.643-.643a1 1 0 00-1.414-1.414l-1.414 1.414a1 1 0 00-.293.707v3.293a1 1 0 001 1h3.293a1 1 0 00.707-1.707l-1.414-1.414.643-.643c.214-.386.494-.728.822-.98a1 1 0 00.385-1.45zM8.25 10.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.75 10.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12 14.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5.25 14.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clip-rule="evenodd"></path></svg>
                    <span class="virality-score text-sm font-bold text-white">${video.viralityScore}</span>
                </div>
            </div>
            <div class="absolute bottom-0 left-0 p-3 text-white w-full bg-gradient-to-t from-black/80 to-transparent pt-10">
                <h3 class="font-semibold truncate text-sm">${video.title}</h3>
                <div class="flex justify-between items-center text-xs text-gray-300 mt-1">
                     <p class="truncate">by ${video.author}</p>
                     <p class="font-semibold">${formatNumber(video.viewCount)} views</p>
                </div>
            </div>
        `;
        return card;
    };

    /** Creates and returns an HTML element for a Twitch stream card. */
    const renderTwitchCard = (stream: any): HTMLElement => {
        const card = document.createElement('div');
        card.className = 'group relative overflow-hidden rounded-lg shadow-md cursor-pointer aspect-video bg-gray-700 grid-item';
        card.dataset.videoId = stream.id;
        card.dataset.platform = stream.platform;
    
        card.innerHTML = `
            <img src="${stream.thumbnailUrl}" alt="${stream.title}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" loading="lazy">
             <div class="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-md bg-red-600 text-white">
                 <div class="w-2 h-2 bg-white rounded-full live-indicator-dot"></div>
                 <span class="text-xs font-bold uppercase tracking-wider">LIVE</span>
            </div>
            <div class="absolute top-12 left-2 md:hidden">
                <span class="font-brand text-pink-400 text-sm bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">${stream.platform.toUpperCase()}</span>
            </div>
            <div class="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur-sm text-xs font-semibold text-white">
                ${formatNumber(stream.viewCount)} viewers
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3 text-white">
                <h3 class="font-semibold truncate text-sm">${stream.title}</h3>
                <p class="text-xs text-gray-300 truncate mt-1">${stream.author}</p>
                <p class="text-xs font-semibold text-purple-400 truncate mt-0.5">${stream.gameName}</p>
            </div>
        `;
        return card;
    };
    
    /** Creates and returns an HTML element for an X (Twitter) post card. */
    const renderXCard = (post: any): HTMLElement => {
        const card = document.createElement('div');
        card.className = 'x-card bg-gray-800 rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:bg-gray-700 transition-colors duration-200 grid-item';
        card.dataset.videoId = post.id;
        card.dataset.platform = post.platform;
    
        const mediaHtml = post.thumbnailUrl ? `<img src="${post.thumbnailUrl}" alt="Post media" class="w-full h-auto object-cover rounded-lg mt-2 border border-gray-600">` : '';
    
        const xLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`;
    
        card.innerHTML = `
            <div class="absolute top-2 left-2 md:hidden z-10">
                <span class="font-brand text-pink-400 text-sm bg-gray-900/60 backdrop-blur-sm px-2 py-1 rounded-md">${post.platform.toUpperCase()}</span>
            </div>
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center">${xLogoSvg}</div>
                <div class="w-full">
                    <div class="flex items-center gap-2">
                        <p class="font-bold text-white truncate">${post.author}</p>
                        <p class="text-sm text-gray-400 flex-shrink-0">${post.authorHandle}</p>
                    </div>
                    <p class="text-white mt-1 text-sm">${post.text}</p>
                    ${mediaHtml}
                </div>
            </div>
            <div class="x-card-actions flex justify-around text-gray-400 pt-2 border-t border-gray-700/50">
                <div class="flex items-center gap-2 text-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div class="flex items-center gap-2 text-sm">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16V4m0 12L3 12m4 4l4-4m6 8v-4m0 4h4m-4 0l4 4M21 8h-4m4 0l-4-4m-2-4v12"></path></svg>
                    <span>${formatNumber(post.retweets)}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    <span>${formatNumber(post.likes)}</span>
                </div>
                 <div class="flex items-center gap-2 text-sm">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
            </div>
        `;
        return card;
    };

    /** Creates and returns an HTML element for a live video card (list view). */
    const renderLiveVideoCard = (video: any): HTMLElement => {
        const card = document.createElement('div');
        card.className = 'live-card bg-gray-800 rounded-lg p-3 flex gap-4 cursor-pointer hover:bg-gray-700 transition-colors duration-200 outline-4 outline-transparent outline-offset-2';
        card.dataset.videoId = video.id;
        card.dataset.platform = video.platform;

        card.innerHTML = `
            <div class="w-48 flex-shrink-0">
                <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full h-full object-cover rounded-md aspect-video">
            </div>
            <div class="flex flex-col justify-center">
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-3 h-3 bg-red-500 rounded-full live-indicator-dot"></div>
                    <span class="text-red-500 font-bold text-sm uppercase">LIVE</span>
                </div>
                <h3 class="font-semibold text-white text-md mb-1">${video.title}</h3>
                <p class="text-xs text-gray-400">${formatNumber(video.viewCount)} watching now</p>
            </div>
        `;
        return card;
    };

    /** Creates and returns an HTML element for a Buffet recommendation card (list view). */
    const renderBuffetCard = (video: any): HTMLElement => {
        const card = document.createElement('div');
        card.className = 'buffet-card list-view-card flex gap-4 p-3 rounded-lg cursor-pointer hover:bg-gray-700/50 border border-transparent hover:border-pink-500/50';
        card.dataset.videoId = video.id;
        card.dataset.platform = video.platform;
    
        // Left side - Thumbnail
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'w-40 flex-shrink-0 relative';
        
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = video.thumbnailUrl;
        thumbnailImg.alt = video.title;
        thumbnailImg.className = 'w-full h-full object-cover rounded-md aspect-video';
        thumbnailContainer.appendChild(thumbnailImg);
        
        const logoContainer = document.createElement('div');
        logoContainer.className = 'absolute top-1 left-1 bg-black/50 p-1 rounded-full';
        if (platformLogos[video.platform]) {
            const logoWrapper = document.createElement('div');
            logoWrapper.className = 'w-6 h-6 text-white';
            logoWrapper.innerHTML = platformLogos[video.platform].replace(/w-12 h-12/g, '');
            logoContainer.appendChild(logoWrapper);
        }
        thumbnailContainer.appendChild(logoContainer);
    
        // Right side - Info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'flex flex-col justify-center overflow-hidden';
        
        const title = document.createElement('h3');
        title.className = 'font-semibold text-white text-sm truncate';
        title.textContent = video.title;
        infoContainer.appendChild(title);
        
        const author = document.createElement('p');
        author.className = 'text-xs text-gray-400 truncate';
        author.textContent = `by ${video.author}`;
        infoContainer.appendChild(author);
    
        const reason = document.createElement('p');
        reason.className = 'text-xs text-pink-300 italic mt-2 reason-text';
        const reasonPrefix = document.createElement('span');
        reasonPrefix.className = 'font-bold not-italic text-pink-400';
        reasonPrefix.textContent = 'OINK AI says: ';
        reason.appendChild(reasonPrefix);
        reason.appendChild(document.createTextNode(video.reason));
        infoContainer.appendChild(reason);
    
        card.appendChild(thumbnailContainer);
        card.appendChild(infoContainer);
    
        return card;
    };

    /** Renders a full column for a platform in the desktop dashboard. */
    const renderDashboardColumn = (platform: {id: string, name: string}) => {
        const columnContainer = document.createElement('div');
        columnContainer.id = `platform-column-${platform.id}`;
        columnContainer.className = 'platform-trough rounded-lg flex flex-col flex-shrink-0 w-80 overflow-y-auto no-scrollbar';
        
        columnContainer.innerHTML = `
            <h2 class="font-brand text-pink-400 text-xl px-4 py-2 text-center sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-700">${platform.name}</h2>
            <div id="column-content-${platform.id}" class="flex flex-col gap-4 p-4"></div>
        `;
        desktopDashboard.appendChild(columnContainer);
    };
    
    /** Re-renders the content of a single platform column with sorted videos. */
    const rerenderColumn = (platformId: string) => {
        const columnContent = document.getElementById(`column-content-${platformId}`);
        if (!columnContent || !state.allVideos[platformId]) return;

        // Sort videos by virality, except for X and Twitch which are chronological/live.
        if(platformId !== 'x' && platformId !== 'twitch') {
            state.allVideos[platformId].sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
        }
        
        const fragment = document.createDocumentFragment();
        state.allVideos[platformId].forEach(video => {
            if (platformId === 'x') {
                fragment.appendChild(renderXCard(video));
            } else if (platformId === 'twitch') {
                fragment.appendChild(renderTwitchCard(video));
            } else {
                fragment.appendChild(renderVideoCard(video));
            }
        });
        columnContent.innerHTML = ''; // Clear existing content
        columnContent.appendChild(fragment);
    };

    /** Renders the entire feed for the mobile view based on the active platform filter. */
    const renderMobileFeed = () => {
        const mobileFeedContent = document.getElementById('mobile-feed-content');
        if (!mobileFeedContent) return;

        let videosToDisplay: any[] = [];
        if (state.mobileActivePlatform === 'all') {
            videosToDisplay = Object.values(state.allVideos).flat();
            videosToDisplay.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
        } else {
            videosToDisplay = [...(state.allVideos[state.mobileActivePlatform] || [])];
             if (state.mobileActivePlatform !== 'x' && state.mobileActivePlatform !== 'twitch') {
                videosToDisplay.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
            }
        }

        const fragment = document.createDocumentFragment();
        videosToDisplay.forEach(video => {
            let card;
            if (video.platform === 'x') card = renderXCard(video);
            else if (video.platform === 'twitch') card = renderTwitchCard(video);
            else card = renderVideoCard(video);
            fragment.appendChild(card);
        });

        mobileFeedContent.innerHTML = '';
        mobileFeedContent.appendChild(fragment);
    }
    
    /** Updates the content of the player's side feed based on the current view. */
    const updatePlayerFeedDisplay = () => {
        playerFeed.innerHTML = '';
        if (state.masonryPlayer) {
            state.masonryPlayer.destroy();
            state.masonryPlayer = null;
        }
        playerFeed.classList.remove('masonry-grid'); 

        // Buffet and Mud Hole views have custom static content and are handled in their respective functions.
        if (state.currentAppView === 'buffet' || state.currentAppView === 'mudhole') return;

        let videosToDisplay: any[] = [];
        let useMasonry = true;
        let cardRenderer = renderVideoCard;

        switch(state.currentAppView) {
            case 'live':
                videosToDisplay = state.liveVideos;
                useMasonry = false;
                cardRenderer = renderLiveVideoCard;
                break;
            case 'history':
                videosToDisplay = state.watchHistory;
                break;
            case 'hoggwild':
                videosToDisplay = state.hoggWildPlaylist;
                break;
            case 'player':
                if (state.currentPlayerPlatform) {
                    const sortedPlatformVideos = [...state.allVideos[state.currentPlayerPlatform]];
                    if (state.currentPlayerPlatform !== 'x' && state.currentPlayerPlatform !== 'twitch') {
                         sortedPlatformVideos.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
                    }
                    videosToDisplay = sortedPlatformVideos;
                }
                break;
        }
        
        const fragment = document.createDocumentFragment();
        videosToDisplay.forEach(video => {
            let card;
            if (video.platform === 'x') card = renderXCard(video);
            else if (video.platform === 'twitch') card = renderTwitchCard(video);
            else card = cardRenderer(video); // Use the determined renderer
            fragment.appendChild(card);
        });
        playerFeed.appendChild(fragment);

        if (useMasonry) {
            playerFeed.classList.add('masonry-grid');
            // Defer masonry initialization to allow DOM to update
            setTimeout(() => {
                if (document.getElementById('player-feed')) {
                    state.masonryPlayer = initMasonry(playerFeed);
                    updatePlayerHighlighting();
                }
            }, 100);
        } else {
             updatePlayerHighlighting();
        }
    };

    /** Initializes a Masonry grid layout on a given element. */
    const initMasonry = (element: HTMLElement): any => {
         return new Masonry(element, {
             itemSelector: '.grid-item',
             percentPosition: true,
             gutter: 16
        });
    };

    // =================================================================================
    // --- CORE LOGIC & VIEW MANAGEMENT ---
    // =================================================================================

    /**
     * Updates the active state of navigation buttons for both desktop and mobile.
     * @param view The name of the currently active view.
     */
    const updateNavStates = (view: string) => {
        headerTitle.textContent = 'OINK';
        // The 'more' menu on mobile contains 'history' and 'mudhole'
        const mobileView = (view === 'history' || view === 'mudhole') ? 'more' : view;

        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const allBottomNavButtons = document.querySelectorAll('#mobile-bottom-nav .bottom-nav-btn, #mobile-bottom-nav-player .bottom-nav-btn') as NodeListOf<HTMLElement>;
        allBottomNavButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mobileView);
        });
    };

    /**
     * Fetches more videos for a specific platform or all platforms.
     * @param specificPlatform - If provided, only fetches for this platform.
     */
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
                    rerenderColumn(platform.id);
                    renderMobileFeed();
                } else if (state.currentAppView === 'player' && state.currentPlayerPlatform === platform.id) {
                    updatePlayerFeedDisplay();
                }
            }
        } finally {
            state.isLoading = false;
            loader.classList.add('hidden');
        }
    };

    /** Checks for new live videos and updates the state and UI if necessary. */
    const checkForNewLiveVideos = async () => {
        const newLiveList = await MockVideoAPIService.fetchLiveVideos();
        if (newLiveList.length > 0 && (newLiveList.length !== state.liveVideos.length || newLiveList[0].id !== state.liveVideos[0]?.id)) {
            state.liveVideos = newLiveList;
            if (state.currentAppView === 'live') {
                updatePlayerFeedDisplay();
            }
        }
    };

    /** Handles the common UI transition to the player view. */
    const transitionToPlayerView = (view: string, title: string) => {
        state.currentAppView = view;
        state.hoggWildPlaylist = [];
        state.buffetPlaylist = [];
        updateNavStates(view);

        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        platformTroughTitle.innerHTML = title;

        // Reset player state
        state.currentlyPlayingVideoId = null;
        if (state.ytPlayer && typeof state.ytPlayer.stopVideo === 'function') state.ytPlayer.stopVideo();
        embedPlayer.innerHTML = '';
        playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
        updatePlayerHighlighting();
    };

    /** Opens the player view for a specific platform's content trough. */
    const openPlayerView = (platformId: string) => {
        state.currentPlayerPlatform = platformId;
        const platform = state.platforms.find(p => p.id === platformId);
        const title = platform ? `${platform.name} - <span class="font-cursive">Trough</span>` : 'Trough';
        
        transitionToPlayerView('player', title);
        playerView.classList.remove('is-live-mode');
        buffetAddFeedBtn.classList.add('hidden');

        mobilePlayerTitle.textContent = 'Select a video to play';
        mobilePlayerAuthor.textContent = 'from the trough';
        updatePlayerFeedDisplay();
    };
    
    /** Opens the live video view. */
    const openLiveView = () => {
        if (state.liveVideos.length === 0) {
            showNotification("Connecting to the forage... try again in a moment.");
            return;
        }
        state.currentPlayerPlatform = null;
        transitionToPlayerView('live', `OINK PEN - <span class="font-cursive">Forage</span>`);
        playerView.classList.add('is-live-mode');
        buffetAddFeedBtn.classList.add('hidden');
        updatePlayerFeedDisplay();
        playVideo(state.liveVideos[0]);
    };

    /** Opens the AI-powered Buffet view. */
    const openBuffetView = async () => {
        state.currentPlayerPlatform = null;
        transitionToPlayerView('buffet', `The Buffet - <span class="font-cursive">Personalized Feed</span>`);
        playerView.classList.remove('is-live-mode');
        buffetAddFeedBtn.classList.remove('hidden');

        if (state.watchHistory.length === 0) {
            playerFeed.innerHTML = `
                <div class="text-center text-gray-400 p-8 flex flex-col items-center gap-4">
                    <h3 class="font-brand text-2xl text-pink-400 mb-2">Your Buffet is Empty!</h3>
                    <p>Watch some videos to get started, or use the "FEED ME" button to add more sources and discover new slop!</p>
                </div>
            `;
            playerTitle.textContent = "Your Buffet is waiting";
            playerAuthor.textContent = "Start watching to get recommendations";
            mobilePlayerTitle.textContent = "Your Buffet is waiting";
            mobilePlayerAuthor.textContent = "Start watching to get recommendations";
            return;
        }

        playerTitle.textContent = "Your Buffet is being prepared...";
        playerAuthor.textContent = "Powered by Gemini";
        mobilePlayerTitle.textContent = "Your Buffet is being prepared...";
        mobilePlayerAuthor.textContent = "Powered by Gemini";
        playerFeed.innerHTML = `
            <div class="text-center text-gray-400 p-8 flex flex-col items-center justify-center gap-4">
                <svg class="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p>Consulting the AI chef to cook up your personalized slop...</p>
            </div>`;

        try {
            const historyForPrompt = state.watchHistory.slice(0, 20).map(v => `'${v.title}' by ${v.author} on ${v.platform}`).join(', ');
            const prompt = `You are a viral video recommendation expert for an app called OINK. Based on this user's watch history, suggest 10 new, engaging video titles they would love. Provide a diverse mix of platforms (youtube, tiktok, x). For each, give a short, compelling reason why the user would like it. User history: ${historyForPrompt}`;
            
            const response = await AI_INSTANCE.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                       recommendations: {
                         type: Type.ARRAY,
                         items: {
                           type: Type.OBJECT,
                           properties: {
                             title: { type: Type.STRING },
                             author: { type: Type.STRING },
                             platform: { type: Type.STRING, enum: ['youtube', 'tiktok', 'x'] },
                             reason: { type: Type.STRING }
                           },
                           required: ['title', 'author', 'platform', 'reason']
                         }
                       }
                     }
                   },
                },
             });

            const resultJson = JSON.parse(response.text);
            const recommendations = resultJson.recommendations || [];
            if (recommendations.length === 0) throw new Error("AI did not return any recommendations.");

            state.buffetPlaylist = recommendations.map((rec: any) => {
                const platformVideos = state.allVideos[rec.platform] || [];
                // Find a random video as a base, fallback to any video if none for that platform exist
                const randomVideo = platformVideos.length > 0
                    ? platformVideos[Math.floor(Math.random() * platformVideos.length)]
                    : Object.values(state.allVideos).flat()[Math.floor(Math.random() * Object.values(state.allVideos).flat().length)];
                return { ...randomVideo, ...rec, id: `buffet-${Math.random()}` };
            });

            playerFeed.innerHTML = '';
            const fragment = document.createDocumentFragment();
            state.buffetPlaylist.forEach(video => fragment.appendChild(renderBuffetCard(video)));
            playerFeed.appendChild(fragment);

            state.currentBuffetIndex = 0;
            playVideo(state.buffetPlaylist[0]);

        } catch (error) {
            console.error("Gemini API call failed:", error);
            playerFeed.innerHTML = `
                <div class="text-center text-gray-400 p-8">
                    <h3 class="font-brand text-2xl text-pink-400 mb-2">AI Chef is on a Break!</h3>
                    <p>We couldn't generate your personalized Buffet this time. Please try again later.</p>
                </div>
            `;
        }
    };

    /** Opens the Mud Hole view (placeholder). */
    const openMudHoleView = () => {
        state.currentPlayerPlatform = null;
        transitionToPlayerView('mudhole', `The Mud Hole - <span class="font-cursive">Top Waller Scores</span>`);
        playerView.classList.remove('is-live-mode');
        buffetAddFeedBtn.classList.add('hidden');
    
        playerTitle.textContent = "See who's the best Truffle Hunter!";
        playerAuthor.textContent = "Spot trends early to climb the ranks.";
        mobilePlayerTitle.textContent = "See who's the best Truffle Hunter!";
        mobilePlayerAuthor.textContent = "Spot trends early to climb the ranks.";
        
        playerFeed.innerHTML = `
            <div class="text-center text-gray-400 p-8">
                <h3 class="font-brand text-2xl text-pink-400 mb-2">Coming Soon!</h3>
                <p>Watch videos before they go viral to earn WALLER points and become the top Truffle Hunter in the Mud Hole. Leaderboards are on the way!</p>
            </div>
        `;
    };

    /** Opens the watch history (Left-Overs) view. */
    const openWatchAgainView = () => {
        if (state.watchHistory.length === 0) {
            showNotification("You haven't watched any videos yet!");
            return;
        }
        state.currentPlayerPlatform = null;
        transitionToPlayerView('history', `Your <span class="font-cursive">Left-Overs</span>`);
        playerView.classList.remove('is-live-mode');
        buffetAddFeedBtn.classList.add('hidden');
        
        updatePlayPauseIcon();
        playerTitle.textContent = 'Your Left-Overs';
        playerAuthor.textContent = 'Re-watch your favorite slop';
        mobilePlayerTitle.textContent = 'Your Left-Overs';
        mobilePlayerAuthor.textContent = 'Re-watch your favorite slop';
        
        updatePlayerFeedDisplay();
    };

    /** Closes any player view and returns to the main feed dashboard. */
    const closePlayerView = () => {
        state.currentAppView = 'feed';
        state.currentPlayerPlatform = null;
        state.hoggWildPlaylist = [];
        state.buffetPlaylist = [];
        state.queuedYouTubeVideo = null;
        
        updateNavStates('feed');
        playerView.classList.add('hidden');
        playerView.classList.remove('is-live-mode');
        desktopDashboard.classList.remove('hidden');
        mobileDashboard.classList.remove('hidden');
        document.body.style.overflow = '';
        
        if (state.ytPlayer && typeof state.ytPlayer.stopVideo === 'function') {
            state.ytPlayer.stopVideo();
        }
        embedPlayer.innerHTML = '';
        playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
        state.currentlyPlayingVideoId = null;
        if (state.masonryPlayer) {
            state.masonryPlayer.destroy();
            state.masonryPlayer = null;
        }
        mobilePlayerTitle.textContent = 'Select a video to play';
        mobilePlayerAuthor.textContent = 'from the trough';
    };

    /** Starts the HOGG WILD continuous playback mode. */
    const startHoggWildStream = () => {
        // HOGG WILD only includes short VOD content, not live streams.
        const playableVideos = [...(state.allVideos['youtube'] || []), ...(state.allVideos['tiktok'] || [])];
        if(playableVideos.length === 0) {
            showNotification("No playable videos loaded for HOGG WILD. Feeds might still be populating.");
            return;
        }
        // Shuffle the playlist
        state.hoggWildPlaylist = playableVideos
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);

        state.currentPlayerPlatform = null;
        transitionToPlayerView('hoggwild', `HOGG WILD - <span class="font-cursive">Slop Trough</span>`);
        playerView.classList.remove('is-live-mode');
        buffetAddFeedBtn.classList.add('hidden');

        updatePlayerFeedDisplay();
        state.currentHoggWildIndex = 0;
        playVideo(state.hoggWildPlaylist[state.currentHoggWildIndex]);
    };

    // =================================================================================
    // --- VIDEO PLAYER LOGIC ---
    // =================================================================================

    /**
     * Plays a selected video, handling UI updates and loading the correct player.
     * @param videoData - The data object for the video to play.
     */
    const playVideo = (videoData: any) => {
        if (!videoData) return;
        state.currentlyPlayingVideoId = videoData.id;

        // Update watch history (if not a live video)
        if (!videoData.isLive) {
            state.watchHistory = state.watchHistory.filter(v => v.id !== videoData.id);
            state.watchHistory.unshift(videoData);
            if (state.watchHistory.length > 100) state.watchHistory.pop();
            localStorage.setItem('oinkHistory', JSON.stringify(state.watchHistory));
        }
        
        // Update titles and author text
        const titleText = videoData.platform === 'x' ? videoData.text : videoData.title;
        const authorText = `by ${videoData.author}`;
        let displayTitle = titleText;
        if (videoData.isLive) displayTitle = `LIVE: ${titleText}`;
        else if (state.buffetPlaylist.length > 0 && state.buffetPlaylist.some(v => v.id === videoData.id)) displayTitle = `The Buffet: ${titleText}`;
        else if (state.hoggWildPlaylist.length > 0 && state.hoggWildPlaylist.some(v => v.id === videoData.id)) displayTitle = `SLOP: ${titleText}`;
        else if (state.currentPlayerPlatform) displayTitle = `Prime Cuts: ${titleText}`;
        
        playerTitle.textContent = displayTitle;
        playerAuthor.textContent = authorText;
        mobilePlayerTitle.textContent = titleText;
        mobilePlayerAuthor.textContent = authorText;

        // Load video into the appropriate player
        if (state.ytPlayer && typeof state.ytPlayer.stopVideo === 'function') state.ytPlayer.stopVideo();
        switch(videoData.platform) {
            case 'youtube':
                playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row youtube-active';
                embedPlayer.innerHTML = '';
                const videoId = typeof videoData.id === 'string' ? videoData.id.replace('youtube-', '') : videoData.id;
                if (state.isYtPlayerReady && state.ytPlayer && typeof state.ytPlayer.loadVideoById === 'function') {
                    state.ytPlayer.loadVideoById(videoId);
                } else {
                     state.queuedYouTubeVideo = videoData;
                }
                break;
            case 'tiktok':
            case 'twitch':
                playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row embed-active';
                const embedHtml = videoData.platform === 'twitch' 
                    ? `<iframe src="https://player.twitch.tv/?channel=${videoData.user_name}&parent=www.oink-app.com&autoplay=true&muted=false" height="100%" width="100%" allowfullscreen></iframe>`
                    : videoData.embedHtml;
                embedPlayer.innerHTML = embedHtml;
                break;
            default:
                playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
                embedPlayer.innerHTML = `<div class="w-full h-full bg-black flex items-center justify-center text-white p-4 text-center"><p>This content type is not yet supported in the player.<br/>Playing a placeholder.</p></div>`;
                showNotification("This content type is not yet supported in the player.");
                break;
        }
        
        progressBar.value = 0;
        updatePlayerHighlighting();
    };

    /** Plays the next video in the current trough/playlist. */
    const playNextVideo = () => {
        if (state.hoggWildPlaylist.length > 0) {
            state.currentHoggWildIndex++;
            if (state.currentHoggWildIndex < state.hoggWildPlaylist.length) {
                playVideo(state.hoggWildPlaylist[state.currentHoggWildIndex]);
            } else {
                closePlayerView();
            }
        } else if (state.buffetPlaylist.length > 0) {
            state.currentBuffetIndex++;
            if (state.currentBuffetIndex < state.buffetPlaylist.length) {
                playVideo(state.buffetPlaylist[state.currentBuffetIndex]);
            } else {
                showNotification("That's all for this Buffet!");
                closePlayerView();
            }
        } else if (state.currentPlayerPlatform) {
            const platformVideos = state.allVideos[state.currentPlayerPlatform] || [];
            const sortedVideos = [...platformVideos];
            if (state.currentPlayerPlatform !== 'twitch' && state.currentPlayerPlatform !== 'x') {
                sortedVideos.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
            }
            const currentIndex = sortedVideos.findIndex(v => v.id === state.currentlyPlayingVideoId);
            if (currentIndex !== -1 && currentIndex < sortedVideos.length - 1) {
                playVideo(sortedVideos[currentIndex + 1]);
            } else {
                closePlayerView();
            }
        }
    };
    
    /** Adds or removes the 'is-playing' class from cards. */
    const updatePlayerHighlighting = () => {
        document.querySelectorAll('.is-playing').forEach(el => el.classList.remove('is-playing'));
        if (state.currentlyPlayingVideoId) {
            document.querySelectorAll(`[data-video-id="${state.currentlyPlayingVideoId}"]`).forEach(el => el.classList.add('is-playing'));
        }
    };
    
    // --- YOUTUBE PLAYER CONTROLS & EVENTS ---

    /** Callback for when the YouTube player is ready. */
    const onPlayerReady = () => {
        state.isYtPlayerReady = true;
        updateVolumeUI();
        if (state.queuedYouTubeVideo) {
            playVideo(state.queuedYouTubeVideo);
            state.queuedYouTubeVideo = null;
        }
    };

    /** Callback for YouTube player state changes (playing, paused, ended). */
    const onPlayerStateChange = (event: any) => {
        updatePlayPauseIcon();
        if (event.data === YT.PlayerState.PLAYING) {
            updateVolumeUI();
            state.playerUpdateInterval = window.setInterval(updateVideoProgress, 250);
        } else {
            clearInterval(state.playerUpdateInterval);
        }
        if (event.data === YT.PlayerState.ENDED) {
            // Don't auto-play next in history or live views.
            if (state.currentAppView !== 'history' && state.currentAppView !== 'live') {
                playNextVideo();
            }
        }
    };

    const updatePlayPauseIcon = () => {
        if (!state.ytPlayer || typeof state.ytPlayer.getPlayerState !== 'function') return;
        const isPlaying = state.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
        playIcon.classList.toggle('hidden', isPlaying);
        pauseIcon.classList.toggle('hidden', !isPlaying);
    };

    const updateVideoProgress = () => {
        if (!state.ytPlayer || typeof state.ytPlayer.getCurrentTime !== 'function') return;
        const currentTime = state.ytPlayer.getCurrentTime();
        const duration = state.ytPlayer.getDuration();
        progressBar.value = (currentTime / duration) * 100 || 0;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    };

    const updateVolumeUI = () => {
        if (!state.ytPlayer || typeof state.ytPlayer.isMuted !== 'function') return;
        const isMuted = state.ytPlayer.isMuted() || state.ytPlayer.getVolume() === 0;
        volumeHighIcon.classList.toggle('hidden', isMuted);
        volumeMutedIcon.classList.toggle('hidden', !isMuted);
        volumeSlider.value = isMuted ? '0' : (state.ytPlayer.getVolume() / 100).toString();
    };

    // =================================================================================
    // --- MODALS & NOTIFICATIONS ---
    // =================================================================================
    
    /** Displays a short-lived notification message. */
    const showNotification = (message: string) => {
        clearTimeout(state.notificationTimeout);
        notification.textContent = message;
        notification.classList.remove('opacity-0');
        state.notificationTimeout = window.setTimeout(() => {
            notification.classList.add('opacity-0');
        }, 4000);
    };

    const openModal = (modal: HTMLElement) => {
        state.previousActiveElement = document.activeElement as HTMLElement;
        modal.classList.remove('hidden');
        const firstFocusable = modal.querySelector('input, button') as HTMLElement;
        firstFocusable?.focus();
    };

    const closeModal = (modal: HTMLElement) => {
        modal.classList.add('hidden');
        state.previousActiveElement?.focus();
    };

    // =================================================================================
    // --- EVENT HANDLERS ---
    // =================================================================================

    /** Handles clicks on any video card to play the video. */
    const handleCardClick = (e: MouseEvent) => {
        const card = (e.target as HTMLElement).closest('[data-video-id]');
        if (!card) return;

        const videoId = (card as HTMLElement).dataset.videoId!;
        const platformId = (card as HTMLElement).dataset.platform!;
        let videoData = state.liveVideos.find(v => v.id === videoId)
            || state.allVideos[platformId]?.find(v => v.id === videoId)
            || state.watchHistory.find(v => v.id === videoId)
            || state.buffetPlaylist.find(v => v.id === videoId);
        
        if (!videoData) return;
        
        // Open player if not already in a player view
        if (!playerView.offsetParent) {
            openPlayerView(platformId);
        }

        if (state.currentAppView === 'buffet' && state.buffetPlaylist.length > 0) {
            const newIndex = state.buffetPlaylist.findIndex(v => v.id === videoData.id);
            if (newIndex > -1) state.currentBuffetIndex = newIndex;
        }
        
        playVideo(videoData);
    };

    /** Handles the share/Waller button action. */
    const handleShare = async () => {
        if (!state.currentlyPlayingVideoId) {
            showNotification('No video is currently playing to share.');
            return;
        }
        const videoData = Object.values(state.allVideos).flat().find(v => v.id === state.currentlyPlayingVideoId) 
            || state.watchHistory.find(v => v.id === state.currentlyPlayingVideoId)
            || state.liveVideos.find(v => v.id === state.currentlyPlayingVideoId)
            || state.buffetPlaylist.find(v => v.id === state.currentlyPlayingVideoId);
        
        if (!videoData) return;

        const virality = videoData.viralityScore || 900;
        const points = Math.max(10, Math.round(100 - (virality / 10)));
        let urlToShare = window.location.href; // Fallback URL
        if (videoData.platform === 'youtube') urlToShare = `https://www.youtube.com/watch?v=${videoData.id}`;
        if (videoData.platform === 'tiktok') urlToShare = `https://www.tiktok.com/@${videoData.author}/video/${videoData.id}`;
        if (videoData.platform === 'twitch') urlToShare = `https://www.twitch.tv/${videoData.user_name}`;

        try {
            if (navigator.share) {
                await navigator.share({ title: `Check out this video: ${videoData.title}`, url: urlToShare });
                showNotification(`SLOP SHARED! +${points} WALLER Points!`);
            } else {
                throw new Error('Share API not supported');
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return; // User cancelled share
            try { // Fallback to clipboard
                await navigator.clipboard.writeText(urlToShare);
                showNotification(`SLOP SHARED! +${points} WALLER Points! Link copied.`);
            } catch {
                showNotification('Could not copy link to clipboard.');
            }
        }
    };

    /** Adds a new custom platform feed. */
    const addPlatform = (name: string) => {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!id || state.platforms.some(p => p.id === id)) { 
            showNotification(`Feed "${name}" already exists or is invalid.`);
            return; 
        }
        const newPlatform = { id, name, query: name };
        state.platforms.push(newPlatform);
        state.allVideos[id] = [];
        state.pageTrackers[id] = 1;

        renderDashboardColumn(newPlatform);
        createMobileToggleBoard(); // Re-render mobile toggles
        loadMoreVideos(newPlatform);
        closeModal(addFeedModal);
    };

    /** Binds all the application's event listeners. */
    const bindEventListeners = () => {
        // Main Navigation
        primeCutsBtn.addEventListener('click', closePlayerView);
        hoggWildBtn.addEventListener('click', startHoggWildStream);
        livePenBtn.addEventListener('click', openLiveView);
        buffetBtn.addEventListener('click', openBuffetView);
        mudHoleBtn.addEventListener('click', openMudHoleView);
        leftOversHeaderBtn.addEventListener('click', openWatchAgainView);
        
        // Player Actions
        backToFeedBtn.addEventListener('click', closePlayerView);
        shareBtn.addEventListener('click', handleShare);
        mobileShareBtn.addEventListener('click', handleShare);
        watchAgainBtn.addEventListener('click', openWatchAgainView);
        buffetAddFeedBtn.addEventListener('click', () => openModal(addFeedModal));

        // Player Controls
        playPauseBtn.addEventListener('click', () => {
            if (!state.ytPlayer || typeof state.ytPlayer.getPlayerState !== 'function') return;
            state.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING ? state.ytPlayer.pauseVideo() : state.ytPlayer.playVideo();
        });
        progressBar.addEventListener('click', (e) => {
            if (!state.ytPlayer || typeof state.ytPlayer.getDuration !== 'function') return;
            const duration = state.ytPlayer.getDuration();
            state.ytPlayer.seekTo((e.offsetX / progressBar.clientWidth) * duration);
        });
        volumeBtn.addEventListener('click', () => {
            if (!state.ytPlayer || typeof state.ytPlayer.isMuted !== 'function') return;
            state.ytPlayer.isMuted() ? state.ytPlayer.unMute() : state.ytPlayer.mute();
        });
        volumeSlider.addEventListener('input', (e) => {
            if (!state.ytPlayer || typeof state.ytPlayer.setVolume !== 'function') return;
            const newVolume = parseFloat((e.target as HTMLInputElement).value);
            state.ytPlayer.setVolume(newVolume * 100);
            newVolume === 0 ? state.ytPlayer.mute() : state.ytPlayer.unMute();
        });
        fullscreenBtn.addEventListener('click', () => {
            document.fullscreenElement ? document.exitFullscreen() : playerContainer.requestFullscreen();
        });

        // Modals
        addFeedBtn.addEventListener('click', () => openModal(addFeedModal));
        closeModalBtn.addEventListener('click', () => closeModal(addFeedModal));
        addFeedModal.addEventListener('click', (e) => { if (e.target === addFeedModal) closeModal(addFeedModal); });
        customFeedForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = customFeedNameInput.value.trim();
            if (newName) { addPlatform(newName); customFeedNameInput.value = ''; }
        });
        document.querySelectorAll('.add-suggestion-btn').forEach(button => {
            button.addEventListener('click', (e) => addPlatform((e.target as HTMLElement).dataset.name!));
        });
        
        // Mobile "More" Menu
        openMoreMenuBtn.addEventListener('click', () => openModal(moreMenuModal));
        closeMoreMenuBtn.addEventListener('click', () => closeModal(moreMenuModal));
        leftOversMenuBtn.addEventListener('click', () => { closeModal(moreMenuModal); openWatchAgainView(); });
        mudHoleMenuBtn.addEventListener('click', () => { closeModal(moreMenuModal); openMudHoleView(); });
        feedMeMenuBtn.addEventListener('click', () => { closeModal(moreMenuModal); openModal(addFeedModal); });

        // Global Listeners
        document.body.addEventListener('click', handleCardClick);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !addFeedModal.classList.contains('hidden')) closeModal(addFeedModal);
            if (e.key === 'Escape' && !moreMenuModal.classList.contains('hidden')) closeModal(moreMenuModal);
        });
    };

    // =================================================================================
    // --- INITIALIZATION ---
    // =================================================================================

    /** Creates the platform toggle buttons for the mobile view. */
    const createMobileToggleBoard = () => {
        mobileDashboard.innerHTML = '';
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'mobile-platform-toggle';
        toggleContainer.className = 'sticky top-0 bg-gray-900/80 backdrop-blur-sm p-2 flex justify-center gap-4 border-b border-gray-700 overflow-x-auto no-scrollbar';

        [{id: 'all', name: 'All'}, ...state.platforms].forEach(platform => {
            const button = document.createElement('button');
            button.dataset.platform = platform.id;
            button.textContent = platform.name;
            button.className = `mobile-toggle-btn font-brand text-lg text-gray-300 px-2 py-1 whitespace-nowrap ${platform.id === state.mobileActivePlatform ? 'active' : ''}`;
            button.addEventListener('click', () => {
                state.mobileActivePlatform = platform.id;
                document.querySelectorAll('.mobile-toggle-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                renderMobileFeed();
            });
            toggleContainer.appendChild(button);
        });
        
        mobileDashboard.appendChild(toggleContainer);
        const feedContentContainer = document.createElement('div');
        feedContentContainer.id = 'mobile-feed-content';
        mobileDashboard.appendChild(feedContentContainer);
    };

    /** Sets up the application on initial load. */
    const initializeApp = async () => {
        // Load assets
        try {
            const logoB64 = await (await fetch('./src/assets/logo.b64')).text();
            const logoSrc = `data:image/png;base64,${logoB64}`;
            (document.getElementById('favicon') as HTMLLinkElement).href = logoSrc;
            (document.getElementById('loading-logo') as HTMLImageElement).src = logoSrc;
        } catch (e) { console.error('Failed to load branding assets.', e); }

        const savedHistory = localStorage.getItem('oinkHistory');
        if (savedHistory) state.watchHistory = JSON.parse(savedHistory);

        updateNavStates(state.currentAppView);
        createMobileToggleBoard();

        // Bind mobile bottom nav actions
        document.querySelectorAll('#mobile-bottom-nav .bottom-nav-btn, #mobile-bottom-nav-player .bottom-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = (btn as HTMLElement).dataset.view;
                if (!view) return;
                if (view !== 'more' && !moreMenuModal.classList.contains('hidden')) closeModal(moreMenuModal);
                
                switch(view) {
                    case 'feed': closePlayerView(); break;
                    case 'live': openLiveView(); break;
                    case 'hoggwild': startHoggWildStream(); break;
                    case 'buffet': openBuffetView(); break;
                    case 'more': openModal(moreMenuModal); break;
                }
            });
        });
        
        // Set up desktop columns
        desktopDashboard.innerHTML = '';
        state.platforms.forEach(platform => {
            state.allVideos[platform.id] = [];
            state.pageTrackers[platform.id] = 1;
            renderDashboardColumn(platform);
        });
        
        bindEventListeners();
        
        document.addEventListener('youtube-api-ready', () => {
            state.ytPlayer = new YT.Player('youtube-player', {
                height: '100%', width: '100%',
                playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'showinfo': 0, 'modestbranding': 1 },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        });
        
        await loadMoreVideos();
        renderMobileFeed();
        checkForNewLiveVideos();
        state.liveUpdateInterval = window.setInterval(checkForNewLiveVideos, 30000);

        // Fade out loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if(loadingScreen) {
            loadingScreen.classList.add('opacity-0');
            setTimeout(() => loadingScreen.remove(), 500);
        }
    };

    initializeApp();
});