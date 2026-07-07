# AGENTS.md - Guia Tecnica del Proyecto

## Stack Tecnologico

### Lenguajes
- **HTML5** - Estructura y UI
- **CSS3** - Estilos (CSS Custom Properties, Grid, Flexbox, `@media print`)
- **JavaScript (ES6+ / ES Modules)** - Toda la logica de la aplicacion
- **Python** - Script de migracion/build (`build_project.py`)

### Herramientas y Frameworks

| Tecnologia | Uso | Version |
|---|---|---|
| Vite | Dev server y bundler | ^5.4.10 |
| Supabase JS | Autenticacion (via npm, no CDN) | v2 |
| Google Sheets API | Fuente de datos para catalogo | gviz/export |
| Google Fonts | Tipografia Montserrat | - |

### Almacenamiento
- **localStorage** - Persistencia del lado del cliente:
  - `session` - Sesion del usuario
  - `saved_quotes` - Cotizaciones guardadas (maximo 100)
  - `quote_draft` - Borrador actual
  - `custom_catalog` - Catalogo personalizado
  - `drive_config` - Configuracion de sincronizacion
  - `cot_seq_YYYYMMDD` - Contadores de secuencia de cotizaciones

### Arquitectura

La aplicacion es una SPA (Single Page Application) vanilla sin frameworks de frontend.

**Version original** (`index (1).html`):
- Archivo monolitico de ~2,200 lineas
- HTML + CSS inline + JS inline
- Catalogo embebido como array JSON
- Autenticacion contra Google Sheets (CSV)

**Version modular** (raiz del repo):
- Vite como dev server y bundler
- CSS extraido a `src/styles.css`
- JS principal en `src/app.js` (logica de catalogo, carrito, cotizaciones)
- Modulo de autenticacion en `src/modules/auth.js` (Supabase)
- Cliente Supabase en `src/lib/supabase.js` (variables de entorno Vite)
- Variables de entorno via `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### Funcionalidades Clave

1. **Autenticacion**: Login via Supabase Auth (`signInWithPassword`). Credenciales en `.env`
2. **Catalogo**: Productos de seguridad con precios, categorias, indicadores de frescura (verde/amarillo/rojo)
3. **Carrito**: Agregar items, cantidades, eliminar, calcular totales
4. **Modalidad de venta**: 35% margen (con instalacion) vs 15% margen (solo equipo)
5. **Cotizacion**: Numeracion automatica, datos de cliente, IVA 15%
6. **Impresion/PDF**: Layout dedicado con `@media print`, logo, tabla, condiciones, firmas
7. **Sincronizacion CSV**: Parser inteligente que maneja el formato de planilla de la empresa

### Comandos

```bash
# Desarrollo
npm install
npm run dev        # Dev server con HMR en http://localhost:5173

# Produccion
npm run build      # Build a dist/
npm run preview    # Preview del build
```

### Estructura de Directorios

```
Cotizador/
├── index (1).html              # Archivo original monolitico
├── index.html                  # HTML de la version modular
├── package.json                # Config NPM
├── vite.config.js              # Config Vite (base: /cotizador/)
├── .env                        # Variables de entorno (gitignored)
├── build_project.py            # Script de migracion Python
├── src/
│   ├── main.js                 # Entry point
│   ├── app.js                  # Logica principal
│   ├── styles.css              # Estilos
│   └── modules/
│       ├── auth.js             # Autenticacion Supabase
│       ├── catalog.js          # Stub
│       ├── quote.js            # Stub
│       └── sync.js             # Stub
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions para GitHub Pages
└── node_modules/               # Dependencias
```

### Dependencias

**Dependencias de desarrollo:**
- `vite` ^5.4.10

**Dependencias de produccion:**
- `@supabase/supabase-js` ^2.110.1

**Dependencias externas (CDN):**
- Google Fonts (Montserrat)

### Notas Importantes

- No hay tests automatizados
- Los modulos en `src/modules/catalog.js`, `quote.js`, `sync.js` son stubs
- El catalogo completo esta embebido como JSON en `app.js`
- Deploy automatico via GitHub Pages al hacer push a `master`
