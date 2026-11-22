// cameras.js — Camera: wall-mounted, sweeps its cone back and forth.
// Seeing the player drives the alarm up fast; a coin landing close
// blinds the lens for a few seconds.
(function (global) {
  'use strict';

  var CFG = global.HEIST_CONFIG;
  var LEVELS = global.HEIST_LEVELS;
  var angleDiff = global.HEIST_GUARD.angleDiff;

  function Camera(level, def) {
    this.level = level;
    this.x = (def.tile[0] + 0.5) * CFG.TILE;
    this.y = (def.tile[1] + 0.5) * CFG.TILE;
    this.baseAngle = def.baseAngle;
    this.sweepTime = Math.random() * CFG.CAMERA_SWEEP_PERIOD_S;
    this.angle = this.baseAngle;
    this.blindLeft = 0;
    this.seesPlayer = false;
  }

  Camera.prototype.blind = function (seconds) {
    this.blindLeft = Math.max(this.blindLeft, seconds);
  };

  Camera.prototype.canSee = function (player) {
    if (this.blindLeft > 0) { return false; }
    var dx = player.x - this.x;
    var dy = player.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > CFG.CAMERA_RANGE) { return false; }
    var ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, this.angle)) > CFG.CAMERA_HALF_ANGLE) { return false; }
    if (player.hidden && dist > CFG.HIDE_DISTANCE) { return false; }
    return LEVELS.hasLineOfSight(this.level, this.x, this.y, player.x, player.y);
  };

  Camera.prototype.update = function (dt, player, alarm) {
    this.sweepTime += dt;
    var phase = (this.sweepTime % CFG.CAMERA_SWEEP_PERIOD_S) / CFG.CAMERA_SWEEP_PERIOD_S;
    var sweep = Math.sin(phase * Math.PI * 2) * CFG.CAMERA_SWEEP_ARC;
    this.angle = this.baseAngle + sweep;
    if (this.blindLeft > 0) { this.blindLeft -= dt; }
    this.seesPlayer = this.canSee(player);
    if (this.seesPlayer) {
      alarm.value = Math.min(100, alarm.value + CFG.ALARM_CAMERA_RATE * dt);
    }
  };

  global.HEIST_CAMERA = { Camera: Camera };
})(typeof window !== 'undefined' ? window : globalThis);
