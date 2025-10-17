import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import { renderXCard } from "./VideoCard";

let player: videojs.Player | null = null;
let playerUpdateInterval: number = 0;

const onPlayerReady = () => {
    player?.play();
    updatePlayPauseIcon();
    if (player) {
        (document.getElementById('volume-slider') as HTMLInputElement).value = String(player.volume());
    }
};

const onPlayerStateChange = (state: any) => {
    updatePlayPauseIcon();
    if (player?.paused()) {
        clearInterval(playerUpdateInterval);
    } else {
        playerUpdateInterval = window.setInterval(() => updateProgressBar(state), 250);
    }

    player?.on('ended', () => {
        if (state.currentAppView === 'hoggwild' && state.hoggWildPlaylist.length > 0) {
            state.currentHoggWildIndex = (state.currentHoggWildIndex + 1) % state.hoggWildPlaylist.length;
            playVideo(state.hoggWildPlaylist[state.currentHoggWildIndex], state);
        } else if (state.currentAppView === 'buffet' && state.buffetPlaylist.length > 0) {
            state.currentBuffetIndex = (state.currentBuffetIndex + 1) % state.buffetPlaylist.length;
            playVideo(state.buffetPlaylist[state.currentBuffetIndex], state);
        }
    });
};

const createPlayer = (options: videojs.PlayerOptions, state: any) => {
    if (player) {
        player.dispose();
    }
    const videoElement = document.createElement('video');
    videoElement.classList.add('video-js');
    (document.getElementById('embed-player') as HTMLElement).appendChild(videoElement);

    player = videojs(videoElement, options, onPlayerReady);
    player.on('timeupdate', () => onPlayerStateChange(state));
};

export const loadPlayerForVideo = (videoData: any, state: any) => {
    const embedPlayer = document.getElementById('embed-player') as HTMLElement;
    const playerContainer = document.getElementById('player-container') as HTMLElement;

    if (player) {
        player.dispose();
        player = null;
    }
    if (playerUpdateInterval) clearInterval(playerUpdateInterval);
    embedPlayer.innerHTML = '';
    document.getElementById('video-controls')?.classList.add('hidden');

    const isPortrait = videoData.orientation === 'portrait';
    playerContainer.classList.toggle('aspect-video', !isPortrait);
    playerContainer.classList.toggle('aspect-[9/16]', isPortrait);
    playerContainer.classList.toggle('md:aspect-auto', isPortrait);

    const videoId = videoData.mockVideoId || videoData.id;

    const options: videojs.PlayerOptions = {
        autoplay: true,
        controls: false,
        fluid: true,
        techOrder: ['youtube', 'html5'],
        sources: videoData.sources,
    };

    switch (videoData.platform) {
        case 'youtube':
        case 'tiktok':
        case 'live':
        default:
            options.sources = [{
                type: 'video/youtube',
                src: `https://www.youtube.com/watch?v=${videoId}`
            }];
            createPlayer(options, state);
            break;

        case 'twitch':
            options.sources = [{
                type: 'video/twitch',
                src: `https://www.twitch.tv/${videoData.user_name}`
            }];
            createPlayer(options, state);
            break;

        case 'x':
             embedPlayer.innerHTML = `<div class="w-full h-full bg-gray-900 flex flex-col items-center justify-center p-4 text-center"><div class="max-w-md">${renderXCard(videoData).innerHTML}</div><p class="mt-4 text-gray-400 text-sm">X video playback not supported directly. View on X.</p></div>`;
             break;
    }
};

export const playVideo = (videoData: any, state: any) => {
    if (!videoData || videoData.id === state.currentlyPlayingVideoId) return;

    state.currentlyPlayingVideoId = videoData.id;

    addToHistory(videoData, state);
    updatePlayerInfo(videoData);
    loadPlayerForVideo(videoData, state);
    updatePlayerHighlighting(state);
};

