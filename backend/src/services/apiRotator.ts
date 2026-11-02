import { ENV } from '../config/env.js';
import logger from '../config/logger.js';
import { redisClient } from '../config/redis.js';

class ApiRotatorService {
  private keys: string[];

  constructor() {
    this.keys = ENV.API_KEYS;
    logger.info(`🔑 ApiRotator initialized with ${this.keys.length} keys.`);
  }

  // Returns the next non-blacklisted API key
  public async getNextKey(): Promise<string> {
    if (this.keys.length === 0) return '';


    for (let attempts = 0; attempts < this.keys.length; attempts++) {
      try {
        const currentGlobalCount = await redisClient.incr('api:rotator:counter');
        const targetIndex = currentGlobalCount % this.keys.length;
        const key = this.keys[targetIndex];

        if (currentGlobalCount > 1000000) {
          await redisClient.set('api:rotator:counter', targetIndex);
        }

        if (!key) continue;

        // Check if this specific key is currently blacklisted in Redis
        const isBlacklisted = await redisClient.get(`api:blacklist:${key}`);
        if (isBlacklisted) {
          logger.warn(`⚠️ Key index [${targetIndex}] is blacklisted. Rotating to next...`);
          continue;
        }

        return key;
      } catch (error: any) {
        logger.error(`❌ Redis Key Rotator error: ${error.message || error}`);
        return this.keys[0] || '';
      }
    }

    logger.error('🚨 CRITICAL: All configured API keys are blacklisted for today!');
    return '';
  }

  // Temporarily bans an API key in Redis until midnight UTC
  public async blacklistKey(key: string): Promise<void> {
    try {
      if (!key) return;
      const redisKey = `api:blacklist:${key}`;
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const secondsUntilMidnight = Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));

      // Flag the key in Redis with an auto-expiry
      await redisClient.set(redisKey, 'exhausted', { expiration: { type: 'EX', value: secondsUntilMidnight } });
      logger.warn(`🚫 Key successfully blacklisted for ${Math.ceil(secondsUntilMidnight / 60)} minutes (until midnight UTC).`);
    } catch (error: any) {
      logger.error(`Failed to execute blacklist operation: ${error.message || error}`);
    }
  }

  public getKeyCount(): number {
    return this.keys.length;
  }

  // Returns only non-blacklisted keys count remaining
  public async getAvailableKeyCount(): Promise<number> {
    if (this.keys.length === 0) return 0;

    try {
      let blacklistedCount = 0;

      for (const key of this.keys) {
        const isBlacklisted = await redisClient.get(`api:blacklist:${key}`);
        if (isBlacklisted) {
          blacklistedCount++;
        }
      }

      const availableCount = this.keys.length - blacklistedCount;
      return Math.max(0, availableCount);
    } catch (error: any) {
      logger.error(`Error calculating available key count: ${error.message || error}`);
      return this.keys.length;
    }
  }
}

export const apiRotator = new ApiRotatorService();