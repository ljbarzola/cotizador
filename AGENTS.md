# AGENTS.md - Guia Tecnica del Proyecto

## Stack Tecnologico

### Lenguajes
- **HTML5** - Estructura y UI
- **CSS3** - Estilos (CSS Custom Properties, Grid, Flexbox, `@media print`)
- **JavaScript (ES6+ / ES Modules)** - Toda la logica de la aplicacion

### Herramientas y Frameworks

| Tecnologia | Uso | Version |
|---|---|---|
| Vite | Dev server y bundler | ^5.4.10 |
| Supabase JS | Autenticacion + Base de datos | v2 |
| Google Fonts | Tipografia Montserrat | - |

### Base de datos (Supabase)

**Tablas (sincronizadas desde Google Sheets):**
- `profiles` - Perfiles de usuario (id, email, nombre, rol). Trigger auto-create.
- `equipos` - Catalogo de equipos (source_id, categoria, subcategoria, modelo, producto, unidades, costo_unitario, ganancia_flag, instalacion_flag, ultima_act, proveedor, observaciones).
- `materiales` - Catalogo de materiales (source_id, categoria, subcategoria, producto, unidades, costo_unitario, ganancia_flag, instalacion_flag, observaciones).
- `servicios` - Catalogo de servicios (source_id, categoria, subcategoria, servicio, descripcion, costo_mensual, costo_anual, costo_unitario, observaciones).
- `saved_quotes` - Cotizaciones guardadas (id, user_id, cot_num, cot_date, client JSONB, margin, items JSONB, status, updated_at).

**Google Sheet fuente:** `https://docs.google.com/spreadsheets/d/1UDY7vse-NqjQcBYSgsSdS3bT7s-MiZl_w_uaTcCOyUo`
- Pestaña `PRECIOS EQUIPOS BD` → tabla `equipos`
- Pestaña `PRECIOS MATERIALES BD` → tabla `materiales`
- Pestaña `PRECIOS SERVICIOS BD` → tabla `servicios`

**RLS (Row Level Security):**
- `profiles`: Los usuarios ven solo su perfil. Admin puede ver todos.
- `equipos/materiales/servicios`: Lectura publica, escritura solo admin.
- `saved_quotes`: Admin ve todas, vendedor solo las suyas.

**Estados de cotizacion:** borrador → enviada → vista → aceptada → rechazada → vencida

### Arquitectura

SPA vanilla sin frameworks de frontend.

```
Cotizador/
├── index.html                  # HTML principal (modales, topbar, layout)
├── src/
│   ├── main.js                 # Entry point, init de auth
│   ├── app.js                  # Logica principal (~1200 lineas)
│   ├── styles.css              # Estilos (~1150 lineas)
│   ├── lib/
│   │   └── supabase.js         # Cliente Supabase (variables de entorno)
│   └── modules/
│       ├── auth.js             # Login, sesion, perfiles
│       ├── sync.js             # Sync Google Sheets ↔ Supabase (3 tablas)
│       ├── catalog.js          # Stub
│       └── quote.js            # Stub
├── db/
│   ├── migrate_catalog.sql     # Query para insertar 400 productos (legacy)
│   ├── migrate_v3_three_tables.sql  # Schema 3 tablas: equipos/materiales/servicios
│   ├── migrate_v3_1_fix_types.sql   # Fix tipos de datos
│   ├── migrate_v3_2_add_flags.sql   # Agregar ganancia_flag, instalacion_flag
│   ├── reset_all_tables.sql    # Reset completo con schema correcto
│   └── verify_supabase.sql     # Verificacion de tablas
├── public/
│   ├── content/
│   │   ├── logo-gemeseg-back-white.png   # Logo login
│   │   ├── logo-gemeseg-back-blue.png    # Logo topbar/impresion
│   │   └── logo-gemeseg-back-orange.png  # Logo alternativo
│   └── favicon.svg
├── .env                        # Variables de entorno (gitignored)
├── vite.config.js              # Config Vite (base: /cotizador/)
└── package.json
```

### Funcionalidades Clave

1. **Autenticacion**: Login via Supabase Auth (`signInWithPassword`). Soporta email completo o username corto.
2. **Perfiles**: Tabla `profiles` con trigger auto-create en `auth.users`. Roles: admin / vendedor.
3. **Catalogo desde Google Sheets**: Sincronizacion automatica de 3 pestañas del Google Sheet a tablas Supabase via `sync.js`.
4. **Visor de catalogo**: Modal de solo lectura (todos los usuarios). Busqueda + filtro por subcategoria.
5. **Editor de catalogo**: Solo admin. Edicion inline, agregar/eliminar productos, batch save a Supabase.
6. **Carrito**: Agregar items, cantidades, eliminar, totales con IVA 15%.
7. **Sistema de precios**: Costo → supplier margin (% editable, default 35%) → IVA 15% → installation margin (global, default 35%). Servicios: costo directo + IVA.
8. **Cotizacion**: Numeracion automatica (COT-YYYYMMDD-NNN), guardado en Supabase.
9. **Historial**: Filtros por cliente, fecha, estado. Dropdown para cambiar estado.
10. **PDF**: Layout print-only con logo, tabla, condiciones, firmas.
11. **Paneles redimensionables**: Divider draggable entre catalogo y cotizacion.
12. **Borrador**: Se guarda automaticamente en localStorage.

### Flujo de precios (confirmado)

- **Servicios**: price = costo_mensual (o costo_anual/12 si mensual=0) + IVA 15%. Sin ganancia, sin instalacion.
- **Equipos/Materiales**: costo → si Ganancia flag=1: +supplier margin (% editable, default 35%) → +IVA 15% (siempre) → si Instalacion flag=1 Y activa: +costo_tecnico + empresa margin (% global, default 35%). NO IVA on installation.

### Sync (Google Sheets → Supabase)

- **CSV export URL**: `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}`
- **Parser CSV**: `parseCsv()` maneja campos multi-línea entre comillas, `splitCsvLine()` separa por comas.
- **Header maps**: Normalizan headers (toLowerCase → NFD → quitar tildes → trim) y mapean a campos de DB.
- **Schema detection**: `getTableColumns()` detecta columnas existentes via dummy insert o SELECT *.
- **Filtrado**: `filterRowToColumns()` quita columnas que no existen en la tabla (fallback V3_2_COLUMNS).
- **Comparacion**: `compareRows()` detecta cambios campo por campo y loguea diferencias.
- **Sorting**: Items ordenados por source_id (natural sort: EQ-0001, EQ-0002, MT-0001, SV-0001, etc.).

### Comandos

```bash
npm install
npm run dev        # Dev server en http://localhost:5174 (vite.config.js: base /cotizador/)
npm run build      # Build a dist/
npm run preview    # Preview del build
```

### Variables de entorno (.env)

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### Notas Importantes

- No hay tests automatizados
- Deploy automatico via GitHub Pages al hacer push a `master`
- **NUNCA hacer push sin confirmacion del usuario**
- El catalogo original de 400 productos esta en `db/migrate_catalog.sql` (legacy, reemplazado por sync desde Google Sheets)
