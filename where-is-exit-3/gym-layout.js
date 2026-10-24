// Ten times the former 40 × 40 floor area. The short entrance passage is extra.
// One shared layout keeps rendering, collision, placement and monster AI in sync.
export const GYM = Object.freeze({
  x:105, z:-60, w:160, d:100,
  minX:25, maxX:185, minZ:-110, maxZ:-10,
  height:9.4,
  passage:{x:15,z:-21,w:20,d:8},
  balls:{x:31,z:-14},
  supply:{x:44,z:-14},
  start:{x:36,z:-27,w:6,d:6},
  goal:{x:117.6,z:-79.2,w:7.2,d:7.2},
  rests:[{x:64.8,z:-27,w:7.2,d:7.2},{x:84,z:-51,w:7.2,d:7.2}],
  spiderSpawn:{x:54,z:-36},
  countingSpot:{x:105.6,z:-67.2},
  respawn:{x:29,z:-21},
  ballRange:48,
  seekRange:72,
  searchPoints:[{x:126,z:-65},{x:147,z:-84},{x:159,z:-42},{x:96,z:-32},{x:72,z:-66},{x:42,z:-94}],
  hideouts:[{x:127.2,z:-94.8},{x:164.4,z:-22.8},{x:162,z:-79.2},{x:57.6,z:-88.8},{x:93.6,z:-16.8}]
});
export const inGymHall=(x,z,margin=0)=>x>GYM.minX+margin&&x<GYM.maxX-margin&&z>GYM.minZ+margin&&z<GYM.maxZ-margin;
