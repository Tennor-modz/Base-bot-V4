const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const plugins = new Map();

function walkPlugins(dir, baseDir = dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const full = path.join(dir, file.name);
    if (file.isDirectory()) walkPlugins(full, baseDir);
    if (file.isFile() && file.name.endsWith(".js")) {
      const rel = path.relative(baseDir, full).replace(/\\/g, "/");
      loadPlugin(rel);
    }
  }
}

function loadPlugin(relativePath) {
  try {
    const pluginPath = path.join(__dirname, "plugins", relativePath);
    delete require.cache[require.resolve(pluginPath)];

    const plugin = require(pluginPath);
    if (!plugin.command || !plugin.run) return;

    const category = path.dirname(relativePath).split("/").pop();
    const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];

    cmds.forEach(cmd => {
      plugins.set(cmd.toLowerCase(), {
        ...plugin,
        category,
        __file: relativePath
      });
    });

    console.log(chalk.green(`✔ Loaded [${category}] → ${relativePath}`));
  } catch (e) {
    console.log(chalk.red(`✖ Failed loading ${relativePath}`));
    console.error(e.message);
  }
}

function loadPlugins() {
  plugins.clear();
  const dir = path.join(__dirname, "plugins");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  walkPlugins(dir);
  console.log(chalk.cyanBright(`🔌 Commands loaded: ${plugins.size}`));
}

function watchPlugins() {
  const dir = path.join(__dirname, "plugins");
  fs.watch(dir, { recursive: true }, (_, filename) => {
    if (!filename || !filename.endsWith(".js")) return;
    const file = filename.replace(/\\/g, "/");
    console.log(chalk.yellow(`🔄 Plugin change: ${file}`));

    for (const [cmd, data] of plugins.entries()) {
      if (data.__file === file) plugins.delete(cmd);
    }

    const full = path.join(dir, file);
    if (fs.existsSync(full)) loadPlugin(file);
    else console.log(chalk.red(`🗑 Removed: ${file}`));
  });
}

module.exports = { plugins, loadPlugins, watchPlugins };