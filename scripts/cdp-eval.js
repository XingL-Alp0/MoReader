'use strict';

const fs = require('node:fs');

const [, , wsUrl, action, ...rest] = process.argv;
if (!wsUrl || !action) {
  console.error('usage: node cdp-eval.js <wsUrl> eval <expression> | shot <pngPath>');
  process.exit(2);
}

const socket = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});

socket.addEventListener('open', async () => {
  try {
    if (action === 'eval') {
      const result = await call('Runtime.evaluate', {
        expression: rest.join(' '),
        returnByValue: true,
        awaitPromise: true
      });
      console.log(JSON.stringify(result.result, null, 2));
    } else if (action === 'shot') {
      await call('Page.enable');
      const result = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(rest[0], Buffer.from(result.data, 'base64'));
      console.log(rest[0]);
    } else if (action === 'cdp') {
      const method = rest[0];
      let params = {};
      if (rest[1]) params = JSON.parse(rest[1]);
      const result = await call(method, params);
      console.log(JSON.stringify(result, null, 2));
    } else if (action === 'drag') {
      // usage: drag <x> <y> <file1> [file2 ...]
      const x = Number(rest[0]);
      const y = Number(rest[1]);
      const files = rest.slice(2);
      const data = {
        items: [{ mimeType: 'text/plain', data: 'moread' }],
        files,
        dragOperationsMask: 1
      };
      await call('Input.dispatchDragEvent', { type: 'dragEnter', x, y, data });
      await call('Input.dispatchDragEvent', { type: 'dragOver', x, y, data });
      await new Promise((resolve) => setTimeout(resolve, 150));
      await call('Input.dispatchDragEvent', { type: 'drop', x, y, data });
      console.log(JSON.stringify({ dropped: files }));
    } else if (action === 'move') {
      const x = Number(rest[0]);
      const y = Number(rest[1]);
      await call('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y,
        button: 'none'
      });
      console.log(JSON.stringify({ moved: [x, y] }));
    } else if (action === 'click') {
      const x = Number(rest[0]);
      const y = Number(rest[1]);
      await call('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        clickCount: 1
      });
      await call('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1
      });
      console.log(JSON.stringify({ clicked: [x, y] }));
    } else if (action === 'key') {
      const key = rest[0];
      const code = rest[1] || key;
      const modifiers = Number(rest[2] || 0);
      const vk = Number(rest[3] || 0);
      const base = {
        key,
        code,
        modifiers,
        windowsVirtualKeyCode: vk,
        nativeVirtualKeyCode: vk
      };
      await call('Input.dispatchKeyEvent', {
        ...base,
        type: 'keyDown',
        text: modifiers === 0 && key.length === 1 ? key : undefined
      });
      await call('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
      console.log(JSON.stringify({ key, modifiers }));
    } else if (action === 'text') {
      await call('Input.insertText', { text: rest.join(' ') });
      console.log(JSON.stringify({ text: rest.join(' ') }));
    } else if (action === 'pdf') {
      await call('Page.enable');
      const result = await call('Page.printToPDF', {
        printBackground: true,
        preferCSSPageSize: true
      });
      fs.writeFileSync(rest[0], Buffer.from(result.data, 'base64'));
      console.log(rest[0]);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    socket.close();
  }
});

socket.addEventListener('error', (event) => {
  console.error(event.message || 'WebSocket error');
  process.exitCode = 1;
});
