// guards.js — Guard: patrols waypoints, sees with a vision cone,
// gets suspicious, chases on full alarm, investigates noises.
(function (global) {
  'use strict';

  var CFG = global.HEIST_CONFIG;
  var LEVELS = global.HEIST_LEVELS;

  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) { d -= Math.PI * 2; }
    while (d < -Math.PI) { d += Math.PI * 2; }
    return d;
  }

  function Guard(level, def, spawnTile) {
    var start = spawnTile || { x: def.waypoints[0][0], y: def.waypoints[0][1] };
    this.level = level;
    this.waypoints = def.waypoints.map(function (w) {
      return { x: (w[0] + 0.5) * CFG.TILE, y: (w[1] + 0.5) * CFG.TILE };
    });
    this.x = (start.x + 0.5) * CFG.TILE;
    this.y = (start.y + 0.5) * CFG.TILE;
    this.angle = 0;
    this.wpIndex = 1 % this.waypoints.length;
    this.pauseLeft = 0;
    this.state = 'patrol'; // patrol | suspicious | alarm | investigate
    this.stateTime = 0;
    this.investigateX = 0;
    this.investigateY = 0;
    this.seesPlayer = false;
    this.stepTimer = 0;
  }

  Guard.prototype.distanceTo = function (x, y) {
    var dx = x - this.x;
    var dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Can this guard see the player right now?
  Guard.prototype.canSee = function (player) {
    var dist = this.distanceTo(player.x, player.y);
    if (dist > CFG.VIEW_DISTANCE) { return false; }
    var ang = Math.atan2(player.y - this.y, player.x - this.x);
    if (Math.abs(angleDiff(ang, this.angle)) > CFG.VIEW_HALF_ANGLE) { return false; }
    if (player.hidden && dist > CFG.HIDE_DISTANCE) { return false; }
    return LEVELS.hasLineOfSight(this.level, this.x, this.y, player.x, player.y);
  };

  Guard.prototype.hearNoise = function (x, y, radius) {
    if (this.state === 'alarm') { return; }
    if (this.distanceTo(x, y) <= radius) {
      this.state = 'investigate';
      this.stateTime = 0;
      this.investigateX = x;
      this.investigateY = y;
    }
  };

  Guard.prototype.moveToward = function (tx, ty, speed, dt) {
    var dx = tx - this.x;
    var dy = ty - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { return true; }
    var step = Math.min(dist, speed * dt);
    this.x += dx / dist * step;
    this.y += dy / dist * step;
    this.angle = Math.atan2(dy, dx);
    return dist - step < 2;
  };

  Guard.prototype.update = function (dt, player, alarm) {
    var prevState = this.state;
    this.stateTime += dt;
    this.seesPlayer = this.canSee(player);

    if (this.seesPlayer) {
      var rate = this.distanceTo(player.x, player.y) < CFG.CLOSE_SEE_DISTANCE
        ? CFG.ALARM_GUARD_CLOSE_RATE : CFG.ALARM_GUARD_RATE;
      alarm.value = Math.min(100, alarm.value + rate * dt);
      if (alarm.value >= 100) {
        this.state = 'alarm';
        this.stateTime = 0;
      } else if (this.state === 'patrol' || this.state === 'investigate') {
        this.state = 'suspicious';
        this.stateTime = 0;
      }
    } else if (this.state === 'suspicious') {
      this.state = 'patrol';
      this.stateTime = 0;
    }

    if (this.state === 'alarm') {
      this.moveToward(player.x, player.y, CFG.GUARD_CHASE_SPEED, dt);
      if (this.stateTime > CFG.CHASE_TIME_S) {
        this.state = 'patrol';
        this.stateTime = 0;
      }
      if (this.distanceTo(player.x, player.y) < CFG.CATCH_DISTANCE) {
        this.caughtPlayer = true;
      }
    } else if (this.state === 'investigate') {
      var arrived = this.moveToward(this.investigateX, this.investigateY, CFG.GUARD_WALK_SPEED * 1.4, dt);
      if (arrived) {
        this.angle += dt * 1.5;
        if (this.stateTime > 4) {
          this.state = 'patrol';
          this.stateTime = 0;
        }
      }
    } else if (this.state === 'suspicious') {
      this.moveToward(player.x, player.y, CFG.GUARD_WALK_SPEED * 1.2, dt);
    } else {
      // Patrol: walk the waypoint loop, pausing at each stop.
      if (this.pauseLeft > 0) {
        this.pauseLeft -= dt;
        if (this.pauseLeft <= 0) { this.wpIndex = (this.wpIndex + 1) % this.waypoints.length; }
      } else {
        var wp = this.waypoints[this.wpIndex];
        var reached = this.moveToward(wp.x, wp.y, CFG.GUARD_WALK_SPEED, dt);
        if (reached) { this.pauseLeft = CFG.GUARD_PAUSE_S; }
      }
    }

    // Footstep ticks, louder when the guard is close to the player.
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.45;
      if (global.HEIST_AUDIO) {
        global.HEIST_AUDIO.guardStep(this.distanceTo(player.x, player.y));
      }
    }
    return prevState !== this.state ? this.state : null;
  };

  global.HEIST_GUARD = { Guard: Guard, angleDiff: angleDiff };
})(typeof window !== 'undefined' ? window : globalThis);
