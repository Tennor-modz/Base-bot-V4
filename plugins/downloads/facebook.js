const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  command: ["fb", "facebook", "instagram", "igdl"],
  desc: "Download Facebook or Instagram media",
  category: "Utility",
  run: async ({ trashcore, m, args, text, xreply,chat }) => {
    try {
      if (!args[0]) {
        const cmd = text.split(" ")[0] || ".fb";
        return xreply(`🔗 Provide a Facebook or Instagram link!\nExample: ${cmd} <link>`);
      }

      const url = args[0];
      const progressMsg = await xreply("⏳ Fetching media... Please wait!");

      async function fetchMedia(url) {
        try {
          const form = new URLSearchParams();
          form.append("q", url);
          form.append("vt", "home");

          const { data } = await axios.post('https://yt5s.io/api/ajaxSearch', form, {
            headers: {
              "Accept": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });

          if (data.status !== "ok") throw new Error("Provide a valid link.");
          const $ = cheerio.load(data.data);

          if (/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+/i.test(url)) {
            const thumb = $('img').attr("src");
            let links = [];
            $('table tbody tr').each((_, el) => {
              const quality = $(el).find('.video-quality').text().trim();
              const link = $(el).find('a.download-link-fb').attr("href");
              if (quality && link) links.push({ quality, link });
            });
            if (links.length > 0) return { platform: "Facebook", type: "video", thumb, media: links[0].link };
            if (thumb) return { platform: "Facebook", type: "image", media: thumb };
            throw new Error("Media is invalid.");
          }

          // Instagram
          if (/^(https?:\/\/)?(www\.)?(instagram\.com\/(p|reel)\/).+/i.test(url)) {
            const video = $('a[title="Download Video"]').attr("href");
            const image = $('img').attr("src");
            if (video) return { platform: "Instagram", type: "video", media: video };
            if (image) return { platform: "Instagram", type: "image", media: image };
            throw new Error("Media is invalid.");
          }

          throw new Error("Provide a valid Facebook or Instagram URL.");
        } catch (err) {
          return { error: err.message };
        }
      }

      const res = await fetchMedia(url);

      if (res.error) return xreply(`⚠️ Error: ${res.error}`);

      await xreply("⏳ Media found! Downloading...");

      if (res.type === "video") {
        await trashcore.sendMessage(chat, {
          video: { url: res.media },
          caption: `✅ Downloaded video from ${res.platform}!`,
        }, { quoted: m });
      } else if (res.type === "image") {
        await trashcore.sendMessage(chat, {
          image: { url: res.media },
          caption: `✅ Downloaded photo from ${res.platform}!`,
        }, { quoted: m });
      }

      await xreply("✅ Done!");

    } catch (err) {
      console.error("FB/IG plugin error:", err);
      await xreply("❌ Failed to get media.");
    }
  }
};