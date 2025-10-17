import { playVideo, updatePlayerInfo } from '../components/player';
import { updatePlayerFeedDisplay } from './feedView';
import { GeminiService, MockVideoAPIService } from '../services/videoService';
import { showNotification } from '../utils/helpers';

/** Handles the common UI transition to the player view. */
const transitionToPlayerView = (view: string, title: string, state: any) => {
    const desktopDashboard = document.getElementById('platform-dashboard') as HTMLElement;
    const mobileDashboard = document.getElementById('mobile-dashboard') as HTMLElement;
    const playerView = document.getElementById('player-view') as HTMLElement;
    const platformTroughTitle = document.getElementById('platform-trough-title') as HTMLElement;
    const embedPlayer = document.getElementById('embed-player') as HTMLElement;
    const playerContainer = document.getElementById('player-container') as HTMLElement;

    state.currentAppView = view;
    state.hoggWildPlaylist = [];
    state.buffetPlaylist = [];

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
};

/** Opens the player view for a specific platform's content trough. */
export const openPlayerView = (platformId: string, state: any) => {
    state.currentPlayerPlatform = platformId;
    const platform = state.platforms.find((p: any) => p.id === platformId);
    const title = platform ? `${platform.name} - <span class="font-cursive">Trough</span>` : 'Trough';

    transitionToPlayerView('player', title, state);
    (document.getElementById('player-view') as HTMLElement).classList.remove('is-live-mode');
    (document.getElementById('buffet-add-feed-btn') as HTMLElement).classList.add('hidden');

    (document.getElementById('mobile-player-title') as HTMLElement).textContent = 'Select a video to play';
    (document.getElementById('mobile-player-author') as HTMLElement).textContent = 'from the trough';
    updatePlayerFeedDisplay(state);
};

/** Opens the live video Buffet view. */
export const openLiveView = async (state: any) => {
    state.currentPlayerPlatform = null;
    transitionToPlayerView('live', `The Buffet - <span class="font-cursive">Finding Truffles...</span>`, state);
    (document.getElementById('player-view') as HTMLElement).classList.add('is-live-mode');
    (document.getElementById('buffet-add-feed-btn') as HTMLElement).classList.remove('hidden');
    (document.getElementById('player-feed') as HTMLElement).innerHTML = `<div class="text-center text-gray-400 p-8"><svg class="animate-spin h-8 w-8 text-pink-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;

    await MockVideoAPIService.fetchLiveVideos();

    if (state.liveVideos.length > 0) {
        (document.getElementById('platform-trough-title') as HTMLElement).innerHTML = `The Buffet - <span class="font-cursive">Fresh Truffles</span>`;
        updatePlayerFeedDisplay(state);
        playVideo(state.liveVideos[0], state);
    } else {
        (document.getElementById('platform-trough-title') as HTMLElement).innerHTML = `The Buffet - <span class="font-cursive">Empty</span>`;
        (document.getElementById('player-feed') as HTMLElement).innerHTML = `<div class="text-center text-gray-400 p-8"><h3 class="font-brand text-2xl text-pink-400 mb-2">The Buffet is Quiet</h3><p>No fresh Truffles found right now. Check back soon!</p></div>`;
        (document.getElementById('player-title') as HTMLElement).textContent = 'No Live Truffles';
        (document.getElementById('player-author') as HTMLElement).textContent = 'The Buffet is currently empty';
        (document.getElementById('mobile-player-title') as HTMLElement).textContent = 'No Live Truffles';
        (document.getElementById('mobile-player-author') as HTMLElement).textContent = 'The Buffet is currently empty';
    }
};

/** Opens the AI-powered Forage view. */
export const openBuffetView = async (state: any) => {
    state.currentPlayerPlatform = null;
    transitionToPlayerView('buffet', `The Forage - <span class="font-cursive">AI-Powered Feed</span>`, state);
    (document.getElementById('player-view') as HTMLElement).classList.remove('is-live-mode');
    (document.getElementById('buffet-add-feed-btn') as HTMLElement).classList.add('hidden');

    if (state.watchHistory.length === 0) {
        (document.getElementById('player-feed') as HTMLElement).innerHTML = `
            <div class="text-center text-gray-400 p-8 flex flex-col items-center gap-4">
                <h3 class="font-brand text-2xl text-pink-400 mb-2">Nothing to Forage!</h3>
                <p>Watch some videos to give the AI Forager a scent to follow.</p>
            </div>
        `;
        updatePlayerInfo({ title: "Your Forage awaits", author: "Start watching to get AI recommendations" });
        return;
    }

    updatePlayerInfo({ title: "Foraging for content...", author: "AI Forager at work..." });
    (document.getElementById('player-feed') as HTMLElement).innerHTML = `
        <div class="text-center text-gray-400 p-8 flex flex-col items-center justify-center gap-4">
            <svg class="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p>The AI Forager is sniffing out the best slop for you...</p>
        </div>`;

    try {
        const recommendations = await GeminiService.generateRecommendations(state.watchHistory);
        if (recommendations.length === 0) throw new Error("AI did not return any recommendations.");

        state.buffetPlaylist = recommendations.map((rec: any, index: number) => {
            const isPortrait = rec.platform === 'tiktok';
            const videoId = MockVideoAPIService._youtubeIds[index % MockVideoAPIService._youtubeIds.length];
            const thumbUrl = isPortrait ? `https://picsum.photos/seed/buffet${index}/360/640` : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            const mockAuthor = MockVideoAPIService._authors[index % MockVideoAPIService._authors.length];

            return {
                id: videoId,
                platform: rec.platform,
                title: rec.title,
                author: rec.author || mockAuthor,
                reason: rec.reason,
                thumbnailUrl: thumbUrl,
                orientation: isPortrait ? 'portrait' : 'landscape',
                viewCount: Math.floor(Math.random() * 5000000) + 50000,
                viralityScore: Math.floor(Math.random() * 1000),
                ...(isPortrait && { mockVideoId: videoId })
            };
        });

        updatePlayerFeedDisplay(state);
        state.currentBuffetIndex = 0;
        playVideo(state.buffetPlaylist[0], state);

    } catch (error) {
        console.error("Gemini API call failed:", error);
        (document.getElementById('player-feed') as HTMLElement).innerHTML = `
            <div class="text-center text-gray-400 p-8">
                <h3 class="font-brand text-2xl text-pink-400 mb-2">AI Forager Got Lost!</h3>
                <p>We couldn't Forage for you this time. Please try again later.</p>
            </div>
        `;
    }
};

