// Regenerates every app-icon PNG from one vector source.
//
//   npm run icons
//
// Keeps a single source of truth for the Counter brand mark (a geometric "C"
// holding an ascending bar chart, on the indigo->violet brand gradient) and
// renders the full set Expo references in app.json. Edit the geometry here and
// re-run; never hand-edit the PNGs.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMAGES = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

// One continuous diagonal gradient (userSpaceOnUse) so it reads identically
// across the background fill and any gradient-filled mark.
const GRADIENT =
  '<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1024" y2="1024">' +
  '<stop offset="0" stop-color="#4F46E5"/><stop offset="1" stop-color="#7C3AED"/></linearGradient>';

const BACKGROUND = '<rect width="1024" height="1024" fill="url(#g)"/>';

/** The brand mark: stroked "C" + three ascending bars, in `fill`, optionally
 *  scaled about the centre to leave safe-zone padding (Android adaptive). */
function mark(fill, scale = 1) {
  const transform =
    scale === 1 ? '' : ` transform="translate(512 512) scale(${scale}) translate(-512 -512)"`;
  return (
    `<g${transform}>` +
    `<path d="M725 333.3 A278 278 0 1 0 725 690.7" fill="none" stroke="${fill}" stroke-width="100" stroke-linecap="round"/>` +
    `<rect x="410" y="568" width="48" height="60" rx="14" fill="${fill}"/>` +
    `<rect x="488" y="512" width="48" height="116" rx="14" fill="${fill}"/>` +
    `<rect x="566" y="452" width="48" height="176" rx="14" fill="${fill}"/>` +
    `</g>`
  );
}

const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">` +
  `<defs>${GRADIENT}</defs>${inner}</svg>`;

// Android adaptive/themed layers keep the mark inside the central safe zone.
const SAFE = 0.82;

const assets = [
  { file: 'icon.png', size: 1024, svg: svg(BACKGROUND + mark('#FFFFFF')) },
  { file: 'android-icon-background.png', size: 1024, svg: svg(BACKGROUND) },
  { file: 'android-icon-foreground.png', size: 1024, svg: svg(mark('#FFFFFF', SAFE)) },
  { file: 'android-icon-monochrome.png', size: 1024, svg: svg(mark('#FFFFFF', SAFE)) },
  { file: 'splash-icon.png', size: 1024, svg: svg(mark('url(#g)', 0.86)) },
  { file: 'favicon.png', size: 96, svg: svg(BACKGROUND + mark('#FFFFFF')) },
];

for (const asset of assets) {
  const resvg = new Resvg(asset.svg, {
    fitTo: { mode: 'width', value: asset.size },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  writeFileSync(join(IMAGES, asset.file), png);
  console.log(`wrote ${asset.file} (${asset.size}px, ${png.length} bytes)`);
}
