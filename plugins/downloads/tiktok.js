const fg = require("api-dylux"); 
module.exports = {
  command: ["tiktok", "tt"],
  desc: "Download TikTok video or audio",
  category: "Utility",
  run: async ({ trashcore, m, args, xreply }) => {
    try {
      if (!args[0]) return xreply("⚠️ Provide a TikTok link.");

      await xreply("⏳ Fetching TikTok data...");

      const data = await fg.tiktok(args[0]); 
      const json = data.result;
      let caption = `🎵 [TIKTOK DOWNLOAD]\n\n`;
      caption += `◦ Id: ${json.id}\n`;
      caption += `◦ Username: ${json.author.nickname}\n`;
      caption += `◦ Title: ${json.title}\n`;
      caption += `◦ Likes: ${json.digg_count}\n`;
      caption += `◦ Comments: ${json.comment_count}\n`;
      caption += `◦ Shares: ${json.share_count}\n`;
      caption += `◦ Plays: ${json.play_count}\n`;
      caption += `◦ Created: ${json.create_time}\n`;
      caption += `◦ Size: ${json.size}\n`;
      caption += `◦ Duration: ${json.duration}`;

      if (json.images && json.images.length > 0) {
        for (const imgUrl of json.images) {
          await trashcore.sendMessage(m.key.remoteJid, { image: { url: imgUrl } }, { quoted: m });
        }
      } else {
        await trashcore.sendMessage(
          m.key.remoteJid,
          { video: { url: json.play }, mimetype: "video/mp4", caption },
          { quoted: m }
        );

        setTimeout(async () => {
          if (json.music)
            await trashcore.sendMessage(
              m.key.remoteJid,
              { audio: { url: json.music }, mimetype: "audio/mpeg" },
              { quoted: m }
            );
        }, 3000);
      }
    } catch (err) {
      console.error("TikTok plugin error:", err);
      await xreply("❌ Failed to fetch TikTok data. Make sure the link is valid.");
    }
  }
};