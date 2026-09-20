// Geometry for the time machine.
//
// Every number here was measured off the supplied reference. The six timeline
// nodes were located by detecting their glow, and a least-squares circle fit
// through them closed to within +/-3px — so the timeline really is a circular
// arc, and it is rebuilt here as one rather than approximated by a spline
// through hand-placed points. That matters for the interaction: the cursor is
// projected onto this same arc to decide which year the visitor is reaching
// for, so the maths the scene is drawn with and the maths it is read with are
// the same maths.

export const YEARS = [
  {
    year: 2015,
    // ­ is a soft hyphen: invisible unless the browser actually needs
    // to break there, in which case it shows a real hyphen glyph. CSS
    // `hyphens: auto` alone was not reliable across browsers (it fell back
    // to a raw, hyphen-less overflow-wrap cut mid-word — "BEGINNIN/G"), so
    // every long single-word key gets an explicit break point here instead
    // of depending on the browser's own hyphenation dictionary.
    key: 'Begin­ning',
    lines: ['New city', 'New chapter', 'Bigger dreams'],
  },
  {
    year: 2016,
    key: 'Founda­tions',
    lines: ['Learning', 'Building', 'The craft'],
  },
  {
    year: 2017,
    key: 'Mo­men­tum',
    lines: ['More skills', 'Bigger goals', 'Same curiosity'],
  },
  {
    year: 2018,
    key: 'Direc­tion',
    lines: ['New tools', 'New people', 'Measured value'],
  },
  {
    year: 2019,
    key: 'Impact',
    lines: ['Real problems', 'Real solutions', 'Measurable value'],
  },
  {
    year: 2020,
    key: 'Resil­ience',
    lines: ['Remote work', 'New routines', 'Stronger focus'],
  },
  {
    year: 2021,
    key: 'Reig­niting',
    lines: ['New chapter', 'Bigger dreams', 'Fresh momentum'],
  },
  {
    year: 2022,
    key: 'Explo­ration',
    lines: ['Learned design', 'Found direction'],
  },
  {
    year: 2023,
    key: 'Prac­tice',
    lines: ['Built skills', 'Made projects', 'Kept going'],
  },
  {
    year: 2024,
    key: 'Growth',
    lines: ['Real projects', 'Real people', 'Real learning'],
  },
  {
    year: 2025,
    key: 'Oppor­tu­nities',
    lines: ['Collaborated', 'Solved problems', 'Stepped up'],
  },
  {
    year: 2026,
    key: 'Next chapter',
    lines: ['Bigger goals', 'More impact', 'Still designing'],
  },
];

