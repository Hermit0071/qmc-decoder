const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(require('node:path').join(__dirname, '../frontend/main.js'), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function boot(savedAutoFetch = null) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, disabled: false, checked: false, textContent: '',
      classList: { toggle() {}, add() {}, remove() {} },
      handlers: {},
      addEventListener(event, handler) { this.handlers[event] = handler; },
    });
    return elements.get(id);
  };
  let result = { found: false, permissionRequired: true, reason: '请开启完全磁盘访问权限' };
  const calls = [];
  const context = {
    document: { getElementById: element, querySelector: element, querySelectorAll: () => [], addEventListener() {} },
    window: {
      __TAURI__: { core: { invoke: async (command) => {
        calls.push(command);
        if (command === 'check_credentials') {
          if (result instanceof Error) throw result;
          return result;
        }
      } } },
      addEventListener() {},
    },
    localStorage: { getItem: (key) => key === 'autoFetch' ? savedAutoFetch : null },
    setInterval() {}, clearTimeout() {}, console: { warn() {} },
  };
  vm.runInNewContext(source, context);
  await flush();
  return { element, calls, respond(value) { result = value; } };
}

test('permission guidance can be retried after authorization', async () => {
  const ui = await boot();
  assert.equal(ui.element('autoFetch').checked, true);
  assert.equal(ui.element('btn-credentials-settings').hidden, false);
  assert.match(ui.element('cred-note').textContent, /完全磁盘访问权限/);
  await ui.element('btn-credentials-settings').handlers.click();
  assert.ok(ui.calls.includes('open_credentials_settings'));
  ui.respond({ found: true, permissionRequired: false });
  await ui.element('btn-check-credentials').handlers.click();
  assert.equal(ui.element('btn-credentials-settings').hidden, true);
  assert.match(ui.element('cred-note').textContent, /无需手动填写/);
  assert.equal(ui.element('btn-check-credentials').disabled, false);
});

test('an explicit opt-out is retained and enabling checks credentials again', async () => {
  const ui = await boot('0');
  assert.equal(ui.element('autoFetch').checked, false);
  ui.element('autoFetch').checked = true;
  ui.element('autoFetch').handlers.change();
  await flush();
  assert.equal(ui.calls.filter((c) => c === 'check_credentials').length, 2);
});

test('a failed check allows retry and login failures do not request disk access', async () => {
  const ui = await boot();
  ui.respond(new Error('IPC unavailable'));
  await ui.element('btn-check-credentials').handlers.click();
  assert.match(ui.element('cred-note').textContent, /凭据检查失败/);
  assert.equal(ui.element('btn-check-credentials').disabled, false);
  ui.respond({ found: false, permissionRequired: false, reason: '未登录' });
  await ui.element('btn-check-credentials').handlers.click();
  assert.equal(ui.element('btn-credentials-settings').hidden, true);
  assert.match(ui.element('cred-note').textContent, /请先在本机 QQ 音乐登录/);
});
