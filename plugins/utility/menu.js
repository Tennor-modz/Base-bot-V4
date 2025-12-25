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

// ===== Group commands by category =====
function groupByCategory(plugins) {
  const categories = {};
  for (const plugin of plugins.values()) {
    const category = plugin.category || "Uncategorized";
    if (!categories[category]) categories[category] = [];

    const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
    for (const cmd of cmds) {
      const display = plugin.isOwner ? `${cmd} (owner)` : cmd;
      if (!categories[category].includes(display)) {
        categories[category].push(display);
      }
    }
  }
  return categories;
}

module.exports = {
  command: ["menu", "help"],
  desc: "Show command list and bot status",
  run: async ({ trashcore, chat, botStartTime }) => {
    const startTime = botStartTime || global.botStartTime || Date.now();
    const uptimeSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000)); 
    const uptime = formatUptime(uptimeSeconds);

    const prefix = await getSetting("prefix", ".");
    const privateMode = await getSetting("privateMode", false);
    const mode = privateMode ? "PRIVATE" : "PUBLIC";
    const totalPlugins = plugins.size;
    const grouped = groupByCategory(plugins);

    let commandsText = "";
    for (const [category, cmds] of Object.entries(grouped)) {
      commandsText += `\n📂 *${category} Commands*\n`;
      cmds.sort();
      commandsText += cmds.map(cmd => `• ${prefix}${cmd}`).join("\n") + "\n";
    }

    const text = `
🥷 *TRASHBOT MENU*

⬡ Creator: Trashcore
⬡ Bot prefix: ${prefix}
⬡ Bot mode: ${mode}
⬡ Total plugins: ${totalPlugins}
⬡ Bot uptime: ${uptime}

${commandsText}
`;

    const botImageUrl = "https://files.catbox.moe/en2v4a.jpg";

    await trashcore.sendMessage(chat, {
      image: { url: botImageUrl },
      caption: text
    });
  }
};