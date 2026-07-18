import { redisClient } from '../config/redis.js';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { apiRotator } from './apiRotator.js';
import { verifyStreamChannel } from '../utils/verifyStreamChannel.js';

const ALLOWED_LEAGUES = [
    'Premier League',
    'LaLiga',
    'Serie A',
    'Bundesliga',
    'UEFA Champions League',
    'International Friendly',
    'International Club Friendly',
    'World Cup'
].map(league => league.toLowerCase());

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

            // Filter down to targeted leagues
            const allowedMatches = allMatches.filter((match) =>
                ALLOWED_LEAGUES.includes(match.league_name.toLowerCase())
            );

            const filteredMatches: ApiMatch[] = allowedMatches.map((match) => ({
                ...match,
                id: this.generateMatchId(match.home_team_name, match.away_team_name, match.match_time)
            }));

            // Filter out matches without server arrays
            const matchesWithServers = filteredMatches.filter(match => match.servers && match.servers.length > 0);
            const matchesWithValidServers: ApiMatch[] = [];
            const matchesWithNoValidServers: ApiMatch[] = [];

            for (const match of matchesWithServers) {
                const verifiedServers = await verifyStreamChannel(match.servers);

                if (verifiedServers.length > 0) {
                    matchesWithValidServers.push({
                        ...match,
                        servers: verifiedServers
                    });
                } else {
                    matchesWithNoValidServers.push({
                        ...match,
                        servers: []
                    });
                }
            }


            // Save updated array to Redis
            await redisClient.set(
                'matches:today',
                JSON.stringify([...matchesWithValidServers, ...matchesWithNoValidServers]),
                { EX: 86400 }
            );

            logger.info(`⚡ Flat Cache Sync Complete: Saved games ${matchesWithValidServers.length} with servers and ${matchesWithNoValidServers.length} without servers to Redis.`);
            return [...matchesWithValidServers, ...matchesWithNoValidServers];
        } catch (error: any) {
            logger.error(`❌ Error during syncMatchesCache routine: ${error.message || error}`);
            const existingCache = await redisClient.get('matches:today');
            return existingCache ? JSON.parse(existingCache) : [];
        }
    }
}

export const footballService = new FootballService();