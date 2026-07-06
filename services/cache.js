import NodeCache from 'node-cache';
import config from '../config/index.js';
import logger from './logger.js';

const cache = new NodeCache({
  stdTTL: config.cacheTtl,
  checkperiod: 120,
  useClones: false,
  deleteOnExpire: true,
});

cache.on('expired', (key) => {
  logger.debug(`Cache expired: ${key}`);
});

cache.on('del', (key) => {
  logger.debug(`Cache deleted: ${key}`);
});

export const cacheService = {
  get: (key) => cache.get(key),
  set: (key, value, ttl) => cache.set(key, value, ttl ?? config.cacheTtl),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
  has: (key) => cache.has(key),
  keys: () => cache.keys(),
  stats: () => cache.getStats(),
  mget: (keys) => cache.mget(keys),
  mset: (entries) => cache.mset(entries),

  async getOrSet(key, factory, ttl) {
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const value = await factory();
    cache.set(key, value, ttl ?? config.cacheTtl);
    return value;
  },

  userKey: (userId) => `user:${userId}`,
  langKey: (userId) => `lang:${userId}`,
  statsKey: () => 'admin:stats',
  usersPageKey: (userId, page) => `users_page:${userId}:${page}`,
  countryPageKey: (userId, page) => `country_page:${userId}:${page}`,
  searchKey: (userId, query) => `search:${userId}:${query}`,
};

export default cacheService;
