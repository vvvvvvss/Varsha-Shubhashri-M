'use strict';

const { createApp } = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Portfolio:       http://localhost:${PORT}/`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`API:             http://localhost:${PORT}/api/portfolio`);
  if (app.locals.usingDefaultPassword) {
    console.warn('\n⚠  ADMIN_PASSWORD is not set — using the default password "admin123".');
    console.warn('   Set ADMIN_PASSWORD before deploying anywhere public.\n');
  }
});
