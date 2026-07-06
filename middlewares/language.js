import { getUser } from '../database/index.js';
import { cacheService } from '../services/cache.js';

export async function languageMiddleware(ctx, next) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  if (!ctx.session) ctx.session = {};

  if (!ctx.session.language) {
    const cacheKey = cacheService.langKey(userId);
    let lang = cacheService.get(cacheKey);
    if (!lang) {
      const dbUser = getUser(userId);
      lang = dbUser?.language || ctx.from?.language_code || 'en';
      cacheService.set(cacheKey, lang, 600);
    }
    ctx.session.language = lang;
  }

  return next();
}

export default languageMiddleware;
