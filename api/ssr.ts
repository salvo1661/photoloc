import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const supportedLanguages = ["en", "es", "pt", "fr", "de", "hi", "ja", "ko", "id", "ar", "zh", "ru", "bn", "uk", "pl", "th", "ur", "sw"];

const getContentType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".xml":
      return "application/xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
};

const sendStatic = (res: any, filePath: string) => {
  if (!fs.existsSync(filePath)) return false;
  const data = fs.readFileSync(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", getContentType(filePath));
  res.end(data);
  return true;
};

export default async function handler(req: any, res: any) {
  try {
    const url = req?.url ?? "/";
    const pathname = url.split("?")[0] || "/";
    const root = process.cwd();

    if (pathname === "/sitemap.xml") {
      const host = "https://photo.localtool.tech";
      const urls = ["/", "/en", ...supportedLanguages.map((lang) => `/${lang}`)];
      const items = urls
        .map(
          (route) =>
            `  <url><loc>${host}${route}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
        )
        .join("\n");
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(sitemap);
      return;
    }

    if (pathname.includes(".") || pathname.startsWith("/assets/")) {
      const staticPath = path.join(root, "dist/client", pathname);
      if (sendStatic(res, staticPath)) return;
      const publicPath = path.join(root, "public", pathname);
      if (sendStatic(res, publicPath)) return;
    }

    const templatePath = path.join(root, "dist/client/index.html");
    const template = fs.readFileSync(templatePath, "utf-8");

    const entryPath = path.join(root, "dist/server/entry-server.js");
    const { render } = await import(pathToFileURL(entryPath).href);

    const { appHtml, helmet } = await render(url);
    const helmetTitle = helmet?.title?.toString() ?? "";
    const helmetMeta = helmet?.meta?.toString() ?? "";
    const helmetLink = helmet?.link?.toString() ?? "";

    let html = template;
    html = html.replace("<div id=\"root\"></div>", `<div id=\"root\">${appHtml}</div>`);
    html = html.replace("</head>", `${helmetTitle}${helmetMeta}${helmetLink}</head>`);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
