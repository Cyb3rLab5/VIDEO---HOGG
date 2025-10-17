import videojs from 'video.js';

export const loadVideoInCell = (cellIndex: number, source: { type: string, src: string }, save: boolean = true) => {
    console.log(`Loading video in cell ${cellIndex} with source:`, source);
    const videoGrid = document.getElementById('video-grid') as HTMLElement;
    const cell = videoGrid.querySelector(`[data-index='${cellIndex}']`) as HTMLElement;

    if (!cell) {
        console.error(`Cell ${cellIndex} not found!`);
        return;
    }

    // Clear the cell and dispose of any existing player
    if ((cell as any).player) {
        (cell as any).player.dispose();
        (cell as any).player = null;
    }
    cell.innerHTML = '';

    if (source.type === 'video/youtube') {
        const videoId = new URL(source.src).searchParams.get('v');
        if (videoId) {
            const iframe = document.createElement('iframe');
            iframe.className = 'w-full h-full';
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', '');
            cell.appendChild(iframe);
        }
    } else {
        // Use video.js for other types like HLS
        const videoElement = document.createElement('video');
        videoElement.className = 'video-js vjs-default-skin';
        cell.appendChild(videoElement);

        const player = videojs(videoElement, {
            autoplay: 'muted',
            controls: true, // Show controls for non-YouTube videos for now
            fluid: true,
            sources: [source]
        });
        (cell as any).player = player;
    }

    if (save) {
        const savedStreams = getGridStreams();
        savedStreams[cellIndex] = source;
        localStorage.setItem('gridStreams', JSON.stringify(savedStreams));
    }
};

const getGridStreams = (): any[] => {
    return JSON.parse(localStorage.getItem('gridStreams') || '[]');
};

const createGrid = (size: number) => {
    const videoGrid = document.getElementById('video-grid') as HTMLElement;
    videoGrid.innerHTML = '';
    videoGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    videoGrid.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'bg-black border-2 border-gray-700 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer transition-all duration-200';
        cell.innerHTML = `<div class="text-center">
                            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            <p class="mt-2 text-xs">Empty Slot</p>
                          </div>`;
        cell.dataset.index = i.toString();
        videoGrid.appendChild(cell);

        cell.addEventListener('click', () => {
            // Remove highlight from all other cells
            videoGrid.querySelectorAll('.video-cell-highlight').forEach(c => {
                c.classList.remove('video-cell-highlight', 'border-pink-500');
                c.classList.add('border-gray-700');
                const player = (c as any).player;
                if (player) {
                    player.muted(true);
                }
            });
            // Add highlight to the clicked cell
            cell.classList.add('video-cell-highlight', 'border-pink-500');
            cell.classList.remove('border-gray-700');
            const player = (cell as any).player;
            if (player) {
                player.muted(false);
            }
        });
    }
};

export const initializeNewsroom = () => {
    const gridSizeSelector = document.getElementById('grid-size') as HTMLSelectElement;
    const manageStreamsBtn = document.getElementById('manage-streams-btn') as HTMLElement;
    const streamManagerModal = document.getElementById('stream-manager-modal') as HTMLElement;
    const closeStreamManagerBtn = document.getElementById('close-stream-manager-btn') as HTMLElement;

    gridSizeSelector.addEventListener('change', () => {
        const size = parseInt(gridSizeSelector.value, 10);
        createGrid(size);
        localStorage.setItem('gridSize', size.toString());
    });

    manageStreamsBtn.addEventListener('click', () => {
        streamManagerModal.classList.remove('hidden');
    });

    closeStreamManagerBtn.addEventListener('click', () => {
        streamManagerModal.classList.add('hidden');
    });

    // Load saved grid size or default to 2
    const savedSize = parseInt(localStorage.getItem('gridSize') || '2', 10);
    gridSizeSelector.value = savedSize.toString();
    createGrid(savedSize);

    // Use a timeout to ensure the grid is rendered before loading videos
    setTimeout(() => {
        const savedStreams = getGridStreams();
        if (savedStreams.length > 0) {
            savedStreams.forEach((source, index) => {
                if (source) {
                    loadVideoInCell(index, source, false);
                }
            });
        } else {
            // Load a default video if no streams are saved
            loadVideoInCell(0, { type: 'video/youtube', src: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }, false);
        }
    }, 100); // A small delay is enough

    const addStreamForm = document.getElementById('add-stream-form') as HTMLFormElement;
    addStreamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (document.getElementById('stream-name') as HTMLInputElement).value;
        const url = (document.getElementById('stream-url') as HTMLInputElement).value;
        const type = (document.getElementById('stream-type') as HTMLSelectElement).value;
        saveStream({ name, url, type });
        renderSavedStreams();
        addStreamForm.reset();
    });

    renderSavedStreams();
};

const getSavedStreams = (): any[] => {
    return JSON.parse(localStorage.getItem('savedStreams') || '[]');
};

const saveStream = (stream: any) => {
    const streams = getSavedStreams();
    streams.push(stream);
    localStorage.setItem('savedStreams', JSON.stringify(streams));
};

const renderSavedStreams = () => {
    const savedStreamsList = document.getElementById('saved-streams-list') as HTMLElement;
    savedStreamsList.innerHTML = '';
    getSavedStreams().forEach((stream, index) => {
        const streamEl = document.createElement('div');
        streamEl.className = 'flex items-center justify-between p-2 bg-gray-700 rounded-lg';
        streamEl.innerHTML = `
            <div>
                <p class="font-semibold">${stream.name}</p>
                <p class="text-xs text-gray-400">${stream.url}</p>
            </div>
            <div class="flex gap-2">
                <button class="load-stream-btn text-xs bg-pink-600 hover:bg-pink-700 text-white px-2 py-1 rounded" data-index="${index}">Load</button>
                <button class="delete-stream-btn text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" data-index="${index}">Delete</button>
            </div>
        `;
        savedStreamsList.appendChild(streamEl);
    });

    document.querySelectorAll('.load-stream-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt((e.target as HTMLElement).dataset.index || '0', 10);
            const streams = getSavedStreams();
            const selectedStream = streams[index];
            const activeCell = document.querySelector('.video-cell-highlight');
            if (activeCell) {
                const cellIndex = parseInt((activeCell as HTMLElement).dataset.index || '0', 10);
                loadVideoInCell(cellIndex, { type: selectedStream.type, src: selectedStream.url });
            }
        });
    });

    document.querySelectorAll('.delete-stream-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt((e.target as HTMLElement).dataset.index || '0', 10);
            const streams = getSavedStreams();
            streams.splice(index, 1);
            localStorage.setItem('savedStreams', JSON.stringify(streams));
            renderSavedStreams();
        });
    });
};

export const openNewsroomView = (state: any) => {
    state.currentAppView = 'newsroom';

    (document.getElementById('platform-dashboard') as HTMLElement).classList.add('hidden');
    (document.getElementById('mobile-dashboard') as HTMLElement).classList.add('hidden');
    (document.getElementById('player-view') as HTMLElement).classList.add('hidden');
    const newsroomView = document.getElementById('newsroom-view') as HTMLElement;
    newsroomView.classList.remove('hidden');
    newsroomView.classList.add('flex');


    // Ensure the newsroom is initialized
    if (!newsroomView.dataset.initialized) {
        initializeNewsroom();
        newsroomView.dataset.initialized = 'true';
    }
};