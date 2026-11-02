import { redisClient } from '../config/redis.js';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { apiRotator } from './apiRotator.js';
import { verifyStreamChannel } from '../utils/verifyStreamChannel.js';
import { LEAGUE_GROUPS } from '../config/constants.js';


export interface ApiMatch {
    id?: string;
    match_time: number;
    match_status: 'live' | 'vs';
    home_team_name: string;
    home_team_logo: string;
    homeTeamScore: string;
    away_team_name: string;
    away_team_logo: string;
    awayTeamScore: string;
    league_name: string;
    league_logo: string;
    servers: Array<{
        name: string;
        url: string;
        type: 'direct' | 'drm' | 'referer';
        header?: Record<string, string>;
    }>;
}

interface ApiResponseData {
    matches: ApiMatch[];
    pagination: {
        hasNext: boolean;
    };
}

class FootballService {
    public getLeagueName = (apiLeagueName: string): string => {
        const lower = apiLeagueName.trim().toLowerCase();
        for (const [leagueName, variants] of Object.entries(LEAGUE_GROUPS)) {
            if (variants.some(v => lower === v.trim().toLowerCase())) {
                return leagueName;
            }
        }
        return apiLeagueName;
    };

    public isSameTeam = (team1: string, team2: string): boolean => {
        const n1 = team1.trim().toLowerCase();
        const n2 = team2.trim().toLowerCase();
        return n1.includes(n2) || n2.includes(n1);
    };

    private getBestTeamName = (name1: string, name2: string): string => {
        if (name1 <= name2) {
            return name1;
        } else {
            return name2;
        }
    };

    public generateMatchId(homeTeam: string, awayTeam: string, timestamp: number): string {
        const uniqueString = `${homeTeam.trim().toLowerCase()}_vs_${awayTeam.trim().toLowerCase()}_${timestamp}`;
        return crypto.createHash('md5').update(uniqueString).digest('hex');
    }

