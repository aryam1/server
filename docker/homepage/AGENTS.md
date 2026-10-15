# Homepage icon guide

How to pick icons for new services in `services.yaml`.

## Resolution order (homepage source: `src/components/resolvedicon.jsx`)

1. `http...` or `/...` — absolute URL / local file. Local needs a mount to `/app/public/icons`, restart required.
2. `sh-<name>[.svg|.png|.webp]` — selfh.st/icons, full-color, cannot be tinted.
3. `mdi-<name>` — Material Design Icons, rendered as a mask.
4. `si-<name>` — Simple Icons, rendered as a mask.
5. anything else — Dashboard Icons (bare name, optional `.png/.svg/.webp`), full-color, cannot be tinted.

`mdi-`/`si-` masks default to theme color; append `-#rrggbb` (e.g. `si-audiobookshelf-#22c55e`) to tint. The prefix is the substring before the first `-`, so no other prefixes work.

## Process

1. Identify the real upstream app/image in the service's `docker-compose.yml` (not the folder name) and pick the icon matching that exact app/fork — e.g. `gtstef/filebrowser` is File Browser Quantum → `filebrowser-quantum`, not the classic floppy icon.
2. If the icon should be tinted (custom color, mono look, or a black-on-transparent logo that is invisible on the dark theme), use `si-`/`mdi-` + hex.
3. Otherwise use a full-color icon: Dashboard Icons first, selfh.st when Dashboard lacks it.
4. Custom/self-made services (site, custom proxies): use the app's own favicon as an absolute URL, or a themed `mdi-` + hex.

## Checking availability (from this server)

`cdn.simpleicons.org` returns 403 here — always use jsDelivr. Check candidates with HEAD-style requests:

```bash
DI=https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png
SH=https://cdn.jsdelivr.net/gh/selfhst/icons/png
curl -s --max-time 15 -o /dev/null -w "%{http_code}\n" "$DI/<name>.png"
curl -s --max-time 15 -o /dev/null -w "%{http_code}\n" "$SH/<name>.png"
```

Simple Icons slug lookup (titles ≠ slugs; download the metadata and grep):

```bash
curl -s -o /tmp/opencode/si.json https://cdn.jsdelivr.net/npm/simple-icons@latest/_data/simple-icons.json
rg -oi '"title":"[^"]*(<term>)[^"]*"' /tmp/opencode/si.json
```

MDI existence: `https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/<name>.svg`

`data.jsdelivr.com` listings fail (package >50MB) — probe candidate filenames instead.

## Always view the icon before committing to it

Download and look at it (agents can read images). This catches invisible-on-dark and ugly icons:

```bash
mkdir -p /tmp/opencode/icons
curl -s --max-time 15 -o /tmp/opencode/icons/<name>.png "$DI/<name>.png"
# then Read /tmp/opencode/icons/<name>.png
```

## Slugs and fallbacks learned so far

- Simple Icons has `si-traefikproxy` (no `si-traefik`); dashboard `traefik` is the new æ logo and `traefik-proxy` is the old teal routing emblem.
- Not in Simple Icons: prowlarr, filebrowser, dozzle, goatcounter, gluetun, mousehole, dockhand, readmeabook.
- Dashboard Icons lacks goatcounter/readmeabook → use `sh-goatcounter`, `sh-readmeabook`.
- `gtstef/filebrowser` (Quantum) → `filebrowser-quantum`.
- VPN tunnels (gluetun) get the provider's icon (e.g. `nordvpn`) rather than gluetun's cartoon pipe.
- Colors in use: green `#22c55e` (absg), cheese yellow `#f0d453` (mousehole).

## Verify and ship

```bash
python3 -c "import yaml; yaml.safe_load(open('docker/homepage/config/services.yaml'))"
```

Homepage watches its config — icon changes hot-reload, no restart needed.
