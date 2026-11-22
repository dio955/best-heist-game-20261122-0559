// player.js — Wren the thief: WASD/arrows to move, Shift to run (loud),
// mouse click tosses a coin noisemaker. Hides in shadow planters.
(function (global) {
  'use strict';

  var CFG = global.HEIST_CONFIG;
  var LEVELS = global.HEIST_LEVELS;

  function Player(level, spawn) {
    this.level = level;
    this.x = (spawn.x + 0.5) * CFG.TILE;
    this.y = (spawn.y + 0.5) * CFG.TILE;
    this.radius = CFG.PLAYER_RADIUS;
    this.coins = CFG.COINS_PER_ROOM;
    this.running = false;
    this.moving = false;
    this.hidden = false;
    this.stepTimer = 0;
    this.coinsInFlight = [];
  }

  // Circle vs tile collision, axis by axis so the player slides along walls.
  Player.prototype.tryMove = function (dx, dy) {
    var nx = this.x + dx;
    var ny = this.y + dy;
    var r = this.radius;
    var level = this.level;
    function blockedAt(px, py) {
      return LEVELS.isSolid(level, Math.floor(px / CFG.TILE), Math.floor(py / CFG.TILE));
    }
    var xFree = !blockedAt(nx + (dx > 0 ? r : -r), this.y - r + 1) &&
      !blockedAt(nx + (dx > 0 ? r : -r), this.y + r - 1) &&
      !blockedAt(nx + (dx > 0 ? r : -r), this.y);
    if (xFree) { this.x = nx; }
    var yFree = !blockedAt(this.x - r + 1, ny + (dy > 0 ? r : -r)) &&
      !blockedAt(this.x + r - 1, ny + (dy > 0 ? r : -r)) &&
      !blockedAt(this.x, ny + (dy > 0 ? r : -r));
    if (yFree) { this.y = ny; }
  };

  Player.prototype.update = function (dt, keys) {
    var dx = 0;
    var dy = 0;
    if (keys.left) { dx -= 1; }
    if (keys.right) { dx += 1; }
    if (keys.up) { dy -= 1; }
    if (keys.down) { dy += 1; }
    this.moving = dx !== 0 || dy !== 0;
    this.running = !!keys.run && this.moving;
    if (this.moving) {
      var len = Math.sqrt(dx * dx + dy * dy);
      var speed = this.running ? CFG.RUN_SPEED : CFG.WALK_SPEED;
      this.tryMove(dx / len * speed * dt, dy / len * speed * dt);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.running ? 0.22 : 0.38;
        if (global.HEIST_AUDIO) { global.HEIST_AUDIO.footstep(); }
      }
    }
    // Hidden while standing on a shadow planter tile.
    var tile = LEVELS.tileAt(this.level,
      Math.floor(this.x / CFG.TILE), Math.floor(this.y / CFG.TILE));
    this.hidden = tile === 'shadow';
    // Animate coins in flight; a landed coin pings once.
    var i, coin;
    for (i = this.coinsInFlight.length - 1; i >= 0; i--) {
      coin = this.coinsInFlight[i];
      coin.t += dt / 0.45;
      if (coin.t >= 1) {
        coin.x = coin.tx;
        coin.y = coin.ty;
        coin.landed = true;
        coin.pingLeft = 0.6;
        this.coinsInFlight.splice(i, 1);
        if (coin.onLand) { coin.onLand(coin); }
      } else {
        coin.x = coin.x0 + (coin.tx - coin.x0) * coin.t;
        coin.y = coin.y0 + (coin.ty - coin.y0) * coin.t - Math.sin(coin.t * Math.PI) * 26;
      }
    }
  };

  // Toss a coin toward a pixel point. Returns false when out of coins.
  Player.prototype.tossCoin = function (tx, ty, onLand) {
    if (this.coins <= 0) { return false; }
    this.coins -= 1;
    this.coinsInFlight.push({
      x0: this.x, y0: this.y, tx: tx, ty: ty,
      x: this.x, y: this.y, t: 0, landed: false, onLand: onLand
    });
    if (global.HEIST_AUDIO) { global.HEIST_AUDIO.coin(); }
    return true;
  };

  Player.prototype.tilePos = function () {
    return { x: Math.floor(this.x / CFG.TILE), y: Math.floor(this.y / CFG.TILE) };
  };

  global.HEIST_PLAYER = { Player: Player };
})(typeof window !== 'undefined' ? window : globalThis);
