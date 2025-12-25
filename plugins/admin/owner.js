module.exports = {
  command: "owner",
  desc: "Bot owner info",
  run: async ({ trashcore, chat }) => {
    await trashcore.sendMessage(chat, { text: "👤 Owner: Trashcore Devs" });
  }
};