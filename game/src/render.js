// render.js — draws the whole frame: HUD, room, cones, actors, overlays.
// One frame shows the thief, the guards and their cones, the cameras,
// the loot, the jewel, the exit and the alarm meter together.
(function (global) {
  'use strict';

  var CFG = global.HEIST_CONFIG;
  var C = CFG.COLORS;
  var angleDiff = global.HEIST_GUARD.angleDiff;

  function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawRoom(ctx, level) {
    var x, y, t, px, py;
    for (y = 0; y < level.height; y++) {
      for (x = 0; x < level.width; x++) {
        t = level.tiles[y][x];
        px = x * CFG.TILE;
        py = CFG.HUD_H + y * CFG.TILE;
        if (t === 'wall') {
          ctx.fillStyle = C.wall;
          ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
          ctx.fillStyle = C.wallTop;
          ctx.fillRect(px, py, CFG.TILE, 4);
        } else if (t === 'crate') {
          ctx.fillStyle = C.crate;
          ctx.fillRect(px + 2, py + 2, CFG.TILE - 4, CFG.TILE - 4);
          ctx.fillStyle = C.crateTop;
          ctx.fillRect(px + 2, py + 2, CFG.TILE - 4, 5);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.strokeRect(px + 2.5, py + 2.5, CFG.TILE - 5, CFG.TILE - 5);
        } else if (t === 'shadow') {
          ctx.fillStyle = C.shadow;
          ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
          ctx.fillStyle = C.shadowEdge;
          ctx.beginPath();
          ctx.arc(px + 16, py + 16, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === 'camera') {
          ctx.fillStyle = (x + y) % 2 === 0 ? C.floorA : C.floorB;
          ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px + 4, py + 4, CFG.TILE - 8, CFG.TILE - 8);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? C.floorA : C.floorB;
          ctx.fillRect(px, py, CFG.TILE, CFG.TILE);
        }
      }
    }
  }

  function drawLoot(ctx, level, jewelTaken, time) {
    var i, l, px, py, pulse;
    for (i = 0; i < level.loot.length; i++) {
      l = level.loot[i];
      if (l.taken) { continue; }
      px = (l.x + 0.5) * CFG.TILE;
      py = CFG.HUD_H + (l.y + 0.5) * CFG.TILE;
      pulse = 1 + 0.15 * Math.sin(time * 4 + i);
      ctx.fillStyle = C.loot;
      ctx.beginPath();
      ctx.arc(px, py, 5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c5a00';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!jewelTaken && level.jewel) {
      px = (level.jewel.x + 0.5) * CFG.TILE;
      py = CFG.HUD_H + (level.jewel.y + 0.5) * CFG.TILE;
      pulse = 1 + 0.2 * Math.sin(time * 5);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.jewel;
      ctx.fillRect(-8 * pulse, -8 * pulse, 16 * pulse, 16 * pulse);
      ctx.fillStyle = '#ffd6e7';
      ctx.fillRect(-4 * pulse, -4 * pulse, 8 * pulse, 8 * pulse);
      ctx.restore();
      ctx.fillStyle = C.jewel;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JEWEL', px, py - 16);
    }
  }

  function drawExit(ctx, level, open) {
    if (!level.exit) { return; }
    var px = (level.exit.x + 0.5) * CFG.TILE;
    var py = CFG.HUD_H + (level.exit.y + 0.5) * CFG.TILE;
    ctx.fillStyle = open ? C.exit : C.exitLocked;
    ctx.fillRect(px - 14, py - 14, 28, 28);
    ctx.fillStyle = '#06281a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT' : 'LOCK', px, py + 4);
    if (open) {
      ctx.strokeStyle = 'rgba(52,211,153,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 14, py - 14, 28, 28);
    }
  }

  function drawGuards(ctx, guards, time) {
    var i, g, px, py;
    for (i = 0; i < guards.length; i++) {
      g = guards[i];
      px = g.x;
      py = CFG.HUD_H + g.y;
      var coneFill = g.state === 'alarm' ? C.guardConeAlarm : C.guardCone;
      drawCone(ctx, px, py, g.angle, CFG.VIEW_DISTANCE, CFG.VIEW_HALF_ANGLE, coneFill);
    }
    for (i = 0; i < guards.length; i++) {
      g = guards[i];
      px = g.x;
      py = CFG.HUD_H + g.y;
      ctx.fillStyle = '#3f0d0d';
      ctx.beginPath();
      ctx.arc(px, py, CFG.GUARD_RADIUS + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.guard;
      ctx.beginPath();
      ctx.arc(px, py, CFG.GUARD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px + Math.cos(g.angle) * 5, py + Math.sin(g.angle) * 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (g.state === 'suspicious' || g.state === 'alarm' || g.state === 'investigate') {
        ctx.fillStyle = g.state === 'alarm' ? '#ff3b30' : '#ffd23f';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        var mark = g.state === 'alarm' ? '!' : '?';
        ctx.fillText(mark, px, py - 18);
      }
      if (g.state === 'investigate') {
        ctx.strokeStyle = 'rgba(255,210,63,0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(g.investigateX, CFG.HUD_H + g.investigateY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawCameras(ctx, cameras) {
    var i, cam, px, py;
    for (i = 0; i < cameras.length; i++) {
      cam = cameras[i];
      px = cam.x;
      py = CFG.HUD_H + cam.y;
      var fill = cam.seesPlayer ? C.cameraConeAlarm : C.cameraCone;
      drawCone(ctx, px, py, cam.angle, CFG.CAMERA_RANGE, CFG.CAMERA_HALF_ANGLE, fill);
    }
    for (i = 0; i < cameras.length; i++) {
      cam = cameras[i];
      px = cam.x;
      py = CFG.HUD_H + cam.y;
      ctx.fillStyle = cam.blindLeft > 0 ? '#475569' : C.camera;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px + Math.cos(cam.angle) * 4, py + Math.sin(cam.angle) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
      if (cam.seesPlayer) {
        ctx.fillStyle = '#ff3b30';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', px, py - 14);
      }
    }
  }

  function drawPlayer(ctx, player, time) {
    var px = player.x;
    var py = CFG.HUD_H + player.y;
    var i, coin;
    for (i = 0; i < player.coinsInFlight.length; i++) {
      coin = player.coinsInFlight[i];
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(coin.x, CFG.HUD_H + coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    if (player.hidden) { ctx.globalAlpha = 0.55; }
    ctx.fillStyle = '#7c5a00';
    ctx.beginPath();
    ctx.arc(px, py, CFG.PLAYER_RADIUS + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.player;
    ctx.beginPath();
    ctx.arc(px, py, CFG.PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(px - 3.5, py - 2, 2, 0, Math.PI * 2);
    ctx.arc(px + 3.5, py - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (player.hidden) {
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', px, py - 16);
    }
  }

  function drawPing(ctx, pings) {
    var i, p;
    for (i = 0; i < pings.length; i++) {
      p = pings[i];
      var alpha = Math.max(0, p.left / 0.6);
      ctx.strokeStyle = 'rgba(253, 230, 138,' + alpha.toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, CFG.HUD_H + p.y, CFG.COIN_NOISE_RADIUS * (1 - alpha * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawVignette(ctx, player) {
    var px = player.x;
    var py = CFG.HUD_H + player.y;
    var g = ctx.createRadialGradient(px, py, 120, px, py, 520);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, CFG.HUD_H, CFG.CANVAS_W, CFG.CANVAS_H - CFG.HUD_H);
  }

  function alarmColor(v) {
    if (v < 50) { return C.alarmLow; }
    if (v < 80) { return C.alarmMid; }
    return C.alarmHigh;
  }

  function drawHUD(ctx, state) {
    var w = CFG.CANVAS_W;
    ctx.fillStyle = C.hudBg;
    ctx.fillRect(0, 0, w, CFG.HUD_H);
    ctx.fillStyle = C.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.roomName, 12, 20);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = C.muted;
    ctx.fillText('Loot ' + state.lootGot + '/' + state.lootTotal + '   Coins ' + state.coins +
      '   Score ' + state.score, 12, 38);
    // Lives as hearts.
    var i;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    for (i = 0; i < state.lives; i++) {
      ctx.fillStyle = '#f87171';
      ctx.fillText('♥', 330 + i * 18, 20);
    }
    // Timer.
    ctx.fillStyle = state.timeLeft <= 10 ? '#ff3b30' : C.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(state.timeLeft) + 's', 480, 22);
    ctx.fillStyle = C.muted;
    ctx.font = '10px sans-serif';
    ctx.fillText('TIME', 480, 38);
    // Alarm meter.
    var barX = 560, barY = 12, barW = 220, barH = 16;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = alarmColor(state.alarm);
    ctx.fillRect(barX, barY, barW * state.alarm / 100, barH);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW, barH);
    ctx.fillStyle = C.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM ' + Math.round(state.alarm) + '%', barX, barY + 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.muted;
    ctx.font = '11px sans-serif';
    ctx.fillText('WASD move · Shift run · Click coin · M mute', w - 10, 38);
    // Red edge pulse while the alarm is high.
    if (state.alarm > 40) {
      var pulse = (state.alarm - 40) / 60 * (0.25 + 0.15 * Math.sin(state.time * 6));
      ctx.strokeStyle = 'rgba(229,72,77,' + pulse.toFixed(2) + ')';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, CFG.HUD_H + 4, w - 8, CFG.CANVAS_H - CFG.HUD_H - 8);
    }
  }

  function drawCenterText(ctx, lines, accent) {
    var cx = CFG.CANVAS_W / 2;
    var cy = CFG.CANVAS_H / 2;
    ctx.fillStyle = 'rgba(8, 8, 12, 0.82)';
    ctx.fillRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);
    ctx.textAlign = 'center';
    var y = cy - (lines.length - 1) * 22;
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      ctx.font = line.big ? 'bold 34px sans-serif' : (line.small ? '14px sans-serif' : 'bold 20px sans-serif');
      ctx.fillStyle = line.accent ? accent : C.text;
      ctx.fillText(line.text, cx, y);
      y += line.big ? 48 : 36;
    }
  }

  global.HEIST_RENDER = {
    drawCone: drawCone,
    drawRoom: drawRoom,
    drawLoot: drawLoot,
    drawExit: drawExit,
    drawGuards: drawGuards,
    drawCameras: drawCameras,
    drawPlayer: drawPlayer,
    drawPing: drawPing,
    drawVignette: drawVignette,
    drawHUD: drawHUD,
    drawCenterText: drawCenterText,
    alarmColor: alarmColor
  };
})(typeof window !== 'undefined' ? window : globalThis);
