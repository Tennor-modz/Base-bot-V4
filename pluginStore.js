const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const chokidar = require("chokidar");

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
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  walkPlugins(dir);
  console.log(chalk.cyanBright(`🔌 Commands loaded: ${plugins.size}`));
}

function watchPlugins() {
  const dir = path.join(__dirname, "plugins");

  chokidar.watch(dir, {
    persistent: true,
    ignoreInitial: true,        // don't fire for files already loaded
    awaitWriteFinish: {
      stabilityThreshold: 300,  // wait 300ms after last write before triggering
      pollInterval: 100
    }
  }).on("add", filePath => {
    const rel = path.relative(dir, filePath).replace(/\\/g, "/");
    if (!rel.endsWith(".js")) return;
    console.log(chalk.yellow(`🔄 Plugin added: ${rel}`));
    loadPlugin(rel);

  }).on("change", filePath => {
    const rel = path.relative(dir, filePath).replace(/\\/g, "/");
    if (!rel.endsWith(".js")) return;
    console.log(chalk.yellow(`🔄 Plugin changed: ${rel}`));

    for (const [cmd, data] of plugins.entries()) {
      if (data.__file === rel) plugins.delete(cmd);
    }
    loadPlugin(rel);

  }).on("unlink", filePath => {
    const rel = path.relative(dir, filePath).replace(/\\/g, "/");
    if (!rel.endsWith(".js")) return;
    console.log(chalk.red(`🗑 Plugin removed: ${rel}`));

    for (const [cmd, data] of plugins.entries()) {
      if (data.__file === rel) plugins.delete(cmd);
    }
  });
}

module.exports = { plugins, loadPlugins, watchPlugins };
