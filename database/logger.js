const chalk = require('chalk');

async function logMessage(m, trashcore) {
  if (!m?.message) return;

  const chatId = m.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const senderJid = m.key.participant || chatId;
  const senderNumber = senderJid.split("@")[0];

  let text = '';
  if (m.message?.conversation) text = m.message.conversation;
  else if (m.message?.extendedTextMessage?.text) text = m.message.extendedTextMessage.text;
  else if (m.message?.imageMessage?.caption) text = m.message.imageMessage.caption;
  else if (m.message?.videoMessage?.caption) text = m.message.videoMessage.caption;
  else if (m.message?.documentMessage?.caption) text = m.message.documentMessage.caption;
  else if (m.message?.buttonsResponseMessage?.selectedButtonId) text = m.message.buttonsResponseMessage.selectedButtonId;
  else if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) text = m.message.listResponseMessage.singleSelectReply.selectedRowId;
  else if (m.message?.templateButtonReplyMessage?.selectedId) text = m.message.templateButtonReplyMessage.selectedId;

  let chatName = chatId;
  if (isGroup) {
    try {
      const metadata = await trashcore.groupMetadata(chatId);
      chatName = metadata.subject || chatId;
    } catch {
      chatName = chatId;
    }
  }

  let senderName = senderNumber;
  try {
    if (isGroup) {
      const groupMetadata = await trashcore.groupMetadata(chatId);
      const participant = groupMetadata.participants.find(p => p.id === senderJid);
      senderName = participant?.notify || senderNumber;
    } else {

      const contact = await trashcore.onWhatsApp(senderJid);
      senderName = contact?.[0]?.notify || senderNumber;
    }
  } catch {
    senderName = senderNumber;
  }

  if (isGroup) {
    console.log(chalk.bgBlue.black(`
📨 NEW GROUP MESSAGE
From        : ${senderName}
Sender num  : ${senderNumber}
In          : ${chatName}
Message     : ${text}
`));
  } else {
    console.log(chalk.bgGreen.black(`
📨 NEW PRIVATE MESSAGE
From        : ${senderName}
Sender num  : ${senderNumber}
In          : ${chatId}
Message     : ${text}
`));
  }
}

module.exports = { logMessage };