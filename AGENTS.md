# AGENTS.md

## Deployment Guide

- Production app path: `/home/photoloc/app`
- App user: `photoloc`
- App SSH host alias: `photoloc-lightsail`
- Privileged SSH user: `ec2-user`
- Systemd service: `photoloc`
- Nginx vhost: `/etc/nginx/conf.d/photo.localtool.tech.conf`
- Public domain: `photo.localtool.tech`
- GitHub Actions workflow: `.github/workflows/deploy.yml`

## Manual Deploy

1. Sync the current repo to the server.
2. Install dependencies and build on the server.
3. Restart `photoloc.service`.
4. Verify the app locally on the server and through the public domain.

Commands:

```sh
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '*.pem' \
  -e 'ssh' \
  ./ photoloc-lightsail:/home/photoloc/app/

ssh photoloc-lightsail 'cd /home/photoloc/app && npm ci && npm run build'

ssh -i /path/to/LightsailDefaultKey-us-east-1.pem ec2-user@35.175.93.255 \
  'sudo systemctl restart photoloc && sudo systemctl status photoloc --no-pager -l'

ssh photoloc-lightsail 'curl -I http://127.0.0.1:4173/en'
curl -I https://photo.localtool.tech/en
```

## Notes

- Keep private key files out of git. `*.pem` is ignored in this repo.
- The app is served by `nginx` and proxied to the Node SSR server on `127.0.0.1:4173`.
- HTTPS is managed with `certbot`, and renewals are handled by `certbot-renew.timer`.
- If `git pull` is blocked by local changes, stash first, pull, then re-apply the stash.
- The GitHub Actions deploy flow syncs files with `rsync`, builds on the server, then restarts `photoloc.service`.
- Required GitHub repository secrets:
  - `PHOTOLOC_DEPLOY_KEY`
  - `LIGHTSAIL_DEFAULT_KEY`
  - `PHOTOLOC_HOST`
  - `PHOTOLOC_USER`
  - `LIGHTSAIL_SUDO_USER`
  - `PHOTOLOC_APP_DIR`
  - `PHOTOLOC_SERVICE_NAME`
  - `PHOTOLOC_APP_PORT`
  - `PHOTOLOC_DOMAIN`
