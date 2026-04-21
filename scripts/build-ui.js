// scripts/build-ui.js
// Inlines src/ui.css and src/ui.js into src/ui.html → ui.html
// Usage: node scripts/build-ui.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_HTML = path.join(ROOT, "src", "ui.html");
const SRC_CSS = path.join(ROOT, "src", "ui.css");
const SRC_JS = path.join(ROOT, "src", "ui.js");
const OUT_HTML = path.join(ROOT, "ui.html");

function build() {
  const html = fs.readFileSync(SRC_HTML, "utf8");
  const css = fs.readFileSync(SRC_CSS, "utf8");
  const js = fs.readFileSync(SRC_JS, "utf8");

  // Replace CSS placeholder comment inside <style> tags
  const withCss = html.replace(
    /(<style>)[\s\S]*?(<\/style>)/,
    `$1\n${css}\n    $2`
  );

  // Replace JS placeholder comment inside <script> tags
  const withJs = withCss.replace(
    /(<script>)[\s\S]*?(<\/script>)/,
    `$1\n${js}\n    $2`
  );

  fs.writeFileSync(OUT_HTML, withJs, "utf8");

  console.log(`[${new Date().toLocaleTimeString()}] ✓ ui.html rebuilt`);
}

build();

if (process.argv.includes("--watch")) {
  console.log("Watching src/ for changes...");
  let timeout;
  fs.watch(path.join(ROOT, "src"), (eventType, filename) => {
    if (filename && (filename === "ui.html" || filename === "ui.css" || filename === "ui.js")) {
      clearTimeout(timeout);
      timeout = setTimeout(build, 100);
    }
  });
}