/** Opens the Mud Hole view (placeholder). */
export const openMudHoleView = (state: any) => {
    state.currentPlayerPlatform = null;
    transitionToPlayerView('mudhole', `The Mud Hole - <span class="font-cursive">Top Waller Scores</span>`, state);
    (document.getElementById('player-view') as HTMLElement).classList.remove('is-live-mode');
    (document.getElementById('buffet-add-feed-btn') as HTMLElement).classList.add('hidden');

    updatePlayerInfo({ title: "See who's the best Truffle Hunter!", author: "Spot trends early to climb the ranks."});

    (document.getElementById('player-feed') as HTMLElement).innerHTML = `
        <div class="text-center text-gray-400 p-8">
            <h3 class="font-brand text-2xl text-pink-400 mb-2">Coming Soon!</h3>
            <p>Watch videos before they go viral to earn WALLER points and become the top Truffle Hunter in the Mud Hole. Leaderboards are on the way!</p>
        </div>
    `;
};

/** Opens the watch history (Left-Overs) view. */
export const openWatchAgainView = (state: any) => {
    if (state.watchHistory.length === 0) {
        showNotification("You haven't watched any videos yet!");
        return;
    }
    state.currentPlayerPlatform = null;
    transitionToPlayerView('history', `Your <span class="font-cursive">Left-Overs</span>`, state);
    (document.getElementById('player-view') as HTMLElement).classList.remove('is-live-mode');
    (document.getElementById('buffet-add-feed-btn') as HTMLElement).classList.add('hidden');

    updatePlayerInfo({ title: 'Your Left-Overs', author: 'Re-watch your favorite slop' });

    updatePlayerFeedDisplay(state);
};

/** Closes any player view and returns to the main feed dashboard. */
export const closePlayerView = (state: any) => {
    state.currentAppView = 'feed';
    state.currentPlayerPlatform = null;
    state.hoggWildPlaylist = [];
    state.buffetPlaylist = [];
    state.queuedYouTubeVideo = null;

    (document.getElementById('player-view') as HTMLElement).classList.add('hidden');
    (document.getElementById('player-view') as HTMLElement).classList.remove('is-live-mode');
    (document.getElementById('desktop-dashboard') as HTMLElement).classList.remove('hidden');
    (document.getElementById('mobile-dashboard') as HTMLElement).classList.remove('hidden');
    document.body.style.overflow = '';

    if (state.ytPlayer && typeof state.ytPlayer.stopVideo === 'function') {
        state.ytPlayer.stopVideo();
    }
    (document.getElementById('embed-player') as HTMLElement).innerHTML = '';
    (document.getElementById('player-container') as HTMLElement).className = 'relative w-full max-w-6xl mx-auto bg-black flex flex-col md:flex-row';
    state.currentlyPlayingVideoId = null;
    if (state.masonryPlayer) {
        state.masonryPlayer.destroy();
        state.masonryPlayer = null;
    }
    updatePlayerInfo({ title: 'Select a video to play', author: 'from the trough' });
};

/** Starts the HOGG WILD continuous playback mode. */
export const startHoggWildStream = (state: any) => {
    const playableVideos = [...(state.allVideos['youtube'] || []), ...(state.allVideos['tiktok'] || [])];
    if(playableVideos.length === 0) {
        showNotification("No playable videos loaded for HOGG WILD. Feeds might still be populating.");
        return;
    }

    state.currentPlayerPlatform = null;
    transitionToPlayerView('hoggwild', `HOGG WILD - <span class="font-cursive">Slop Trough</span>`, state);
    (document.getElementById('player-view') as HTMLElement).classList.remove('is-live-mode');
    (document.getElementById('buffet-add-feed-btn') as HTMLElement).classList.add('hidden');

    state.hoggWildPlaylist = playableVideos
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

    updatePlayerFeedDisplay(state);
    state.currentHoggWildIndex = 0;
    playVideo(state.hoggWildPlaylist[state.currentHoggWildIndex], state);
};