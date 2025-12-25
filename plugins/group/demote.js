module.exports = {
  command: ["demote"],
  desc: "Demote a member from admin (owner only)",
  category: "Group",

  run: async ({ trashcore, chat, m, args, xreply, isOwner }) => {
    try {
      if (!isOwner) return xreply("⚠️ Only the bot owner can use .demote");

      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");

      const group = await trashcore.groupMetadata(chat);
      const participants = group.participants;
      let target =
        (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) || 
        (m.message?.extendedTextMessage?.contextInfo?.participant) || 
        (args[0] && args[0].replace(/\D/g, "")); 

      if (!target)
        return xreply(`⚠️ Mention, reply, or provide a number.\nExample:\n.demote @user\n.demote (reply)`);
      if (/^\d+$/.test(target) && !target.includes("@")) {
        const participant = participants.find(p => p.id.endsWith(target + "@s.whatsapp.net"));
        target = participant ? participant.id : `${target}@s.whatsapp.net`;
      }
      const isTargetAdmin = participants.find(p => p.id === target && (p.admin === "admin" || p.admin === "superadmin"));
      if (!isTargetAdmin) return xreply("⚠️ This user is not an admin.");
      await trashcore.groupParticipantsUpdate(chat, [target], "demote");
      await xreply(`✅ Demoted @${target.split("@")[0]} from admin.`, { mentions: [target] });

    } catch (err) {
      console.error("Demote Command Error:", err);
      return xreply("❌ Failed to demote member. Check bot permissions.");
    }
  }
};