// config.js — every tunable number for One Clean Minute, in one place.
(function (global) {
  'use strict';

  var CONFIG = {
    // Canvas and grid.
    TILE: 32,
    COLS: 30,
    ROWS: 19,
    CANVAS_W: 960,
    CANVAS_H: 656,
    HUD_H: 48,

    // Player.
    PLAYER_RADIUS: 11,
    WALK_SPEED: 130,
    RUN_SPEED: 200,
    RUN_NOISE_RADIUS: 150,

    // Guards.
    GUARD_RADIUS: 12,
    GUARD_WALK_SPEED: 55,
    GUARD_CHASE_SPEED: 105,
    GUARD_PAUSE_S: 0.8,
    VIEW_DISTANCE: 230,
    VIEW_HALF_ANGLE: 42 * Math.PI / 180,
    CLOSE_SEE_DISTANCE: 90,
    HIDE_DISTANCE: 48,
    CATCH_DISTANCE: 20,
    CHASE_TIME_S: 6,

    // Cameras.
    CAMERA_RANGE: 200,
    CAMERA_HALF_ANGLE: 30 * Math.PI / 180,
    CAMERA_SWEEP_ARC: 50 * Math.PI / 180,
    CAMERA_SWEEP_PERIOD_S: 4,
    CAMERA_BLIND_S: 8,

    // Alarm meter 0..100.
    ALARM_GUARD_RATE: 55,
    ALARM_GUARD_CLOSE_RATE: 85,
    ALARM_CAMERA_RATE: 70,
    ALARM_DECAY_RATE: 20,
    ALARM_GHOST_LIMIT: 50,

    // Coins.
    COINS_PER_ROOM: 3,
    COIN_NOISE_RADIUS: 170,
    COIN_BLIND_RADIUS: 90,

    // Room rules.
    ROOM_TIME_S: 90,
    START_LIVES: 3,
    LOOT_SCORE: 100,
    JEWEL_SCORE: 500,
    TIME_BONUS_PER_S: 10,
    GHOST_BONUS: 1000,

    // Colours.
    COLORS: {
      floorA: '#2b2b33',
      floorB: '#26262e',
      wall: '#17171d',
      wallTop: '#3a3a46',
      crate: '#5a4632',
      crateTop: '#7a6248',
      shadow: '#12351f',
      shadowEdge: '#1e5c34',
      player: '#ffd23f',
      playerRing: '#fff3b0',
      guard: '#e5484d',
      guardCone: 'rgba(255, 210, 63, 0.20)',
      guardConeAlarm: 'rgba(229, 72, 77, 0.30)',
      camera: '#7dd3fc',
      cameraCone: 'rgba(125, 211, 252, 0.18)',
      cameraConeAlarm: 'rgba(229, 72, 77, 0.30)',
      loot: '#ffd23f',
      jewel: '#ff5d8f',
      exit: '#34d399',
      exitLocked: '#475569',
      hudBg: '#101014',
      text: '#f1f5f9',
      muted: '#94a3b8',
      alarmLow: '#34d399',
      alarmMid: '#f59e0b',
      alarmHigh: '#e5484d'
    }
  };

  global.HEIST_CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
