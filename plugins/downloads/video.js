const axios = require("axios");

module.exports = {
  command: ["video"],
  desc: "Search and download a video as document",
  category: "Media",
  usage: ".video <video name>",
  run: async ({ trashcore, m, args, xreply, chat }) => {
    try {
      if (!args.length) {
        return xreply("🎬 Please provide a video name\nExample: `.video Faded`");
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
            `📄 *Video Mp4*\n\n` +
            `🎬 ${data.title}\n` +
            `🎞 Quality: ${data.quality}\n` +
            `⏱ Duration: ${data.searchResult?.duration || "Unknown"}`
        },
        { quoted: m }
      );

      // 📄 Send MP4 as video 
      await trashcore.sendMessage(
  chat,
  {
    video: { url: data.streamUrl },
    mimetype: "video/mp4",
    caption: data.title
  },
  { quoted: m }
);

    } catch (err) {
      console.error("❌ video error:", err);
      xreply("⚠️ An error occurred while sending the video.");
    }
  }
};