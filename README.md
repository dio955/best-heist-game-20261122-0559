# One Clean Minute

[![Make the best heist game](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/dio955/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/dio955/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A single-screen heist game, made for the [make.fun best-heist-game bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

You are Wren, a thief with one clean minute per room. Cross the Meridian
Gallery after hours, grab the pink crown jewel, and slip out the green exit
before the alarm meter fills. Guards patrol with yellow vision cones,
wall cameras sweep blue cones across the floor, and every second you are
seen pushes the alarm higher. At 100% the room locks down.

Three rooms, escalating: The Gallery, The Vault Floor, The Gilded Vault.

## How to play

- **WASD / arrow keys** — move
- **Shift** — run (faster, but loud: guards hear it)
- **Mouse click** — toss a coin (3 per room): guards investigate the noise,
  and a coin landing near a camera blinds it for 8 seconds
- **Hide** in the green shadow planters — guards cannot see you there
  unless they get very close
- **M** — mute · **R** — retry after game over or a clean getaway

Grab all the loot dots for score, take the jewel to unlock the exit, and
finish fast: leftover seconds are bonus points, and a room finished with
the alarm never passing 50% earns a ghost bonus.

## Run it

Serve `game/` with any static server and open `index.html` in desktop
Chrome — no build step, no network requests, all art and sound are drawn
and synthesised by the game's own code.

```sh
node serve.ts        # then open http://localhost:8080
```

## Files

- `game/index.html` — the page
- `game/src/config.js` — every tunable number
- `game/src/levels.js` — the three rooms as ASCII maps
- `game/src/audio.js` — WebAudio sounds (oscillators only)
- `game/src/guards.js` — guard patrol, vision cones, chase, investigate
- `game/src/cameras.js` — sweeping security cameras
- `game/src/player.js` — movement, collision, coin toss, hiding
- `game/src/render.js` — canvas drawing: room, cones, actors, HUD
- `game/src/main.js` — game loop, states, rooms, scoring
- `main.ts` — the make.fun hand-in program (Node 22)

Original work: all art, sounds, names and levels are original. MIT licensed.
