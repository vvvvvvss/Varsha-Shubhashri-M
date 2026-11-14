/*
 * Public portfolio — loads everything from the REST API and renders it into the
 * existing page. It builds exactly the same markup/classes as the original
 * static page, so the design is untouched.
 *
 *   GET /api/portfolio  ->  { profile, projects, skills, achievements, certifications, models }
 *
 * All text is inserted with textContent / text nodes (never innerHTML), so
 * nothing typed in the admin dashboard can inject HTML or scripts.
 */
(function () {
  'use strict';

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const DELAYS = ['', '.1s', '.2s']; // same staggered reveal as the original grid

  /** Tiny DOM builder. Strings become text nodes, so they are always escaped. */
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    children.flat().forEach((child) => {
      if (child !== null && child !== undefined) node.append(child);
    });
    return node;
  }

  const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '');
  const list = (name) => $(`[data-list="${name}"]`);
  const field = (name) => $(`[data-field="${name}"]`);

  function observeReveals(root) {
    if (typeof obs === 'undefined') return; // IntersectionObserver from the page script
    $$('.reveal', root).forEach((el) => obs.observe(el));
  }

  // ---- profile ------------------------------------------------------------

  function renderProfile(p) {
    const set = (name, value) => {
      const el = field(name);
      if (el) el.textContent = value || '';
    };

    set('heroTag', p.heroTag);
    set('heroDescription', p.heroDescription);
    set('email', p.email);
    set('footer', p.footerText ? `© ${new Date().getFullYear()} — ${p.footerText}` : `© ${new Date().getFullYear()}`);

    // About: paragraphs separated by a blank line, joined with <br><br> like the original
    const about = field('aboutBody');
    if (about) {
      const paragraphs = (p.aboutBody || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      const nodes = [];
      paragraphs.forEach((para, i) => {
        if (i > 0) nodes.push(h('br'), h('br'));
        nodes.push(para);
      });
      about.replaceChildren(...nodes);
    }

    // Status badge: "Currently: <strong>highlight</strong> rest"
    const badge = field('badge');
    if (badge) {
      const box = badge.closest('.hero-badge');
      if (!p.badgeHighlight && !p.badgeText) {
        if (box) box.style.display = 'none';
      } else {
        if (box) box.style.display = '';
        badge.replaceChildren(
          'Currently: ',
          p.badgeHighlight ? h('strong', { text: p.badgeHighlight }) : null,
          p.badgeText ? ` ${p.badgeText}` : null
        );
      }
    }

    // Contact links (hidden when the URL is empty)
    const links = {
      email: p.email ? `mailto:${p.email}` : '',
      linkedin: safeUrl(p.linkedin),
      github: safeUrl(p.github),
      substack: safeUrl(p.substack),
    };
    $$('[data-link]').forEach((a) => {
      const href = links[a.dataset.link];
      if (href) {
        a.setAttribute('href', href);
        a.style.display = '';
      } else {
        a.style.display = 'none';
      }
    });
  }

  // ---- stats (hero tiles are derived from the data) -----------------------

  function renderStats(data) {
    const set = (name, n) => {
      const el = $(`[data-stat="${name}"]`);
      if (el) el.innerHTML = `${n}<span>+</span>`; // n is a number, so this is safe
    };
    set('certifications', data.certifications.length);
    set('projects', data.projects.length);
  }

  // ---- lists --------------------------------------------------------------

  function renderMarquee(skills) {
    const track = list('marquee');
    const items = skills.filter((s) => s.inMarquee);
    track.replaceChildren(
      ...items.map((s) => h('span', { class: 'marquee-item' }, `${s.name} `, h('span', { class: 'marquee-sep', text: '✦' })))
    );
    const strip = track.closest('.marquee-section');
    if (strip) strip.style.display = items.length ? '' : 'none';
  }

  function renderAboutTags(skills) {
    list('aboutTags').replaceChildren(
      ...skills
        .filter((s) => s.aboutTag)
        .map((s) => h('span', { class: s.aboutTag === 'plain' ? 'skill-tag' : `skill-tag ${s.aboutTag}`, text: s.name }))
    );
  }

  function renderProjects(projects) {
    const grid = list('projects');
    if (!projects.length) {
      grid.replaceChildren(
        h('p', {
          style: "padding:2.5rem;font-family:'DM Mono',monospace;font-size:.8rem;color:var(--muted)",
          text: 'No projects yet — check back soon.',
        })
      );
      return;
    }
    grid.replaceChildren(
      ...projects.map((p, i) => {
        const url = safeUrl(p.link);
        const delay = DELAYS[i % 3];
        return h(
          'div',
          { class: 'project-card reveal', style: delay ? `transition-delay:${delay}` : null },
          h('div', { class: 'project-num', text: String(i + 1).padStart(2, '0') }),
          h('div', { class: 'project-title', text: p.title }),
          h('p', { class: 'project-desc', text: p.description }),
          h('div', { class: 'project-tech' }, p.tech.map((t) => h('span', { text: t }))),
          url
            ? h('a', { class: 'project-arrow', href: url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Open ${p.title}`, text: '↗' })
            : null
        );
      })
    );
    observeReveals(grid);
  }

  function renderModels(models) {
    list('models').replaceChildren(
      ...models.map((m) => h('div', { class: 'model-item' }, h('span', { text: m.name }), h('span', { class: 'model-category', text: m.category })))
    );
  }

  function renderCertifications(certs) {
    list('certifications').replaceChildren(
      ...certs.map((c) => {
        const url = safeUrl(c.link);
        return h(
          'div',
          { class: 'cert-card' },
          h(
            'div',
            { class: 'cert-info' },
            h('div', { class: 'cert-name', text: c.name }),
            h('div', { class: 'cert-org', text: c.org }),
            c.level ? h('div', { class: 'cert-level', text: c.level }) : null,
            url ? h('a', { class: 'cert-link', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'View Certificate ↗' }) : null
          )
        );
      })
    );
  }

  function renderAchievements(items) {
    list('achievements').replaceChildren(
      ...items.map((a) => h('div', { class: 'achievement-item' }, h('div', { class: 'ach-title', text: a.title }), h('div', { class: 'ach-desc', text: a.description })))
    );
  }

  function renderTechStack(skills) {
    // Group by category, keeping first-seen order (case-insensitive match)
    const groups = new Map();
    skills
      .filter((s) => s.inStack)
      .forEach((s) => {
        const key = s.category.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, { label: s.category.trim(), names: [] });
        groups.get(key).names.push(s.name);
      });

    list('skills').replaceChildren(
      ...Array.from(groups.values()).map((g) =>
        h(
          'div',
          { class: 'tech-category' },
          h('div', { class: 'tech-cat-label', text: g.label }),
          h('div', { class: 'tech-items' }, g.names.map((n) => h('span', { class: 'tech-item', text: n })))
        )
      )
    );
  }

  function render(data) {
    renderProfile(data.profile);
    renderStats(data);
    renderMarquee(data.skills);
    renderAboutTags(data.skills);
    renderProjects(data.projects);
    renderModels(data.models);
    renderCertifications(data.certifications);
    renderAchievements(data.achievements);
    renderTechStack(data.skills);
  }

  function showError() {
    const grid = list('projects');
    if (!grid) return;
    grid.replaceChildren(
      h('p', {
        style: "padding:2.5rem;font-family:'DM Mono',monospace;font-size:.8rem;color:var(--muted)",
        text: "Couldn't load the portfolio content. Please refresh in a moment.",
      })
    );
  }

  // ---- loading ------------------------------------------------------------

  let lastLoad = 0;

  async function load() {
    const res = await fetch('/api/portfolio', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`API responded with ${res.status}`);
    render(await res.json());
    lastLoad = Date.now();
  }

  function startStatCounters() {
    // `statObs` is created by the page script; start the count-up only now that real numbers are in place.
    const grid = $('.hero-stat-grid');
    if (grid && typeof statObs !== 'undefined') statObs.observe(grid);
  }

  load()
    .catch((err) => {
      console.error(err);
      showError();
    })
    .finally(startStatCounters);

  // Pick up edits made in the dashboard when the visitor comes back to this tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && lastLoad && Date.now() - lastLoad > 10000) {
      load().catch((err) => console.error(err));
    }
  });
})();
