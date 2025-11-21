# NODAYSIDLE Website

![Performance](https://github.com/salvadalba/nodaysidle-website/actions/workflows/performance.yml/badge.svg) ![Link Check](https://github.com/salvadalba/nodaysidle-website/actions/workflows/link-check.yml/badge.svg)

## Brand

![NDI](site/assets/images/logo-primary.jpg)

## Team

![NDI Team](site/assets/images/team-us.jpg)

## About NODAYSIDLE

NODAYSIDLE is a two‑person engineering outfit focused on making PCs and workstations behave like dependable tools — predictable, fast, and continuously productive. Our motto is simple: No Days Idle. We tune systems for real workloads (CAD/3D/ML/video), quantify performance with clear budgets, and validate reliability with repeatable tests.

### What We Deliver
- Diagnostics‑first tuning for latency, throughput, and stability
- Thermal and power management that sustains performance under load
- Workflow‑specific pipelines (rendering, simulation, training)
- Reliability baselines, performance budgets, and measurable SLOs

### Engineering Principles
- Measure before optimize: profile CPU, memory, I/O, network, and storage
- Fix the biggest bottleneck first; validate each change with data
- Prefer simple architectures with explicit caching and observability
- Harden for real‑world usage: fail‑safe configs, graceful degradation, backups

### Technology Stack
- Frontend: static HTML/CSS/JS for speed and simplicity
- CMS: WordPress (`/wp`) for daily posts and media via GUI
- Server: Nginx + PHP‑FPM + MariaDB on Ubuntu, Certbot for TLS
- Testing: k6 smoke tests with thresholds; Chrome DevTools and Query Monitor for profiling

### Performance & Reliability
- Track p95 response time, error rate, and asset load consistency
- Validate under realistic VUs and durations; watch regressions in CI
- Keep images optimized (WebP/AVIF) and cache headers tuned at Nginx

### Contact
- Email: `info@nodaysidle.com`
- Site: `https://nodaysidle.com/`
- GitHub: `https://github.com/salvadalba`

A modern static website with a WordPress-powered CMS for daily publishing, deployed behind Nginx with PHP‑FPM and MariaDB. The blog index uses the WordPress REST API, preserving the site’s existing look and feel while enabling GUI content management via `wp-admin`.

## Highlights
- WordPress admin GUI for posts, pages, media
- Static frontend remains intact; blog list loads via REST
- Hardened Nginx config with SSL and PHP‑FPM routing
- Lightweight deploy script and performance smoke tests

## Repository Layout
- `site/` — static frontend (HTML/CSS/JS)
- `infra/nginx/nodaysidle.com.conf` — Nginx template for the site and WP subdir
- `perf/k6-smoke.js` — k6 smoke test with thresholds
- `scripts/deploy.sh` — rsync-based deploy script to remote docroot

## Brand & Media
- Place brand assets under `site/assets/images/`:
  - `logo-primary.jpg` — primary lockup
  - `logo-alt1.jpg`, `logo-alt2.jpg`, `logo-wordmark.jpg` — alternates
  - `team-us.jpg` — NDI team photo
- Example embeds for GitHub:
  - `![NDI](site/assets/images/logo-primary.jpg)`
  - `![NDI Team](site/assets/images/team-us.jpg)`

## Quick Start
- Local preview of static site:
  - `python3 -m http.server -d site 8000` then open `http://localhost:8000/`
  - or `npx serve site`
- Blog page (`/blog/`) renders WordPress posts via REST once the server’s WP is installed and reachable at `/wp`.

## WordPress Admin
- Server-side WordPress runs under the web root at `/wp`.
- Access the dashboard at `https://<your-domain>/wp/wp-admin`.
- Recommended post-install settings:
  - Permalinks → Post name
  - Media uploads verified under `wp-content/uploads`

## Deployment
- Docroot: `/var/www/ndi/public` (on server)
- Deploy from local:
  - `./scripts/deploy.sh` (backups remote docroot and rsyncs `site/`)
- Nginx: copy `infra/nginx/nodaysidle.com.conf` to `/etc/nginx/sites-available/nodaysidle.com`, then:
  - `sudo nginx -t && sudo systemctl reload nginx`
- Certificates managed via Certbot; ensure 443 server blocks reference valid `fullchain.pem` and `privkey.pem`.

## Performance
- Smoke test:
  - `k6 run perf/k6-smoke.js --env BASE_URL=https://<your-domain> --env VUS=20 --env DURATION=1m`
- Thresholds:
  - `http_req_duration: p(95) < 300ms`
  - `http_req_failed: rate < 1%`
- Use Chrome DevTools + Query Monitor (plugin) for deeper profiling during admin use.

## Security
- Enforce admin over HTTPS and disable in-dashboard file editing:
  - `FORCE_SSL_ADMIN` and `DISALLOW_FILE_EDIT` in `wp-config.php`
- Disable XML‑RPC at Nginx
- Recommended plugins:
  - 2FA (Wordfence Security or WP 2FA)
  - WP Mail SMTP (email reliability)
  - UpdraftPlus (offsite backups)
- Optional Nginx login rate limiting (server-level) for `/wp-login.php`.

## Operations
- Logs:
  - Nginx access/error logs under `/var/log/nginx/`
  - PHP‑FPM service: `php8.2-fpm`
  - MariaDB service: `mariadb`
- Ownership:
  - Ensure `www-data:www-data` owns WordPress files under `/wp`.

## Contributing
- Keep changes minimal and focused; prefer small PRs
- Avoid committing secrets and server-only files
- Validate with k6 smoke test after significant changes

## License
- Copyright © 2025 NODAYSIDLE. All rights reserved.