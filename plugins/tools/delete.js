module.exports = {
  command: ["delete", "del"],
  desc: "Owner delete message (no admin checks)",
  category: "Tools",

  run: async ({ trashcore, m, chat, xreply, isOwner }) => {
    try {
      if (!isOwner) {
        return xreply("⚠️ Only bot owner can use this command.");
      }

      const quoted = m.quoted || m.message?.extendedTextMessage?.contextInfo;

      if (!quoted) {
        return xreply("⚠️ Reply to the message you want to delete.");
      }

      const key = m.quoted?.key || {
        remoteJid: chat,
        fromMe: false,
        id: m.message.extendedTextMessage.contextInfo.stanzaId,
        participant: m.message.extendedTextMessage.contextInfo.participant
      };
      await trashcore.sendMessage(chat, { delete: key });

    } catch (err) {
      console.error("Delete Error:", err);
      xreply("❌ Failed (bot may not be admin).");
    }
  }
};