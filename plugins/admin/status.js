const { getSetting } = require("../../database");
const { plugins } = require("../../pluginStore");


function formatUptime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

module.exports = {
  command: ["status"],
  desc: "Show current bot settings and status",
  category: "Owner",
  run: async ({ trashcore, m, xreply, isOwner, botStartTime }) => {
    if (!isOwner) return xreply("❌ Only the bot owner can use this command.");

    try {
      const prefix = await getSetting("prefix", ".");
      const privateMode = await getSetting("privateMode", false);
      const statusView = await getSetting("statusView", true); 
      const totalPlugins = plugins.size;
      const uptimeSeconds = Math.floor((Date.now() - (botStartTime || global.botStartTime || Date.now())) / 1000);
      const uptime = formatUptime(uptimeSeconds);

      const statusMsg = `
📊 *TRASHBOT STATUS*

- Prefix: ${prefix}
- Mode: ${privateMode ? "PRIVATE (owner only)" : "PUBLIC (everyone)"}
- Status Viewer: ${statusView ? "ON" : "OFF"}
- Total Plugins: ${totalPlugins}
- Bot Uptime: ${uptime}
- Owner: You (bot owner)
      `;

      await xreply(statusMsg);
    } catch (err) {
      console.error("❌ Failed to fetch status:", err);
      await xreply("❌ Could not fetch bot status. Check logs.");
    }
  }
};