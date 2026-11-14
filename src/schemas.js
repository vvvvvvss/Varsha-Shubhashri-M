'use strict';

/**
 * One place that describes every piece of portfolio content.
 *  - The API validates request bodies against these definitions.
 *  - GET /api/meta sends them to the admin dashboard, which builds its
 *    forms and tables from them (so adding a field = edit this file only).
 *
 * Field types: string | text | url | email | list | boolean | enum
 */

const collections = {
  projects: {
    label: 'Project',
    plural: 'Projects',
    columns: ['title', 'tech', 'link'],
    fields: {
      title: { type: 'string', required: true, max: 80, label: 'Title' },
      description: { type: 'text', required: true, max: 400, label: 'Description' },
      tech: { type: 'list', max: 8, itemMax: 30, label: 'Tech tags', help: 'Comma-separated, up to 8 (e.g. Python, OpenCV)' },
      link: { type: 'url', label: 'GitHub / live link', help: 'Optional. Must start with http:// or https://' },
    },
  },

  skills: {
    label: 'Skill',
    plural: 'Skills',
    columns: ['name', 'category', 'inStack', 'inMarquee', 'aboutTag'],
    fields: {
      name: { type: 'string', required: true, max: 40, label: 'Name' },
      category: {
        type: 'string', required: true, max: 40, label: 'Category',
        help: 'Groups skills in the Tech Stack section (e.g. Languages, Tools, AI / ML)',
        suggestions: ['Languages', 'Tools', 'AI / ML', 'DevOps / Cloud', 'Other', 'Core Subjects'],
      },
      inStack: { type: 'boolean', default: true, label: 'Show in Tech Stack section' },
      inMarquee: { type: 'boolean', default: false, label: 'Show in scrolling marquee' },
      aboutTag: {
        type: 'enum', default: '', label: 'Tag in "About" section',
        options: [
          { value: '', label: 'Not shown' },
          { value: 'accent', label: 'Accent (blue outline)' },
          { value: 'blue', label: 'Light blue outline' },
          { value: 'plain', label: 'Plain' },
        ],
      },
    },
  },

  achievements: {
    label: 'Achievement',
    plural: 'Achievements',
    columns: ['title', 'description'],
    fields: {
      title: { type: 'string', required: true, max: 80, label: 'Title' },
      description: { type: 'text', required: true, max: 300, label: 'Description' },
    },
  },

  certifications: {
    label: 'Certification',
    plural: 'Certifications',
    columns: ['name', 'org', 'level', 'link'],
    fields: {
      name: { type: 'string', required: true, max: 100, label: 'Name' },
      org: { type: 'string', required: true, max: 60, label: 'Issued by' },
      level: { type: 'string', max: 60, label: 'Level / detail', help: 'e.g. Level 1 & Level 2 Certified' },
      link: { type: 'url', label: 'Certificate link' },
    },
  },

  models: {
    label: 'ML model',
    plural: 'ML Models',
    columns: ['name', 'category'],
    fields: {
      name: { type: 'string', required: true, max: 60, label: 'Model / algorithm' },
      category: { type: 'string', required: true, max: 40, label: 'Category', help: 'e.g. Ensemble, Regression' },
    },
  },
};

const profile = {
  label: 'Profile & contact',
  fields: {
    heroTag: { type: 'string', required: true, max: 120, label: 'Hero tagline' },
    heroDescription: { type: 'text', required: true, max: 600, label: 'Hero description' },
    aboutBody: { type: 'text', required: true, max: 1500, label: 'About text', help: 'Separate paragraphs with a blank line' },
    badgeHighlight: { type: 'string', max: 80, label: 'Status badge — bold part', help: 'Shown after "Currently:"' },
    badgeText: { type: 'string', max: 120, label: 'Status badge — rest of the text' },
    email: { type: 'email', required: true, max: 120, label: 'Email' },
    linkedin: { type: 'url', label: 'LinkedIn URL' },
    github: { type: 'url', label: 'GitHub URL' },
    substack: { type: 'url', label: 'Substack URL' },
    footerText: { type: 'string', max: 100, label: 'Footer text', help: 'Appears after "© year —"' },
  },
};

module.exports = { collections, profile };
