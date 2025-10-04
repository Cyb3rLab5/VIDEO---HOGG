/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This declares the Masonry and YouTube Player libraries loaded from CDN scripts in index.html
declare var Masonry: any;
declare var YT: any;

// --- YOUTUBE PLAYER API CALLBACK ---
// This global function is called by the YouTube Iframe API script when it's ready.
(window as any).onYouTubeIframeAPIReady = () => {
    document.dispatchEvent(new Event('youtube-api-ready'));
};

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- ASSET LOADING ---
    try {
        const [logoResponse] = await Promise.all([
            fetch('./src/assets/logo.b64'),
        ]);
        if (!logoResponse.ok) throw new Error('Asset fetch failed');
        
        const logoB64 = await logoResponse.text();
        
        const logoSrc = `data:image/png;base64,${logoB64}`;

        (document.getElementById('favicon') as HTMLLinkElement).href = logoSrc;
        (document.getElementById('loading-logo') as HTMLImageElement).src = logoSrc;
    } catch (e) {
        console.error('Failed to load branding assets.', e);
    }
    
    // --- CONFIG & STATE ---
    let allVideos: {[key: string]: any[]} = {};
    let liveVideos: any[] = [];
    let isLoading = false;
    let currentAppView = 'feed';
    let currentPlayerPlatform: string | null = null;
    let hoggWildPlaylist: any[] = [];
    let currentHoggWildIndex = 0;
    let currentlyPlayingVideoId: string | null = null;
    let watchHistory: any[] = [];
    const videosPerPage = 20;
    let pageTrackers: {[key: string]: number} = {};
    let platforms = [
        { id: 'youtube', name: 'YouTube', query: 'Viral' },
        { id: 'tiktok', name: 'TikTok', query: 'Trending' },
        { id: 'twitch', name: 'Twitch', query: 'Live' },
        { id: 'x', name: 'X', query: 'Breaking' }
    ];
    let masonryPlayer: any;
    let liveUpdateInterval: number;
    let ytPlayer: any = null;
    let playerUpdateInterval: number;
    let isYtPlayerReady = false;
    let queuedYouTubeVideo: any | null = null;
    let previousActiveElement: HTMLElement | null = null;
    let mobileActivePlatform: string = 'all';

    // --- ELEMENTS ---
    const desktopDashboard = document.getElementById('platform-dashboard') as HTMLElement;
    const mobileDashboard = document.getElementById('mobile-dashboard') as HTMLElement;
    const playerView = document.getElementById('player-view') as HTMLElement;
    const playerFeed = document.getElementById('player-feed') as HTMLElement;
    const platformTroughTitle = document.getElementById('platform-trough-title') as HTMLElement;
    const loader = document.getElementById('loader') as HTMLElement;
    
    // Header elements
    const headerTitle = document.getElementById('header-title') as HTMLElement;
    const navButtons = document.querySelectorAll('#main-nav .nav-btn') as NodeListOf<HTMLElement>;
    const primeCutsBtn = document.getElementById('prime-cuts-btn') as HTMLElement;
    const hoggWildBtn = document.getElementById('hogg-wild-btn') as HTMLElement;
    const livePenBtn = document.getElementById('live-pen-btn') as HTMLElement;
    const buffettBtn = document.getElementById('buffett-btn') as HTMLElement;
    const mudHoleBtn = document.getElementById('mud-hole-btn') as HTMLElement;
    const leftOversHeaderBtn = document.getElementById('left-overs-header-btn') as HTMLElement;
    
    const playerTitle = document.getElementById('player-title') as HTMLElement;
    const playerAuthor = document.getElementById('player-author') as HTMLElement;
    const backToFeedBtn = document.getElementById('back-to-feed-btn') as HTMLElement;
    const shareBtn = document.getElementById('share-btn') as HTMLElement;
    const watchAgainBtn = document.getElementById('watch-again-btn') as HTMLElement;
    
    const addFeedModal = document.getElementById('add-feed-modal') as HTMLElement;
    const addFeedBtn = document.getElementById('add-feed-btn') as HTMLElement;
    const closeModalBtn = document.getElementById('close-modal-btn') as HTMLElement;
    const customFeedForm = document.getElementById('custom-feed-form') as HTMLFormElement;
    const customFeedNameInput = document.getElementById('custom-feed-name') as HTMLInputElement;
    
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
    const notification = document.getElementById('notification') as HTMLElement;
    const playerContainer = document.getElementById('player-container') as HTMLElement;
    const embedPlayer = document.getElementById('embed-player') as HTMLElement;
    let notificationTimeout: number;

    // --- ASSETS ---
     const platformLogos: {[key: string]: string} = {
        youtube: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"></path></svg>`,
        tiktok: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525,2.007c-0.104-0.033-0.213-0.05-0.323-0.05C8.831,1.957,6,4.789,6,8.161v7.402c0,0.113,0.016,0.224,0.046,0.33c-0.021,0.081-0.034,0.165-0.034,0.253c0,0.822,0.667,1.488,1.488,1.488 c0.821,0,1.488-0.667,1.488-1.488c0-0.038-0.002-0.076-0.005-0.113C8.98,16.035,9,16.01,9,15.986V8.161c0-2.228,1.808-4.037,4.037-4.037 c0.162,0,0.32,0.01,0.475,0.029v3.251c0,2.155-1.742,3.896-3.896,3.896c-0.093,0-0.185-0.003-0.276-0.009v3.085 c0,0.003,0,0.005,0.001,0.008c0.09,0.006,0.182,0.009,0.275,0.009c2.909,0,5.271-2.362,5.271-5.271V5.424 C14.993,3.593,13.911,2.181,12.525,2.007z"></path></svg>`,
        twitch: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M4.265 3 3 6.204v11.592h4.265V21l3.199-3.199h3.199L21 10.998V3H4.265zM17.801 10.463 15.6 12.667h-3.199l-2.666 2.666v-2.666H6.4v-8.53h11.401v6.33z"/><path d="m14.532 6.331-1.066 2.133h-2.133v-2.133zm-4.265 0-1.066 2.133H7.068v-2.133z"/></svg>`,
        x: `<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`,
        news: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`,
        default: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`
    };
    
    // --- API & DATA FUNCTIONS ---
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num.toString();
    };

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
        _streamerNames: ['StreamHogg', 'ProGamerX', 'PixelQueen', 'RageQuitRoy', 'SnackStreamz'],
        _gameNames: ['Hogcraft', 'Call of Duty: Modern Boarfare', 'League of Legends', 'Fortnite', 'Valorant', 'Apex Legends'],

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

    // --- RENDER FUNCTIONS ---
    const renderVideoCard = (video: any) => {
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

    const renderTwitchCard = (stream: any) => {
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
    
    const renderXCard = (post: any) => {
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

    const renderLiveVideoCard = (video: any) => {
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

    const renderVideoCardListView = (video: any) => {
        const card = document.createElement('div');
        card.className = 'list-view-card flex gap-4 p-2 rounded-lg cursor-pointer hover:bg-gray-700/50';
        card.dataset.videoId = video.id;
        card.dataset.platform = video.platform;

        card.innerHTML = `
            <div class="w-40 flex-shrink-0">
                <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full h-full object-cover rounded-md aspect-video">
            </div>
            <div class="flex flex-col justify-center overflow-hidden">
                <h3 class="font-semibold text-white text-sm truncate">${video.title}</h3>
                <p class="text-xs text-gray-400 truncate">by ${video.author}</p>
                <p class="text-xs text-gray-400 mt-1">${formatNumber(video.viewCount)} views</p>
            </div>
        `;
        return card;
    };

    const renderXCardListView = (post: any) => {
        const card = document.createElement('div');
        card.className = 'list-view-card flex gap-4 p-2 rounded-lg cursor-pointer hover:bg-gray-700/50';
        card.dataset.videoId = post.id;
        card.dataset.platform = post.platform;
        
        const xLogoSmall = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`;
        const mediaThumb = post.thumbnailUrl ? `<div class="w-24 h-16 flex-shrink-0"><img src="${post.thumbnailUrl}" alt="Post media" class="w-full h-full object-cover rounded-md"></div>` : `<div class="w-24 h-16 flex-shrink-0 bg-gray-700 rounded-md flex items-center justify-center">${xLogoSmall}</div>`;

        card.innerHTML = `
            ${mediaThumb}
            <div class="flex flex-col justify-center overflow-hidden">
                <div class="flex items-center gap-2">
                    <p class="font-semibold text-white text-sm truncate">${post.author}</p>
                    <p class="text-xs text-gray-400 truncate">${post.authorHandle}</p>
                </div>
                <p class="text-xs text-gray-300 truncate mt-1">${post.text}</p>
            </div>
        `;
        return card;
    };

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

    const updatePlayerHighlighting = () => {
        document.querySelectorAll('.is-playing').forEach(el => el.classList.remove('is-playing'));
        if (currentlyPlayingVideoId) {
            document.querySelectorAll(`[data-video-id="${currentlyPlayingVideoId}"]`).forEach(el => el.classList.add('is-playing'));
        }
    };

    const rerenderColumn = (platformId: string) => {
        const columnContent = document.getElementById(`column-content-${platformId}`);
        if (!columnContent || !allVideos[platformId]) return;

        if(platformId !== 'x' && platformId !== 'twitch') {
            allVideos[platformId].sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
        }
        
        const fragment = document.createDocumentFragment();
        allVideos[platformId].forEach(video => {
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

    const renderMobileFeed = () => {
        const mobileFeedContent = document.getElementById('mobile-feed-content');
        if (!mobileFeedContent) return;

        let videosToDisplay: any[] = [];
        if (mobileActivePlatform === 'all') {
            videosToDisplay = Object.values(allVideos).flat();
            videosToDisplay.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
        } else {
            videosToDisplay = [...(allVideos[mobileActivePlatform] || [])];
             if (mobileActivePlatform !== 'x' && mobileActivePlatform !== 'twitch') {
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

    const updatePlayerFeedDisplay = () => {
        if (currentAppView === 'buffett' || currentAppView === 'mudhole') {
            return; // These views manage their own content
        }
        playerFeed.innerHTML = '';
        if (masonryPlayer) {
            masonryPlayer.destroy();
            masonryPlayer = null;
        }
        // Remove masonry class by default, add it back if needed
        playerFeed.classList.remove('masonry-grid'); 

        let videosToDisplay: any[] = [];

        if (currentAppView === 'live') {
            // Live view uses a list, not masonry
            liveVideos.forEach(video => playerFeed.appendChild(renderLiveVideoCard(video)));
            updatePlayerHighlighting();
            return;
        }
        
        // All other player views use masonry
        if (currentAppView === 'history') {
            videosToDisplay = watchHistory;
        } else if (hoggWildPlaylist.length > 0) {
            videosToDisplay = hoggWildPlaylist;
        } else if (currentPlayerPlatform) {
            const sortedPlatformVideos = [...allVideos[currentPlayerPlatform]];
            if (currentPlayerPlatform !== 'x' && currentPlayerPlatform !== 'twitch') {
                 sortedPlatformVideos.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
            }
            videosToDisplay = sortedPlatformVideos;
        }

        playerFeed.classList.add('masonry-grid');
        const fragment = document.createDocumentFragment();
        videosToDisplay.forEach(video => {
            let card;
            if (video.platform === 'x') {
                card = renderXCard(video);
            } else if (video.platform === 'twitch') {
                card = renderTwitchCard(video);
            } else {
                card = renderVideoCard(video);
            }
            fragment.appendChild(card);
        });
        playerFeed.appendChild(fragment);
       
        // We need to give the browser a moment to render the items before initializing Masonry
        setTimeout(() => {
            if (document.getElementById('player-feed')) { // Ensure element still exists
                masonryPlayer = initMasonry(playerFeed);
                updatePlayerHighlighting();
            }
        }, 100);
    };

    // --- CORE LOGIC ---
    const updateHeader = (view: string, sectionName: string) => {
        headerTitle.innerHTML = `VIDEO HOGG - <span class="font-cursive">${sectionName}</span>`;
        navButtons.forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        });
    };

    const loadMoreVideos = async (specificPlatform: {id: string, name: string, query: string} | null = null) => {
        if (isLoading) return;
        isLoading = true;
        loader.classList.remove('hidden');

        const platformsToLoad = specificPlatform ? [specificPlatform] : platforms;

        try {
            for (const platform of platformsToLoad) {
                if (platform.id === 'tiktok') {
                    // TikTok doesn't have pagination in this implementation
                    allVideos['tiktok'] = await TikTokVideoService.fetchTrending();
                } else if (platform.id === 'twitch') {
                    // Twitch also fetches a single list of top streams
                    allVideos['twitch'] = await TwitchVideoService.fetchTopStreams();
                } else {
                     // Handles youtube, x, and other custom feeds with pagination
                     const page = pageTrackers[platform.id] || 1;
                     const newVideos = await MockVideoAPIService.fetchVideos(platform, page, videosPerPage);
                     pageTrackers[platform.id] = page + 1;
                     allVideos[platform.id] = [...(allVideos[platform.id] || []), ...newVideos];
                }
                
                if (currentAppView === 'feed') {
                    rerenderColumn(platform.id);
                    renderMobileFeed();
                } else if (currentAppView === 'player' && currentPlayerPlatform === platform.id) {
                    updatePlayerFeedDisplay();
                }
            }
        } finally {
            isLoading = false;
            loader.classList.add('hidden');
        }
    };

    const checkForNewLiveVideos = async () => {
        const newLiveList = await MockVideoAPIService.fetchLiveVideos();
        if (newLiveList.length > 0 && (newLiveList.length !== liveVideos.length || newLiveList[0].id !== liveVideos[0]?.id)) {
            liveVideos = newLiveList;
            if (currentAppView === 'live') {
                updatePlayerFeedDisplay();
            }
        }
    };

    const initMasonry = (element: HTMLElement) => {
         return new Masonry(element, {
             itemSelector: '.grid-item',
             percentPosition: true,
             gutter: 16
        });
    };
    
    const openPlayerView = (platformId: string) => {
        currentAppView = 'player';
        currentPlayerPlatform = platformId;
        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.remove('hidden');
        playerView.classList.remove('is-live-mode');
        document.body.style.overflow = 'hidden';

        const platform = platforms.find(p => p.id === platformId);
        if (platform) platformTroughTitle.innerHTML = `${platform.name} - <span class="font-cursive">Trough</span>`;
        
        updatePlayerFeedDisplay();
    };
    
    const openLiveView = () => {
        if (liveVideos.length === 0) {
            showNotification("Connecting to the forage... try again in a moment.");
            return;
        }
        currentAppView = 'live';
        currentPlayerPlatform = null;
        hoggWildPlaylist = [];
        updateHeader('live', 'Forage');

        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.add('is-live-mode');
        playerView.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        platformTroughTitle.innerHTML = `HOGG PEN - <span class="font-cursive">Forage</span>`;

        updatePlayerFeedDisplay();
        playVideo(liveVideos[0]);
    };

    const openBuffettView = () => {
        currentAppView = 'buffett';
        currentPlayerPlatform = null;
        hoggWildPlaylist = [];
        updateHeader('buffett', 'The Buffett');
    
        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.remove('is-live-mode');
        playerView.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        platformTroughTitle.innerHTML = `The Buffett - <span class="font-cursive">Personalized Feed</span>`;
        playerTitle.textContent = "Your Buffett is being prepared...";
        playerAuthor.textContent = "Powered by Gemini";
        playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
        embedPlayer.innerHTML = '';
        if(ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
        
        playerFeed.innerHTML = `
            <div class="text-center text-gray-400 p-8">
                <h3 class="font-brand text-2xl text-pink-400 mb-2">Coming Soon!</h3>
                <p>The Buffett will analyze your watch history across all platforms to create a hyper-personalized feed, just for you. Keep watching to fatten up your hogg!</p>
            </div>
        `;
        currentlyPlayingVideoId = null;
        updatePlayerHighlighting();
    };

    const openMudHoleView = () => {
        currentAppView = 'mudhole';
        currentPlayerPlatform = null;
        hoggWildPlaylist = [];
        updateHeader('mudhole', 'The Mud Hole');
    
        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.remove('is-live-mode');
        playerView.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    
        platformTroughTitle.innerHTML = `The Mud Hole - <span class="font-cursive">Top Waller Scores</span>`;
        playerTitle.textContent = "See who's the best Truffle Hunter!";
        playerAuthor.textContent = "Spot trends early to climb the ranks.";
        playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
        embedPlayer.innerHTML = '';
        if(ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
        
        playerFeed.innerHTML = `
            <div class="text-center text-gray-400 p-8">
                <h3 class="font-brand text-2xl text-pink-400 mb-2">Coming Soon!</h3>
                <p>Watch videos before they go viral to earn WALLER points and become the top Hogg in the Mud Hole. Leaderboards are on the way!</p>
            </div>
        `;
        currentlyPlayingVideoId = null;
        updatePlayerHighlighting();
    };

    const closePlayerView = () => {
        currentAppView = 'feed';
        currentPlayerPlatform = null;
        hoggWildPlaylist = [];
        queuedYouTubeVideo = null;
        updateHeader('feed', 'Prime Cuts');
        playerView.classList.remove('is-live-mode');
        playerView.classList.add('hidden');
        desktopDashboard.classList.remove('hidden');
        mobileDashboard.classList.remove('hidden');
        document.body.style.overflow = '';
        if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
            ytPlayer.stopVideo();
        }
        embedPlayer.innerHTML = ''; // Clear embed player
        playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row'; // Reset classes
        currentlyPlayingVideoId = null;
        if (masonryPlayer) {
            masonryPlayer.destroy();
            masonryPlayer = null;
        }
    };

    const playVideo = (videoData: any) => {
        if (!videoData) return;
        currentlyPlayingVideoId = videoData.id;

        if (!videoData.isLive) {
            watchHistory = watchHistory.filter(v => v.id !== videoData.id);
            watchHistory.unshift(videoData);
            if (watchHistory.length > 100) watchHistory.pop();
            localStorage.setItem('videoHoggHistory', JSON.stringify(watchHistory));
        }
        
        const titleText = videoData.platform === 'x' ? videoData.text : videoData.title;

        if (videoData.isLive) playerTitle.textContent = `LIVE: ${titleText}`;
        else if (hoggWildPlaylist.length > 0 && hoggWildPlaylist.some(v => v.id === videoData.id)) playerTitle.textContent = `SLOP: ${titleText}`;
        else if (currentPlayerPlatform) playerTitle.textContent = `Prime Cuts: ${titleText}`;
        else playerTitle.textContent = titleText;
        
        playerAuthor.textContent = `by ${videoData.author}`;

        if (videoData.platform === 'youtube') {
            playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row youtube-active';
            embedPlayer.innerHTML = '';
            if (isYtPlayerReady && ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
                ytPlayer.loadVideoById(videoData.id);
            } else {
                 queuedYouTubeVideo = videoData;
            }
        } else if (videoData.platform === 'tiktok') {
            playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row embed-active';
            if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
            embedPlayer.innerHTML = videoData.embedHtml;
        } else if (videoData.platform === 'twitch') {
            playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row embed-active';
            if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
            // The 'parent' parameter is required by Twitch and must match the domain where the script is hosted.
            const twitchEmbedUrl = `https://player.twitch.tv/?channel=${videoData.user_name}&parent=${window.location.hostname}&autoplay=true&muted=false`;
            embedPlayer.innerHTML = `<iframe src="${twitchEmbedUrl}" height="100%" width="100%" allowfullscreen></iframe>`;
        } else {
            playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
            if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
            embedPlayer.innerHTML = '';
            showNotification("This content type is not yet supported in the player.");
        }
        
        progressBar.value = 0;
        updatePlayerHighlighting();
    };

    const startHoggWildStream = () => {
        // Hogg wild only includes short VOD content, not live streams.
        const playableVideos = [...(allVideos['youtube'] || []), ...(allVideos['tiktok'] || [])];
        if(playableVideos.length === 0) {
            showNotification("No playable videos loaded for Hogg Wild. Feeds might still be populating.");
            return;
        }
        hoggWildPlaylist = playableVideos
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);

        currentAppView = 'hoggwild';
        currentPlayerPlatform = null;
        updateHeader('hoggwild', 'Hogg Wild');
        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.remove('hidden');
        playerView.classList.remove('is-live-mode');
        document.body.style.overflow = 'hidden';
        platformTroughTitle.innerHTML = 'Hogg Wild - <span class="font-cursive">Slop Trough</span>';

        updatePlayerFeedDisplay();
        currentHoggWildIndex = 0;
        playVideo(hoggWildPlaylist[currentHoggWildIndex]);
    };

    const openWatchAgainView = () => {
        if (watchHistory.length === 0) {
            showNotification("You haven't watched any videos yet!");
            return;
        }

        currentAppView = 'history';
        currentPlayerPlatform = null;
        hoggWildPlaylist = [];
        updateHeader('history', 'Left-Overs');
        
        desktopDashboard.classList.add('hidden');
        mobileDashboard.classList.add('hidden');
        playerView.classList.remove('hidden');
        playerView.classList.remove('is-live-mode');
        document.body.style.overflow = 'hidden';
        platformTroughTitle.innerHTML = 'Your <span class="font-cursive">Left-Overs</span>';
        
        currentlyPlayingVideoId = null;
        playerContainer.className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
        embedPlayer.innerHTML = '';
        if(ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
        updatePlayPauseIcon();
        
        updatePlayerFeedDisplay();
    };
    
    const handleShare = async () => {
        if (!currentlyPlayingVideoId) {
            showNotification('No video is currently playing to share.');
            return;
        }
        const videoData = Object.values(allVideos).flat().find(v => v.id === currentlyPlayingVideoId) 
            || watchHistory.find(v => v.id === currentlyPlayingVideoId)
            || liveVideos.find(v => v.id === currentlyPlayingVideoId);
        
        if (!videoData) return;

        // Calculate points based on virality. Lower score = more points.
        const virality = videoData.viralityScore || 900; // Default to high virality if undefined
        const points = Math.max(10, Math.round(100 - (virality / 10))); // Min 10 points
        
        let urlToShare = window.location.href;
        if (videoData.platform === 'youtube') urlToShare = `https://www.youtube.com/watch?v=${videoData.id}`;
        if (videoData.platform === 'tiktok') urlToShare = `https://www.tiktok.com/@${videoData.author}/video/${videoData.id}`;
        if (videoData.platform === 'twitch') urlToShare = `https://www.twitch.tv/${videoData.user_name}`;


        const shareData = {
            title: `Check out this video from PRIME CUTS: ${videoData.title}`,
            text: `${videoData.title} by ${videoData.author}`,
            url: urlToShare
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                showNotification(`SLOP SHARED! +${points} WALLER Points!`);
            } else {
                throw new Error('Share API not supported');
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                // User cancelled the share dialog, do nothing.
                return;
            }
            try {
                await navigator.clipboard.writeText(urlToShare);
                showNotification(`SLOP SHARED! +${points} WALLER Points! Link copied.`);
            } catch (clipErr) {
                showNotification('Could not copy link to clipboard.');
            }
        }
    };

    // --- VIDEO PLAYER CONTROLS ---
    const playNextInPlatformTrough = () => {
        if (!currentPlayerPlatform) return;
    
        const platformVideos = allVideos[currentPlayerPlatform] || [];
        const sortedVideos = [...platformVideos];
        if (currentPlayerPlatform !== 'twitch' && currentPlayerPlatform !== 'x') {
            sortedVideos.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
        }
    
        const currentIndex = sortedVideos.findIndex(v => v.id === currentlyPlayingVideoId);
    
        if (currentIndex !== -1 && currentIndex < sortedVideos.length - 1) {
            playVideo(sortedVideos[currentIndex + 1]);
        } else {
            closePlayerView();
        }
    };

    const playNextInHoggWild = () => {
        if (hoggWildPlaylist.length > 0) {
            currentHoggWildIndex++;
            if (currentHoggWildIndex < hoggWildPlaylist.length) {
                playVideo(hoggWildPlaylist[currentHoggWildIndex]);
            } else {
                closePlayerView();
            }
        }
    };
    
    const onVideoEnded = () => {
        if (currentAppView === 'history' || currentAppView === 'live') {
            updatePlayPauseIcon();
            return;
        }
        if (hoggWildPlaylist.length > 0) {
            playNextInHoggWild();
        } else if (currentPlayerPlatform) {
            playNextInPlatformTrough();
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const updatePlayPauseIcon = () => {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        const playerState = ytPlayer.getPlayerState();
        if (playerState !== YT.PlayerState.PLAYING) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        } else {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
    };

    const updateVideoProgress = () => {
        if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
        const currentTime = ytPlayer.getCurrentTime();
        const duration = ytPlayer.getDuration();
        const progress = (currentTime / duration) * 100;
        progressBar.value = progress || 0;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    };

    const setVideoTime = (e: MouseEvent) => {
        if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
        const duration = ytPlayer.getDuration();
        const width = progressBar.clientWidth;
        const clickX = e.offsetX;
        ytPlayer.seekTo((clickX / width) * duration);
    };

    const toggleMute = () => {
        if (!ytPlayer || typeof ytPlayer.isMuted !== 'function') return;
        ytPlayer.isMuted() ? ytPlayer.unMute() : ytPlayer.mute();
    };

    const updateVolumeUI = () => {
        if (!ytPlayer || typeof ytPlayer.isMuted !== 'function') return;
        if (ytPlayer.isMuted() || ytPlayer.getVolume() === 0) {
            volumeHighIcon.classList.add('hidden');
            volumeMutedIcon.classList.remove('hidden');
            volumeSlider.value = '0';
        } else {
            volumeHighIcon.classList.remove('hidden');
            volumeMutedIcon.classList.add('hidden');
            volumeSlider.value = (ytPlayer.getVolume() / 100).toString();
        }
    };

    const setVolume = (e: Event) => {
        if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
        const target = e.target as HTMLInputElement;
        const newVolume = parseFloat(target.value);
        ytPlayer.setVolume(newVolume * 100);
        if (newVolume === 0) ytPlayer.mute();
        else ytPlayer.unMute();
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            playerContainer.requestFullscreen().catch(err => {
                showNotification(`Error enabling full-screen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const addPlatform = (name: string) => {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!id || platforms.some(p => p.id === id)) { return; }
        const newPlatform = { id, name, query: name };
        platforms.push(newPlatform);
        allVideos[id] = [];
        pageTrackers[id] = 1;
        renderDashboardColumn(newPlatform);
        createMobileToggleBoard(); // Recreate to include the new platform
        loadMoreVideos(newPlatform);
        closeModal();
    };
    
    const openModal = () => {
        previousActiveElement = document.activeElement as HTMLElement;
        addFeedModal.classList.remove('hidden');
        customFeedNameInput.focus();
    };
    const closeModal = () => {
        addFeedModal.classList.add('hidden');
        previousActiveElement?.focus();
    };

    const showNotification = (message: string) => {
        clearTimeout(notificationTimeout);
        notification.textContent = message;
        notification.classList.remove('opacity-0');
        notificationTimeout = window.setTimeout(() => {
            notification.classList.add('opacity-0');
        }, 4000);
    };

    // --- YOUTUBE PLAYER EVENT HANDLERS ---
    const onPlayerReady = (event: any) => {
        isYtPlayerReady = true;
        updateVolumeUI();
        if (queuedYouTubeVideo) {
            playVideo(queuedYouTubeVideo);
            queuedYouTubeVideo = null;
        }
    };

    const onPlayerStateChange = (event: any) => {
        updatePlayPauseIcon();
        if (event.data === YT.PlayerState.PLAYING) {
            updateVolumeUI();
            playerUpdateInterval = window.setInterval(updateVideoProgress, 250);
        } else {
            clearInterval(playerUpdateInterval);
        }
        if (event.data === YT.PlayerState.ENDED) {
            onVideoEnded();
        }
    };

    const createMobileToggleBoard = () => {
        mobileDashboard.innerHTML = ''; // Clear previous board
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'mobile-platform-toggle';
        toggleContainer.className = 'sticky top-0 bg-gray-900/80 backdrop-blur-sm p-2 flex justify-center gap-4 border-b border-gray-700 overflow-x-auto no-scrollbar';

        const allPlatforms = [{id: 'all', name: 'All'}, ...platforms];
        allPlatforms.forEach(platform => {
            const button = document.createElement('button');
            button.dataset.platform = platform.id;
            button.textContent = platform.name;
            button.className = `mobile-toggle-btn font-brand text-lg text-gray-300 px-2 py-1 whitespace-nowrap ${platform.id === mobileActivePlatform ? 'active' : ''}`;
            button.addEventListener('click', () => {
                mobileActivePlatform = platform.id;
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

    // --- EVENT LISTENERS ---
    document.body.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('[data-video-id]');
        if (card) {
            const videoId = (card as HTMLElement).dataset.videoId!;
            const platformId = (card as HTMLElement).dataset.platform!;
            let videoData;

            if (platformId === 'live') {
                videoData = liveVideos.find(v => v.id === videoId);
            } else {
                videoData = allVideos[platformId]?.find(v => v.id === videoId) || watchHistory.find(v => v.id === videoId);
            }
            
            if (!videoData) return;

            if (currentAppView !== 'player' && currentAppView !== 'history' && currentAppView !== 'live') {
                openPlayerView(platformId);
            }
            playVideo(videoData);
        }
    });
    
    playerView.addEventListener('scroll', () => {
        if (currentAppView === 'player' && currentPlayerPlatform && playerView.scrollTop + playerView.clientHeight >= playerView.scrollHeight - 500) {
            const platform = platforms.find(p => p.id === currentPlayerPlatform);
            if(platform && platform.id !== 'youtube' && platform.id !== 'tiktok' && platform.id !== 'twitch') loadMoreVideos(platform);
        }
    });
    
    primeCutsBtn.addEventListener('click', closePlayerView);
    hoggWildBtn.addEventListener('click', startHoggWildStream);
    livePenBtn.addEventListener('click', openLiveView);
    buffettBtn.addEventListener('click', openBuffettView);
    mudHoleBtn.addEventListener('click', openMudHoleView);
    leftOversHeaderBtn.addEventListener('click', openWatchAgainView);
    addFeedBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    addFeedModal.addEventListener('click', (e) => { if (e.target === addFeedModal) closeModal(); });
    customFeedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = customFeedNameInput.value.trim();
        if (newName) { addPlatform(newName); customFeedNameInput.value = ''; }
    });
    document.querySelectorAll('.add-suggestion-btn').forEach(button => {
        button.addEventListener('click', (e) => addPlatform((e.target as HTMLElement).dataset.name!));
    });

    backToFeedBtn.addEventListener('click', closePlayerView);
    shareBtn.addEventListener('click', handleShare);
    watchAgainBtn.addEventListener('click', openWatchAgainView);
    
    playPauseBtn.addEventListener('click', () => {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        ytPlayer.getPlayerState() === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
    });

    progressBar.addEventListener('click', setVideoTime);
    volumeBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', setVolume);
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !addFeedModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // --- INITIALIZATION ---
    const initializeApp = async () => {
        const savedHistory = localStorage.getItem('videoHoggHistory');
        if (savedHistory) watchHistory = JSON.parse(savedHistory);

        currentAppView = 'feed';
        updateHeader('feed', 'Prime Cuts');
        
        // --- Mobile Setup ---
        createMobileToggleBoard();

        // --- Desktop Setup ---
        desktopDashboard.innerHTML = '';
        platforms.forEach(platform => {
            allVideos[platform.id] = [];
            pageTrackers[platform.id] = 1;
            renderDashboardColumn(platform);

            const columnContainer = document.getElementById(`platform-column-${platform.id}`) as HTMLElement;
            columnContainer.addEventListener('scroll', () => {
                if (columnContainer.scrollTop + columnContainer.clientHeight >= columnContainer.scrollHeight - 500) {
                    if (platform.id !== 'youtube' && platform.id !== 'tiktok' && platform.id !== 'twitch') loadMoreVideos(platform);
                }
            });
        });
        
        // --- Shared Setup ---
         window.addEventListener('scroll', () => {
            // Check if we are in mobile view by looking at the dashboard's visibility
            const isMobileView = mobileDashboard.offsetParent !== null;
            if (isMobileView && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                 if (mobileActivePlatform === 'all') {
                    // Load more for all paginated platforms
                    platforms.forEach(p => {
                        if (p.id !== 'tiktok' && p.id !== 'twitch') loadMoreVideos(p);
                    });
                } else {
                    const platform = platforms.find(p => p.id === mobileActivePlatform);
                     if (platform && platform.id !== 'tiktok' && platform.id !== 'twitch') {
                        loadMoreVideos(platform);
                    }
                }
            }
        });
        
        document.addEventListener('youtube-api-ready', () => {
            ytPlayer = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'showinfo': 0, 'modestbranding': 1 },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        });
        
        await loadMoreVideos();
        renderMobileFeed(); // Initial render for mobile
        checkForNewLiveVideos();
        liveUpdateInterval = window.setInterval(checkForNewLiveVideos, 30000);

        const loadingScreen = document.getElementById('loading-screen') as HTMLElement;
        if(loadingScreen) {
            loadingScreen.classList.add('opacity-0');
            setTimeout(() => loadingScreen.remove(), 500);
        }
    };

    initializeApp();
});