// measured in the 1280x720 reference, stored as fractions of the frame.
// Re-measured whole when the timeline grew from 6 to 12 nodes (2015-2026):
// cramming twice the cards into the same frame reflows the whole curve, so
// the old 2021-2026 fractions (measured for a 6-card row) no longer apply.
// Each card centre below is this poster's own detected box (or, where the
// generator fused a card's photo into its frame, a linear fill between its
// neighbours); each node is that card centre offset upward by this poster's
// own median node-to-card gap (~0.132 frame heights) — the same
// relationship the original six points carried. The 2022-2026 stretch is
// evenly resampled between those two real anchors rather than kept at its
// raw detected spacing: the raw boxes clustered three years into barely
// more space than one, leaving too little width for their captions even
// after the DOM upscale was capped to the gap (see boot3.js place()).
const REF = {
  nodes: [
    [0.1176, 0.2304],
    [0.1909, 0.2620],
    [0.2585, 0.2805],
    [0.3261, 0.2989],
    [0.4004, 0.3087],
    [0.4695, 0.3053],
    [0.5386, 0.3018],
    [0.6139, 0.3117],
    [0.6778, 0.3065],
    [0.7417, 0.3014],
    [0.8056, 0.2962],
    [0.8695, 0.2910],
  ],
  // centre of each card's artwork, and the card's width as a fraction of frame
  cards: [
    [0.1194, 0.3628, 0.0350],
    [0.1927, 0.3944, 0.0446],
    [0.2603, 0.4129, 0.0422],
    [0.3279, 0.4313, 0.0398],
    [0.4022, 0.4411, 0.0469],
    [0.4713, 0.4377, 0.0441],
    [0.5404, 0.4342, 0.0413],
    [0.6157, 0.4441, 0.0484],
    [0.6796, 0.4389, 0.0570],
    [0.7435, 0.4338, 0.0655],
    [0.8074, 0.4286, 0.0741],
    [0.8713, 0.4234, 0.0826],
  ],
  pivot: [0.6991, 0.0483],   // the clock's hand pivot
  // The dial is NOT concentric with the hand in the reference — it is a much
  // larger circle whose centre sits well above frame, which is why only a
  // shallow sweep of its rim is ever on screen. Centre offset from the pivot,
  // radius in height units.
  dial: [0.0, -0.20, 0.47],
  // Slightly LEFT of true centre, and a step NEARER than the deck: he renders
  // on the front canvas, over the cards, standing in front of his own journey.
  // Offset left and set LOW — nearer the viewer than the ring centre — so his
  // head rises only into a card's PHOTO, never its caption text: every card
  // stays readable around him. The ring system stays centred on the scene
  // regardless.
  // Height was 0.412 for the 6-card layout; with 12 cards now packed into
  // the same frame their captions sit measurably lower (proportionally
  // taller text blocks per card), so his old reach rose into 2019's caption
  // — confirmed against a live screenshot, his head-top landed mid-caption.
  // Shortened so his head-top clears every card's text zone with margin.
  figure: [0.3900, 0.9740, 0.30],  // centre x, feet y, height as frac of frame
  floor: [0.4900, 0.9550],   // centre of the ring system, at his feet
};

/**
 * Fit the reference composition to the current viewport.
 *
 * The poster is 16:9. On a wider screen the composition is anchored by height
 * and allowed to breathe sideways; on a narrower one it is anchored by width so
 * the timeline never runs off the edge. Returning plain pixel coordinates keeps
 * the DOM cards and the WebGL scene reading from one source of truth.
 */
export function fitScene(w, h) {
  const refAspect = 16 / 9;
  const aspect = w / h;
  const portrait = aspect < 0.95;

  // uniform scale plus an offset, so nothing is ever stretched
  let scale;
  let ox = 0;
  let oy = 0;
  if (aspect >= refAspect) {
    scale = h / 720;
    ox = (w - 1280 * scale) * 0.5;
  } else {
    scale = w / 1280;
    oy = (h - 720 * scale) * 0.5;
  }

  const P = ([fx, fy]) => [ox + fx * 1280 * scale, oy + fy * 720 * scale];

  let nodes;
  let cards;
  let pivot;
  let floor;
  let figure;

  if (portrait) {
    // A genuine recomposition, not the landscape frame scaled down. Mapped
    // straight onto a tall screen the arc collapses into a 60px band and all
    // six cards land on top of each other. Instead the timeline stands UP: the
    // years become a vertical rail down the left, and one card at a time holds
    // the stage beside it.
    const railX = w * 0.155;
    const top = h * 0.20;
    // the rail spans a fixed band regardless of how many years it carries,
    // so it always fits the viewport instead of running off the bottom
    const step = (h * 0.66) / Math.max(1, REF.nodes.length - 1);
    nodes = REF.nodes.map((_, i) => [railX + i * w * 0.006, top + i * step]);
    const cw = Math.min(w * 0.62, 330);
    cards = REF.nodes.map((_, i) => ({
      x: w * 0.60, y: h * 0.50, w: cw, i,
    }));
    pivot = [w * 0.52, h * 0.075];
    floor = [w * 0.5, h * 0.965];
    figure = { cx: w * 0.5, feet: h * 0.965, h: h * 0.30 };
  } else {
    nodes = REF.nodes.map(P);
    cards = REF.cards.map(([fx, fy, fw], i) => {
      const [x, y] = P([fx, fy]);
      return { x, y, w: fw * 1280 * scale, i };
    });
    pivot = P(REF.pivot);
    floor = P(REF.floor);
    figure = {
      cx: P([REF.figure[0], 0])[0],
      feet: P([0, REF.figure[1]])[1],
      h: REF.figure[2] * 720 * scale,
    };
  }

  // circle through the nodes, refit in screen pixels
  const arc = fitCircle(nodes);
  const angles = nodes.map((n) => Math.atan2(n[1] - arc.cy, n[0] - arc.cx));

  // angle from the clock pivot to each year — this is what the hand points at
  const handAngles = nodes.map((n) =>
    Math.atan2(n[1] - pivot[1], n[0] - pivot[0]));

  const dial = portrait
    ? { cx: pivot[0], cy: pivot[1] - h * 0.30, r: h * 0.40 }
    : {
      cx: pivot[0] + REF.dial[0] * 720 * scale,
      cy: pivot[1] + REF.dial[1] * 720 * scale,
      r: REF.dial[2] * 720 * scale,
    };

  return {
    w, h, scale, portrait,
    nodes, cards, pivot, dial, floor, figure, arc, angles, handAngles,
  };
}

