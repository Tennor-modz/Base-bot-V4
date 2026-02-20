const axios = require("axios");

module.exports = {
  command: "llama",
  desc: "Chat with LLaMA AI API",
  category: "AI",
  usage: ".llama <message>",

  run: async ({ m, args, xreply }) => {
    try {
      const text = args.join(" ");
      if (!text) return await xreply("❌ Please type a message. Example: `.llama hi`");

      const url = `https://apiskeith.vercel.app/ai/ilama?q=${encodeURIComponent(text)}`;
      const response = await axios.get(url);
      const replyText = response.data?.result;

      if (!replyText) return await xreply("⚠️ No response from the AI.");

      return await xreply(replyText);

    } catch (err) {
      console.error("❌ LLaMA API Error:", err.message);
      return await xreply("💥 API error! Try again later.");
    }
  },
};