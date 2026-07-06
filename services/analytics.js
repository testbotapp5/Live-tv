import { logAnalytics } from '../database/index.js';
import logger from './logger.js';

export const analyticsService = {
  track(userId, action, data = null) {
    try {
      logAnalytics(userId, action, data);
    } catch (err) {
      logger.error('Analytics track error', { userId, action, err: err.message });
    }
  },

  trackStart: (userId) => analyticsService.track(userId, 'start'),
  trackLanguageSet: (userId, lang) => analyticsService.track(userId, 'language_set', { lang }),
  trackCountrySet: (userId, country) => analyticsService.track(userId, 'country_set', { country }),
  trackWatchTV: (userId) => analyticsService.track(userId, 'watch_tv'),
  trackHelp: (userId) => analyticsService.track(userId, 'help'),
  trackAbout: (userId) => analyticsService.track(userId, 'about'),
  trackPing: (userId) => analyticsService.track(userId, 'ping'),
  trackPanel: (userId) => analyticsService.track(userId, 'panel'),
  trackBroadcast: (adminId, total) => analyticsService.track(adminId, 'broadcast', { total }),
  trackBan: (adminId, targetId) => analyticsService.track(adminId, 'ban', { targetId }),
  trackUnban: (adminId, targetId) => analyticsService.track(adminId, 'unban', { targetId }),
  trackError: (userId, error) => analyticsService.track(userId, 'error', { error }),
  trackButton: (userId, button) => analyticsService.track(userId, 'button_click', { button }),
};

export default analyticsService;