function fitCircle(pts) {
  const A = pts.map((p) => [p[0], p[1], 1]);
  const b = pts.map((p) => -(p[0] * p[0] + p[1] * p[1]));
  const [D, E, F] = solve3(A, b);
  const cx = -D / 2;
  const cy = -E / 2;
  return { cx, cy, r: Math.sqrt(Math.max(cx * cx + cy * cy - F, 1)) };
}

/** Normal-equation solve of an over-determined 3-column system. */
function solve3(A, b) {
  const N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const r = [0, 0, 0];
  for (let k = 0; k < A.length; k++) {
    for (let i = 0; i < 3; i++) {
      r[i] += A[k][i] * b[k];
      for (let j = 0; j < 3; j++) N[i][j] += A[k][i] * A[k][j];
    }
  }
  // Gaussian elimination with partial pivoting
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(N[k][i]) > Math.abs(N[p][i])) p = k;
    [N[i], N[p]] = [N[p], N[i]];
    [r[i], r[p]] = [r[p], r[i]];
    const d = N[i][i] || 1e-9;
    for (let k = i + 1; k < 3; k++) {
      const f = N[k][i] / d;
      for (let j = i; j < 3; j++) N[k][j] -= f * N[i][j];
      r[k] -= f * r[i];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = r[i];
    for (let j = i + 1; j < 3; j++) s -= N[i][j] * x[j];
    x[i] = s / (N[i][i] || 1e-9);
  }
  return x;
}

/**
 * Which year is the visitor reaching for?
 *
 * Not raw cursor-x: the timeline is a curve that descends across the frame, so
 * horizontal position alone would pick the wrong year whenever the pointer sits
 * above or below the arc. The cursor is instead projected onto the polyline
 * through the card centres, which yields a CONTINUOUS position along the
 * timeline. The hand reads that continuum (so it moves smoothly and can sit
 * between years), while the cards read its rounded value.
 */
export function timeAt(layout, px, py) {
  // portrait reads the vertical rail of nodes; landscape reads the card curve
  const pts = layout.portrait
    ? layout.nodes.map((n) => [n[0], n[1]])
    : layout.cards.map((c) => [c.x, c.y]);
  let best = 0;
  let bestD = Infinity;

  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + dx * t;
    const qy = ay + dy * t;
    const d = (px - qx) ** 2 + (py - qy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i + t;
    }
  }
  return { u: best, dist: Math.sqrt(bestD) };
}

/** Interpolate an angle list at a fractional index, the short way round. */
export function angleAt(list, u) {
  const i = Math.max(0, Math.min(list.length - 2, Math.floor(u)));
  const t = Math.max(0, Math.min(1, u - i));
  let a = list[i];
  let b = list[i + 1];
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
