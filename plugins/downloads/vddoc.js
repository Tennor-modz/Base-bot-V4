const axios = require("axios");

module.exports = {
  command: ["videodoc"],
  desc: "Search and download a video as document",
  category: "Media",
  usage: ".video <video name>",
  run: async ({ trashcore, m, args, xreply, chat }) => {
    try {
      if (!args.length) {
        return xreply("🎬 Please provide a video name\nExample: `.videodoc Faded`");
      }

      const query = args.join(" ").slice(0, 100);
      await xreply("🎬 Fetching video...");
      const apiUrl = `https://apis.xwolf.space/download/mp4?url=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl);

      if (!data?.success || !data.downloadUrl) {
        return xreply("❌ Failed to fetch video.");
      }

      // 🖼️ Thumbnail + info
      await trashcore.sendMessage(
        chat,
        {
          image: { url: data.thumbnail },
          caption:
            `📄 *Video Document*\n\n` +
            `🎬 ${data.title}\n` +
            `🎞 Quality: ${data.quality}\n` +
            `⏱ Duration: ${data.searchResult?.duration || "Unknown"}`
        },
        { quoted: m }
      );

      // 📄 Send MP4 as document
      await trashcore.sendMessage(
        chat,
        {
          document: { url: data.downloadUrl },
          mimetype: "video/mp4",
          fileName: `${data.title}.mp4`
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("❌ video error:", err);
      xreply("⚠️ An error occurred while sending the video.");
    }
  }
};