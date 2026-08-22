#!/usr/bin/env node
/**
 * Regenerates `admin/public/og.png` from the dark UI.
 *
 * Same dependency-free pipeline as `make-seed-photos.mjs`: compose an SVG,
 * render it with macOS `qlmanage`, then normalise with `sips`. No headless
 * browser, no image library — this runs on a laptop with nothing installed.
 *
 * The screenshot is embedded as a base64 data URI because `qlmanage` renders
 * the SVG in a sandbox that will not fetch a relative `href`.
 *
 *   node scripts/make-og.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const W = 1200;
const H = 630;

const ROOT = new URL('..', import.meta.url).pathname;
const SHOT = join(ROOT, 'admin/public/hero-roster.png');
const OUT = join(ROOT, 'admin/public/og.png');

// Dark-theme tokens, mirrored from admin/src/index.css. Hardcoded here on
// purpose: this is a build artefact rendered outside the app, and reaching
// into the stylesheet at build time would couple a script to CSS parsing.
const BG = '#0a0b0d';
const SURFACE = '#121418';
const BORDER = '#2a2d33';
const TEXT = '#f2f3f5';
const MUTED = '#a0a5ad';
const ACCENT = '#2dd4bf';

/**
 * Pre-crop the screenshot to the roster grid before embedding.
 *
 * Positioning it with `<image>` offsets inside the SVG proved unreliable —
 * qlmanage's rasteriser rescales the bitmap even with explicit width/height
 * and `preserveAspectRatio="none"`, so the visible window drifted. Cropping
 * with `sips` first makes the embedded image exactly the region we want and
 * leaves the SVG with nothing to get wrong.
 */
function cropToGrid(tmpDir) {
      const cropped = join(tmpDir, 'grid.jpg');
      // Source is 1568×763; the grid starts after the worker panel (x≈555) and
      // below the page header (y≈150).
      execFileSync(
            'sips',
            ['-c', '600', '1010', '--cropOffset', '150', '555', SHOT, '--out', cropped],
            { stdio: 'ignore' },
      );
      return readFileSync(cropped).toString('base64');
}

/**
 * `qlmanage -t` renders into a SQUARE canvas at the requested size and pads
 * the remainder, so a 1200×630 SVG came back as 1200×1200 with 570px of white
 * below it. The design is therefore composed on a 1200×1200 canvas, centred
 * vertically, and `sips -c` centre-crops the band back out.
 */
const PAD = (W - H) / 2;

const buildSvg = (shot) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <defs>
    <radialGradient id="glow" cx="0.18" cy="0" r="0.9">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <!-- No PAD here: clipPath coordinates resolve in the *referencing*
         element's user space, and the element already sits inside the
         translated group — adding PAD applied the offset twice and pushed the
         visible window off the frame. -->
    <clipPath id="frame">
      <rect x="600" y="180" width="720" height="450" rx="14"/>
    </clipPath>
  </defs>

  <rect width="${W}" height="${W}" fill="${BG}"/>
  <g transform="translate(0 ${PAD})">
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Ghosted wordmark, as on the landing hero -->
  <text x="-20" y="150" font-family="Inter, Helvetica, Arial, sans-serif" font-size="190"
        font-weight="700" letter-spacing="-9" fill="${TEXT}" opacity="0.035">ROSTERBAY</text>

  <!-- Mark -->
  <rect x="72" y="188" width="52" height="52" rx="13" fill="${ACCENT}"/>
  <path d="M86 214 l9 9 l17 -19" stroke="${BG}" stroke-width="5.5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>

  <text x="140" y="228" font-family="Inter, Helvetica, Arial, sans-serif" font-size="46"
        font-weight="700" letter-spacing="-1.6" fill="${TEXT}">RosterBay</text>

  <text x="72" y="306" font-family="Inter, Helvetica, Arial, sans-serif" font-size="34"
        font-weight="600" letter-spacing="-1" fill="${TEXT}">Roster, verify, and track</text>
  <text x="72" y="350" font-family="Inter, Helvetica, Arial, sans-serif" font-size="34"
        font-weight="600" letter-spacing="-1" fill="${TEXT}">your field workforce.</text>

  <text x="72" y="404" font-family="Inter, Helvetica, Arial, sans-serif" font-size="19"
        fill="${MUTED}">Shift scheduling, geofenced clock-in, proof of work</text>
  <text x="72" y="432" font-family="Inter, Helvetica, Arial, sans-serif" font-size="19"
        fill="${MUTED}">and compliance tracking for deskless teams.</text>

  <!-- Live demo pill -->
  <rect x="72" y="474" width="196" height="40" rx="10" fill="${ACCENT}" fill-opacity="0.14"
        stroke="${ACCENT}" stroke-opacity="0.34"/>
  <circle cx="94" cy="494" r="4.5" fill="${ACCENT}"/>
  <text x="108" y="500" font-family="ui-monospace, Menlo, monospace" font-size="15"
        font-weight="600" letter-spacing="1.2" fill="${ACCENT}">LIVE DEMO</text>

  <!-- The product, in a frame that bleeds off the right edge -->
  <g clip-path="url(#frame)">
    <!-- Placed 1:1 and offset so the 720×450 frame lands on the roster's time
         axis and site rows. A naive xMinYMin crop shows the app sidebar and
         the empty page header instead — all chrome, none of the product. -->
    <image xlink:href="data:image/jpeg;base64,${shot}" x="600" y="180" width="720" height="450"
           preserveAspectRatio="xMidYMid slice"/>
  </g>
  <rect x="600" y="180" width="720" height="450" rx="14" fill="none"
        stroke="${BORDER}" stroke-width="1.5"/>
  <rect x="600" y="180" width="720" height="30" fill="${SURFACE}"/>
  <circle cx="618" cy="195" r="4" fill="${BORDER}"/>
  <circle cx="632" cy="195" r="4" fill="${BORDER}"/>
  <circle cx="646" cy="195" r="4" fill="${BORDER}"/>
  </g>
</svg>`;

const tmp = mkdtempSync(join(tmpdir(), 'rb-og-'));
try {
      const svgPath = join(tmp, 'og.svg');
      writeFileSync(svgPath, buildSvg(cropToGrid(tmp)));
      execFileSync('qlmanage', ['-t', '-s', String(W), '-o', tmp, svgPath], { stdio: 'ignore' });
      // Centre-crop, not resize: -z would squash the square back to 1200×630.
      execFileSync('sips', ['-c', String(H), String(W), join(tmp, 'og.svg.png'), '--out', OUT], {
            stdio: 'ignore',
      });
      console.log(`og.png regenerated → ${OUT}`);
} finally {
      rmSync(tmp, { recursive: true, force: true });
}
