module.exports = {
  command: "setprefix",
  desc: "Change command prefix (bot owner only)",
  category: "Admin",
  usage: ".setprefix <new_prefix>",
  run: async ({ m, args, xreply, isOwner, trashcore }) => {
    if (!isOwner) return xreply("❌ Only the bot owner can use this command.");
    if (!args[0]) return xreply("❌ Usage: .setprefix <new_prefix>");

    const { setSetting } = require("../../database");
    setSetting("prefix", args[0]);

    await xreply(`✅ Command prefix updated to: \`${args[0]}\``);
  }
};