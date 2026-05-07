# intern-usecases

A small Electron app that ships three intern experiments in one tray icon:

- **Fat Cat Break** — every 25 minutes a fat cat slides in over your screen and forces a 5-minute break.
- **Voice Control** — say "cat, break now" into your mic to trigger a break on demand.
- **Scream Flappy** — a transparent always-on-top Flappy clone where you flap by yelling / clapping into your mic.

A localhost HTTP bridge on port `4317` is also exposed for forwarding text commands from external STT tools (Superwhisper, local Whisper, etc.).

## Requirements

- macOS (tested) — Windows/Linux likely work but mic permission UX differs
- Node.js 18+ and npm
- A working microphone (for voice control + Scream Flappy)

## Install

From the repo root:

```bash
npm install
```

This pulls in Electron (the only runtime dependency).

## Run

```bash
npm start
```

On launch you'll get:

1. A `🐱` icon in the macOS menu bar (tray).
2. The **Voice Control** window.
3. The **Scream Flappy** overlay window.
4. A break scheduled 25 minutes out.
5. The localhost command bridge listening on `http://127.0.0.1:4317`.

The first time you run it, macOS will ask for **microphone permission** — allow it, otherwise voice control and Scream Flappy can't hear you.

## Tray menu

Right-click the `🐱` in the menu bar:

- **Open voice control** — re-open the voice window if you closed it
- **Play Scream Flappy 🐦** — re-open the game window
- **Take a break NOW** — fire the break overlay immediately
- **Take a break in 10s (test)** — handy for quickly seeing the overlay
- **Dismiss break** — close the overlay early
- **Quit** — exit the app

## Voice commands

Open the Voice Control window, click **Start listening**, and say one of:

- `cat break now`
- `cat take a break`
- `cat start break`
- `hey cat break now`
- `fat cat break now`

## Scream Flappy

- Make a **short sharp sound** (clap, pop, quick yell) to flap.
- After game over, one short sharp sound restarts.
- **Space** = manual flap fallback.
- **R** = manual restart after game over.

See `scream-flappy/README.md` for more detail.

## Command bridge (HTTP)

Health check:

```bash
curl http://127.0.0.1:4317/health
```

Send a command:

```bash
curl -X POST http://127.0.0.1:4317/command \
  -H 'Content-Type: application/json' \
  -d '{"text":"cat break now"}'
```

See `scream-flappy/COMMAND_BRIDGE.md` for the full contract.

## Project layout

```
main.js              Electron main process — tray, windows, scheduler, HTTP bridge
break.html           Full-screen break overlay (cat video + countdown)
control.html         Voice control window (Web Speech API)
flappy.html          Scream Flappy overlay (mic-driven game)
fatcat.webm / .mp4   The cat
oneko.gif            Bonus cat
scream-flappy/       Game assets and docs
scripts/             Sprite generation helper
```

## Tweaking timings

Edit the constants at the top of `main.js`:

```js
const WORK_MINUTES = 25;        // time between breaks
const BREAK_SECONDS = 5 * 60;   // length of each break
const COMMAND_BRIDGE_PORT = 4317;
```
