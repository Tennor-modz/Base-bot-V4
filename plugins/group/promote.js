module.exports = {
  command: ["promote"],
  desc: "Promote a member to admin",
  category: "Group",

  run: async ({ trashcore, chat, m, args, xreply, isOwner }) => {
    try {
      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");
      const group = await trashcore.groupMetadata(chat);
      const participants = group.participants;

      const botId = trashcore.user.id;
      const senderId = m.sender;
      const botAdmin = participants.find(p => p.id === botId && (p.admin === "admin" || p.admin === "superadmin"));
      if (!isOwner) return xreply("⚠️ only bot owners can promote members.");
      const senderAdmin = participants.find(p => p.id === senderId && (p.admin === "admin" || p.admin === "superadmin"));
      if (!isOwner) return xreply("⚠️ Only group admins can use .promote");
      let target =
        (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) || 
        (m.message?.extendedTextMessage?.contextInfo?.participant) || 
        (args[0] && args[0].replace(/\D/g, "")); 

      if (!target)
        return xreply(`⚠️ Mention, reply, or provide a number.\nExample:\n.promote @user\n.promote (reply)`);

      if (/^\d+$/.test(target) && !target.includes("@")) {
        const participant = participants.find(p => p.id.endsWith(target + "@s.whatsapp.net"));
        target = participant ? participant.id : `${target}@s.whatsapp.net`;
      }
      const isTargetAdmin = participants.find(p => p.id === target && (p.admin === "admin" || p.admin === "superadmin"));
      if (isTargetAdmin) return xreply("⚠️ This user is already an admin.");
      await trashcore.groupParticipantsUpdate(chat, [target], "promote");
      await xreply(`✅ Promoted @${target.split("@")[0]} to admin.`, { mentions: [target] });

    } catch (err) {
      console.error("Promote Command Error:", err);
      return xreply("❌ Failed to promote member. Check bot permissions.");
    }
  }
};