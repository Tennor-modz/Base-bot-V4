const { downloadContentFromMessage } = require('@trashcore/baileys');

module.exports = {
  command: ["vv", "viewonce"],
  desc: "Retrieve view-once media",
  category: "Tools",

  run: async ({ trashcore, m, xreply, chat }) => {
    try {

      if (!m.quoted) {
        return xreply("⚠️ Reply to a *view once* message!");
      }

      const quotedMsg = m.quoted.message;
      const viewOnceMsg =
        quotedMsg?.viewOnceMessage?.message ||
        quotedMsg?.viewOnceMessageV2?.message ||
        quotedMsg?.viewOnceMessageV2Extension?.message ||
        quotedMsg;

      const imageMsg = viewOnceMsg?.imageMessage;
      const videoMsg = viewOnceMsg?.videoMessage;

      if (!imageMsg && !videoMsg) {
        return xreply("⚠️ This is not a *view once* message!");
      }

      const mediaMessage = imageMsg || videoMsg;
      const type = imageMsg ? "image" : "video";

      const stream = await downloadContentFromMessage(mediaMessage, type);

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      await trashcore.sendMessage(
        chat,
        type === "image"
          ? { image: buffer, caption: "*Retrieved by Trashcore*" }
          : { video: buffer, caption: "*Retrieved by Trashcore*" },
        { quoted: m }
      );

    } catch (err) {
      console.error("VV Error:", err);
      xreply("❌ Failed to retrieve view-once media.");
    }
  }
};