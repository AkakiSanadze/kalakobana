const fs = require('fs');
const path = require('path');

function buildSingleFile() {
  console.log('=== ქალაქობანა: Single-File Bundle Builder ===');

  const rootDir = path.resolve(__dirname, '..');
  const indexPath = path.join(rootDir, 'index.html');
  const distDir = path.join(rootDir, 'dist');
  const distHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // 1. Inline CSS
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (match, href) => {
    const cssPath = path.join(rootDir, href);
    if (fs.existsSync(cssPath)) {
      console.log(`Inlining CSS: ${href}`);
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      return `<style>\n${cssContent}\n</style>`;
    }
    return match;
  });

  // 2. Inline Scripts
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, src) => {
    const jsPath = path.join(rootDir, src);
    if (fs.existsSync(jsPath)) {
      console.log(`Inlining JS: ${src}`);
      const jsContent = fs.readFileSync(jsPath, 'utf8');
      return `<script>\n${jsContent}\n</script>`;
    }
    return match;
  });

  // Remove service worker registration from the standalone file since SW requires HTTP/HTTPS
  html = html.replace(/<script>\s*if \('serviceWorker'[\s\S]*?<\/script>/, '<!-- Standalone Offline Bundle (No SW needed) -->');

  fs.writeFileSync(distHtmlPath, html, 'utf8');

  const stats = fs.statSync(distHtmlPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  const sizeKb = (stats.size / 1024).toFixed(0);

  console.log(`\n✅ Standalone bundle successfully built: dist/index.html`);
  console.log(`📦 Bundle size: ${sizeKb} KB (${sizeMb} MB)`);
}

buildSingleFile();
