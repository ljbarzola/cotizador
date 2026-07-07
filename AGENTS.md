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
  - `drive_config` / `auth_config` - Configuracion de sincronizacion
  - `cot_seq_YYYYMMDD` - Contadores de secuencia de cotizaciones

### Arquitectura

La aplicacion es una SPA (Single Page Application) vanilla sin frameworks de frontend.

**Version original** (`index (1).html`):
- Archivo monolitico de ~2,200 lineas
- HTML + CSS inline + JS inline
- Catalogo embebido como array JSON
- Autenticacion contra Google Sheets (CSV)

**Version modular** (`nuevo-proyecto/`):
- Vite como dev server y bundler
- CSS extraido a `src/styles.css` (908 lineas)
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
cd nuevo-proyecto
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
├── nuevo-proyecto/             # Version modular (Vite)
│   ├── index.html              # HTML con referencias externas
│   ├── package.json            # Config NPM
│   ├── build_project.py        # Script de migracion Python
│   ├── src/
│   │   ├── main.js             # Entry point
│   │   ├── app.js              # Logica principal (930 lineas)
│   │   ├── styles.css          # Estilos (908 lineas)
│   │   └── modules/            # Modulos stub (no implementados)
│   │       ├── auth.js
│   │       ├── catalog.js
│   │       ├── quote.js
│   │       └── sync.js
│   └── node_modules/           # Dependencias
```

### Dependencias

**Dependencias de desarrollo:**
- `vite` ^5.4.10

**Dependencias externas (CDN):**
- `@supabase/supabase-js@2` (autenticacion)
- Google Fonts (Montserrat)

### Notas Importantes

- No hay `.gitignore` - `node_modules/` esta being tracked (recomendado agregarlo)
- No hay tests automatizados
- No hay `vite.config.js` (configuracion default)
- Los modulos en `src/modules/` son stubs vacios - toda la logica esta en `app.js`
- La contrasena de admin esta hardcodeada en el codigo fuente
- El catalogo completo esta embebido como JSON en `app.js`
