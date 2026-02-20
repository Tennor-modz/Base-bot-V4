const axios = require("axios");

module.exports = {
  command: ["copilot"],
  desc: "Ask AI Copilot a question",
  category: "AI",
  usage: ".copilot <your question>",
  run: async ({ trashcore, m, args, xreply, chat }) => {
    try {
      if (!args.length) {
        return xreply("🤖 Please provide a question for Copilot.\nExample: `.copilot Hi`");
      }

      const prompt = args.join(" ").slice(0, 500);

      await xreply("🤖 Asking Copilot...");

      const apiUrl = `https://api.ootaizumi.web.id/ai/copilot?prompt=${encodeURIComponent(prompt)}`;

      const { data } = await axios.get(apiUrl, { timeout: 30000 });

      if (!data?.status || !data?.result?.text) {
        return xreply("❌ Copilot failed to respond.");
      }

      await trashcore.sendMessage(
        chat,
        { text: `🤖 *Copilot Response:*\n\n${data.result.text}` },
        { quoted: m }
      );

    } catch (err) {
      console.error("❌ Copilot error:", err?.message || err);
      xreply("⚠️ Failed to contact Copilot. Please try again later.");
    }
  }
};