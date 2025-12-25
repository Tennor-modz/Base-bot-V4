module.exports = {
  command: ["kick"],
  desc: "Kick a user from the group",
  category: "Group",

  run: async ({ trashcore, chat, isOwner, m, xreply, args }) => {
    try {
      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");

      if (!isOwner) return xreply("⚠️ Only the bot owner can use .kick");

      const group = await trashcore.groupMetadata(chat);
      const participants = group.participants;

      // --- Resolve target ---
      let target =
        (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) ||
        (m.message?.extendedTextMessage?.contextInfo?.participant) || 
        (args[0] && args[0].replace(/\D/g, "")); 

      if (!target)
        return xreply(`⚠️ Mention, reply, or provide a number.\nExample:
.kick @user
.kick (reply)
.kick 2547xxxxxxx`);

      if (/^\d+$/.test(target) && !target.includes("@")) {
        const participant = participants.find(p => p.id.endsWith(target + "@s.whatsapp.net"));
        target = participant ? participant.id : `${target}@s.whatsapp.net`;
      }

      const isTargetAdmin = participants.some(p => p.id === target && p.admin);
      if (isTargetAdmin) return xreply("🚫 I can't kick a group admin.");

      await trashcore.groupParticipantsUpdate(chat, [target], "remove");
      return xreply(`👢 Removed @${target.split("@")[0]}`, { mentions: [target] });

    } catch (err) {
      console.error("Kick Error:", err);
      return xreply("❌ Failed to kick. Check bot permissions or ID.");
    }
  },
};