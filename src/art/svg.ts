/**
 * Generated art: every picture in the prototype is code-drawn SVG (spec §9.2).
 * Dragon parts share one 300×300 frame so they line up when layered; each part
 * is a separate texture so it can be animated on its own.
 */

export const PALETTE = {
  outline: '#1F4E45',
  body: '#4CB89A',
  bodyDark: '#3A9A80',
  bodyLight: '#7ED3B9',
  spot: '#6FD0B3',
  belly: '#F6DFA8',
  bellyLine: '#E0B970',
  horn: '#FFF1CF',
  hornLine: '#C9A86A',
  wing: '#A6E0CF',
  eye: '#2B2340',
  cheek: '#FF9E9E',
  mouth: '#7A2E3A',
  tongue: '#FF8FA3',
};

export interface Art {
  svg: string;
  w: number;
  h: number;
}

const P = PALETTE;
const O = `stroke="${P.outline}" stroke-linejoin="round" stroke-linecap="round"`;

function art(w: number, h: number, inner: string, defs = ''): Art {
  return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${inner}</svg>` };
}

/** Returns the SVG with its pixel size multiplied, for crisp textures on 2× screens. */
export function scaled(a: Art, scale: number): string {
  return a.svg.replace(`width="${a.w}" height="${a.h}"`, `width="${a.w * scale}" height="${a.h * scale}"`);
}

export function dataUri(a: Art, scale = 1): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scaled(a, scale))}`;
}

// ---------- Dragon parts (300×300 frame) ----------

