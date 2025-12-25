const { getSetting, setSetting } = require("../../database");

module.exports = {
  command: ["mode"],
  desc: "Switch bot mode (private/public) — owner only",
  category: "Owner",
  usage: ".mode <private|public>",
  run: async ({ m, args, xreply, isOwner }) => {
    if (!isOwner) return xreply("❌ Only the bot owner can use this command.");

    if (!args[0]) {
      return xreply(
        "Usage:\n" +
        ".`mode private` — Switch bot to private mode (only owner can use commands)\n" +
        ".`mode public` — Switch bot to public mode (everyone can use commands)"
      );
    }

    const mode = args[0].toLowerCase();
    if (mode !== "private" && mode !== "public") {
      return xreply("❌ Invalid mode. Use either `private` or `public`.");
    }

    const newMode = mode === "private";
    await setSetting("privateMode", newMode);

    xreply(`✅ Bot mode is now: ${newMode ? "PRIVATE (owner only)" : "PUBLIC (everyone can use)"} ✅`);
  }
};