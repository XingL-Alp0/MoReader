'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { shell } = require('electron');

const execFileAsync = promisify(execFile);

const PROG_ID = 'MoRead.Markdown';
const APP_NAME = 'MoRead';
const REGISTERED_APPS_KEY = 'HKCU\\Software\\RegisteredApplications';
const CAPABILITIES_KEY = 'HKCU\\Software\\MoRead\\Capabilities';
const EXTENSIONS = ['.md', '.markdown', '.mdown'];
const CLASSES_ROOT = 'HKCU\\Software\\Classes';

function quote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function resolveIconPath(app, isPackaged) {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icon.ico');
  }
  return path.join(app.getAppPath(), 'assets', 'icon.ico');
}

function launchCommand(app, isPackaged) {
  const exe = process.execPath;
  if (isPackaged) {
    return `${quote(exe)} "%1"`;
  }
  return `${quote(exe)} ${quote(app.getAppPath())} "%1"`;
}

async function reg(args) {
  return execFileAsync('reg.exe', args, { windowsHide: true });
}

async function regAdd(key, valueName, data, type = 'REG_SZ') {
  const args = ['add', key];
  if (valueName === null) {
    args.push('/ve');
  } else {
    args.push('/v', valueName);
  }
  args.push('/t', type, '/d', data, '/f');
  await reg(args);
}

async function regAddEmpty(key, valueName) {
  await reg(['add', key, '/v', valueName, '/t', 'REG_SZ', '/d', '', '/f']);
}

async function regDelete(key, valueName = null, recursive = false) {
  const args = ['delete', key];
  if (recursive) {
    args.push('/f');
  } else if (valueName === null) {
    args.push('/ve', '/f');
  } else {
    args.push('/v', valueName, '/f');
  }
  try {
    await reg(args);
  } catch {
    // Missing key/value is already the desired state.
  }
}

