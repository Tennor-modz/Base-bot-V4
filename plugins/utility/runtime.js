
const os = require('os');

function detectPlatform() {
  if (process.env.TRASHBOTS) return "TrashBots";
  if (process.env.DYNO) return "Heroku";
  if (process.env.RENDER) return "Render";
  if (process.env.PREFIX && process.env.PREFIX.includes("termux")) return "Termux";
  if (process.env.PORTS && process.env.CYPHERX_HOST_ID) return "CypherX Platform";
  if (process.env.P_SERVER_UUID) return "Panel";
  if (process.env.LXC) return "Linux Container (LXC)";

  switch (os.platform()) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "Unknown";
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = {
  command: ["runtime", "uptime", "host"],
  desc: "Check bot runtime and hosting platform",
  category: "Utility",
  usage: ".runtime",
  run: async ({ m, xreply }) => {
    const host = detectPlatform();
    const uptime = formatUptime(process.uptime());
    
    await xreply(`*🤖 TRASHCORE ULTRA*\n\n📡 *Platform:* ${host}\n⏱️ *Runtime:* ${uptime}\n🔄 *Status:* Active\n\n> Bot is running smoothly on ${host}`);
  }
};