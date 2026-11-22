// levels.js — the three rooms of One Clean Minute as ASCII maps.
// Legend: # wall, . floor, C crate (cover, blocks sight + movement),
// S shadow planter (hide inside), P player spawn, E exit, G guard spawn,
// o loot dot, J crown jewel (main loot), X camera mount (impassable, sees).
(function (global) {
  'use strict';

  var TILE = 32;

  var MAPS = [
    {
      name: 'Room 1 — The Gallery',
      map: [
        '##############################',
        '#............J.......X......E#',
        '#............................#',
        '#..C.........C......C........#',
        '#............................#',
        '#....S..................S....#',
        '#............................#',
        '#.........C......C...........#',
        '#..o.........................#',
        '#.........................o..#',
        '#....C..........C............#',
        '#............................#',
        '#..S....................S....#',
        '#............................#',
        '#......C.......C......C......#',
        '#..o......................o..#',
        '#............................#',
        '#.P..........................#',
        '##############################'
      ],
      guards: [
        { waypoints: [[5, 4], [24, 4]] },
        { waypoints: [[24, 14], [5, 14]] }
      ],
      cameras: [
        { tile: [20, 1], baseAngle: Math.PI / 2 }
      ]
    },
    {
      name: 'Room 2 — The Vault Floor',
      map: [
        '##############################',
        '#............J.........X....E#',
        '#...........o................#',
        '#..C......C......C......C....#',
        '#............................#',
        '#.....S...........C......S...#',
        '#............................#',
        '#..C......####.......C.......#',
        '#.........####...............#',
        '#..o......####..........o...X#',
        '#.........####...............#',
        '#..C......####.......C.......#',
        '#............................#',
        '#..o..S..........C......S....#',
        '#............................#',
        '#..C......C......C......C....#',
        '#..o......................o..#',
        '#.P..........................#',
        '##############################'
      ],
      guards: [
        { waypoints: [[4, 3], [25, 3]] },
        { waypoints: [[25, 13], [4, 13]] },
        { waypoints: [[15, 6], [15, 16]] }
      ],
      cameras: [
        { tile: [21, 1], baseAngle: Math.PI / 2 },
        { tile: [28, 9], baseAngle: Math.PI }
      ]
    },
    {
      name: 'Room 3 — The Gilded Vault',
      map: [
        '##############################',
        '#......J.....X........X.....E#',
        '#.........................o..#',
        '#..C....C......C.......C.....#',
        '#............................#',
        '#....S.....C........C....S..o#',
        '#............................#',
        '#......C......C.......C......#',
        '#..o.........................#',
        '#............####............#',
        '#..C........######.......C..X#',
        '#............####............#',
        '#.........................o..#',
        '#....S.....C........C....S...#',
        '#..o.........................#',
        '#..C....C......C.......C.....#',
        '#..o......................o..#',
        '#.P....................o.....#',
        '##############################'
      ],
      guards: [
        { waypoints: [[5, 3], [26, 3]] },
        { waypoints: [[26, 15], [5, 15]] },
        { waypoints: [[8, 8], [21, 8]] },
        { waypoints: [[21, 12], [8, 12]] }
      ],
      cameras: [
        { tile: [14, 1], baseAngle: Math.PI / 2 },
        { tile: [23, 1], baseAngle: Math.PI / 2 },
        { tile: [28, 10], baseAngle: Math.PI }
      ]
    }
  ];

  // Parse one ASCII map into tiles and markers.
  // Tile kinds: 'wall', 'floor', 'crate', 'shadow', 'camera'.
  function parseLevel(def) {
    var rows = def.map;
    var height = rows.length;
    var width = rows[0].length;
    var tiles = [];
    var playerSpawn = null;
    var exit = null;
    var jewel = null;
    var loot = [];
    var guardSpawns = [];
    var cameraTiles = [];
    var y, x, ch;
    for (y = 0; y < height; y++) {
      tiles[y] = [];
      for (x = 0; x < width; x++) {
        ch = rows[y][x];
        if (ch === '#') { tiles[y][x] = 'wall'; }
        else if (ch === 'C') { tiles[y][x] = 'crate'; }
        else if (ch === 'S') { tiles[y][x] = 'shadow'; }
        else if (ch === 'X') { tiles[y][x] = 'camera'; cameraTiles.push({ x: x, y: y }); }
        else { tiles[y][x] = 'floor'; }
        if (ch === 'P') { playerSpawn = { x: x, y: y }; }
        if (ch === 'E') { exit = { x: x, y: y }; }
        if (ch === 'J') { jewel = { x: x, y: y }; }
        if (ch === 'o') { loot.push({ x: x, y: y, taken: false }); }
        if (ch === 'G') { guardSpawns.push({ x: x, y: y }); }
      }
    }
    return {
      name: def.name,
      width: width,
      height: height,
      tiles: tiles,
      playerSpawn: playerSpawn,
      exit: exit,
      jewel: jewel,
      loot: loot,
      guardSpawns: guardSpawns,
      cameraTiles: cameraTiles,
      guardDefs: def.guards,
      cameraDefs: def.cameras
    };
  }

  function tileCenter(t, axis) {
    return (t[axis] + 0.5) * TILE;
  }

  function tileAt(level, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) { return 'wall'; }
    return level.tiles[ty][tx];
  }

  function isSolid(level, tx, ty) {
    var t = tileAt(level, tx, ty);
    return t === 'wall' || t === 'crate' || t === 'camera';
  }

  function blocksSight(level, tx, ty) {
    var t = tileAt(level, tx, ty);
    return t === 'wall' || t === 'crate';
  }

  // Line of sight between two pixel points, sampled every 8px.
  function hasLineOfSight(level, x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(dist / 8));
    var i, sx, sy;
    for (i = 1; i < steps; i++) {
      sx = x0 + dx * i / steps;
      sy = y0 + dy * i / steps;
      if (blocksSight(level, Math.floor(sx / TILE), Math.floor(sy / TILE))) { return false; }
    }
    return true;
  }

  global.HEIST_LEVELS = {
    MAPS: MAPS,
    parseLevel: parseLevel,
    tileCenter: tileCenter,
    tileAt: tileAt,
    isSolid: isSolid,
    blocksSight: blocksSight,
    hasLineOfSight: hasLineOfSight
  };
})(typeof window !== 'undefined' ? window : globalThis);
