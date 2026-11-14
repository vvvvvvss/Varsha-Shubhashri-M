'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

const PASSWORD = 'test-password';
let server;
let base;
let token;

async function call(method, path, { body, auth = true, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  if (auth && token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers: h,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  return { status: res.status, json, headers: res.headers, text };
}

before(async () => {
  const app = createApp({ adminPassword: PASSWORD });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await call('POST', '/api/auth/login', { body: { password: PASSWORD }, auth: false });
  token = login.json.token;
});

after(() => server.close());

test('GET /api/health returns ok', async () => {
  const r = await call('GET', '/api/health', { auth: false });
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'ok');
});

test('GET /api/portfolio returns every section (public, no auth)', async () => {
  const r = await call('GET', '/api/portfolio', { auth: false });
  assert.equal(r.status, 200);
  for (const key of ['profile', 'projects', 'skills', 'achievements', 'certifications', 'models']) {
    assert.ok(r.json[key], `missing ${key}`);
  }
  assert.ok(r.json.projects.length >= 1);
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('auth: wrong password -> 401, writes without token -> 401', async () => {
  const bad = await call('POST', '/api/auth/login', { body: { password: 'nope' }, auth: false });
  assert.equal(bad.status, 401);
  const w = await call('POST', '/api/projects', { body: { title: 'x', description: 'y' }, auth: false });
  assert.equal(w.status, 401);
  assert.equal(w.json.error.status, 401);
});

test('projects CRUD: create -> read -> put -> patch -> delete -> 404', async () => {
  const created = await call('POST', '/api/projects', {
    body: { title: 'Test project', description: 'Does things', tech: 'Python, Node , Python', link: 'https://example.com' },
  });
  assert.equal(created.status, 201);
  assert.match(created.headers.get('location'), /^\/api\/projects\/\d+$/);
  assert.deepEqual(created.json.tech, ['Python', 'Node']); // trimmed + de-duplicated
  const id = created.json.id;

  const one = await call('GET', `/api/projects/${id}`, { auth: false });
  assert.equal(one.status, 200);
  assert.equal(one.json.title, 'Test project');

  const put = await call('PUT', `/api/projects/${id}`, { body: { title: 'Renamed', description: 'New text', tech: ['Go'] } });
  assert.equal(put.status, 200);
  assert.equal(put.json.title, 'Renamed');
  assert.equal(put.json.link, ''); // PUT replaces everything, optional fields reset
  assert.equal(put.json.id, id);

  const patch = await call('PATCH', `/api/projects/${id}`, { body: { link: 'https://github.com/x/y' } });
  assert.equal(patch.status, 200);
  assert.equal(patch.json.title, 'Renamed'); // untouched
  assert.equal(patch.json.link, 'https://github.com/x/y');

  const del = await call('DELETE', `/api/projects/${id}`);
  assert.equal(del.status, 204);
  assert.equal((await call('GET', `/api/projects/${id}`, { auth: false })).status, 404);
  assert.equal((await call('DELETE', `/api/projects/${id}`)).status, 404);
});

test('changes show up on the public aggregate endpoint', async () => {
  const before = (await call('GET', '/api/portfolio', { auth: false })).json.projects.length;
  const created = await call('POST', '/api/projects', { body: { title: 'Visible', description: 'on the site' } });
  const after = (await call('GET', '/api/portfolio', { auth: false })).json.projects;
  assert.equal(after.length, before + 1);
  assert.equal(after.at(-1).title, 'Visible');
  await call('DELETE', `/api/projects/${created.json.id}`);
});

test('validation errors return 400 with per-field details', async () => {
  const r = await call('POST', '/api/projects', { body: { title: '', link: 'ftp://nope', tech: 'a,b,c,d,e,f,g,h,i' } });
  assert.equal(r.status, 400);
  assert.equal(r.json.error.message, 'Validation failed');
  assert.ok(r.json.error.details.title);
  assert.ok(r.json.error.details.description);
  assert.ok(r.json.error.details.link);
  assert.ok(r.json.error.details.tech);
});

test('skills: enum + boolean validation', async () => {
  const bad = await call('POST', '/api/skills', { body: { name: 'Rust', category: 'Languages', aboutTag: 'purple', inStack: 'yes' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.error.details.aboutTag);
  assert.ok(bad.json.error.details.inStack);

  const ok = await call('POST', '/api/skills', { body: { name: 'Rust', category: 'Languages' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.inStack, true); // default
  assert.equal(ok.json.inMarquee, false);
  assert.equal(ok.json.aboutTag, '');
  await call('DELETE', `/api/skills/${ok.json.id}`);
});

test('malformed input: bad JSON, wrong content type, bad id, empty PATCH', async () => {
  assert.equal((await call('POST', '/api/projects', { raw: '{oops', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await call('POST', '/api/projects', { raw: 'title=x', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await call('GET', '/api/projects/abc', { auth: false })).status, 400);
  assert.equal((await call('PATCH', '/api/projects/1', { body: {} })).status, 400);
  assert.equal((await call('POST', '/api/projects', { body: [] })).status, 400);
});

test('unknown collection / route -> 404 JSON', async () => {
  const a = await call('GET', '/api/nope', { auth: false });
  assert.equal(a.status, 404);
  assert.ok(a.json.error.message.includes('Unknown collection'));
  const b = await call('GET', '/api/nope/1/extra/more', { auth: false });
  assert.equal(b.status, 404);
});

test('reorder with /move', async () => {
  const list = (await call('GET', '/api/achievements', { auth: false })).json.items;
  const [first, second] = list;
  const r = await call('POST', `/api/achievements/${first.id}/move`, { body: { direction: 'down' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.items[0].id, second.id);
  assert.equal(r.json.items[1].id, first.id);
  assert.equal((await call('POST', `/api/achievements/${first.id}/move`, { body: { direction: 'sideways' } })).status, 400);
});

test('search with ?q=', async () => {
  const r = await call('GET', '/api/skills?q=docker', { auth: false });
  assert.equal(r.status, 200);
  assert.ok(r.json.count >= 1);
  assert.ok(r.json.items.every((s) => JSON.stringify(s).toLowerCase().includes('docker')));
});

test('profile: PUT validates, PATCH updates one field', async () => {
  const current = (await call('GET', '/api/profile', { auth: false })).json;
  assert.equal((await call('PUT', '/api/profile', { body: { ...current, email: 'not-an-email' } })).status, 400);
  const r = await call('PATCH', '/api/profile', { body: { heroTag: 'Hello there' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.heroTag, 'Hello there');
  assert.equal(r.json.email, current.email);
});

test('export -> import round trip, invalid import changes nothing, reset restores defaults', async () => {
  const exported = await call('GET', '/api/admin/export');
  assert.equal(exported.status, 200);
  assert.ok(exported.headers.get('content-disposition').includes('attachment'));
  assert.equal(exported.json.projects[0].id, undefined); // ids are stripped

  await call('POST', '/api/projects', { body: { title: 'Temp', description: 'temp' } });
  const imported = await call('POST', '/api/admin/import', { body: exported.json });
  assert.equal(imported.status, 200);
  const titles = (await call('GET', '/api/projects', { auth: false })).json.items.map((p) => p.title);
  assert.ok(!titles.includes('Temp'));

  const bad = await call('POST', '/api/admin/import', { body: { projects: [{ title: 'only a title' }] } });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.error.details['projects[0].description']);
  assert.equal((await call('POST', '/api/admin/import', { body: {} })).status, 400);

  await call('POST', '/api/projects', { body: { title: 'Another', description: 'x' } });
  const reset = await call('POST', '/api/admin/reset');
  assert.equal(reset.status, 200);
  const after = (await call('GET', '/api/projects', { auth: false })).json.items;
  assert.equal(after.length, 6);
});

test('logout invalidates the token', async () => {
  const login = await call('POST', '/api/auth/login', { body: { password: PASSWORD }, auth: false });
  const t = login.json.token;
  const me = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
  assert.equal(me.status, 200);
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
  const again = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
  assert.equal(again.status, 401);
});

test('static pages are served: portfolio, admin, script', async () => {
  const home = await call('GET', '/', { auth: false });
  assert.equal(home.status, 200);
  assert.ok(home.text.includes('data-list="projects"'));
  const admin = await call('GET', '/admin/', { auth: false });
  assert.equal(admin.status, 200);
  assert.ok(admin.text.includes('Admin'));
  assert.equal((await call('GET', '/js/portfolio.js', { auth: false })).status, 200);
});
