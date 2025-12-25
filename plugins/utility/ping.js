module.exports = {
  command: ["ping", "p"],
  desc: "Check bot latency",
  category: "Utility",
  usage: ".ping",
  run: async ({ m, xreply }) => {
    const start = Date.now();
    await xreply("Pinging...");

    const latency = Date.now() - start;
    await xreply(`📍 Pong: ${latency} ms`);
  }
};