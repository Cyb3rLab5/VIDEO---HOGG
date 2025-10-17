import { renderVideoCard, renderTwitchCard, renderXCard } from '../components/VideoCard';

declare var Masonry: any;

let masonryPlayer: any = null;

const initMasonry = (element: HTMLElement): any => {
    return new Masonry(element, {
        itemSelector: '.grid-item',
        percentPosition: true,
        gutter: 16
   });
};

/** Renders a full column for a platform in the desktop dashboard. */
export const renderDashboardColumn = (platform: {id: string, name: string}) => {
    const desktopDashboard = document.getElementById('platform-dashboard') as HTMLElement;
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
export const rerenderColumn = (platformId: string, state: any) => {
    const columnContent = document.getElementById(`column-content-${platformId}`);
    if (!columnContent || !state.allVideos[platformId]) return;

    // Sort videos by virality, except for X and Twitch which are chronological/live.
    if(platformId !== 'x' && platformId !== 'twitch') {
        state.allVideos[platformId].sort((a: any, b: any) => (b.viralityScore || 0) - (a.viralityScore || 0));
    }

    const fragment = document.createDocumentFragment();
    state.allVideos[platformId].forEach((video: any) => {
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
export const renderMobileFeed = (state: any) => {
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
export const updatePlayerFeedDisplay = (state: any) => {
    const playerFeed = document.getElementById('player-feed') as HTMLElement;
    playerFeed.innerHTML = '';
    if (masonryPlayer) {
        masonryPlayer.destroy();
        masonryPlayer = null;
    }
    playerFeed.classList.remove('masonry-grid');

    // Buffet and Mud Hole views have custom static content and are handled in their respective functions.
    if (state.currentAppView === 'mudhole') return;

    let videosToDisplay: any[] = [];
    let useMasonry = true;

    switch(state.currentAppView) {
        case 'live':
            videosToDisplay = state.liveVideos;
            useMasonry = false;
            break;
        case 'history':
            videosToDisplay = state.watchHistory;
            break;
        case 'hoggwild':
            videosToDisplay = state.hoggWildPlaylist;
            break;
        case 'buffet':
            videosToDisplay = state.buffetPlaylist;
            break;
        case 'player':
            if (state.currentPlayerPlatform) {
                const sortedPlatformVideos = [...state.allVideos[state.currentPlayerPlatform]];
                if (state.currentPlayerPlatform !== 'x' && state.currentPlayerPlatform !== 'twitch') {
                     sortedPlatformVideos.sort((a: any, b: any) => (b.viralityScore || 0) - (a.viralityScore || 0));
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
        else if (video.platform === 'live') card = renderVideoCard(video);
        else card = renderVideoCard(video);
        fragment.appendChild(card);
    });
    playerFeed.appendChild(fragment);

    if (useMasonry) {
        playerFeed.classList.add('masonry-grid');
        // Defer masonry initialization to allow DOM to update
        setTimeout(() => {
            if (document.getElementById('player-feed')) {
                masonryPlayer = initMasonry(playerFeed);
            }
        }, 100);
    }
};