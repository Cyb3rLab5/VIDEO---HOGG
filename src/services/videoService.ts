import { GoogleGenAI, Type } from "@google/genai";
import { showNotification } from "../utils/helpers";

/**
 * A collection of mock services to provide data for development and as a fallback
 * when live APIs are unavailable.
 */
export const MockVideoAPIService = {
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
    _youtubeIds: ['dQw4w9WgXcQ', '3tmd-ClpJxA', 'kJQP7kiw5Fk', '8-m4w_2cWwU', 'nfWlot6h_JM', 'e-ORhEE9VVg', '09m0B8RRiEE', 'kXYiU_JCYtU', 'Y-x0efG1knA'],


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
        // Fallback to a real, playable video for the player
         const mockVideoId = this._youtubeIds[Math.floor(Math.random() * this._youtubeIds.length)];
        return {
            id: `tiktok-${this._idCounter}`, platform: 'tiktok', title: title, author: randomAuthor,
            thumbnailUrl: `https://picsum.photos/seed/tiktok${this._idCounter}/360/640`,
            orientation: 'portrait',
            viralityScore: Math.floor(Math.random() * 1000),
            viewCount: Math.floor(Math.random() * 15000000) + 100000,
            embedHtml: `<div id="youtube-player-mock"></div>`,
            mockVideoId: mockVideoId
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
                const viewCount = Math.floor(Math.random() * 8000000) + 10000;
                const viralityScore = Math.floor(Math.random() * 1000);

                let templates = this._titleTemplates.default;
                let title = templates[Math.floor(Math.random() * templates.length)];
                title = title.replace('{noun}', randomNoun).replace('{adjective}', randomAdjective);
                const videoId = this._youtubeIds[Math.floor(Math.random() * this._youtubeIds.length)];

                videos.push({
                    id: videoId, platform: platform.id, title: title, author: randomAuthor,
                    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    orientation: 'landscape', viralityScore, viewCount
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
            const videoId = this._youtubeIds[Math.floor(Math.random() * this._youtubeIds.length)];

            this._liveFeed.unshift({
                id: videoId, // Use a real playable ID
                platform: 'live',
                title,
                author: 'Global News Network',
                thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                orientation: 'landscape',
                viewCount: Math.floor(Math.random() * 150000) + 5000, isLive: true,
            });
        }
        return [...this._liveFeed];
    }
};

export const TikTokVideoService = {
    fetchTrending: async (): Promise<any[]> => {
        try {
            // Using oEmbed is rate-limited and often fails in this environment.
            // Using a list of real video IDs and populating them as mock TikToks.
            const realVideoIds = ['7314220791646391595', '6790333339028901126', '6794921679332216070', '7325234932374637867', '6793399039983946962', '6862153931888200965', '6824962154563931397', '6718335390845095173'];

            const mockVideos = realVideoIds.map(id => {
                const mock = MockVideoAPIService._generateMockTikTok();
                // Override with real data for player compatibility
                mock.id = `tiktok-${id}`;
                mock.title = "Real TikTok (via Mock Service)";
                mock.embedHtml = `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@placeholder/video/${id}" data-video-id="${id}" style="max-width: 605px;min-width: 325px;" > <section></section> </blockquote>`;
                return mock;
            });
            return mockVideos;

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

export const TwitchVideoService = {
    fetchTopStreams: async (): Promise<any[]> => {
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
        try {
            // Real streamer names for embeddable content
            const realStreamers = ['xqc', 'summit1g', 'shroud', 'pokimane', 'sodapoppin', 'asmongold', 'lirik', 'tarik'];
            const mockStreams = realStreamers.map((name, i) => {
                 const mock = MockVideoAPIService._generateMockStream();
                 mock.user_name = name;
                 mock.author = name.charAt(0).toUpperCase() + name.slice(1);
                 mock.id = `twitch-${name}-${i}`;
                 return mock;
            });
            return mockStreams;
        } catch (error) {
             console.error('Failed to generate mock Twitch streams:', error);
             showNotification('Could not load Twitch mock feed.');
             return [];
        }
    }
};

export const GeminiService = {
    generateRecommendations: async (history: any[]): Promise<any[]> => {
        const AI_INSTANCE = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const historyForPrompt = history.slice(0, 20).map(v => `'${v.title}' by ${v.author} on ${v.platform}`).join(', ');
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
        return resultJson.recommendations || [];
    }
}