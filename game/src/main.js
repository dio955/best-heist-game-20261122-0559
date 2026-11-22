// main.js — game loop, states, room flow and scoring for One Clean Minute.
// States: menu | playing | caught | roomclear | gameover | win
// ?shot=menu|play|alarm|win starts a deterministic demo state for screenshots.
(function () {
  'use strict';

  var CFG = window.HEIST_CONFIG;
  var LEVELS = window.HEIST_LEVELS;
  var AUDIO = window.HEIST_AUDIO;
  var RENDER = window.HEIST_RENDER;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  canvas.width = CFG.CANVAS_W;
  canvas.height = CFG.CANVAS_H;

  var params = new URLSearchParams(window.location.search);
  var shotMode = params.get('shot') || '';

  var game = {
    state: 'menu',
    roomIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    alarm: { value: 0 },
    lives: CFG.START_LIVES,
    score: 0,
    lootGot: 0,
    lootTotal: 0,
    jewelTaken: false,
    timeLeft: CFG.ROOM_TIME_S,
    time: 0,
    pings: [],
    toast: '',
    toastLeft: 0,
    roomAlarmPeak: 0,
    stateTime: 0,
    keys: { up: false, down: false, left: false, right: false, run: false }
  };

  function loadRoom(index) {
    var def = LEVELS.MAPS[index];
    var level = LEVELS.parseLevel(def);
    game.level = level;
    game.roomIndex = index;
    game.player = new window.HEIST_PLAYER.Player(level, level.playerSpawn);
    game.guards = def.guards.map(function (gdef, i) {
      var spawn = level.guardSpawns[i] || { x: gdef.waypoints[0][0], y: gdef.waypoints[0][1] };
      return new window.HEIST_GUARD.Guard(level, gdef, spawn);
    });
    game.cameras = def.cameras.map(function (cdef) {
      return new window.HEIST_CAMERA.Camera(level, cdef);
    });
    game.alarm.value = 0;
    game.lootGot = 0;
    game.lootTotal = level.loot.length + 1;
    game.jewelTaken = false;
    game.timeLeft = CFG.ROOM_TIME_S;
    game.pings = [];
    game.roomAlarmPeak = 0;
    game.toast = level.name + ' — grab the jewel, reach the green exit';
    game.toastLeft = 3;
  }

  function startGame() {
    game.score = 0;
    game.lives = CFG.START_LIVES;
    loadRoom(0);
    game.state = 'playing';
    AUDIO.unlock();
  }

  function nextRoom() {
    if (game.roomIndex + 1 >= LEVELS.MAPS.length) {
      game.state = 'win';
      game.stateTime = 0;
      AUDIO.win();
    } else {
      loadRoom(game.roomIndex + 1);
      game.state = 'playing';
    }
  }

  function caught(reason) {
    game.lives -= 1;
    game.state = 'caught';
    game.stateTime = 0;
    game.caughtReason = reason;
    AUDIO.caught();
    if (game.lives <= 0) {
      game.state = 'gameover';
      AUDIO.gameOver();
    }
  }

  function roomClear() {
    var timeBonus = Math.round(game.timeLeft) * CFG.TIME_BONUS_PER_S;
    var ghost = game.roomAlarmPeak < CFG.ALARM_GHOST_LIMIT ? CFG.GHOST_BONUS : 0;
    game.score += timeBonus + ghost;
    game.clearBonus = { time: timeBonus, ghost: ghost };
    game.state = 'roomclear';
    game.stateTime = 0;
    AUDIO.roomClear();
  }

  function coinLanded(coin) {
    game.pings.push({ x: coin.tx, y: coin.ty, left: 0.6 });
    AUDIO.coinLand();
    var i;
    for (i = 0; i < game.guards.length; i++) {
      game.guards[i].hearNoise(coin.tx, coin.ty, CFG.COIN_NOISE_RADIUS);
    }
    for (i = 0; i < game.cameras.length; i++) {
      var cam = game.cameras[i];
      var dx = coin.tx - cam.x;
      var dy = coin.ty - cam.y;
      if (Math.sqrt(dx * dx + dy * dy) <= CFG.COIN_BLIND_RADIUS) {
        cam.blind(CFG.CAMERA_BLIND_S);
      }
    }
  }

  function checkPickups() {
    var player = game.player;
    var level = game.level;
    var tp = player.tilePos();
    var i, l;
    for (i = 0; i < level.loot.length; i++) {
      l = level.loot[i];
      if (!l.taken && l.x === tp.x && l.y === tp.y) {
        l.taken = true;
        game.lootGot += 1;
        game.score += CFG.LOOT_SCORE;
        AUDIO.pickup();
      }
    }
    if (!game.jewelTaken && level.jewel && level.jewel.x === tp.x && level.jewel.y === tp.y) {
      game.jewelTaken = true;
      game.lootGot += 1;
      game.score += CFG.JEWEL_SCORE;
      AUDIO.jewel();
    }
    if (game.jewelTaken && level.exit && level.exit.x === tp.x && level.exit.y === tp.y) {
      roomClear();
    }
  }

  function update(dt) {
    game.time += dt;
    game.stateTime += dt;
    if (game.toastLeft > 0) { game.toastLeft -= dt; }
    var i;
    // Frozen demo poses (?shot=) hold still so screenshots keep their setup.
    if (game.frozen) { return; }
    for (i = game.pings.length - 1; i >= 0; i--) {
      game.pings[i].left -= dt;
      if (game.pings[i].left <= 0) { game.pings.splice(i, 1); }
    }
    if (game.state === 'playing') {
      game.timeLeft -= dt;
      if (game.timeLeft <= 0) {
        game.timeLeft = 0;
        game.alarm.value = 100;
        caught('Out of time — the alarm filled');
        return;
      }
      game.player.update(dt, game.keys);
      if (game.player.running) {
        for (i = 0; i < game.guards.length; i++) {
          game.guards[i].hearNoise(game.player.x, game.player.y, CFG.RUN_NOISE_RADIUS);
        }
      }
      var spotted = false;
      for (i = 0; i < game.guards.length; i++) {
        var change = game.guards[i].update(dt, game.player, game.alarm);
        if (change === 'alarm' && !spotted) {
          spotted = true;
          AUDIO.alarm();
        }
        if (game.guards[i].caughtPlayer) {
          caught('A guard caught Wren');
          return;
        }
      }
      for (i = 0; i < game.cameras.length; i++) {
        game.cameras[i].update(dt, game.player, game.alarm);
        if (game.cameras[i].seesPlayer && !spotted) {
          spotted = true;
          AUDIO.alarm();
        }
      }
      // Decay only when nobody sees the player.
      var anyoneSees = game.guards.some(function (g) { return g.seesPlayer; }) ||
        game.cameras.some(function (c) { return c.seesPlayer; });
      if (!anyoneSees) {
        game.alarm.value = Math.max(0, game.alarm.value - CFG.ALARM_DECAY_RATE * dt);
      }
      game.roomAlarmPeak = Math.max(game.roomAlarmPeak, game.alarm.value);
      if (game.alarm.value >= 100) {
        caught('The alarm hit 100% — lockdown');
        return;
      }
      checkPickups();
    } else if (game.state === 'caught') {
      if (game.stateTime > 1.6) { loadRoom(game.roomIndex); game.state = 'playing'; }
    } else if (game.state === 'roomclear') {
      if (game.stateTime > 2.2) { nextRoom(); }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);
    if (game.state === 'menu') {
      RENDER.drawRoom(ctx, LEVELS.parseLevel(LEVELS.MAPS[0]));
      RENDER.drawCenterText(ctx, [
        { text: 'ONE CLEAN MINUTE', big: true, accent: true },
        { text: 'A heist in three rooms. One clean minute each.', small: true },
        { text: 'Grab the pink jewel, then reach the green exit.', small: true },
        { text: 'Guards watch with yellow cones — cameras sweep blue.', small: true },
        { text: 'The alarm meter fills when you are seen. At 100% it is over.', small: true },
        { text: 'WASD / arrows move · Shift run · Click tosses a coin', small: true },
        { text: 'Click or press Enter to start', accent: true }
      ], '#ffd23f');
      return;
    }
    var level = game.level;
    RENDER.drawRoom(ctx, level);
    RENDER.drawLoot(ctx, level, game.jewelTaken, game.time);
    RENDER.drawExit(ctx, level, game.jewelTaken);
    RENDER.drawGuards(ctx, game.guards, game.time);
    RENDER.drawCameras(ctx, game.cameras);
    RENDER.drawPlayer(ctx, game.player, game.time);
    RENDER.drawPing(ctx, game.pings);
    RENDER.drawVignette(ctx, game.player);
    RENDER.drawHUD(ctx, {
      roomName: level.name,
      lootGot: game.lootGot,
      lootTotal: game.lootTotal,
      coins: game.player.coins,
      lives: game.lives,
      timeLeft: game.timeLeft,
      alarm: game.alarm.value,
      score: game.score,
      time: game.time
    });
    if (game.toastLeft > 0 && game.state === 'playing') {
      ctx.fillStyle = 'rgba(8,8,12,0.75)';
      ctx.fillRect(180, CFG.HUD_H + 8, CFG.CANVAS_W - 360, 30);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.toast, CFG.CANVAS_W / 2, CFG.HUD_H + 27);
    }
    if (game.state === 'caught') {
      RENDER.drawCenterText(ctx, [
        { text: 'CAUGHT!', big: true, accent: true },
        { text: game.caughtReason || 'Spotted.', small: true },
        { text: game.lives > 0 ? 'Lives left: ' + game.lives + ' — the room resets' : '', small: true }
      ], '#e5484d');
    } else if (game.state === 'roomclear') {
      RENDER.drawCenterText(ctx, [
        { text: 'ROOM CLEAR', big: true, accent: true },
        { text: 'Time bonus +' + game.clearBonus.time +
          (game.clearBonus.ghost ? ' · Ghost bonus +' + game.clearBonus.ghost : ''), small: true },
        { text: 'Score: ' + game.score, small: true }
      ], '#34d399');
    } else if (game.state === 'gameover') {
      RENDER.drawCenterText(ctx, [
        { text: 'GAME OVER', big: true, accent: true },
        { text: 'The crew got pinched. Score: ' + game.score, small: true },
        { text: 'Press R to try again', small: true }
      ], '#e5484d');
    } else if (game.state === 'win') {
      RENDER.drawCenterText(ctx, [
        { text: 'CLEAN GETAWAY!', big: true, accent: true },
        { text: 'All three jewels lifted. Final score: ' + game.score, small: true },
        { text: 'Wren walks out into the night, one clean minute at a time.', small: true },
        { text: 'Press R to play again', small: true }
      ], '#ffd23f');
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // Input.
  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'run', ShiftRight: 'run'
  };
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyM') {
      AUDIO.toggleMute();
      return;
    }
    if (game.state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
      startGame();
      return;
    }
    if ((game.state === 'gameover' || game.state === 'win') && e.code === 'KeyR') {
      startGame();
      return;
    }
    if (KEYMAP[e.code]) {
      game.keys[KEYMAP[e.code]] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) {
    if (KEYMAP[e.code]) { game.keys[KEYMAP[e.code]] = false; }
  });
  canvas.addEventListener('mousedown', function (e) {
    AUDIO.unlock();
    if (game.state === 'menu') { startGame(); return; }
    if (game.state !== 'playing') { return; }
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var tx = (e.clientX - rect.left) * scaleX;
    var ty = (e.clientY - rect.top) * scaleY - CFG.HUD_H;
    if (ty < 0) { return; }
    game.player.tossCoin(tx, ty, coinLanded);
  });

  // Deterministic demo states for screenshots (?shot=...).
  function applyShotMode() {
    if (!shotMode) { return; }
    if (shotMode === 'menu') {
      game.state = 'menu';
      return;
    }
    if (shotMode === 'play') {
      startGame();
      game.frozen = true;
      // Wren mid-room, a guard cone sweeping close by, one loot taken.
      game.player.x = (10 + 0.5) * CFG.TILE;
      game.player.y = (10 + 0.5) * CFG.TILE;
      game.level.loot[0].taken = true;
      game.lootGot = 1;
      game.guards[0].x = (14 + 0.5) * CFG.TILE;
      game.guards[0].y = (8 + 0.5) * CFG.TILE;
      game.guards[0].angle = Math.PI;
      game.guards[1].x = (20 + 0.5) * CFG.TILE;
      game.guards[1].y = (14 + 0.5) * CFG.TILE;
      game.guards[1].angle = -Math.PI / 2;
      game.timeLeft = 61;
      return;
    }
    if (shotMode === 'alarm') {
      loadRoom(1);
      game.state = 'playing';
      game.frozen = true;
      game.player.x = (15 + 0.5) * CFG.TILE;
      game.player.y = (9 + 0.5) * CFG.TILE;
      game.alarm.value = 78;
      game.roomAlarmPeak = 78;
      game.timeLeft = 44;
      game.jewelTaken = true;
      game.lootGot = 4;
      game.guards[2].x = (15 + 0.5) * CFG.TILE;
      game.guards[2].y = (11 + 0.5) * CFG.TILE;
      game.guards[2].angle = -Math.PI / 2;
      game.guards[2].state = 'alarm';
      game.guards[2].stateTime = 1;
      game.cameras[0].angle = Math.PI / 2;
      game.pings.push({ x: (18 + 0.5) * CFG.TILE, y: (6 + 0.5) * CFG.TILE, left: 0.5 });
      return;
    }
    if (shotMode === 'win') {
      loadRoom(2);
      game.state = 'win';
      game.score = 7420;
      game.lootGot = 9;
      game.player.x = (26 + 0.5) * CFG.TILE;
      game.player.y = (2 + 0.5) * CFG.TILE;
      game.jewelTaken = true;
      game.guards[0].x = (10 + 0.5) * CFG.TILE;
      game.guards[0].y = (6 + 0.5) * CFG.TILE;
      game.guards[0].angle = 0;
      return;
    }
  }

  loadRoom(0);
  game.state = 'menu';
  applyShotMode();
  // Expose a little state for automated play-testing.
  window.__heist = game;
  requestAnimationFrame(frame);
  // Signal screenshot readiness after the first frames have painted.
  setTimeout(function () {
    draw();
    window.__shotReady = true;
  }, 400);
})();