    public async syncMatchesCache(): Promise<ApiMatch[]> {
        try {
            let activeKey = await apiRotator.getNextKey();
            if (!activeKey) {
                logger.error("🛑 Sync aborted: No available keys remaining.");
                const existingCache = await redisClient.get('matches:today');
                return existingCache ? JSON.parse(existingCache) : [];
            }

            const today = new Date();
            const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear()}`;

            let allMatches: ApiMatch[] = [];
            let page = 1;
            let hasMore = true;
            let consecutiveErrors = 0;
            const maxAllowedErrors = await apiRotator.getAvailableKeyCount();

            while (hasMore) {
                if (!activeKey) {
                    logger.error("🛑 Hard stopping page loop: No operational API keys remaining.");
                    break;
                }
                if (consecutiveErrors >= maxAllowedErrors) {
                    logger.error("🚨 All available keys failed consecutively. Hard stopping page loop.");
                    break;
                }

                try {
                    const response = await fetch(`https://football-live-streaming-api.p.rapidapi.com/matches?date=${dateStr}&page=${page}`, {
                        headers: {
                            'X-RapidAPI-Key': activeKey,
                            'X-RapidAPI-Host': 'football-live-streaming-api.p.rapidapi.com'
                        }
                    });

                    if (response.status === 429) {
                        logger.error(`🚫 Key hit 429 Rate Limit on page ${page}. Blacklisting and swapping...`);
                        await apiRotator.blacklistKey(activeKey);
                        activeKey = await apiRotator.getNextKey();
                        consecutiveErrors++;
                        continue;
                    }

                    if (!response.ok) throw new Error(`API responded with status code: ${response.status}`);

                    const data = await response.json() as ApiResponseData;

                    if (data && data.matches && data.matches.length > 0) {
                        allMatches = [...allMatches, ...data.matches];
                        hasMore = data.pagination.hasNext;
                        page++;
                        consecutiveErrors = 0;
                    } else {
                        hasMore = false;
                    }

                } catch (error: any) {
                    logger.error(`Error fetching data on page ${page}: ${error?.message || error}`);
                    activeKey = await apiRotator.getNextKey();
                    consecutiveErrors++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // 1. Normalize and filter matches into league groups
            const normalizedApiMatches = allMatches
                .filter(match => {
                    const leagueName = this.getLeagueName(match.league_name);
                    return Object.keys(LEAGUE_GROUPS).includes(leagueName);
                })
                .map(match => ({
                    ...match,
                    league_name: this.getLeagueName(match.league_name)
                }));

            // 2. Verify stream servers for fetched matches
            const verifiedFetchedMatches: ApiMatch[] = [];
            for (const match of normalizedApiMatches) {
                const verifiedServers = await verifyStreamChannel(match?.servers);
                verifiedFetchedMatches.push({
                    ...match,
                    servers: verifiedServers // empty array if none verified
                });
            }

            // 3. Retrieve current Redis cache and prune expired games (older than 2.5 hours)
            const existingCacheRaw = await redisClient.get('matches:today');
            const existingMatches: ApiMatch[] = existingCacheRaw ? JSON.parse(existingCacheRaw) : [];

            const currentTimeSeconds = Math.floor(Date.now() / 1000);
            const EXPIRATION_WINDOW_SECONDS = 2 * 60 * 60;

            const activeCachedMatches = existingMatches.filter((match) => {
                const matchEndTime = Number(match.match_time) + EXPIRATION_WINDOW_SECONDS;
                return matchEndTime >= currentTimeSeconds;
            });

            // 4. Master List Merge & Deduplication
            const masterMatchList: ApiMatch[] = [...activeCachedMatches];

            for (const freshMatch of verifiedFetchedMatches) {
                // Check if this incoming match already exists in our master list using isSameTeam
                const existingIndex = masterMatchList.findIndex(item =>
                    item.league_name === freshMatch.league_name &&
                    (
                        this.isSameTeam(item.home_team_name, freshMatch.home_team_name)
                        ||
                        this.isSameTeam(item.away_team_name, freshMatch.away_team_name)
                    )
                );
                const cachedMatch = masterMatchList[existingIndex];

                if (cachedMatch) {
                    // Merge servers (de-duplicate by URL)
                    const mergedServers = [...cachedMatch.servers];
                    for (const freshServer of freshMatch.servers) {
                        const exists = mergedServers.some(s => s.url === freshServer.url);
                        if (!exists) {
                            mergedServers.push(freshServer);
                        }
                    }

                    // Keep cleaner team name strings , update scores/servers, retain old ID
                    masterMatchList[existingIndex] = {
                        ...freshMatch,
                        id: cachedMatch.id ?? this.generateMatchId(freshMatch.home_team_name, freshMatch.away_team_name, freshMatch.match_time), // Retain stable cached ID
                        home_team_name: this.getBestTeamName(freshMatch.home_team_name, cachedMatch.home_team_name),
                        away_team_name: this.getBestTeamName(freshMatch.away_team_name, cachedMatch.away_team_name),
                        servers: mergedServers
                    };
                } else {
                    // Brand new match: Generate a stable ID for it
                    const newId = this.generateMatchId(freshMatch.home_team_name, freshMatch.away_team_name, freshMatch.match_time);
                    masterMatchList.push({
                        ...freshMatch,
                        id: newId
                    });
                }
            }

            // 5. Optimized Sort using a Lookup Map
            const leagueOrder = Object.keys(LEAGUE_GROUPS);
            const leagueRankMap = new Map(leagueOrder.map((league, index) => [league, index]));

            masterMatchList.sort((a, b) => {
                const rankA = leagueRankMap.has(a.league_name) ? leagueRankMap.get(a.league_name)! : leagueOrder.length;
                const rankB = leagueRankMap.has(b.league_name) ? leagueRankMap.get(b.league_name)! : leagueOrder.length;

                return rankA - rankB;
            });

            // 6. Persist master list back to Redis
            await redisClient.set(
                'matches:today',
                JSON.stringify(masterMatchList),
                { EX: 86400 }
            );

            logger.info(`⚡ Merge Sync & Deduplication Complete: Saved ${masterMatchList.length} unique matches to Redis.`);
            return masterMatchList;

        } catch (error: any) {
            logger.error(`❌ Error during syncMatchesCache routine: ${error.message || error}`);
            const existingCache = await redisClient.get('matches:today').catch(() => null);
            return existingCache ? JSON.parse(existingCache) : [];
        }
    }
}

export const footballService = new FootballService();