export const dragonParts = {
  tail: art(
    300,
    300,
    `<path d="M190,232 C240,250 284,232 276,192 C271,166 246,160 238,180" fill="none" stroke="${P.outline}" stroke-width="38" stroke-linecap="round"/>
     <path d="M190,232 C240,250 284,232 276,192 C271,166 246,160 238,180" fill="none" stroke="${P.body}" stroke-width="27" stroke-linecap="round"/>
     <path d="M238,182 L222,160 L246,150 L256,172 Z" fill="${P.bodyDark}" ${O} stroke-width="5"/>
     <circle cx="262" cy="214" r="5" fill="${P.spot}"/><circle cx="236" cy="236" r="4" fill="${P.spot}"/>`,
  ),
  wingL: art(
    300,
    300,
    `<path d="M112,160 C86,122 62,92 34,96 C50,112 46,128 58,138 C48,148 56,162 74,162 C78,174 94,178 112,168 Z" fill="${P.wing}" ${O} stroke-width="5"/>
     <path d="M110,160 L44,104 M100,164 L62,140 M106,166 L78,162" stroke="${P.bodyDark}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  ),
  wingR: art(
    300,
    300,
    `<path d="M188,160 C214,122 238,92 266,96 C250,112 254,128 242,138 C252,148 244,162 226,162 C222,174 206,178 188,168 Z" fill="${P.wing}" ${O} stroke-width="5"/>
     <path d="M190,160 L256,104 M200,164 L238,140 M194,166 L222,162" stroke="${P.bodyDark}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  ),
  body: art(
    300,
    300,
    `<ellipse cx="112" cy="264" rx="28" ry="15" fill="${P.bodyDark}" ${O} stroke-width="5"/>
     <ellipse cx="188" cy="264" rx="28" ry="15" fill="${P.bodyDark}" ${O} stroke-width="5"/>
     <path d="M98,270 l0,-7 M110,272 l0,-8 M122,270 l0,-7 M178,270 l0,-7 M190,272 l0,-8 M202,270 l0,-7" stroke="${P.outline}" stroke-width="3" stroke-linecap="round"/>
     <ellipse cx="150" cy="196" rx="72" ry="76" fill="${P.body}" ${O} stroke-width="5"/>
     <ellipse cx="150" cy="210" rx="46" ry="54" fill="${P.belly}" stroke="${P.bellyLine}" stroke-width="3"/>
     <path d="M116,186 Q150,196 184,186 M110,208 Q150,220 190,208 M114,232 Q150,244 186,232" fill="none" stroke="${P.bellyLine}" stroke-width="3" stroke-linecap="round"/>
     <circle cx="92" cy="176" r="7" fill="${P.spot}"/><circle cx="84" cy="200" r="5" fill="${P.spot}"/><circle cx="210" cy="172" r="6" fill="${P.spot}"/><circle cx="218" cy="196" r="5" fill="${P.spot}"/>
     <ellipse cx="96" cy="208" rx="13" ry="20" transform="rotate(25 96 208)" fill="${P.body}" ${O} stroke-width="5"/>
     <ellipse cx="204" cy="208" rx="13" ry="20" transform="rotate(-25 204 208)" fill="${P.body}" ${O} stroke-width="5"/>`,
  ),
  glow: art(
    300,
    300,
    `<ellipse cx="150" cy="208" rx="58" ry="64" fill="url(#g)"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#FFE27A" stop-opacity="0.95"/><stop offset="0.55" stop-color="#FF9A3D" stop-opacity="0.55"/><stop offset="1" stop-color="#FF7A2D" stop-opacity="0"/></radialGradient>`,
  ),
  head: art(
    300,
    300,
    `<path d="M116,60 Q106,30 122,18 Q122,38 136,52 Z" fill="${P.horn}" stroke="${P.hornLine}" stroke-width="4" stroke-linejoin="round"/>
     <path d="M184,60 Q194,30 178,18 Q178,38 164,52 Z" fill="${P.horn}" stroke="${P.hornLine}" stroke-width="4" stroke-linejoin="round"/>
     <path d="M92,96 L62,78 L84,124 Z" fill="${P.wing}" ${O} stroke-width="5"/>
     <path d="M208,96 L238,78 L216,124 Z" fill="${P.wing}" ${O} stroke-width="5"/>
     <circle cx="150" cy="104" r="62" fill="${P.body}" ${O} stroke-width="5"/>
     <circle cx="128" cy="58" r="6" fill="${P.spot}"/><circle cx="150" cy="50" r="5" fill="${P.spot}"/><circle cx="172" cy="58" r="6" fill="${P.spot}"/>
     <ellipse cx="150" cy="134" rx="40" ry="26" fill="${P.bodyLight}" ${O} stroke-width="4"/>
     <ellipse cx="137" cy="126" rx="5" ry="3.5" fill="${P.outline}"/><ellipse cx="163" cy="126" rx="5" ry="3.5" fill="${P.outline}"/>
     <ellipse cx="104" cy="126" rx="13" ry="8" fill="${P.cheek}" opacity="0.7"/><ellipse cx="196" cy="126" rx="13" ry="8" fill="${P.cheek}" opacity="0.7"/>`,
  ),
  eyes: art(
    300,
    300,
    `<ellipse cx="124" cy="98" rx="15" ry="18" fill="${P.eye}"/><ellipse cx="176" cy="98" rx="15" ry="18" fill="${P.eye}"/>
     <circle cx="129" cy="91" r="6" fill="#fff"/><circle cx="181" cy="91" r="6" fill="#fff"/>
     <circle cx="119" cy="106" r="3" fill="#fff" opacity="0.8"/><circle cx="171" cy="106" r="3" fill="#fff" opacity="0.8"/>`,
  ),
  mouthSmile: art(300, 300, `<path d="M138,143 Q150,153 162,143" fill="none" ${O} stroke-width="4"/>`),
  mouthOpen: art(
    300,
    300,
    `<ellipse cx="150" cy="146" rx="13" ry="11" fill="${P.mouth}" ${O} stroke-width="4"/><ellipse cx="150" cy="151" rx="7" ry="4" fill="${P.tongue}"/>`,
  ),
  mouthWorried: art(300, 300, `<path d="M139,148 Q150,140 161,148" fill="none" ${O} stroke-width="4"/>`),
};

// ---------- Egg ----------

export const egg = art(
  300,
  300,
  `<ellipse cx="150" cy="168" rx="80" ry="100" fill="#ECE4C8" stroke="#8C7B57" stroke-width="5"/>
   <path d="M95,140 Q110,150 104,168 M190,120 Q204,134 196,150 M120,220 Q136,226 140,244 M176,200 Q190,206 188,226" fill="none" stroke="#D6CBA6" stroke-width="4" stroke-linecap="round"/>
   <circle cx="120" cy="110" r="9" fill="#6FB89F"/><circle cx="176" cy="96" r="6" fill="#A0835A"/><circle cx="188" cy="174" r="10" fill="#6FB89F"/>
   <circle cx="112" cy="196" r="6" fill="#A0835A"/><circle cx="150" cy="238" r="8" fill="#6FB89F"/><circle cx="150" cy="140" r="5" fill="#A0835A"/>
   <ellipse cx="120" cy="120" rx="18" ry="34" fill="#fff" opacity="0.35" transform="rotate(20 120 120)"/>`,
);

export const eggCracks = [
  art(300, 300, `<path d="M120,96 L132,112 L124,124 L138,138" fill="none" stroke="#5C4B2E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
  art(300, 300, `<path d="M120,96 L132,112 L124,124 L138,138 L156,130 L170,146 L186,136" fill="none" stroke="#5C4B2E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M168,200 L180,214 L174,228" fill="none" stroke="#5C4B2E" stroke-width="4" stroke-linecap="round"/>`),
  art(300, 300, `<path d="M74,150 L98,140 L110,156 L132,140 L150,158 L170,140 L192,156 L208,142 L226,152" fill="none" stroke="#5C4B2E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
];

// ---------- Food, props & effects ----------

export const foodArt: Record<string, Art> = {
  beef: art(
    120,
    120,
    `<ellipse cx="60" cy="88" rx="46" ry="14" fill="#E9EEF2" stroke="#9FB0BE" stroke-width="4"/>
     <path d="M24,84 C22,58 40,40 60,42 C82,40 100,58 96,84 Z" fill="#E06470" stroke="#8E2F3B" stroke-width="4" stroke-linejoin="round"/>
     <path d="M38,66 q8,-6 14,2 M58,56 q8,-6 14,2 M66,74 q8,-6 14,2 M42,78 q6,-4 10,1" fill="none" stroke="#F7B3BA" stroke-width="4" stroke-linecap="round"/>`,
  ),
  greens: art(
    120,
    120,
    `<path d="M60,104 C40,80 26,62 30,34 L38,44 L40,30 L48,42 L52,28 L58,50 C62,70 62,86 60,104 Z" fill="#6DBB4F" stroke="#2F6B2A" stroke-width="4" stroke-linejoin="round"/>
     <path d="M62,104 C78,82 96,66 92,40 L84,48 L82,34 L74,46 L68,34 L64,56 C60,74 60,90 62,104 Z" fill="#84CC5E" stroke="#2F6B2A" stroke-width="4" stroke-linejoin="round"/>
     <circle cx="61" cy="22" r="12" fill="#FFD23F" stroke="#C98F12" stroke-width="3"/><path d="M61,34 L61,104" stroke="#2F6B2A" stroke-width="4"/>`,
  ),
  eggshell: art(
    120,
    120,
    `<path d="M18,84 Q24,56 44,58 L40,68 L50,66 L46,78 Z" fill="#FFFDF6" stroke="#B9A98A" stroke-width="4" stroke-linejoin="round"/>
     <path d="M54,90 Q58,52 86,56 Q104,64 100,90 L90,82 L84,94 L74,84 L66,94 Z" fill="#FFF8EA" stroke="#B9A98A" stroke-width="4" stroke-linejoin="round"/>
     <circle cx="34" cy="98" r="5" fill="#FFFDF6" stroke="#B9A98A" stroke-width="3"/><circle cx="50" cy="102" r="3.5" fill="#FFFDF6" stroke="#B9A98A" stroke-width="2.5"/><circle cx="96" cy="102" r="4" fill="#FFFDF6" stroke="#B9A98A" stroke-width="3"/>`,
  ),
  apple: art(
    120,
    120,
    `<path d="M16,70 A44,44 0 0 0 104,70 Z" fill="#FFF3D6" stroke="#C23A3A" stroke-width="7" stroke-linejoin="round"/>
     <path d="M52,80 q8,8 16,0" fill="none" stroke="#7A4A22" stroke-width="3"/><ellipse cx="50" cy="86" rx="3" ry="5" fill="#7A4A22"/><ellipse cx="70" cy="86" rx="3" ry="5" fill="#7A4A22"/>`,
  ),
};

export const heart = art(40, 40, `<path d="M20,34 C6,24 2,16 6,10 C10,4 18,6 20,12 C22,6 30,4 34,10 C38,16 34,24 20,34 Z" fill="#FF7A93" stroke="#B83D58" stroke-width="3"/>`);

export const sparkle = art(40, 40, `<path d="M20,2 L24,16 L38,20 L24,24 L20,38 L16,24 L2,20 L16,16 Z" fill="#FFE27A" stroke="#E0A526" stroke-width="2"/>`);

export const note = art(40, 40, `<path d="M14,30 a6,5 0 1 1 0,-1 L14,8 L32,4 L32,26 a6,5 0 1 1 0,-1 L32,12 L14,16" fill="#6C5CE7" stroke="#3F2FB3" stroke-width="2.5" stroke-linejoin="round"/>`);

export function sockArt(scorched = false): Art {
  const scorch = scorched
    ? `<ellipse cx="60" cy="40" rx="16" ry="10" fill="#2A211C" opacity="0.85"/><ellipse cx="96" cy="76" rx="12" ry="8" fill="#2A211C" opacity="0.8"/><ellipse cx="44" cy="70" rx="9" ry="6" fill="#2A211C" opacity="0.75"/>`
    : '';
  return art(
    160,
    120,
    `<path d="M30,14 L78,14 L78,64 Q78,74 90,78 L128,88 Q146,94 140,108 Q134,118 116,114 L58,100 Q30,92 30,66 Z" fill="#F7F0E2" stroke="#8A3B3B" stroke-width="5" stroke-linejoin="round"/>
     <path d="M30,28 L78,28 M30,44 L78,44" stroke="#E25555" stroke-width="8"/>
     <path d="M30,14 L78,14 L78,22 L30,22 Z" fill="#E25555"/>
     <path d="M118,90 Q140,96 134,110" fill="none" stroke="#E25555" stroke-width="8" stroke-linecap="round"/>
     ${scorch}`,
  );
}

export const bowl = art(
  160,
  80,
  `<path d="M12,30 Q16,74 80,74 Q144,74 148,30 Z" fill="#E86A5A" stroke="#8E2F3B" stroke-width="5" stroke-linejoin="round"/>
   <ellipse cx="80" cy="30" rx="68" ry="14" fill="#F59A8A" stroke="#8E2F3B" stroke-width="5"/>
   <path d="M44,52 L56,52 M72,56 L88,56 M104,52 L116,52" stroke="#FFD1C8" stroke-width="4" stroke-linecap="round"/>`,
);

// ---------- Room (1334×750) ----------

export const ROOM = {
  w: 1334,
  h: 750,
  dragonX: 720,
  dragonY: 440,
  nestX: 270,
  nestY: 548,
  bowlX: 930,
  bowlY: 650,
  sockX: 470,
  sockY: 590,
  /** Inside of the window frame, where night sky and window visitors appear. */
  win: { x: 101, y: 75, w: 340, h: 290 },
  /** Where the dragon curls up in the nest at night. */
  nightX: 270,
  nightY: 512,
  nightScale: 0.6,
  lampX: 548,
  lampY: 318,
};

export const bedroom = art(
  1334,
  750,
  `<rect width="1334" height="500" fill="url(#wall)"/>
   <rect y="470" width="1334" height="22" fill="#E8C9A0"/>
   <rect y="492" width="1334" height="258" fill="#D8A56C"/>
   ${[540, 600, 670, 740].map((y) => `<path d="M0,${y} L1334,${y}" stroke="#C48F55" stroke-width="3"/>`).join('')}
   ${[[180, 492, 540], [610, 540, 600], [420, 600, 670], [900, 492, 540], [1150, 600, 670], [260, 670, 740], [760, 670, 740]]
     .map(([x, a, b]) => `<path d="M${x},${a} L${x},${b}" stroke="#C48F55" stroke-width="3"/>`)
     .join('')}
   <!-- window -->
   <rect x="96" y="70" width="350" height="300" rx="10" fill="url(#sky)" stroke="#C9A27A" stroke-width="10"/>
   <circle cx="370" cy="140" r="38" fill="#FFE08A"/><circle cx="370" cy="140" r="54" fill="#FFE08A" opacity="0.35"/>
   <path d="M140,250 q20,-30 50,-14 q16,-24 44,-8 q30,-4 30,22 Z" fill="#fff" opacity="0.9"/>
   <path d="M96,300 Q180,250 270,282 Q360,250 446,300 L446,370 L96,370 Z" fill="#9CD08A"/>
   <path d="M271,70 L271,370 M96,220 L446,220" stroke="#C9A27A" stroke-width="10"/>
   <path d="M60,56 Q120,200 92,400 L40,400 L40,56 Z" fill="#F28C8C" stroke="#C25F5F" stroke-width="4"/>
   <path d="M482,56 Q422,200 450,400 L502,400 L502,56 Z" fill="#F28C8C" stroke="#C25F5F" stroke-width="4"/>
   <rect x="30" y="48" width="482" height="14" rx="7" fill="#B98552"/>
   <rect x="76" y="370" width="390" height="18" rx="4" fill="#E8C9A0" stroke="#C9A27A" stroke-width="4"/>
   <!-- shelf & poster -->
   <rect x="610" y="150" width="230" height="14" rx="4" fill="#B98552"/>
   <rect x="626" y="96" width="22" height="54" fill="#6C9BD2"/><rect x="650" y="104" width="18" height="46" fill="#F2B84B"/><rect x="670" y="92" width="24" height="58" fill="#E26D5A"/>
   <rect x="700" y="112" width="20" height="38" transform="rotate(14 710 131)" fill="#8CC084"/>
   <path d="M780,150 Q768,116 790,104 Q812,116 800,150 Z" fill="#6DBB4F"/><rect x="776" y="132" width="28" height="18" rx="3" fill="#D9844E"/>
   <rect x="890" y="80" width="150" height="190" rx="6" fill="#2E3A6E" stroke="#fff" stroke-width="8"/>
   <path d="M965,120 L976,156 L1012,156 L983,176 L994,212 L965,190 L936,212 L947,176 L918,156 L954,156 Z" fill="#FFE27A"/>
   <circle cx="920" cy="240" r="4" fill="#fff"/><circle cx="1010" cy="110" r="3" fill="#fff"/><circle cx="1020" cy="236" r="3" fill="#fff"/>
   <!-- bed -->
   <rect x="1060" y="250" width="40" height="330" rx="8" fill="#B98552" stroke="#8A5E35" stroke-width="5"/>
   <rect x="1090" y="410" width="260" height="150" rx="14" fill="#F7B6C2" stroke="#C97A8A" stroke-width="5"/>
   <path d="M1150,410 L1150,560 M1220,410 L1220,560 M1290,410 L1290,560 M1090,485 L1334,485" stroke="#E995A5" stroke-width="4"/>
   <rect x="1104" y="372" width="120" height="52" rx="24" fill="#FFF7EC" stroke="#D8C4A4" stroke-width="5"/>
   <rect x="1086" y="556" width="260" height="30" rx="6" fill="#B98552" stroke="#8A5E35" stroke-width="5"/>
   <!-- rug -->
   <ellipse cx="720" cy="630" rx="380" ry="90" fill="#A9D1EE" stroke="#7FB2D9" stroke-width="6"/>
   <ellipse cx="720" cy="630" rx="320" ry="66" fill="none" stroke="#FFF7EC" stroke-width="6" stroke-dasharray="18 14"/>
   <!-- shoebox nest -->
   <path d="M170,530 L370,530 L360,600 L180,600 Z" fill="#C98A4B" stroke="#7F5228" stroke-width="5" stroke-linejoin="round"/>
   <path d="M176,532 Q230,500 270,520 Q320,498 364,532 Z" fill="#8EC5E8" stroke="#4F8CB8" stroke-width="4"/>
   <path d="M150,602 L196,522 L214,526 L172,606 Z" fill="#B57A3E" stroke="#7F5228" stroke-width="4" stroke-linejoin="round"/>
   <text x="270" y="578" text-anchor="middle" font-family="Trebuchet MS, Verdana, sans-serif" font-size="22" font-weight="bold" fill="#7F5228">NEST</text>`,
  `<pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="3" fill="#F3D9B5"/><circle cx="30" cy="30" r="3" fill="#F3D9B5"/></pattern>
   <linearGradient id="wall0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3E0"/><stop offset="1" stop-color="#FBE6C8"/></linearGradient>
   <pattern id="wall" width="1334" height="500" patternUnits="userSpaceOnUse"><rect width="1334" height="500" fill="url(#wall0)"/><rect width="1334" height="500" fill="url(#dots)"/></pattern>
   <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD9A8"/><stop offset="1" stop-color="#BFE3F7"/></linearGradient>`,
);

// ---------- Night (evening phase) ----------

export const nightWindow = art(
  340,
  290,
  `<rect width="340" height="290" fill="url(#night)"/>
   <circle cx="270" cy="60" r="26" fill="#FFF4C9"/><circle cx="282" cy="52" r="24" fill="url(#night)"/>
   ${[[30, 40], [90, 24], [150, 60], [200, 30], [60, 100], [230, 110], [310, 140], [120, 130]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff" opacity="0.85"/>`).join('')}
   <path d="M0,230 Q85,190 170,215 Q260,190 340,230 L340,290 L0,290 Z" fill="#1E3A2E"/>
   <path d="M0,262 L340,262" stroke="#3A2A1E" stroke-width="5"/>
   ${[10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310].map((x) => `<rect x="${x}" y="244" width="12" height="40" fill="#4A3626"/>`).join('')}
   <rect x="52" y="120" width="8" height="150" fill="#2C2C3A"/><path d="M40,120 L72,120 L64,108 L48,108 Z" fill="#2C2C3A"/>
   <ellipse cx="56" cy="128" rx="40" ry="16" fill="#FFE9A8" opacity="0.35"/>
   <path d="M170,0 L170,290 M0,145 L340,145" stroke="#C9A27A" stroke-width="10"/>`,
  `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141B3C"/><stop offset="1" stop-color="#2D3A6B"/></linearGradient>`,
);

