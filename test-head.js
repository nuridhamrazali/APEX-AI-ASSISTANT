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

const xPts = [
  {y: 0.9, v: 0.01}, {y: 0.7, v: 0.3}, {y: 0.5, v: 0.35}, {y: 0.2, v: 0.3}, {y: 0.05, v: 0.2}, 
  {y: -0.1, v: 0.15}, {y: -0.2, v: 0.18}, {y: -0.4, v: 0.5}, {y: -0.8, v: 0.9}, {y: -1.0, v: 1.0}
];
const zPts = [
  {y: 0.9, v: 0.01}, {y: 0.7, v: 0.4}, {y: 0.5, v: 0.45}, {y: 0.2, v: 0.4}, {y: 0.05, v: 0.2}, 
  {y: -0.1, v: 0.15}, {y: -0.2, v: 0.2}, {y: -0.4, v: 0.25}, {y: -0.8, v: 0.3}, {y: -1.0, v: 0.35}
];

for(let y=0.9; y>=-1; y-=0.1) {
  console.log(`y=${y.toFixed(1)} x=${getInterpolated(xPts, y).toFixed(2)} z=${getInterpolated(zPts, y).toFixed(2)}`);
}
