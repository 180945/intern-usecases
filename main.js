const { app, BrowserWindow, screen, Tray, Menu, nativeImage, ipcMain, session } = require('electron');
const http = require('http');

const COMMAND_BRIDGE_PORT = 4317;

let breakWindow = null;
let controlWindow = null;
let flappyWindow = null;
let tray = null;
let breakTimeout = null;
let commandServer = null;

const WORK_MINUTES = 25;
const BREAK_SECONDS = 5 * 60;

function clearBreakTimer() {
  if (breakTimeout) {
    clearTimeout(breakTimeout);
    breakTimeout = null;
  }
}

function createBreakWindow() {
  if (breakWindow && !breakWindow.isDestroyed()) return;

  clearBreakTimer();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  breakWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  breakWindow.setAlwaysOnTop(true, 'screen-saver');
  breakWindow.setIgnoreMouseEvents(true, { forward: true });
  breakWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  breakWindow.loadFile('break.html');

  setTimeout(() => {
    dismissBreak();
  }, BREAK_SECONDS * 1000);
}

function dismissBreak() {
  if (breakWindow && !breakWindow.isDestroyed()) {
    breakWindow.close();
  }
  breakWindow = null;
  scheduleBreak();
}

function scheduleBreak() {
  clearBreakTimer();
  console.log(`Next break in ${WORK_MINUTES} minutes...`);
  breakTimeout = setTimeout(createBreakWindow, WORK_MINUTES * 60 * 1000);
}

function normalizeCommand(input) {
  return input.toLowerCase().replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function handleVoiceCommand(rawText, source = 'voice') {
  const text = normalizeCommand(rawText);
  console.log(`Voice command heard: "${text}" (source=${source})`);

  const breakNowPatterns = [
    'cat break now',
    'cat take a break',
    'cat start break',
    'hey cat break now',
    'fat cat break now',
  ];

  let result;
  if (breakNowPatterns.some((pattern) => text.includes(pattern))) {
    createBreakWindow();
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('cat-status', 'Break time. I am sitting here now.');
    }
    result = { ok: true, action: 'break_now' };
  } else {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('cat-status', `I heard: “${rawText}” but don't know that trick yet.`);
    }
    result = { ok: false, action: 'unknown', text };
  }

  if (flappyWindow && !flappyWindow.isDestroyed()) {
    flappyWindow.webContents.send('bridge-command', {
      rawText,
      normalized: text,
      result,
      source,
    });
  }

  return result;
}

function startCommandBridge() {
  if (commandServer) return;

  commandServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'intern-command-bridge' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/command') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 64) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const text = String(parsed.text || '');
          const result = handleVoiceCommand(text, 'bridge');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, received: text, result }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'not_found' }));
  });

  commandServer.listen(COMMAND_BRIDGE_PORT, '127.0.0.1', () => {
    console.log(`Command bridge listening on http://127.0.0.1:${COMMAND_BRIDGE_PORT}`);
  });
}

function createFlappyWindow() {
  if (flappyWindow && !flappyWindow.isDestroyed()) {
    flappyWindow.focus();
    return;
  }

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = 720;
  const h = 420;

  flappyWindow = new BrowserWindow({
    width: w,
    height: h,
    x: Math.max(0, sw - w - 40),
    y: 60,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    title: 'Scream Flappy',
    webPreferences: {
      // nodeIntegration on so the renderer can use ipcRenderer to receive
      // bridge-command events from main. Local-only window, no remote content.
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  flappyWindow.setAlwaysOnTop(true, 'floating');
  flappyWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  flappyWindow.loadFile('flappy.html');
  flappyWindow.on('closed', () => {
    flappyWindow = null;
  });
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 420,
    height: 520,
    alwaysOnTop: true,
    resizable: false,
    title: 'Fat Cat Voice Control',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  controlWindow.loadFile('control.html');
  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

app.whenReady().then(() => {
  // Auto-grant mic access for our windows (control + flappy both need it).
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
      callback(true);
      return;
    }
    callback(false);
  });

  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setTitle('🐱');
  tray.setToolTip('Fat Cat Break Reminder');

  const contextMenu = Menu.buildFromTemplate([
    { label: `Break every ${WORK_MINUTES} min (5 min)`, enabled: false },
    { type: 'separator' },
    { label: 'Open voice control', click: createControlWindow },
    { label: 'Play Scream Flappy 🐦', click: createFlappyWindow },
    { label: 'Take a break NOW', click: createBreakWindow },
    { label: 'Take a break in 10s (test)', click: () => setTimeout(createBreakWindow, 10_000) },
    { label: 'Dismiss break', click: dismissBreak },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);

  createControlWindow();
  createFlappyWindow();
  startCommandBridge();
  scheduleBreak();
  console.log(`Fat Cat Break started! Every ${WORK_MINUTES} min, 5 min break.`);
  console.log('Say “cat, break now” in the voice control window.');
});

ipcMain.on('voice-command', (_event, rawText) => {
  handleVoiceCommand(rawText);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  if (commandServer) {
    commandServer.close();
    commandServer = null;
  }
});
