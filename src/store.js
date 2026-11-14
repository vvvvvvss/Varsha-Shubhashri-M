'use strict';

const seed = require('./data/seed');
const { collections } = require('./schemas');

const COLLECTION_NAMES = Object.keys(collections);
const clone = (x) => structuredClone(x);
const now = () => new Date().toISOString();

/**
 * All portfolio data lives here, in memory. Every request (public site and
 * admin dashboard) goes through this single object, so both always see the
 * same data. Restarting the server resets it to the seed data.
 */
class Store {
  constructor() {
    this.reset();
  }

  reset() {
    const s = clone(seed);
    this.profile = s.profile;
    this.counters = {};
    this.items = {};
    for (const name of COLLECTION_NAMES) this.replaceAll(name, s[name] || []);
  }

  // ---- collections ------------------------------------------------------

  has(name) {
    return COLLECTION_NAMES.includes(name);
  }

  replaceAll(name, list) {
    this.counters[name] = 0;
    this.items[name] = list.map((data) => this._build(name, data));
  }

  _build(name, data) {
    const t = now();
    return { id: ++this.counters[name], ...clone(data), createdAt: t, updatedAt: t };
  }

  list(name) {
    return clone(this.items[name]);
  }

  find(name, id) {
    return this.items[name].find((i) => i.id === id);
  }

  get(name, id) {
    const item = this.find(name, id);
    return item ? clone(item) : null;
  }

  create(name, data) {
    const item = this._build(name, data);
    this.items[name].push(item);
    return clone(item);
  }

  /** Replace every editable field (PUT). Keeps id + createdAt. */
  replace(name, id, data) {
    const item = this.find(name, id);
    if (!item) return null;
    const { createdAt } = item;
    for (const key of Object.keys(item)) delete item[key];
    Object.assign(item, { id, ...clone(data), createdAt, updatedAt: now() });
    return clone(item);
  }

  /** Change only the supplied fields (PATCH). */
  update(name, id, patch) {
    const item = this.find(name, id);
    if (!item) return null;
    Object.assign(item, clone(patch), { updatedAt: now() });
    return clone(item);
  }

  remove(name, id) {
    const index = this.items[name].findIndex((i) => i.id === id);
    if (index === -1) return null;
    const [removed] = this.items[name].splice(index, 1);
    return clone(removed);
  }

  /** Move an item one step up or down in display order. */
  move(name, id, direction) {
    const list = this.items[name];
    const from = list.findIndex((i) => i.id === id);
    if (from === -1) return false;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= list.length) return true; // already at the edge — nothing to do
    [list[from], list[to]] = [list[to], list[from]];
    return true;
  }

  // ---- profile ----------------------------------------------------------

  getProfile() {
    return clone(this.profile);
  }

  setProfile(data) {
    this.profile = { ...this.profile, ...clone(data) };
    return this.getProfile();
  }

  // ---- backup / restore -------------------------------------------------

  snapshot() {
    const strip = ({ id, createdAt, updatedAt, ...rest }) => rest; // eslint-disable-line no-unused-vars
    const out = { exportedAt: now(), profile: this.getProfile() };
    for (const name of COLLECTION_NAMES) out[name] = this.items[name].map(strip);
    return out;
  }

  /** `data` must already be validated. Only the keys present are replaced. */
  load(data) {
    if (data.profile) this.profile = clone(data.profile);
    for (const name of COLLECTION_NAMES) {
      if (Array.isArray(data[name])) this.replaceAll(name, data[name]);
    }
  }
}

module.exports = { Store, COLLECTION_NAMES };
