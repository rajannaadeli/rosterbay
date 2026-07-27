/**
 * Generates the six seed proof-of-work JPEGs. SVG → PNG (qlmanage) → JPEG (sips),
 * the same no-dependency pipeline the OG image used. Run from the repo root.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'scripts/seed-photos';
const TMP = process.env.TMPDIR_SCRATCH ?? '/tmp/rosterbay-seed-photos';

/** Shared photographic treatment: defocus, film grain, vignette. */
const defs = `
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="7"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="7"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <radialGradient id="vig" cx="50%" cy="45%" r="72%">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.42"/>
  </radialGradient>`;

const frame = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>${defs}</defs>
  ${body}
  <rect width="600" height="600" filter="url(#grain)" opacity="0.15"/>
  <rect width="600" height="600" fill="url(#vig)"/>
</svg>`;

const scenes = {
  // Polished corporate lobby floor, low raking light and reflections.
  'kingsford-lobby': frame(`
    <defs><linearGradient id="f" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="#9aa3ad"/><stop offset="0.42" stop-color="#767f89"/>
      <stop offset="1" stop-color="#3f454c"/></linearGradient>
      <radialGradient id="pool" cx="42%" cy="30%" r="45%">
        <stop offset="0" stop-color="#eef2f6" stop-opacity="0.85"/>
        <stop offset="1" stop-color="#eef2f6" stop-opacity="0"/></radialGradient></defs>
    <rect width="600" height="600" fill="url(#f)"/>
    <rect width="600" height="600" fill="url(#pool)"/>
    <g filter="url(#soft)" opacity="0.5">
      <ellipse cx="180" cy="470" rx="230" ry="34" fill="#c9d2da"/>
      <ellipse cx="430" cy="360" rx="150" ry="20" fill="#dfe6ec"/>
      <rect x="0" y="86" width="600" height="16" fill="#c3ccd5" opacity="0.7"/>
    </g>
    <g filter="url(#soft)" opacity="0.45">
      <rect x="70" y="0" width="26" height="220" fill="#2f353b"/>
      <rect x="470" y="0" width="26" height="200" fill="#2f353b"/>
    </g>`),

  // Food court seating — warm timber and upholstery, overhead light.
  'marion-food-court': frame(`
    <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8c3a2"/><stop offset="0.5" stop-color="#a98d6d"/>
      <stop offset="1" stop-color="#5d4a37"/></linearGradient></defs>
    <rect width="600" height="600" fill="#8f7558"/>
    <rect width="600" height="600" fill="url(#f)" opacity="0.9"/>
    <g filter="url(#soft)" opacity="0.75">
      <rect x="60" y="250" width="230" height="120" rx="18" fill="#c9ad87"/>
      <rect x="330" y="300" width="240" height="130" rx="18" fill="#b89970"/>
      <circle cx="140" cy="200" r="46" fill="#6f5a43"/>
      <circle cx="420" cy="215" r="42" fill="#6f5a43"/>
      <rect x="0" y="60" width="600" height="34" fill="#f0e2cb" opacity="0.55"/>
    </g>`),

  // Sanitised ward touchpoints — clinical, cool, high-key.
  'hospital-ward': frame(`
    <defs><linearGradient id="f" x1="0" y1="0" x2="0.1" y2="1">
      <stop offset="0" stop-color="#eef4f2"/><stop offset="0.55" stop-color="#cfdcd8"/>
      <stop offset="1" stop-color="#8fa39e"/></linearGradient></defs>
    <rect width="600" height="600" fill="url(#f)"/>
    <g filter="url(#soft)" opacity="0.7">
      <rect x="0" y="300" width="600" height="120" fill="#b9c9c5"/>
      <rect x="80" y="150" width="180" height="150" rx="10" fill="#dfe9e6"/>
      <rect x="360" y="180" width="150" height="120" rx="10" fill="#d3e0dc"/>
      <rect x="0" y="470" width="600" height="130" fill="#7d918c"/>
    </g>
    <g filter="url(#soft)" opacity="0.4">
      <rect x="270" y="120" width="14" height="300" fill="#9db0ab"/>
    </g>`),

  // Loading dock secured — concrete, roller shutter, safety line.
  'wingfield-dock': frame(`
    <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8f8c"/><stop offset="0.6" stop-color="#666866"/>
      <stop offset="1" stop-color="#3a3c3b"/></linearGradient></defs>
    <rect width="600" height="600" fill="url(#f)"/>
    <g filter="url(#soft)" opacity="0.8">
      <rect x="120" y="70" width="360" height="290" rx="6" fill="#4a4d4f"/>
      <rect x="120" y="70" width="360" height="290" rx="6" fill="none" stroke="#9a9d9e" stroke-width="10"/>
      <rect x="0" y="430" width="600" height="26" fill="#c98f2a" opacity="0.85"/>
      <rect x="0" y="480" width="600" height="120" fill="#55585a"/>
    </g>
    <g filter="url(#soft)" opacity="0.35">
      <rect x="150" y="110" width="300" height="8" fill="#8b8e90"/>
      <rect x="150" y="170" width="300" height="8" fill="#8b8e90"/>
      <rect x="150" y="230" width="300" height="8" fill="#8b8e90"/>
      <rect x="150" y="290" width="300" height="8" fill="#8b8e90"/>
    </g>`),

  // Riverbank main gates at night — sodium light on steel.
  'riverbank-gates': frame(`
    <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d2c38"/><stop offset="0.6" stop-color="#16232d"/>
      <stop offset="1" stop-color="#0d161d"/></linearGradient>
      <radialGradient id="lamp" cx="70%" cy="18%" r="42%">
        <stop offset="0" stop-color="#f0c07a" stop-opacity="0.75"/>
        <stop offset="1" stop-color="#f0c07a" stop-opacity="0"/></radialGradient></defs>
    <rect width="600" height="600" fill="url(#f)"/>
    <rect width="600" height="600" fill="url(#lamp)"/>
    <g filter="url(#soft)" opacity="0.8">
      <rect x="90" y="150" width="16" height="380" fill="#39505f"/>
      <rect x="180" y="150" width="16" height="380" fill="#39505f"/>
      <rect x="270" y="150" width="16" height="380" fill="#39505f"/>
      <rect x="360" y="150" width="16" height="380" fill="#39505f"/>
      <rect x="450" y="150" width="16" height="380" fill="#39505f"/>
      <rect x="60" y="140" width="440" height="18" fill="#47606f"/>
      <rect x="0" y="530" width="600" height="70" fill="#0a1116"/>
    </g>`),

  // The reported fault: roller door, torn bottom seal.
  'roller-door': frame(`
    <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a4a6a3"/><stop offset="0.7" stop-color="#7c7e7b"/>
      <stop offset="1" stop-color="#4b4d4a"/></linearGradient></defs>
    <rect width="600" height="600" fill="url(#f)"/>
    <g opacity="0.55" filter="url(#soft)">
      ${Array.from({ length: 14 }, (_, i) => `<rect x="0" y="${20 + i * 34}" width="600" height="12" fill="#666865"/>`).join('')}
    </g>
    <g filter="url(#soft)" opacity="0.9">
      <rect x="0" y="486" width="600" height="46" fill="#33352f"/>
      <path d="M120 486 L210 532 L268 486 L340 528 L410 486 Z" fill="#20221e"/>
      <rect x="430" y="120" width="120" height="120" rx="8" fill="#c98f2a" opacity="0.5"/>
    </g>`),
};

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

for (const [name, svg] of Object.entries(scenes)) {
  const svgPath = join(TMP, `${name}.svg`);
  writeFileSync(svgPath, svg);
  execFileSync('qlmanage', ['-t', '-s', '600', '-o', TMP, svgPath], { stdio: 'ignore' });
  execFileSync('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '58',
    '-z', '480', '480',
    join(TMP, `${name}.svg.png`),
    '--out', join(OUT, `${name}.jpg`),
  ], { stdio: 'ignore' });
  console.log(`+ ${OUT}/${name}.jpg`);
}
