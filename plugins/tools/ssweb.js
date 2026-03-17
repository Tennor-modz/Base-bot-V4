const axios = require("axios");

module.exports = {
  command: ["ssweb", "ss"],
  desc: "Take a screenshot of a website",
  category: "Tools",
  limit: true,

  run: async ({ trashcore, m, chat, xreply }) => {
    try {
      const text =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption ||
        m.message?.buttonsResponseMessage?.selectedButtonId ||
        m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.message?.templateButtonReplyMessage?.selectedId ||
        "";

      const args = text.trim().split(/\s+/).slice(1);
      if (!args[0]) return xreply("❌ Example:\n.ssweb google.com");

      let url = args[0].trim();
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      const pick = (k, d) => {
        const f = args.find(a => a.startsWith(`--${k}=`));
        return f ? f.split("=").slice(1).join("=").trim() : d;
      };
      const toBool = v => /^(1|true|on|ya|y)$/i.test(String(v));

      const width = parseInt(pick("w", 1280));
      const height = parseInt(pick("h", 720));
      const full = toBool(pick("full", false));
      const scale = parseInt(pick("scale", 1));

      const statusMsg = await xreply("⏳ Taking screenshot...");

      const { data } = await axios.post(
        "https://gcp.imagy.app/screenshot/createscreenshot",
        {
          url,
          browserWidth: width,
          browserHeight: height,
          fullPage: full,
          deviceScaleFactor: scale,
          format: "png",
        },
        {
          headers: {
            "content-type": "application/json",
            referer: "https://imagy.app/full-page-screenshot-taker/",
            "user-agent":
              "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137.0.0.0 Mobile Safari/537.36",
          },
          timeout: 30000,
        }
      );

      if (!data?.fileUrl) return xreply("❌ Failed to get screenshot file");

      await trashcore.sendMessage(
        chat,
        {
          image: { url: data.fileUrl },
          caption: `✅ Screenshot successful\n🌐 URL: ${url}`,
        },
        { quoted: m }
      );

    } catch (e) {
      console.error("SSWEB ERROR:", e);
      await xreply("⚠️ " + (e.message || "An error occurred"));
    }
  },
};