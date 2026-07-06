import { getDbSize } from '../database/index.js';
import config from '../config/index.js';
import { readdir } from 'fs/promises';
import { resolve } from 'path';

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export function getSystemInfo() {
  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  return {
    ram: `${Math.round(mem.rss / 1024 / 1024)} MB / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    cpu: `${((cpuUsage.user + cpuUsage.system) / 1e6).toFixed(2)}s`,
    dbSize: formatBytes(getDbSize()),
    uptime: formatUptime(Date.now() - config.startTime),
    version: config.version,
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
  };
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeMd(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAdmin(userId) {
  return config.adminIds.includes(Number(userId));
}

export function formatUserInfo(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A';
  const username = user.username ? `@${user.username}` : 'N/A';
  return { name, username };
}

export async function getLogFiles() {
  try {
    const files = await readdir(config.logDir);
    return files.filter((f) => f.endsWith('.log'));
  } catch {
    return [];
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', { timeZone: 'UTC' });
}

export function buildProgressBar(done, total, width = 20) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filled = Math.round((pct / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${pct}%`;
}