export const updatePlayerInfo = (videoData: any) => {
    const playerTitle = document.getElementById('player-title') as HTMLElement;
    const playerAuthor = document.getElementById('player-author') as HTMLElement;
    const mobilePlayerTitle = document.getElementById('mobile-player-title') as HTMLElement;
    const mobilePlayerAuthor = document.getElementById('mobile-player-author') as HTMLElement;

    const titleText = videoData.platform === 'x' ? videoData.text : videoData.title;
    const authorText = `by ${videoData.author}`;
    let displayTitle = titleText;

    playerTitle.textContent = displayTitle;
    playerAuthor.textContent = authorText;
    mobilePlayerTitle.textContent = displayTitle;
    mobilePlayerAuthor.textContent = authorText;
};

const updatePlayPauseIcon = () => {
    const playIcon = document.getElementById('play-icon') as HTMLElement;
    const pauseIcon = document.getElementById('pause-icon') as HTMLElement;

    if (player?.paused()) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    } else {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    }
};

const updatePlayerHighlighting = (state: any) => {
    const playerFeed = document.getElementById('player-feed') as HTMLElement;
    const allCards = playerFeed.querySelectorAll('.live-card, .group, .x-card, .buffet-card');
    allCards.forEach(card => {
        const htmlCard = card as HTMLElement;
        htmlCard.classList.toggle('outline-pink-500', htmlCard.dataset.videoId === state.currentlyPlayingVideoId);
    });
};

const addToHistory = (videoData: any, state: any) => {
    const existingIndex = state.watchHistory.findIndex((v: any) => v.id === videoData.id);
    if (existingIndex > -1) {
        state.watchHistory.splice(existingIndex, 1);
    }
    state.watchHistory.unshift(videoData);
    if (state.watchHistory.length > 50) {
        state.watchHistory.pop();
    }
};

const updateProgressBar = (state: any) => {
    const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
    const currentTimeEl = document.getElementById('current-time') as HTMLElement;
    const durationEl = document.getElementById('duration') as HTMLElement;

    if (player) {
        const currentTime = player.currentTime() || 0;
        const duration = player.duration() || 0;
        progressBar.value = duration > 0 ? (currentTime / duration) * 100 : 0;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    }
};

export const setupPlayerControls = (state: any) => {
    const playPauseBtn = document.getElementById('play-pause-btn') as HTMLElement;
    const volumeBtn = document.getElementById('volume-btn') as HTMLElement;
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
    const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLElement;

    playPauseBtn.addEventListener('click', () => {
        if (player?.paused()) {
            player.play();
        } else {
            player?.pause();
        }
        updatePlayPauseIcon();
    });

    volumeBtn.addEventListener('click', () => {
        const volumeHighIcon = document.getElementById('volume-high-icon') as HTMLElement;
        const volumeMutedIcon = document.getElementById('volume-muted-icon') as HTMLElement;
        if (player) {
            player.muted(!player.muted());
            if (player.muted()) {
                volumeHighIcon.classList.add('hidden');
                volumeMutedIcon.classList.remove('hidden');
            } else {
                volumeHighIcon.classList.remove('hidden');
                volumeMutedIcon.classList.add('hidden');
            }
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        const volumeHighIcon = document.getElementById('volume-high-icon') as HTMLElement;
        const volumeMutedIcon = document.getElementById('volume-muted-icon') as HTMLElement;
        const volume = parseFloat((e.target as HTMLInputElement).value);
        if (player) {
            player.volume(volume);
            if (volume > 0 && player.muted()) {
                player.muted(false);
                volumeHighIcon.classList.remove('hidden');
                volumeMutedIcon.classList.add('hidden');
            } else if (volume === 0 && !player.muted()) {
                player.muted(true);
                volumeHighIcon.classList.add('hidden');
                volumeMutedIcon.classList.remove('hidden');
            }
        }
    });

    progressBar.addEventListener('input', (e) => {
        const newTimePercent = parseFloat((e.target as HTMLInputElement).value);
        if (player) {
            const duration = player.duration() || 0;
            player.currentTime((newTimePercent / 100) * duration);
        }
    });

    fullscreenBtn.addEventListener('click', () => {
        const playerElement = document.getElementById('player-container-wrapper') as HTMLElement;
        if (!document.fullscreenElement) {
            playerElement.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });
}

function formatTime(time: number): string {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}