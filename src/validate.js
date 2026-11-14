'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function defaultFor(def) {
  if (def.default !== undefined) return def.default;
  if (def.type === 'boolean') return false;
  if (def.type === 'list') return [];
  return '';
}

/** Returns { value } on success or { error } for a single field. */
function coerce(def, raw) {
  const label = def.label || 'Value';

  switch (def.type) {
    case 'string':
    case 'text':
    case 'url':
    case 'email': {
      if (typeof raw !== 'string') return { error: `${label} must be text` };
      const v = raw.trim();
      if (!v) return def.required ? { error: `${label} is required` } : { value: '' };
      if (v.length > (def.max || (def.type === 'url' ? 500 : 200))) {
        return { error: `${label} must be at most ${def.max || 500} characters` };
      }
      if (def.type === 'url' && !isHttpUrl(v)) return { error: `${label} must be a valid http(s) URL` };
      if (def.type === 'email' && !EMAIL_RE.test(v)) return { error: `${label} must be a valid email address` };
      return { value: v };
    }

    case 'list': {
      let items = raw;
      if (typeof raw === 'string') items = raw.split(',');
      if (!Array.isArray(items)) return { error: `${label} must be a list or comma-separated text` };
      if (items.some((i) => typeof i !== 'string')) return { error: `${label} items must be text` };
      items = items.map((i) => i.trim()).filter(Boolean);
      items = [...new Set(items)];
      if (def.max && items.length > def.max) return { error: `${label} can have at most ${def.max} items` };
      if (def.itemMax && items.some((i) => i.length > def.itemMax)) {
        return { error: `Each item in ${label} must be at most ${def.itemMax} characters` };
      }
      if (def.required && items.length === 0) return { error: `${label} is required` };
      return { value: items };
    }

    case 'boolean':
      if (typeof raw !== 'boolean') return { error: `${label} must be true or false` };
      return { value: raw };

    case 'enum': {
      const allowed = def.options.map((o) => o.value);
      if (!allowed.includes(raw)) {
        return { error: `${label} must be one of: ${allowed.map((a) => `"${a}"`).join(', ')}` };
      }
      return { value: raw };
    }

    default:
      return { error: `${label} has an unsupported type` };
  }
}

/**
 * Validate `input` against a `fields` definition.
 *  - partial=false (POST / PUT): required fields must be present, missing optional ones get defaults.
 *  - partial=true  (PATCH): only the supplied fields are checked and returned.
 * Unknown keys are ignored (stripped).
 * Returns { value, errors } where errors is null or { field: message }.
 */
function validate(fields, input, { partial = false } = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { value: null, errors: { _body: 'Request body must be a JSON object' } };
  }

  const value = {};
  const errors = {};

  for (const [key, def] of Object.entries(fields)) {
    const present = Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined;

    if (!present) {
      if (partial) continue;
      if (def.required) errors[key] = `${def.label || key} is required`;
      else value[key] = defaultFor(def);
      continue;
    }

    const res = coerce(def, input[key]);
    if (res.error) errors[key] = res.error;
    else value[key] = res.value;
  }

  return { value, errors: Object.keys(errors).length ? errors : null };
}

module.exports = { validate };
