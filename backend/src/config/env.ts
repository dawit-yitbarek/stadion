import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config()

interface EnvConfig {
    PORT: number;
    REDIS_URL: string;
    API_KEYS: string[];
    NODE_ENV: 'development' | 'production' | 'test';
}

const getEnvConfig = (): EnvConfig => {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const rawKeys = process.env.FOOTBALL_API_KEYS || '';
    const nodeEnv = process.env.NODE_ENV;

    // Split comma-separated keys and clean them up
    const apiKeys = rawKeys
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);

    // Crash early if lost critical keys
    if (apiKeys.length === 0) {
        logger.error('❌ CRITICAL ERROR: FOOTBALL_API_KEYS is missing or empty in .env');
        process.exit(1);
    }

    return {
        PORT: port,
        REDIS_URL: redisUrl,
        API_KEYS: apiKeys,
        NODE_ENV: nodeEnv === 'production' ? 'production' : nodeEnv === 'test' ? 'test' : 'development'
    };
};

export const ENV = getEnvConfig();