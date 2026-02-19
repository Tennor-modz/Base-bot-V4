const axios = require("axios");

module.exports = {
  command: ["yts"],
  desc: "Search YouTube videos",
  category: "Search",
  usage: ".yts <query>",
  run: async ({ trashcore, m, args, xreply, chat }) => {
    try {
      if (!args.length) {
        return xreply("🔎 Please provide a search query\nExample: `.yts Faded`");
      }

      const query = args.join(" ").slice(0, 200);
      await xreply("🔍 Searching YouTube...");

      const apiUrl = `https://api.ootaizumi.web.id/search/youtube?query=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl, { timeout: 20000 });

      if (!data?.status || !Array.isArray(data.result) || data.result.length === 0) {
        return xreply("❌ No results found.");
      }

      // Limit results to top 7
      const results = data.result
        .filter(v => v.type === "video")
        .slice(0, 7);

      let text = `🔎 *YouTube Search Results*\n`;
      text += `📌 Query: *${query}*\n\n`;

      results.forEach((v, i) => {
        text += `*${i + 1}. ${v.title}*\n`;
        text += `⏱ Duration: ${v.timestamp || "Unknown"}\n`;
        text += `👤 Channel: ${v.author?.name || "Unknown"}\n`;
        text += `👁 Views: ${v.views?.toLocaleString() || "N/A"}\n`;
        text += `🕒 Uploaded: ${v.ago || "Unknown"}\n`;
        text += `🔗 ${v.url}\n\n`;
      });

      await trashcore.sendMessage(
        chat,
        { text },
        { quoted: m }
      );

    } catch (err) {
      console.error("❌ yts error:", err?.response?.data || err.message);
      xreply("⚠️ Failed to fetch YouTube search results.");
    }
  }
};