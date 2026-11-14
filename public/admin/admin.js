/*
 * Admin dashboard — a plain-JavaScript single page app that talks to the REST API.
 *
 *   - Forms and tables are generated from GET /api/meta (the same field
 *     definitions the server validates with).
 *   - Every change is a real API call (POST / PUT / DELETE ...), then the data is
 *     re-fetched, so what you see here is exactly what the public site serves.
 *   - Validation errors from the API (HTTP 400) are shown next to the fields.
 */
(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const TOKEN_KEY = 'portfolio_admin_token';

  let token = sessionStorage.getItem(TOKEN_KEY);
  let meta = null; // field definitions from /api/meta
  let data = null; // whole portfolio from /api/portfolio
  const searchText = {}; // per-collection search box text

  // ---- helpers ------------------------------------------------------------

  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'value') node.value = value;
      else if (key === 'checked') node.checked = !!value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    children.flat().forEach((c) => {
      if (c !== null && c !== undefined) node.append(c);
    });
    return node;
  }

  class ApiError extends Error {
    constructor(status, message, details) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }

  async function api(path, { method = 'GET', body, expire = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError(0, 'Cannot reach the server. Is it running?');
    }

    if (res.status === 204) return null;
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      const err = (payload && payload.error) || {};
      if (res.status === 401 && token && expire && path !== '/auth/login') {
        clearToken();
        showLogin('Your session expired. Please sign in again.');
      }
      throw new ApiError(res.status, err.message || res.statusText, err.details);
    }
    return payload;
  }

  function setToken(value) {
    token = value;
    sessionStorage.setItem(TOKEN_KEY, value);
  }

  function clearToken() {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function toast(message, type) {
    const el = h('div', { class: `toast${type === 'error' ? ' error' : ''}`, text: message });
    $('#toasts').append(el);
    setTimeout(() => el.remove(), 3800);
  }

  function confirmAction({ title, text, okLabel = 'Confirm' }) {
    return new Promise((resolve) => {
      const dialog = $('#confirmDialog');
      $('#confirmTitle').textContent = title;
      $('#confirmText').textContent = text;
      $('#confirmOk').textContent = okLabel;
      dialog.returnValue = '';
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
      dialog.showModal();
    });
  }

  async function refreshData() {
    data = await api('/portfolio');
  }

  // ---- login / logout -------------------------------------------------------

  function showLogin(message) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    const err = $('#loginError');
    err.hidden = !message;
    err.textContent = message || '';
    $('#password').value = '';
    $('#password').focus();
  }

  async function enterApp() {
    await refreshData();
    $('#login').hidden = true;
    $('#app').hidden = false;
    route();
  }

  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api('/auth/login', { method: 'POST', body: { password: $('#password').value } });
      setToken(result.token);
      await enterApp();
    } catch (err) {
      showLogin(err.message);
    } finally {
      button.disabled = false;
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST', expire: false });
    } catch {
      /* logging out locally is enough */
    }
    clearToken();
    showLogin();
  });

  // ---- routing + tabs -------------------------------------------------------

  function currentKey() {
    const key = decodeURIComponent(location.hash.slice(1)) || 'overview';
    const valid = ['overview', 'profile', 'backup', ...Object.keys(meta.collections)];
    return valid.includes(key) ? key : 'overview';
  }

  function renderTabs(active) {
    const tab = (key, label, count) =>
      h(
        'button',
        { class: 'tab', type: 'button', 'aria-current': key === active ? 'page' : null, onclick: () => { location.hash = key; } },
        label,
        count !== undefined ? h('span', { class: 'count', text: count }) : null
      );

    $('#tabs').replaceChildren(
      tab('overview', 'Overview'),
      ...Object.entries(meta.collections).map(([key, def]) => tab(key, def.plural, data[key].length)),
      h('div', { class: 'tab-sep' }),
      tab('profile', 'Profile & contact'),
      tab('backup', 'Backup')
    );
  }

  function route() {
    if (!meta || !data) return;
    const key = currentKey();
    renderTabs(key);
    const main = $('#main');
    if (key === 'overview') viewOverview(main);
    else if (key === 'profile') viewProfile(main);
    else if (key === 'backup') viewBackup(main);
    else viewCollection(main, key);
    window.scrollTo({ top: 0 });
  }

  window.addEventListener('hashchange', route);

  // ---- overview ---------------------------------------------------------------

  function viewOverview(main) {
    main.replaceChildren(
      h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow', text: 'Dashboard' }), h('h1', {}, 'Your ', h('em', { text: 'portfolio' }), ' content'))),
      h(
        'div',
        { class: 'cards' },
        ...Object.entries(meta.collections).map(([key, def]) =>
          h(
            'button',
            { class: 'card', type: 'button', onclick: () => { location.hash = key; } },
            h('span', { class: 'num', text: String(data[key].length) }),
            h('span', { class: 'lbl', text: def.plural })
          )
        )
      ),
      h(
        'div',
        { class: 'notice' },
        h('p', { class: 'muted' }, 'Everything you change here is saved through the REST API and shows up on the public site straight away. '),
        h('p', { class: 'muted' }, 'Open the ', h('a', { href: '/', target: '_blank', rel: 'noopener', text: 'public portfolio' }), ' or inspect the raw ', h('a', { href: '/api/portfolio', target: '_blank', rel: 'noopener', text: 'JSON from the API' }), '.'),
        h('p', { class: 'muted' }, 'Heads up: data is kept in memory, so it resets when the server restarts. Use the Backup tab to download a copy.')
      )
    );
  }

  // ---- collection tables (projects, skills, ...) -------------------------------

  function cell(def, value, first) {
    const td = h('td', { class: first ? 'strong' : def.type === 'text' ? 'clip' : null });
    if (def.type === 'list') {
      td.append(...value.map((v) => h('span', { class: 'chip', text: v })));
    } else if (def.type === 'boolean') {
      td.append(h('span', { class: value ? 'yes' : 'no', text: value ? '✓' : '—' }));
    } else if (def.type === 'url') {
      td.append(value && /^https?:\/\//i.test(value) ? h('a', { class: 'ext', href: value, target: '_blank', rel: 'noopener noreferrer', text: 'open ↗' }) : h('span', { class: 'no', text: '—' }));
    } else if (def.type === 'enum') {
      const option = def.options.find((o) => o.value === value);
      td.textContent = value ? (option ? option.label : value) : '—';
    } else {
      td.textContent = value || '—';
    }
    return td;
  }

  function viewCollection(main, name) {
    const def = meta.collections[name];
    const columns = def.columns;
    const tbody = h('tbody');
    const countLabel = h('p', { class: 'muted' });

    function matches(item, q) {
      return columns
        .concat(Object.keys(def.fields))
        .map((k) => (Array.isArray(item[k]) ? item[k].join(' ') : String(item[k] ?? '')))
        .join(' ')
        .toLowerCase()
        .includes(q);
    }

    function renderRows() {
      const q = (searchText[name] || '').trim().toLowerCase();
      const all = data[name];
      const rows = q ? all.filter((item) => matches(item, q)) : all;
      countLabel.textContent = q ? `${rows.length} of ${all.length} shown` : `${all.length} ${all.length === 1 ? def.label.toLowerCase() : def.plural.toLowerCase()}`;

      if (!rows.length) {
        tbody.replaceChildren(h('tr', {}, h('td', { colspan: columns.length + 1, class: 'empty muted', text: q ? 'No matches.' : `No ${def.plural.toLowerCase()} yet. Use “Add” to create one.` })));
        return;
      }

      tbody.replaceChildren(
        ...rows.map((item) => {
          const index = all.findIndex((i) => i.id === item.id);
          return h(
            'tr',
            {},
            ...columns.map((col, i) => cell(def.fields[col], item[col], i === 0)),
            h(
              'td',
              { class: 'actions' },
              h('button', { class: 'icon-btn', type: 'button', title: 'Move up', 'aria-label': 'Move up', disabled: !!q || index === 0, onclick: () => move(item.id, 'up'), text: '↑' }),
              h('button', { class: 'icon-btn', type: 'button', title: 'Move down', 'aria-label': 'Move down', disabled: !!q || index === all.length - 1, onclick: () => move(item.id, 'down'), text: '↓' }),
              h('button', { class: 'btn btn-outline btn-sm', type: 'button', onclick: () => edit(item), text: 'Edit' }),
              ' ',
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => remove(item), text: 'Delete' })
            )
          );
        })
      );
    }

    async function afterChange(message) {
      await refreshData();
      route();
      if (message) toast(message);
    }

    async function move(id, direction) {
      try {
        const result = await api(`/${name}/${id}/move`, { method: 'POST', body: { direction } });
        data[name] = result.items;
        renderTabs(name);
        renderRows();
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    function add() {
      openForm({
        title: `Add ${def.label.toLowerCase()}`,
        fields: def.fields,
        values: {},
        submitLabel: 'Create',
        submit: (body) => api(`/${name}`, { method: 'POST', body }),
        onSaved: () => afterChange(`${def.label} added`),
      });
    }

    function edit(item) {
      openForm({
        title: `Edit ${def.label.toLowerCase()}`,
        fields: def.fields,
        values: item,
        submitLabel: 'Save changes',
        submit: (body) => api(`/${name}/${item.id}`, { method: 'PUT', body }),
        onSaved: () => afterChange(`${def.label} updated`),
      });
    }

    async function remove(item) {
      const label = item[columns[0]];
      const ok = await confirmAction({ title: `Delete “${label}”?`, text: 'This removes it from the public portfolio immediately. This cannot be undone.', okLabel: 'Delete' });
      if (!ok) return;
      try {
        await api(`/${name}/${item.id}`, { method: 'DELETE' });
        await afterChange(`${def.label} deleted`);
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    const search = h('input', {
      class: 'search',
      type: 'text',
      placeholder: `Search ${def.plural.toLowerCase()}…`,
      'aria-label': 'Search',
      value: searchText[name] || '',
      oninput: (e) => {
        searchText[name] = e.target.value;
        renderRows();
      },
    });

    main.replaceChildren(
      h(
        'div',
        { class: 'page-head' },
        h('div', {}, h('p', { class: 'eyebrow', text: 'Manage' }), h('h1', { text: def.plural }), countLabel),
        h('div', { class: 'tools' }, search, h('button', { class: 'btn btn-primary', type: 'button', onclick: add, text: `+ Add ${def.label.toLowerCase()}` }))
      ),
      h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ...columns.map((col) => h('th', { text: def.fields[col].label })), h('th', { text: '' }))), tbody))
    );
    renderRows();
  }

  // ---- form generator -------------------------------------------------------------

  let datalistCounter = 0;

  function buildField(key, def, value) {
    const id = `f_${key}`;
    const initial = value !== undefined ? value : def.default;
    const wrap = h('div', { class: `field${def.type === 'boolean' ? ' check' : ''}`, 'data-key': key });
    const labelText = h('span', { class: 'label' }, def.label, def.required ? h('span', { class: 'req', text: ' *' }) : null);
    let input;

    switch (def.type) {
      case 'text':
        input = h('textarea', { id, name: key, maxlength: def.max, value: initial || '' });
        break;
      case 'boolean':
        input = h('input', { id, name: key, type: 'checkbox', checked: !!initial });
        break;
      case 'enum':
        input = h('select', { id, name: key }, ...def.options.map((o) => h('option', { value: o.value, selected: o.value === (initial ?? ''), text: o.label })));
        break;
      case 'list':
        input = h('input', { id, name: key, type: 'text', value: Array.isArray(initial) ? initial.join(', ') : initial || '' });
        break;
      default: {
        const type = def.type === 'url' ? 'url' : def.type === 'email' ? 'email' : 'text';
        input = h('input', { id, name: key, type, maxlength: def.max, value: initial || '', placeholder: def.type === 'url' ? 'https://…' : null });
        if (def.suggestions) {
          const listId = `dl_${key}_${++datalistCounter}`;
          input.setAttribute('list', listId);
          wrap.append(h('datalist', { id: listId }, ...def.suggestions.map((s) => h('option', { value: s }))));
        }
      }
    }

    if (def.type === 'boolean') {
      wrap.append(input, h('label', { for: id }, labelText));
    } else {
      wrap.append(h('label', { for: id }, labelText), input);
    }
    if (def.help) wrap.append(h('span', { class: 'help', text: def.help }));
    return wrap;
  }

  function readForm(form, fields) {
    const body = {};
    for (const [key, def] of Object.entries(fields)) {
      const el = form.elements[key];
      body[key] = def.type === 'boolean' ? el.checked : el.value;
    }
    return body;
  }

  /** Show API validation messages next to their fields. Returns true if any field matched. */
  function showFieldErrors(root, details) {
    root.querySelectorAll('.field-error').forEach((e) => e.remove());
    root.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
    let shown = false;
    for (const [key, message] of Object.entries(details || {})) {
      const wrap = root.querySelector(`[data-key="${key}"]`);
      if (!wrap) continue;
      wrap.classList.add('invalid');
      wrap.append(h('span', { class: 'field-error', role: 'alert', text: message }));
      shown = true;
    }
    return shown;
  }

  function openForm({ title, fields, values, submitLabel, submit, onSaved }) {
    const dialog = $('#formDialog');
    const form = $('#itemForm');
    const errorBox = $('#formError');
    const submitBtn = $('#formSubmit');

    $('#formTitle').textContent = title;
    submitBtn.textContent = submitLabel || 'Save';
    errorBox.hidden = true;
    $('#formFields').replaceChildren(...Object.entries(fields).map(([key, def]) => buildField(key, def, values[key])));

    form.onsubmit = async (event) => {
      event.preventDefault();
      errorBox.hidden = true;
      submitBtn.disabled = true;
      try {
        await submit(readForm(form, fields));
        dialog.close();
        await onSaved();
      } catch (err) {
        const matched = showFieldErrors(form, err.details);
        errorBox.textContent = matched ? 'Please fix the highlighted fields.' : err.message;
        errorBox.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    };

    dialog.showModal();
    const first = form.querySelector('input:not([type=checkbox]), textarea, select');
    if (first) first.focus();
  }

  $('#formClose').addEventListener('click', () => $('#formDialog').close());
  $('#formCancel').addEventListener('click', () => $('#formDialog').close());

  // ---- profile ----------------------------------------------------------------------

  function viewProfile(main) {
    const fields = meta.profile.fields;
    const form = h('form', { class: 'panel', novalidate: true });
    const errorBox = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const saveBtn = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Save changes' });

    form.append(
      ...Object.entries(fields).map(([key, def]) => buildField(key, def, data.profile[key])),
      errorBox,
      h('div', { class: 'panel-actions' }, saveBtn)
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.hidden = true;
      saveBtn.disabled = true;
      try {
        data.profile = await api('/profile', { method: 'PUT', body: readForm(form, fields) });
        showFieldErrors(form, {});
        toast('Profile saved');
      } catch (err) {
        const matched = showFieldErrors(form, err.details);
        errorBox.textContent = matched ? 'Please fix the highlighted fields.' : err.message;
        errorBox.hidden = false;
      } finally {
        saveBtn.disabled = false;
      }
    });

    main.replaceChildren(
      h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow', text: 'Manage' }), h('h1', {}, 'Profile & ', h('em', { text: 'contact' })), h('p', { class: 'muted', text: 'Hero text, about section, status badge, contact links and footer.' }))),
      form
    );
  }

  // ---- backup / restore / reset ------------------------------------------------------

  async function downloadBackup() {
    try {
      const res = await fetch('/api/admin/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new ApiError(res.status, 'Could not export the data');
      const url = URL.createObjectURL(await res.blob());
      const link = h('a', { href: url, download: 'portfolio-backup.json' });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast('Backup downloaded');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function importBackup(file) {
    if (!file) return;
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast('That file is not valid JSON', 'error');
      return;
    }
    const ok = await confirmAction({ title: 'Import this backup?', text: 'The sections contained in the file will replace your current content.', okLabel: 'Import' });
    if (!ok) return;
    try {
      await api('/admin/import', { method: 'POST', body: parsed });
      await refreshData();
      route();
      toast('Backup imported');
    } catch (err) {
      const first = err.details && Object.entries(err.details)[0];
      toast(first ? `${err.message}: ${first[0]} — ${first[1]}` : err.message, 'error');
    }
  }

  async function resetData() {
    const ok = await confirmAction({ title: 'Reset to default content?', text: 'All your edits will be replaced by the original seed data.', okLabel: 'Reset' });
    if (!ok) return;
    try {
      await api('/admin/reset', { method: 'POST' });
      await refreshData();
      route();
      toast('Content reset');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function viewBackup(main) {
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: (e) => { importBackup(e.target.files[0]); e.target.value = ''; } });
    const row = (title, text, button) => h('div', {}, h('div', {}, h('h3', { text: title }), h('p', { class: 'muted', text })), button);

    main.replaceChildren(
      h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow', text: 'Safety net' }), h('h1', { text: 'Backup' }), h('p', { class: 'muted', text: 'Data lives in server memory and resets on restart. Keep a copy.' }))),
      h(
        'div',
        { class: 'backup' },
        row('Download backup', 'Saves all content as a JSON file.', h('button', { class: 'btn btn-outline', type: 'button', onclick: downloadBackup, text: 'Download JSON' })),
        row('Restore from backup', 'Upload a file you downloaded earlier. It is validated before anything changes.', h('span', {}, fileInput, h('button', { class: 'btn btn-outline', type: 'button', onclick: () => fileInput.click(), text: 'Choose file…' }))),
        row('Reset to defaults', 'Discard all edits and go back to the original content.', h('button', { class: 'btn btn-danger', type: 'button', onclick: resetData, text: 'Reset' }))
      )
    );
  }

  // ---- start ----------------------------------------------------------------------------

  async function init() {
    try {
      meta = await api('/meta');
    } catch (err) {
      showLogin(err.message);
      return;
    }
    if (token) {
      try {
        await api('/auth/me', { expire: false });
        await enterApp();
        return;
      } catch {
        clearToken();
      }
    }
    showLogin();
  }

  init();
})();
