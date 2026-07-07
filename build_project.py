from pathlib import Path
import re
import shutil
import textwrap

root = Path(r'c:\Users\leidy\Documents\GEMESEG\Cotizador')
original = root / 'index (1).html'
out = root / 'nuevo-proyecto'
(out / 'src' / 'modules').mkdir(parents=True, exist_ok=True)

text = original.read_text(encoding='utf-8')

style_match = re.search(r'<style>(.*?)</style>', text, re.S)
script_match = re.search(r'<script>(.*?)</script>\s*</body>', text, re.S)

if not style_match or not script_match:
    raise SystemExit('No se pudo extraer el CSS o el JS del archivo original.')

styles = style_match.group(1)
script = script_match.group(1)

# Copy original HTML as a base and remap assets
new_html = text.replace('<style>' + styles + '</style>', '<link rel="stylesheet" href="/src/styles.css">', 1)
new_html = new_html.replace('<script>' + script + '</script></body>', '<script type="module" src="/src/main.js"></script></body>', 1)
(out / 'index.html').write_text(new_html, encoding='utf-8')

(out / 'src' / 'styles.css').write_text(styles, encoding='utf-8')
(out / 'src' / 'app.js').write_text(script, encoding='utf-8')

(out / 'src' / 'main.js').write_text(textwrap.dedent('''\
import './styles.css';
import { initAuth } from './modules/auth.js';
import { initCatalog } from './modules/catalog.js';
import { initQuote } from './modules/quote.js';
import { initSync } from './modules/sync.js';
import './app.js';

initAuth();
initCatalog();
initQuote();
initSync();
'''), encoding='utf-8')

(out / 'src' / 'modules' / 'auth.js').write_text(textwrap.dedent('''\
export function initAuth() {
  console.info('Auth module ready');
}
'''), encoding='utf-8')

(out / 'src' / 'modules' / 'catalog.js').write_text(textwrap.dedent('''\
export function initCatalog() {
  console.info('Catalog module ready');
}
'''), encoding='utf-8')

(out / 'src' / 'modules' / 'quote.js').write_text(textwrap.dedent('''\
export function initQuote() {
  console.info('Quote module ready');
}
'''), encoding='utf-8')

(out / 'src' / 'modules' / 'sync.js').write_text(textwrap.dedent('''\
export function initSync() {
  console.info('Sync module ready');
}
'''), encoding='utf-8')

(out / 'package.json').write_text(textwrap.dedent('''\
{
  "name": "gemeseg-cotizador-modular",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.4.10"
  }
}
'''), encoding='utf-8')

(out / 'README.md').write_text(textwrap.dedent('''\
# Cotizador GEMESEG - Versión modular

Esta carpeta contiene una copia modular del cotizador original sin modificar el archivo fuente.

## Comandos
- npm install
- npm run dev
'''), encoding='utf-8')

print('Proyecto modular creado en ' + str(out))
