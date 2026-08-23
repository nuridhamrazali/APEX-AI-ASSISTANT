const lerp = (a, b, t) => a + (b - a) * t;
const getInterpolated = (pts, y) => {
  if (y >= pts[0].y) return pts[0].v;
  if (y <= pts[pts.length-1].y) return pts[pts.length-1].v;
  for (let i = 0; i < pts.length - 1; i++) {
    if (y <= pts[i].y && y > pts[i+1].y) {
      const t = (y - pts[i+1].y) / (pts[i].y - pts[i+1].y);
      return lerp(pts[i+1].v, pts[i].v, t);
    }
  }
  return 0;
};
// adjusted for a better head shape
const xPts = [
  {y: 1.0, v: 0.1}, {y: 0.8, v: 0.35}, {y: 0.6, v: 0.45}, {y: 0.3, v: 0.42}, {y: 0.1, v: 0.35}, 
  {y: -0.1, v: 0.25}, {y: -0.3, v: 0.25}, {y: -0.4, v: 0.45}, {y: -0.7, v: 0.8}, {y: -1.0, v: 1.0}
];
const zPts = [
  {y: 1.0, v: 0.1}, {y: 0.8, v: 0.45}, {y: 0.6, v: 0.55}, {y: 0.3, v: 0.52}, {y: 0.1, v: 0.45}, 
  {y: -0.1, v: 0.30}, {y: -0.3, v: 0.30}, {y: -0.4, v: 0.35}, {y: -0.7, v: 0.45}, {y: -1.0, v: 0.5}
];

let total = 0;
for(let i=0; i<60; i++) { // 60 scanlines
  const y = -1.0 + (i / 59) * 2.0;
  const rx = getInterpolated(xPts, y);
  const rz = getInterpolated(zPts, y);
  const circ = Math.PI * (rx + rz);
  const pts = Math.max(10, Math.floor(circ * 80));
  total += pts;
}
console.log("Total points for scanlines:", total);
