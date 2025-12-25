const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yts = require("yt-search");

module.exports = {
  command: ["play"],
  desc: "Search and play a song from YouTube",
  category: "Music",
  usage: ".play <song name>",
  run: async ({ trashcore, m, args, xreply, sender, chat }) => {
    try {
      const tempDir = path.join(__dirname, "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      if (!args.length)
        return xreply(`🎵 Provide a song name!\nExample: .play Not Like Us`);

      const query = args.join(" ");
      if (query.length > 100)
        return xreply(`📝 Song name too long! Max 100 chars.`);

      await xreply("🎧 Searching for the track... ⏳");
      const searchResult = (await yts(`${query} official`)).videos[0];
      if (!searchResult) return xreply("😕 Couldn't find that song. Try another one!");

      const video = searchResult;
      const apiUrl = `https://api.privatezia.biz.id/api/downloader/ytmp3?url=${encodeURIComponent(video.url)}`;
      const apiData = (await axios.get(apiUrl)).data;

      if (!apiData.status || !apiData.result || !apiData.result.downloadUrl)
        throw new Error("API failed to fetch track!");

      const timestamp = Date.now();
      const fileName = `audio_${timestamp}.mp3`;
      const filePath = path.join(tempDir, fileName);

      // Download MP3
      const audioResponse = await axios({
        method: "get",
        url: apiData.result.downloadUrl,
        responseType: "stream",
        timeout: 600000
      });
      const writer = fs.createWriteStream(filePath);
      audioResponse.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0)
        throw new Error("Download failed or empty file!");

      // Send thumbnail + title
      if (video.thumbnail) {
        await trashcore.sendMessage(
          chat,
          {
            image: { url: video.thumbnail },
            caption: `🎶 Playing *${apiData.result.title || video.title}* 🎧`
          },
          { quoted: m }
        );
      } else {
        await trashcore.sendMessage(
          chat,
          { text: `🎶 Playing *${apiData.result.title || video.title}* 🎧` },
          { quoted: m }
        );
      }

      // Send audio
      await trashcore.sendMessage(
        chat,
        {
          audio: { url: filePath },
          mimetype: "audio/mpeg",
          fileName: `${(apiData.result.title || video.title).substring(0, 100)}.mp3`
        },
        { quoted: m }
      );

      // Cleanup
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (error) {
      console.error("Play command error:", error);
      return xreply(`💥 Error: ${error.message}`);
    }
  }
};