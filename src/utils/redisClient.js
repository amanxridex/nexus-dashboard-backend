const { createClient } = require('redis');

let redisClient;
let isRedisConnected = false;

async function connectRedis() {
    try {
        if (!process.env.REDIS_URL) {
            console.warn('[Redis] REDIS_URL not provided. Running without cache layer.');
            return;
        }

        redisClient = createClient({
            url: process.env.REDIS_URL
        });

        redisClient.on('error', (err) => {
            // Only log once and don't spam if it drops, or log a simple warning
            // To avoid log spam, we just track status
            isRedisConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected to Database');
            isRedisConnected = true;
        });

        await redisClient.connect();
    } catch (error) {
        console.error('[Redis] Failed to initialize connection:', error.message);
        isRedisConnected = false;
    }
}

connectRedis();

module.exports = {
    getClient: () => redisClient,
    isConnected: () => isRedisConnected
};
