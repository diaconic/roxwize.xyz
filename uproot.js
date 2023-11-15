const glob = require("glob").glob;
const pug = require("pug");
const fs = require("fs/promises");
const gm = require("gray-matter");
const md = require("marked").parse;
const path = require("path");

const render = async (filePath) => {
  console.log(`==\t\treading ${filePath}`);
  const relativePath = filePath.replace(/[^\/]+\//, "");
  const dir = relativePath.match(/^(?:[^\/]+\/)+/);
  if (dir) {
    await fs.mkdir(`./public/site/${dir[0]}`, { recursive: true });
  }
  const file = (await fs.readFile(filePath)).toString("ascii");
  const matter = gm(file);
  let out;
  if (matter.data.nowrap) {
    out = md(matter.content);
  } else if (matter.data.template) {
    const data = JSON.parse((await fs.readFile(matter.data.data)).toString("ascii"));
    out = pug.compileFile(`./templates/${matter.data.template}.pug`)({
      title: matter.data.title,
      gm: matter.data,
      content: md(matter.content),
      data: data
    });
  } else {
    out = pug.compileFile("./templates/site.pug")({
      title: matter.data.title,
      gm: matter.data,
      content: md(matter.content),
    });
  }
  await fs.writeFile(
    `./public/site/${relativePath.replace(/\.[^\/.]+$/, "").replace(/[^\/]+\//, "")}.html`, // ugh
    out
  );
}

// Render the main Markdown pages, other stuff comes later
async function renderSrc() {
  console.log("====\tFuuuckkk");
  const src = await glob("./src/**/*.md");
  for (let filePath of src) {
    if (path.extname(filePath) !== ".md") return;
    await render(filePath);
  }
}

async function renderNavbar() {
  // Update navbar
  console.log("====\tUpdating navbar");
  const navbar = JSON.parse((await fs.readFile("_nav.json")).toString("ascii"));
  const out = pug.compileFile("./templates/nav.pug")({
    n: navbar,
  });
  console.log("==\t\tWriting to _nav.html");
  await fs.writeFile("./public/site/_nav.html", out);
}

const w = (async () => {
  await renderSrc();
  await renderNavbar();
  console.log("It is done");
});

// (() => {
//   console.log(
//     "GOOD EVENING\nWe are watching for changes at " + new Date().toISOString()
//   );
//   watch("./", { recursive: true }, async (e ,f) => {
//     const ext = path.extname(f);
//     changes.push(e+" "+f);
//     console.log(`${f} has just been ${e}d`);
//     if (ext === ".pug") { renderSrc(); return; }
//     if (ext !== ".md" && ext !== ".json") return;
//     if (e === "update") {
//       if (f === "_nav.json") { renderNavbar(); return; }
//       render(f);
//     } else if (e === "remove" && ext === ".md") {
//       const dir = "site/"+f.match(/[-_\w]+(?=[.][\w]+)/i)[0]+".html";
//       if (!(require("fs").existsSync(dir))) return;
//       console.log(`(We are going to remove ${dir}`);
//       await fs.rm(dir);
//     }
//     console.log("\t\t\t\tTOTAL CHANGES THUS FAR:\n"+changes.join("\n\t\t"))
//   });
// })();

w();
