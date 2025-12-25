module.exports = {
  command: ["hidetag"],
  desc: "Send a message to all members without visible mentions",
  category: "Group",

  run: async ({ trashcore, chat, m, xreply, isOwner, text }) => {
    try {
      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");

      if (!isOwner) return xreply("⚠️ Only the bot owner can use .hidetag");

      const group = await trashcore.groupMetadata(chat);
      const participants = group.participants;

      if (!participants || participants.length === 0)
        return xreply("⚠️ Could not fetch group members.");

      if (!text) return xreply("⚠️ Provide a message to send.");
      await trashcore.sendMessage(chat, {
        text: text,
        mentions: participants.map(p => p.id),
      });

    } catch (err) {
      console.error("Hidetag Error:", err);
      return xreply("❌ Failed to send hidetag message.");
    }
  },
};