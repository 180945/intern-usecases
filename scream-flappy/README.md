# Scream Flappy

Transparent always-on-top Flappy-style overlay game controlled by microphone sound spikes.

## Run

From the repo root:

```bash
npm install
npm start
```

The Flappy window now opens automatically on app launch.

## Play

- make a **short sharp sound** (clap / pop / quick yell) to flap
- after game over, make one **short sharp sound** to restart
- press **Space** for keyboard flap fallback
- press **R** to restart manually after game over

## Notes

- On macOS, you may need to allow **microphone permission** for the app/host process.
- The game window is transparent and always on top.
- Threshold slider controls how strong a sound spike must be before it triggers.
- Short spikes work better than long sustained yelling.

## Local command bridge

The Electron app also exposes a localhost command bridge for future voice-command integrations.

### Health check

```bash
curl http://127.0.0.1:4317/health
```

### Send a command

```bash
curl -X POST http://127.0.0.1:4317/command \
  -H 'Content-Type: application/json' \
  -d '{"text":"cat break now"}'
```

This is intended for future integrations like:
- Superwhisper
- local Whisper/faster-whisper
- any local STT bridge that can POST text to localhost

## Files

- `flappy.html` — overlay game UI and spike-based game loop
- `assets/` — bird + pipe PNG sprite assets
- `COMMAND_BRIDGE.md` — localhost bridge details
- `../main.js` — Electron tray/menu wiring + localhost command bridge
