# Photoloc

Photoloc is a high-function Photoshop-style editor that runs entirely on your device. It is built for privacy-first editing, with all processing kept local in your browser.

Most online photo editors send images to servers, which creates privacy risk. Photoloc does not. Nothing is uploaded or transmitted during editing. If you want to verify this, open Chrome or IE and capture network traffic while editing; you will see that no image or editing data is sent to any server. The tradeoff is that performance can vary depending on your PC’s specs, and very large images may feel slower on lower-end machines.

## Features
- On-device processing only (no uploads, no server-side editing)
- Drag-and-drop or click to open images
- Zoom controls with fit-to-screen
- Pan/drag canvas navigation
- Crop tool with live size readout
- Resize tool with width/height controls
- Rotate 90° clockwise and counterclockwise
- Flip horizontal and vertical
- Adjustment controls:
  brightness, contrast, saturation, hue rotate, sepia, grayscale, blur
- Non-destructive adjustments preview
- Apply adjustments to bake them into the active layer
- Marquee selection with:
  copy, cut, paste, and floating selection move/resize
- Layer system:
  add/delete layers, rename, reorder, merge down, visibility toggle, opacity
- Background color picker (including transparent)
- History timeline with click-to-restore
- Undo/redo with shortcuts
- Export to PNG (lossless), JPEG, WebP with quality control
- Multi-language UI with locale-aware routes

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui (Radix UI)
- React Router

## Getting Started

### Requirements
- Node.js 18+ and npm

### Install
```sh
npm install
```

### Run Dev Server
```sh
npm run dev
```

### Build
```sh
npm run build
```

### Run In Production
```sh
npm run build
PORT=4173 SITE_URL=https://your-domain.com npm run start
```

### Preview
```sh
npm run preview
```

### Lint
```sh
npm run lint
```

### Test
```sh
npm run test
```

## Project Structure
- `src/pages/Index.tsx` main editor page
- `src/hooks/useImageEditor.ts` editor state and image operations
- `src/components/editor` editor UI (toolbar, canvas, sidebars)
- `src/i18n` localization resources

## Linux Server Deployment

This app can run on a regular Linux server without Vercel. The production flow used in this repo is:

1. Install Node.js 18+ and npm
2. Install dependencies with `npm ci`
3. Build the client and SSR bundle with `npm run build`
4. Run the app with `systemd`
5. Put `nginx` in front of the Node SSR server

Useful environment variables:

- `PORT`: port for the Node server, default `4173`
- `SITE_URL`: public origin used for generated URLs such as `sitemap.xml`

Example:

```sh
npm install
npm run build
PORT=4173 SITE_URL=https://your-domain.com npm run start
```

### Production Setup Used Here

- App directory: `/home/photoloc/app`
- App user: `photoloc`
- Public domain: `photo.localtool.tech`
- Reverse proxy: `nginx`
- Process manager: `systemd`
- Internal app port: `4173`

### Deploy Script

This repo includes a deploy helper:

```sh
./deploy.sh
```

The script does the following:

1. Syncs the repo to `/home/photoloc/app` with `rsync`
2. Runs `npm ci && npm run build` on the server
3. Restarts the `photoloc` systemd service
4. Verifies both the local app port and the public HTTPS URL

If your Lightsail key is not stored at the repo root, pass it explicitly:

```sh
KEY_PATH=/path/to/LightsailDefaultKey-us-east-1.pem ./deploy.sh
```

### GitHub Actions Deployment

This repo also includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

On every push to `main`, it:

1. Checks out the repo on GitHub Actions
2. Syncs the files to `/home/photoloc/app` with `rsync`
3. Runs `npm ci && npm run build` on the server
4. Restarts `photoloc.service`
5. Verifies both the internal app port and the public HTTPS URL

Required GitHub repository secrets:

- `PHOTOLOC_DEPLOY_KEY`: private key for the `photoloc` user
- `LIGHTSAIL_DEFAULT_KEY`: private key for the `ec2-user` account
- `PHOTOLOC_HOST`: server IP or hostname
- `PHOTOLOC_USER`: `photoloc`
- `LIGHTSAIL_SUDO_USER`: `ec2-user`
- `PHOTOLOC_APP_DIR`: `/home/photoloc/app`
- `PHOTOLOC_SERVICE_NAME`: `photoloc`
- `PHOTOLOC_APP_PORT`: `4173`
- `PHOTOLOC_DOMAIN`: `photo.localtool.tech`

Typical values for this server:

```text
PHOTOLOC_HOST=35.175.93.255
PHOTOLOC_USER=photoloc
LIGHTSAIL_SUDO_USER=ec2-user
PHOTOLOC_APP_DIR=/home/photoloc/app
PHOTOLOC_SERVICE_NAME=photoloc
PHOTOLOC_APP_PORT=4173
PHOTOLOC_DOMAIN=photo.localtool.tech
```

### Example systemd service

```ini
[Unit]
Description=Photoloc SSR app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=photoloc
Group=photoloc
WorkingDirectory=/home/photoloc/app
Environment=NODE_ENV=production
Environment=PORT=4173
Environment=SITE_URL=https://photo.localtool.tech
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Example nginx vhost

```nginx
server {
    server_name photo.localtool.tech;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/photo.localtool.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/photo.localtool.tech/privkey.pem;
}

server {
    listen 80;
    server_name photo.localtool.tech;
    return 301 https://$host$request_uri;
}
```

## Contributing
Photoloc is open source and we welcome contributions.
- Report bugs and request features via issues
- Submit pull requests for fixes, improvements, and translations
- Keep changes focused and include a clear description

## TODO
- Fix pen-tool flicker after each completed stroke (canvas flashes briefly when stroke is committed to layer history/composite).

Curated on [LeanVibe](https://leanvibe.io/vibe/photoloc)
