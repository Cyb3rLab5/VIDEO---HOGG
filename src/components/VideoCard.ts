import { platformLogos } from '../assets';
import { formatNumber } from '../utils/helpers';

/** Creates and returns an HTML element for a standard video card. */
export const renderVideoCard = (video: any): HTMLElement => {
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
export const renderTwitchCard = (stream: any): HTMLElement => {
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
export const renderXCard = (post: any): HTMLElement => {
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
export const renderLiveVideoCard = (video: any): HTMLElement => {
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
export const renderBuffetCard = (video: any): HTMLElement => {
    const card = document.createElement('div');
    const aspectRatio = video.orientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video';
    card.className = `buffet-card group relative overflow-hidden rounded-lg shadow-md cursor-pointer ${aspectRatio} bg-gray-700 grid-item`;
    card.dataset.videoId = video.id;
    card.dataset.platform = video.platform;

    // Main content remains similar to renderVideoCard for visual consistency in a grid
    card.innerHTML = `
        <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end">
             <div class="p-3 text-white">
                <p class="text-xs text-pink-300 italic mb-1 reason-text"><span class="font-bold not-italic text-pink-400">OINK AI:</span> ${video.reason}</p>
                <h3 class="font-semibold truncate text-sm">${video.title}</h3>
                <div class="flex justify-between items-center text-xs text-gray-300 mt-1">
                     <p class="truncate">by ${video.author}</p>
                     <p class="font-semibold">${formatNumber(video.viewCount)} views</p>
                </div>
            </div>
        </div>
    `;
    return card;
};