import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

type RequestLike = {
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: Buffer | string) => void;
};

const supportedLanguages = ["en", "es", "pt", "fr", "de", "hi", "ja", "ko", "id", "ar", "zh", "ru", "bn", "uk", "pl", "th", "ur", "sw", "ta"];
const fallbackLanguage = "en";

const normalizeStackedLanguagePath = (pathname: string): string | null => {
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

const negotiateLanguage = (headerValue: unknown): string => {
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
    .filter((item): item is { tag: string; weight: number; index: number } => item !== null)
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

const sendStatic = (res: ResponseLike, filePath: string) => {
  if (!fs.existsSync(filePath)) return false;
  const data = fs.readFileSync(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", getContentType(filePath));
  res.end(data);
  return true;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    const url = req?.url ?? "/";
    const pathname = url.split("?")[0] || "/";
    const root = process.cwd();
    const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";

    const normalizedPath = normalizeStackedLanguagePath(pathname);
    if (normalizedPath && normalizedPath !== pathname) {
      res.statusCode = 301;
      res.setHeader("Location", `${normalizedPath}${query}`);
      res.end();
      return;
    }

    if (pathname === "/") {
      const lang = negotiateLanguage(req?.headers?.["accept-language"]);
      res.statusCode = 307;
      res.setHeader("Vary", "Accept-Language");
      res.setHeader("Location", `/${lang}${query}`);
      res.end();
      return;
    }

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
    html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
    html = html.replace("</head>", `${helmetTitle}${helmetMeta}${helmetLink}</head>`);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