export const floorLamp = art(
  120,
  300,
  `<rect x="56" y="70" width="8" height="210" fill="#7A6A5A"/>
   <ellipse cx="60" cy="286" rx="34" ry="10" fill="#7A6A5A"/>
   <path d="M22,74 L98,74 L82,14 L38,14 Z" fill="#FFD98A" stroke="#C99A3A" stroke-width="5" stroke-linejoin="round"/>
   <path d="M30,60 L90,60" stroke="#F2C060" stroke-width="4"/>`,
);

export const lampGlow = art(
  400,
  400,
  `<circle cx="200" cy="200" r="200" fill="url(#lg)"/>`,
  `<radialGradient id="lg"><stop offset="0" stop-color="#FFE7A8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></radialGradient>`,
);

export const blanketArt = art(
  240,
  120,
  `<path d="M10,40 Q60,10 120,22 Q180,10 230,40 L222,110 L18,110 Z" fill="#5B4AA8" stroke="#2F2470" stroke-width="5" stroke-linejoin="round"/>
   ${[[50, 50], [100, 70], [150, 45], [190, 80], [70, 90], [130, 95]].map(([x, y]) => `<path d="M${x},${y - 6} L${x + 2},${y - 2} L${x + 6},${y} L${x + 2},${y + 2} L${x},${y + 6} L${x - 2},${y + 2} L${x - 6},${y} L${x - 2},${y - 2} Z" fill="#FFE27A"/>`).join('')}`,
);