async function regQuery(key, valueName) {
  try {
    const args = ['query', key];
    if (valueName) args.push('/v', valueName);
    const { stdout } = await reg(args);
    const lines = stdout.split(/\r?\n/);
    if (valueName) {
      for (const line of lines) {
        const match = line.match(/^\s*(\S+)\s+REG_\w+\s+(.*)$/);
        if (match && match[1].toLowerCase() === valueName.toLowerCase()) {
          return match[2].trim();
        }
      }
      return null;
    }

    // No value name: read the key's default (unnamed) value. The label for
    // the default value is localized by reg.exe, so match the first data row
    // rather than a specific "(Default)" string.
    for (const line of lines) {
      const match = line.match(/^\s*(\S+)\s+REG_\w+\s+(.*)$/);
      if (match) return match[2].trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function readUserChoice(ext) {
  const key = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\${ext}\\UserChoice`;
  return regQuery(key, 'ProgId');
}

async function getStatus(app, isPackaged) {
  const exe = process.execPath;
  const exeName = path.basename(exe);
  const command = await regQuery(`${CLASSES_ROOT}\\${PROG_ID}\\shell\\open\\command`, null);
  const openWith = {};
  for (const ext of EXTENSIONS) {
    openWith[ext] = {
      legacy: await regQuery(`${CLASSES_ROOT}\\${ext}`, null),
      userChoice: await readUserChoice(ext),
      advertised: Boolean(await regQuery(`${CLASSES_ROOT}\\${ext}\\OpenWithProgids`, PROG_ID))
    };
  }
  const expectedCommand = launchCommand(app, isPackaged);
  const normalize = (value) =>
    String(value || '')
      .replace(/"/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  const registered =
    Boolean(command) &&
    fs.existsSync(exe) &&
    normalize(command) === normalize(expectedCommand);
  const choice = openWith['.md']?.userChoice || '';
  const choiceIsOurs =
    choice === PROG_ID ||
    choice.toLowerCase() === `applications\\${exeName}`.toLowerCase() ||
    /moread/i.test(choice);
  const isDefaultForMd = choice ? choiceIsOurs : openWith['.md']?.legacy === PROG_ID;
  return {
    registered,
    progId: PROG_ID,
    appName: APP_NAME,
    command: command || '',
    expectedCommand,
    icon: resolveIconPath(app, isPackaged),
    extensions: EXTENSIONS,
    openWith,
    isDefaultForMd
  };
}

async function register(app, isPackaged) {
  const exe = process.execPath;
  const icon = resolveIconPath(app, isPackaged);
  const command = launchCommand(app, isPackaged);

  // ProgID and shell verbs.
  await regAdd(`${CLASSES_ROOT}\\${PROG_ID}`, null, 'Markdown 文档');
  await regAdd(`${CLASSES_ROOT}\\${PROG_ID}`, 'FriendlyTypeName', 'Markdown 文档');
  await regAdd(`${CLASSES_ROOT}\\${PROG_ID}\\DefaultIcon`, null, icon);
  await regAdd(`${CLASSES_ROOT}\\${PROG_ID}\\shell\\open\\command`, null, command);
  await regAdd(`${CLASSES_ROOT}\\${PROG_ID}\\shell\\edit\\command`, null, command);

  for (const ext of EXTENSIONS) {
    // The default value makes MoRead the handler for classic resolution.
    // Windows 10/11 still keeps the user's explicit choice in UserChoice.
    await regAdd(`${CLASSES_ROOT}\\${ext}`, null, PROG_ID);
    await regAdd(`${CLASSES_ROOT}\\${ext}`, 'Content Type', 'text/markdown');
    await regAdd(`${CLASSES_ROOT}\\${ext}`, 'PerceivedType', 'text');
    await regAddEmpty(`${CLASSES_ROOT}\\${ext}\\OpenWithProgids`, PROG_ID);
  }

  // Windows "Open with" and Default apps integration.
  await regAdd(CAPABILITIES_KEY, 'ApplicationName', '墨阅 MoRead');
  await regAdd(CAPABILITIES_KEY, 'ApplicationDescription', '优雅的 Markdown 阅读与编辑器');
  await regAdd(CAPABILITIES_KEY, 'ApplicationIcon', `${icon},0`);
  for (const ext of EXTENSIONS) {
    await regAdd(`${CAPABILITIES_KEY}\\FileAssociations`, ext, PROG_ID);
  }
  await regAdd(REGISTERED_APPS_KEY, APP_NAME, 'Software\\MoRead\\Capabilities');

  // Best effort: tell Explorer that associations changed.
  execFile('ie4uinit.exe', ['-show'], { windowsHide: true }, () => {});

  return getStatus(app, isPackaged);
}

async function unregister() {
  for (const ext of EXTENSIONS) {
    await regDelete(`${CLASSES_ROOT}\\${ext}\\OpenWithProgids`, PROG_ID);
    // Only remove the legacy default if it points at us.
    const legacy = await regQuery(`${CLASSES_ROOT}\\${ext}`, null);
    if (legacy === PROG_ID) await regDelete(`${CLASSES_ROOT}\\${ext}`, null);
  }
  await regDelete(`${CLASSES_ROOT}\\${PROG_ID}`, null, true);
  await regDelete(CAPABILITIES_KEY, null, true);
  await regDelete(REGISTERED_APPS_KEY, APP_NAME);
  return { ok: true };
}

async function openDefaultAppsSettings(app, isPackaged) {
  // Windows 11 understands registeredAppUser and opens the page filtered to
  // this app. Windows 10 ignores the query and shows the Default apps page.
  const uri = `ms-settings:defaultapps?registeredAppUser=${encodeURIComponent(APP_NAME)}`;
  try {
    await shell.openExternal(uri);
    return { ok: true, uri };
  } catch {
    await shell.openExternal('ms-settings:defaultapps');
    return { ok: true, uri: 'ms-settings:defaultapps' };
  }
}

module.exports = {
  PROG_ID,
  APP_NAME,
  EXTENSIONS,
  getStatus,
  register,
  unregister,
  openDefaultAppsSettings
};
