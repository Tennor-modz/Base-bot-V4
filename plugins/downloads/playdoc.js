const axios = require("axios");

module.exports = {
  command: ["playdoc"],
  desc: "Search and send a song as document",
  category: "Music",
  usage: ".playdoc <song name>",
  run: async ({ trashcore, m, args, xreply, chat }) => {
    try {
      if (!args.length) {
        return xreply("🎵 Please provide a song name\nExample: `.playdoc Faded`");
      }

      const query = args.join(" ").slice(0, 100);
      const apiUrl = `https://api.ootaizumi.web.id/downloader/youtube/play?query=${encodeURIComponent(query)}`;

      const { data } = await axios.get(apiUrl, { timeout: 20000 });

      if (!data?.status || !data.result?.download) {
        return xreply("❌ Failed to fetch audio.");
      }

      const r = data.result;

      // 🖼️ Thumbnail + info
      await trashcore.sendMessage(
        chat,
        {
          image: { url: r.thumbnail },
          caption:
            `📄 *Song Document*\n\n` +
            `🎵 *Title:* ${r.title}\n` +
            `🎤 *Artist:* ${r.author?.name || "Unknown"}\n` +
            `⏱ *Duration:* ${r.duration?.timestamp || "N/A"}`
        },
        { quoted: m }
      );

      // 📄 Send as document (MP3)
      await trashcore.sendMessage(
        chat,
        {
          document: { url: r.download },
          mimetype: "audio/mpeg",
          fileName: `${r.title}.mp3`
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("❌ PlayDoc error:", err?.response?.data || err.message);
      xreply("⚠️ An error occurred while sending the song.");
    }
  }
};