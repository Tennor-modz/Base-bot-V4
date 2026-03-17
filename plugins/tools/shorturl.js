const axios = require("axios");

module.exports = {
  command: ["shortlink", "shorturl"],
  desc: "Create a short URL from a link",
  category: "Tools",

  run: async ({ trashcore, m, text, xreply }) => {
    try {
      const input = text.trim();
      if (!input) {
        return xreply(
          "❌ Please provide a link to shorten!\nExample:\n.shortlink https://google.com"
        );
      }

      const { data } = await axios.get(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(input)}`
      );

      await xreply(`✅ Shortlink created successfully:\n${data}`);
    } catch (e) {
      console.error("SHORTLINK ERROR:", e);
      await xreply("❌ Failed to create shortlink: " + (e.message || e));
    }
  }
};