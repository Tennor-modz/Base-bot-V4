const axios = require("axios");

module.exports = {
  command: ["ytmp3"],
  desc: "Download YouTube audio",
  category: "Media",
  usage: ".ytmp3 <youtube link>",

  run: async ({ trashcore, chat, m, args, xreply }) => {
    try {

      if (!args[0]) {
        return xreply("⚠️ Provide a YouTube link.\nExample:\n.ytmp3 https://youtu.be/xxxxx");
      }

      const url = args[0];

      const api = `https://www.neoapis.my.id/api/downloader/ytdl?url=${encodeURIComponent(url)}&type=mp3`;

      await xreply("⏳ Processing audio...");

      const { data } = await axios.get(api);

      if (!data.status)
        return xreply("❌ Failed to fetch audio.");

      const title = data.data.title;
      const download = data.data.download;

      await trashcore.sendMessage(
        chat,
        {
          audio: { url: download },
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("YTMP3 Error:", err);
      xreply("❌ Failed to download audio.");
    }
  }
};