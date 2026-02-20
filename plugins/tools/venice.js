const axios = require("axios");

module.exports = {
  command: "venice",
  desc: "AI response using Venice API",
  category: "AI",
  usage: ".venice <message>",

  run: async ({ args, xreply }) => {
    try {
      const text = args.join(" ");
      if (!text) return await xreply("❌ Please enter a message. Example: `.venice hello`");

      const apiURL = `https://apiskeith.vercel.app/ai/venice?q=${encodeURIComponent(text)}`;
      const response = await axios.get(apiURL);

      const result = response.data?.result;
      if (!result) return await xreply("⚠️ Venice API returned no response.");

      return await xreply(result);

    } catch (err) {
      console.error("❌ Venice API Error:", err.message);
      return await xreply("💥 Venice AI is unavailable right now. Try again later.");
    }
  },
};