const { downloadContentFromMessage } = require('@trashcore/baileys');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: ["q", "quote", "quotedinfo"],
  desc: "Get detailed information about a quoted message",
  category: "Tools",

  run: async ({ trashcore, m, chat, xreply }) => {
    try {
      if (!m.quoted) return xreply("❌ Reply to the message you want to inspect");

      const quoted = m.quoted;

      const messageData = {
        type: quoted.mtype || 'unknown',
        sender: quoted.sender || 'unknown',
        chat: quoted.chat || chat,
        timestamp: quoted.timestamp || Date.now(),
        text: quoted.text || quoted.body || '',
        caption: quoted.caption || '',
        mimetype: quoted.mimetype || '',
        isForwarded: quoted.isForwarded || false,
        forwardingScore: quoted.forwardingScore || 0,
        hasMedia: quoted.hasMedia || false,
        quoted: quoted.isQuoted || false,
        key: quoted.key || {}
      };

      // If the quoted message has media, attempt to download it and get its size
      if (quoted.hasMedia) {
        try {
          const tempDir = path.join(process.cwd(), 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

          const tempFile = path.join(tempDir, `quote_${Date.now()}`);
          const stream = await downloadContentFromMessage(quoted, quoted.mtype || 'document');

          let buffer = Buffer.from([]);
          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          fs.writeFileSync(tempFile, buffer);

          messageData.mediaSize = buffer.length;
          messageData.mediaDownloaded = true;

          fs.unlinkSync(tempFile); // cleanup
        } catch (e) {
          messageData.mediaError = e.message;
        }
      }

      const jsonData = JSON.stringify(messageData, null, 2);

      await trashcore.sendMessage(
        chat,
        {
          text: `📋 *Quote Information*\n\n\`\`\`json\n${jsonData}\n\`\`\``,
          contextInfo: { mentionedJid: [m.sender] }
        },
        { quoted: m }
      );

    } catch (error) {
      console.error('[QUOTEINFO ERROR]', error);
      await xreply('❌ Failed to fetch quoted message information');
    }
  }
};