export const nestFront = art(
  220,
  60,
  `<path d="M6,4 L214,4 L204,56 L16,56 Z" fill="#C98A4B" stroke="#7F5228" stroke-width="5" stroke-linejoin="round"/>
   <text x="110" y="40" text-anchor="middle" font-family="Trebuchet MS, Verdana, sans-serif" font-size="22" font-weight="bold" fill="#7F5228">NEST</text>`,
);

export const windowThingArt: Record<string, Art> = {
  moth: art(
    60,
    50,
    `<ellipse cx="18" cy="22" rx="16" ry="12" fill="#D9CBB0" stroke="#8C7B57" stroke-width="3"/><ellipse cx="42" cy="22" rx="16" ry="12" fill="#D9CBB0" stroke="#8C7B57" stroke-width="3"/>
     <ellipse cx="30" cy="28" rx="5" ry="14" fill="#8C7B57"/><path d="M28,14 Q22,4 16,4 M32,14 Q38,4 44,4" stroke="#8C7B57" stroke-width="2" fill="none"/>`,
  ),
  blink: art(
    120,
    80,
    `<path d="M10,20 L46,30 M110,20 L74,30" stroke="#5A5F6E" stroke-width="6" stroke-linecap="round"/>
     <ellipse cx="14" cy="18" rx="14" ry="4" fill="#9AA1B2"/><ellipse cx="106" cy="18" rx="14" ry="4" fill="#9AA1B2"/>
     <circle cx="60" cy="44" r="28" fill="#6B7285" stroke="#2E3240" stroke-width="5"/>
     <circle cx="60" cy="46" r="13" fill="#20222B"/><circle cx="60" cy="46" r="7" fill="#FF2E3E"/><circle cx="57" cy="43" r="2.5" fill="#fff"/>`,
  ),
  cat: art(
    120,
    90,
    `<path d="M20,88 Q16,52 40,46 L86,46 Q104,48 104,70 L104,88 Z" fill="#14141C"/>
     <circle cx="90" cy="40" r="18" fill="#14141C"/><path d="M76,30 L78,12 L88,26 Z M98,26 L106,12 L106,32 Z" fill="#14141C"/>
     <path d="M22,70 Q2,60 8,36" stroke="#14141C" stroke-width="8" fill="none" stroke-linecap="round"/>
     <circle cx="85" cy="38" r="3" fill="#C9F27A"/><circle cx="96" cy="38" r="3" fill="#C9F27A"/>`,
  ),
  surveyor: art(
    90,
    150,
    `<path d="M20,40 L70,40 L64,28 L26,28 Z" fill="#0E0F16"/><rect x="14" y="38" width="62" height="6" rx="3" fill="#0E0F16"/>
     <circle cx="45" cy="58" r="16" fill="#0E0F16"/>
     <path d="M18,150 L22,84 Q45,70 68,84 L72,150 Z" fill="#0E0F16"/>
     <rect x="54" y="92" width="26" height="34" rx="3" fill="#E8E3D4" transform="rotate(10 67 109)"/>
     <path d="M58,100 L76,103 M57,108 L75,111 M56,116 L70,118" stroke="#7A7464" stroke-width="2" transform="rotate(10 67 109)"/>`,
  ),
};

