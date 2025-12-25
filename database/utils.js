/**
 * Normalize a phone number by removing non-digit characters
 * @param {string} number
 * @returns {string}
 */
function normalizeNumber(number) {
  return number.replace(/[^0-9]/g, "");
}

/**
 * Format uptime in human-readable form
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${d}d ${h}h ${m}m ${s}s`;
}

/**
 * Safely capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sleep / delay function
 * @param {number} ms - milliseconds
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  normalizeNumber,
  formatUptime,
  capitalize,
  sleep
};