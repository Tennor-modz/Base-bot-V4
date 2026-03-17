module.exports = {
  command: ["ytmp4"],
  desc: "Download YouTube video",
  category: "Media",
  usage: ".ytmp4 <youtube link>",

  run: async ({ trashcore, chat, m, args, xreply }) => {
    try {

      if (!args[0]) {
        return xreply("⚠️ Provide a YouTube link.\nExample:\n.ytmp4 https://youtu.be/xxxxx");
      }

      const url = args[0];

      const api = `https://api.theresav.biz.id/download/ytmp4?apikey=LB8sM&url=${encodeURIComponent(url)}&resolution=360`;

      await xreply("⏳ Downloading video...");

      await trashcore.sendMessage(
        chat,
        {
          video: { url: api },
          mimetype: "video/mp4",
          caption: "🎬 Here is your video"
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("YTMP4 Error:", err);
      xreply("❌ Failed to download video.");
    }
  }
};