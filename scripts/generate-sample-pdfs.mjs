/**
 * Builds small, text-extractable sample PDFs for mock mode so citation
 * highlighting can match real pdf.js text-layer spans.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');
mkdirSync(publicDir, { recursive: true });

function escapePdf(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pageContent(lines) {
  const ops = ['BT', '/F1 11 Tf', '72 720 Td', '16 TL'];
  lines.forEach((line, i) => {
    if (i === 0) ops.push(`(${escapePdf(line)}) Tj`);
    else ops.push(`T* (${escapePdf(line)}) Tj`);
  });
  ops.push('ET');
  return ops.join('\n');
}

function buildPdf(pages) {
  const objects = [];
  const kids = [];
  const contents = [];

  pages.forEach((lines) => {
    contents.push(pageContent(lines));
  });

  // Object numbers: 1 catalog, 2 pages, 3 font, then content streams, then page dicts
  const fontObj = 3;
  const contentStart = 4;
  const pageStart = contentStart + pages.length;

  contents.forEach((stream, i) => {
    objects[contentStart + i - 1] = { num: contentStart + i, body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream` };
    kids.push(`${pageStart + i} 0 R`);
  });

  pages.forEach((_, i) => {
    const num = pageStart + i;
    objects[num - 1] = {
      num,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentStart + i} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>`,
    };
  });

  objects[0] = { num: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' };
  objects[1] = { num: 2, body: `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>` };
  objects[2] = { num: 3, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' };

  const ordered = objects.filter(Boolean).sort((a, b) => a.num - b.num);
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of ordered) {
    offsets[obj.num] = body.length;
    body += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xrefPos = body.length;
  body += `xref\n0 ${ordered.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let i = 1; i <= ordered.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${ordered.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

const uasPages = [
  [
    'ASTRA INTEL  |  Unclassified // Training sample',
    'Unmanned Aerial Systems Capability Brief 2024',
    '',
    '1. Purpose',
    'This brief outlines current unmanned aerial systems (UAS) roles in',
    'intelligence, surveillance and reconnaissance (ISR) and tactical strike.',
    'Group 2-3 UAS platforms provide persistent ISR coverage over contested',
    'littoral approaches without exposing aircrew to surface-to-air threats.',
    '',
    '2. Force design',
    'A mixed fleet of medium-altitude long-endurance air vehicles and smaller',
    'tactical quadcopters is recommended for brigade and joint task force use.',
    'Attritable airframes should be stocked to absorb expected combat loss rates.',
  ],
  [
    '3. Command and control',
    'Beyond visual line of sight operations require redundant C2 links,',
    'including SATCOM primary and line-of-sight radio as a fallback path.',
    'Ground control stations should implement STANAG 4586 interoperability',
    'so allied payloads and air vehicles can be retasked during coalition ops.',
    '',
    'Lost-link procedures must include a documented return-to-home orbit and',
    'an automatic flight termination option over water or designated ranges.',
  ],
  [
    '4. Sensors and payloads',
    'Electro-optical / infrared turrets remain the primary ISR payload.',
    'Synthetic aperture radar is required for weather-independent mapping of',
    'coastal movement corridors in the Indo-Pacific theatre.',
    'Electronic support measures can cue other sensors onto emitters of interest.',
    '',
    'Strike variants may carry precision-guided munitions only under positive',
    'human authorisation. Autonomous target engagement is not authorised.',
  ],
  [
    '5. Major applications',
    'Border and exclusive economic zone monitoring.',
    'Convoy overwatch and route reconnaissance for land manoeuvre units.',
    'Ship-to-shore surveillance during amphibious entry operations.',
    'Battle damage assessment after stand-off fires.',
    '',
    '6. Risks and limitations',
    'UAS are vulnerable to cheap electronic warfare and GNSS spoofing.',
    'High-bandwidth video is difficult to sustain under contested spectrum.',
    'Public airspace integration still constrains training sorties near cities.',
    'Weather, icing and icing-adjacent humidity reduce small-UAS endurance.',
  ],
  [
    '7. Key organisations and systems',
    'MQ-9 Reaper and similar MALE types remain the theatre ISR workhorse.',
    'General Atomics Aeronautical Systems and allied industry partners supply',
    'airframes, while NATO working groups set payload interface standards.',
    'National geospatial agencies consume the resulting imagery products.',
    '',
    'Dates of interest: capability refresh programmed for 2024-2026, with',
    'a follow-on attritable system decision expected in late 2026.',
  ],
  [
    '8. Summary',
    'Persistent ISR from Group 2-3 UAS is a force multiplier if C2 resilience,',
    'spectrum management and airspace integration are funded together.',
    'The recommended near-term focus is redundant datalinks, SAR payloads,',
    'and training for operations in GNSS-degraded environments.',
  ],
];

const c2Pages = [
  [
    'ASTRA INTEL  |  Unclassified // Training sample',
    'C2 Integration Whitepaper for Joint UAS Employment',
    '',
    'This paper describes how unmanned systems plug into a joint command and',
    'control architecture. It complements the 2024 UAS capability brief.',
    '',
    'Coalition tasking depends on common datalink profiles and shared',
    'track numbering so that a NATO Combined Air Operations Centre can',
    'reassign an air vehicle without a full re-brief of the aircrew-equivalent',
    'mission team on the ground.',
  ],
  [
    'Interoperability notes',
    'STANAG 4586 remains the baseline control interface. National extensions',
    'must not break the core message set used for take-off, payload cueing',
    'and lost-link handling.',
    '',
    'Compared with platform-centric briefs, this paper emphasises the ground',
    'segment: multi-vehicle control, spectrum deconfliction, and the human',
    'authorisation loop for any munition release.',
  ],
  [
    'Differences from platform capability documents',
    'Capability briefs list sensors and air vehicle classes. This whitepaper',
    'instead lists C2 failure modes: SATCOM fade, control-station power loss,',
    'and cross-domain guard delays when tracks move to classified networks.',
    '',
    'Similarities include the same requirement for redundant C2 links and',
    'the prohibition on autonomous target engagement without a human in the loop.',
  ],
  [
    'Recommendations',
    'Fund dual-path datalinks before additional airframes.',
    'Exercise lost-link and GNSS-denied profiles quarterly.',
    'Keep a common operational picture feed into the maritime operations centre',
    'for ship-to-shore surveillance missions.',
  ],
];

writeFileSync(join(publicDir, 'sample-uas.pdf'), buildPdf(uasPages));
writeFileSync(join(publicDir, 'sample-c2.pdf'), buildPdf(c2Pages));
console.log('Wrote sample-uas.pdf and sample-c2.pdf');