export const zzz = art(60, 50, `<text x="6" y="40" font-family="Trebuchet MS, Verdana, sans-serif" font-size="34" font-weight="bold" fill="#B9C6FF" stroke="#2F2470" stroke-width="2">z</text>`);

/** Kit's fuzzy slipper. `chewed` adds tooth holes (Day 3's Fix-It). */
export function slipperArt(chewed = false): Art {
  const holes = chewed
    ? `<ellipse cx="52" cy="58" rx="9" ry="7" fill="#5A3A2E"/><ellipse cx="88" cy="70" rx="8" ry="6" fill="#5A3A2E"/><ellipse cx="118" cy="62" rx="7" ry="6" fill="#5A3A2E"/><path d="M30,48 l6,-6 l4,8 l6,-7" fill="none" stroke="#5A3A2E" stroke-width="3"/>`
    : '';
  return art(
    160,
    120,
    `<path d="M14,70 Q14,40 50,38 L120,40 Q150,44 150,72 Q150,98 118,100 L44,100 Q14,98 14,70 Z" fill="#8FC3F0" stroke="#3E6E9E" stroke-width="5" stroke-linejoin="round"/>
     <path d="M26,66 Q60,46 104,52 Q130,56 140,70" fill="none" stroke="#C7E3FA" stroke-width="10" stroke-linecap="round"/>
     <circle cx="44" cy="44" r="10" fill="#FFD8E4" stroke="#C97A95" stroke-width="3"/><circle cx="62" cy="40" r="10" fill="#FFD8E4" stroke="#C97A95" stroke-width="3"/>
     ${holes}`,
  );
}
