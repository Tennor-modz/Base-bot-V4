const axios = require("axios");

module.exports = {
  command: ["pindl",],
  desc: "Download Pinterest video or image",
  category: "Utility",

  run: async ({ trashcore, chat, args, text, xreply }) => {
    try {
      if (!args[0]) {
        const cmd = text?.split(" ")[0] || ".pindl";
        return xreply(`🔗 *Example:*\n${cmd} https://pin.it/57IghwKl0`);
      }

      const url = args[0];
      await xreply("⏳ Fetching from Pinterest...");

      async function fetchPinterest(url) {
        try {
          const { data } = await axios.get(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile Safari/604.1",
            },
            maxRedirects: 5,
          });

          const video = data.match(/"contentUrl":"(https:\/\/v1\.pinimg\.com\/videos\/[^\"]+\.mp4)"/);
          const image =
            data.match(/"imageSpec_736x":\{"url":"(https:\/\/i\.pinimg\.com\/736x\/[^\"]+\.(jpg|jpeg|png|webp))"/) ||
            data.match(/"imageSpec_564x":\{"url":"(https:\/\/i\.pinimg\.com\/564x\/[^\"]+\.(jpg|jpeg|png|webp))"/);

          const title = data.match(/"name":"([^"]+)"/);
          const author = data.match(/"fullName":"([^"]+)".+?"username":"([^"]+)"/);
          const date = data.match(/"uploadDate":"([^"]+)"/);
          const keyword = data.match(/"keywords":"([^"]+)"/);

          return {
            type: video ? "video" : "image",
            title: title ? title[1] : "Unknown Title",
            author: author ? author[1] : "Unknown",
            username: author ? author[2] : "Unknown",
            media: video ? video[1] : image ? image[1] : null,
            uploadDate: date ? date[1] : "N/A",
            keywords: keyword ? keyword[1].split(",").map(x => x.trim()) : [],
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      const res = await fetchPinterest(url);

      if (res.error) return xreply(`❌ Error: ${res.error}`);
      if (!res.media) return xreply("⚠️ Could not find media from that link.");

      const caption = `📍 *Pinterest Downloader*
📝 Title: ${res.title}
👤 Author: ${res.author} (@${res.username})
📅 Uploaded: ${res.uploadDate}
🔑 Keywords: ${res.keywords.join(", ") || "None"}`;

      // Send based on type
      if (res.type === "video") {
        await trashcore.sendMessage(chat, {
          video: { url: res.media },
          caption
        });
      } else {
        await trashcore.sendMessage(chat, {
          image: { url: res.media },
          caption
        });
      }

      await xreply("✅ Done!");

    } catch (err) {
      console.error("Pinterest Plugin Error:", err);
      return xreply("❌ Failed to fetch Pinterest media.");
    }
  }
};