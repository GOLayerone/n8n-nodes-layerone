const path = require("path");
const { task, src, dest } = require("gulp");

// Copie les icones SVG des noeuds vers dist/ lors du build
// (les .svg ne sont pas geres par tsc).
task("build:icons", copyIcons);

function copyIcons() {
  const nodeSource = path.resolve("nodes", "**", "*.{png,svg}");
  const nodeDestination = path.resolve("dist", "nodes");

  src(nodeSource).pipe(dest(nodeDestination));

  const credSource = path.resolve("credentials", "**", "*.{png,svg}");
  const credDestination = path.resolve("dist", "credentials");

  return src(credSource, { allowEmpty: true }).pipe(dest(credDestination));
}
