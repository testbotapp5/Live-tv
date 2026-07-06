import { readdirSync, readFileSync } from 'fs';
import { resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import logger from '../services/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, '../locales');

const translations = {};

function loadLocales() {
  const files = readdirSync(LOCALES_DIR).filter((f) => extname(f) === '.json');
  for (const file of files) {
    const lang = basename(file, '.json');
    try {
      const content = readFileSync(resolve(LOCALES_DIR, file), 'utf8');
      translations[lang] = JSON.parse(content);
      logger.debug(`Loaded locale: ${lang}`);
    } catch (err) {
      logger.error(`Failed to load locale ${file}: ${err.message}`);
    }
  }
  logger.info(`Locales loaded: ${Object.keys(translations).join(', ')}`);
}

loadLocales();

export function getSupportedLanguages() {
  return Object.keys(translations);
}

export function hasLanguage(lang) {
  return lang in translations;
}

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in vars ? String(vars[key]) : `{{${key}}}`));
}

export function t(lang, key, vars) {
  const locale = translations[lang] ?? translations['en'] ?? {};
  const fallback = translations['en'] ?? {};
  const value = resolvePath(locale, key) ?? resolvePath(fallback, key) ?? key;
  return interpolate(value, vars);
}

export function reloadLocales() {
  Object.keys(translations).forEach((k) => delete translations[k]);
  loadLocales();
}

export default { t, getSupportedLanguages, hasLanguage, reloadLocales };
