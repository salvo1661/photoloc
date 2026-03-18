import fs from "fs";
import path from "path";
import express from "express";

const root = process.cwd();
const app = express();
const port = process.env.PORT || 4173;

app.use(express.static(path.join(root, "dist/client"), { index: false }));

const supportedLanguages = ["en","es","pt","fr","de","hi","ja","ko","id","ar","zh"];

app.get("/sitemap.xml", (req, res) => {
  const host = "https://photo.localtool.tech";
  const urls = ["/", "/en"];
  supportedLanguages.forEach((lang) => {
    urls.push(`/${lang}`);
  });

  const items = urls.map((route) => {
    const loc = `${host}${route}`;
    return `  <url><loc>${loc}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`;
  }).join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap);
});

app.get("*", async (req, res) => {
  try {
    const url = req.originalUrl;
    const template = fs.readFileSync(path.join(root, "dist/client/index.html"), "utf-8");

    const { render } = await import(path.join(root, "dist/server/entry-server.js"));
    const { appHtml, helmet } = await render(url);

    let html = template;

    html = html.replace("<div id=\"root\"></div>", `<div id=\"root\">${appHtml}</div>`);
    html = html.replace("<title>Image Editor</title>", `${helmet.title}${helmet.meta}${helmet.link}<title>Image Editor</title>`);

    res.status(200).set({ "Content-Type": "text/html" }).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`SSR server running at http://localhost:${port}`);
});
