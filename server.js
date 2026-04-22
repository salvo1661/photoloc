import fs from "fs";
import path from "path";
import express from "express";

const root = process.cwd();
const app = express();
const port = process.env.PORT || 4173;

app.use(express.static(path.join(root, "dist/client"), { index: false }));

const supportedLanguages = ["en", "es", "pt", "fr", "de", "hi", "ja", "ko", "id", "ar", "zh", "ru", "bn", "uk", "pl", "th", "ur", "sw", "ta"];
const fallbackLanguage = "en";

const normalizeStackedLanguagePath = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const first = segments[0];
  if (!supportedLanguages.includes(first)) return null;

  let index = 1;
  while (index < segments.length && supportedLanguages.includes(segments[index])) {
    index += 1;
  }

  if (index === 1) return null;
  const rest = segments.slice(index);
  return rest.length > 0 ? `/${first}/${rest.join("/")}` : `/${first}`;
};

const negotiateLanguage = (headerValue) => {
  const raw = typeof headerValue === "string" ? headerValue : "";
  if (!raw) return fallbackLanguage;

  const weighted = raw
    .split(",")
    .map((part, index) => {
      const [tagPart, ...params] = part.trim().split(";");
      const tag = tagPart.toLowerCase();
      if (!tag || tag === "*") return null;
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      const weight = Number.isFinite(q) ? q : 1;
      return { tag, weight, index };
    })
    .filter((item) => item !== null)
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.index - b.index;
    });

  for (const item of weighted) {
    if (supportedLanguages.includes(item.tag)) return item.tag;
    const primary = item.tag.split("-")[0];
    if (supportedLanguages.includes(primary)) return primary;
  }

  return fallbackLanguage;
};

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
    const normalizedPath = normalizeStackedLanguagePath(req.path);
    if (normalizedPath && normalizedPath !== req.path) {
      const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      res.redirect(301, `${normalizedPath}${query}`);
      return;
    }

    if (req.path === "/") {
      const lang = negotiateLanguage(req.get("accept-language"));
      const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      res.set("Vary", "Accept-Language");
      res.redirect(307, `/${lang}${query}`);
      return;
    }

    const url = req.originalUrl;
    const template = fs.readFileSync(path.join(root, "dist/client/index.html"), "utf-8");

    const { render } = await import(path.join(root, "dist/server/entry-server.js"));
    const { appHtml, helmet } = await render(url);
    const helmetTitle = helmet?.title?.toString() ?? "";
    const helmetMeta = helmet?.meta?.toString() ?? "";
    const helmetLink = helmet?.link?.toString() ?? "";
    const helmetHtmlAttrs = helmet?.htmlAttributes?.toString() ?? "";

    let html = template;

    html = html.replace("<div id=\"root\"></div>", `<div id=\"root\">${appHtml}</div>`);
    html = html.replace("</head>", `${helmetTitle}${helmetMeta}${helmetLink}</head>`);
    if (helmetHtmlAttrs) {
      html = html.replace(/<html[^>]*>/i, `<html ${helmetHtmlAttrs}>`);
    }

    res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`SSR server running at http://localhost:${port}`);
});
