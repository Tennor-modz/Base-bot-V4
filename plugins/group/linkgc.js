module.exports = {
  command: ["linkgc",],
  desc: "Get group link, name, member count, admin count, and profile picture",
  category: "Group",

  run: async ({ trashcore, chat, m, xreply }) => {
    try {
      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");
      const group = await trashcore.groupMetadata(chat);

      const groupName = group.subject || "N/A";
      const memberCount = group.participants.length;
      const adminCount = group.participants.filter(p => p.admin || p.admin === "superadmin").length;

      let groupLink;
      try {
        const inviteCode = await trashcore.groupInviteCode(chat);
        groupLink = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : "No invite link available";
      } catch {
        groupLink = "No invite link available";
      }
      let profilePicUrl;
      try {
        profilePicUrl = await trashcore.profilePictureUrl(chat, "image");
      } catch {
        profilePicUrl = null;
      }

      let text = `📊 *Group Info*\n\n`;
      text += `👥 Name: ${groupName}\n`;
      text += `🔗 Link: ${groupLink}\n`;
      text += `👤 Members: ${memberCount}\n`;
      text += `🛡️ Admins: ${adminCount}`;

      if (profilePicUrl) {
        await trashcore.sendMessage(chat, {
          image: { url: profilePicUrl },
          caption: text
        }, { quoted: m });
      } else {
        await xreply(text);
      }

    } catch (err) {
      console.error("linkgc Error:", err);
      await xreply("❌ Failed to fetch group info.");
    }
  }
};