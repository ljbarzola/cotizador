# AGENTS.md - Guia Tecnica del Proyecto

## Stack Tecnologico

### Lenguajes

- **HTML5** - Estructura y UI
- **CSS3** - Estilos (CSS Custom Properties, Grid, Flexbox, `@media print`)
- **JavaScript (ES6+ / ES Modules)** - Toda la logica de la aplicacion

### Herramientas y Frameworks

| Tecnologia   | Uso                           | Version |
| ------------ | ----------------------------- | ------- |
| Vite         | Dev server y bundler          | ^8.1.5  |
| Supabase JS  | Autenticacion + Base de datos | v2      |
| Google Fonts | Tipografia Montserrat         | -       |

### Base de datos (Supabase)

**Tablas (sincronizadas desde Google Sheets):**

- `profiles` - Perfiles de usuario (id, email, nombre, rol). Trigger auto-create.
- `equipos` - Catalogo de equipos (source_id, categoria, subcategoria, modelo, producto, unidades, costo_unitario, ganancia_flag, instalacion_flag, ultima_act, proveedor, observaciones).
- `materiales` - Catalogo de materiales (source_id, categoria, subcategoria, producto, unidades, costo_unitario, ganancia_flag, instalacion_flag, observaciones).
- `servicios` - Catalogo de servicios (source_id, categoria, subcategoria, servicio, descripcion, costo_mensual, costo_anual, costo_unitario, observaciones).
- `instalaciones` - Servicios de instalación (source_id, categoria, subcategoria, servicio, costo_unitario, observaciones). Tabla independiente, NO es una categoría.
- `saved_quotes` - Cotizaciones guardadas (id, user_id, cot_num, cot_date, client JSONB, margin, productos JSONB, status, updated_at).
- `templates` - Plantillas compartidas (id, name, description, client_type, industry, client JSONB, productos JSONB, ...).
- `quote_sequences` - Secuencia global de cotizaciones (id, last_seq). Genera IDs únicos via RPC `next_quote_seq()`.

**Google Sheet fuente:** `https://docs.google.com/spreadsheets/d/1UDY7vse-NqjQcBYSgsSdS3bT7s-MiZl_w_uaTcCOyUo`

- Pestaña `PRECIOS EQUIPOS BD` → tabla `equipos`
- Pestaña `PRECIOS MATERIALES BD` → tabla `materiales`
- Pestaña `PRECIOS SERVICIOS BD` → tabla `servicios`
- Pestaña `INSTALACIÓN BD` → tabla `instalaciones` (5 columnas, sin header: servicio, costo_unitario, categoria, subcategoria, observaciones)

**RLS (Row Level Security):**

- `profiles`: Los usuarios ven solo su perfil. Admin puede ver todos.
- `equipos/materiales/servicios/instalaciones`: Lectura publica, escritura publica (app).
- `saved_quotes`: Admin ve todas, vendedor solo las suyas.

**Estados de cotizacion:** borrador → enviada → vista → aceptada → rechazada → vencida

### Arquitectura

SPA vanilla sin frameworks de frontend. Arquitectura modular con estado centralizado.

```
Cotizador/
├── index.html                  # HTML principal (modales, topbar, layout)
├── src/
│   ├── main.js                 # Entry point, init de auth
│   ├── app.js                  # Core: cart, render, save, sync, auth, user mgmt, viewer, edit modal (~2363 lineas)
   │   ├── state.js                # Estado compartido + setters + JSDoc (120 lineas)
│   ├── utils.js                # Utilidades: $, fmt, esc, toast, confirm + JSDoc (120 lineas)
│   ├── styles.css              # Estilos (~1150 lineas)
│   ├── lib/
│   │   └── supabase.js         # Cliente Supabase (variables de entorno)
│   └── modules/
│       ├── helpers.js          # Pricing: calcItemPrice, getSupplierMargin, marginBadge + JSDoc (103 lineas)
│       ├── cartCalculations.js # Pure cart logic: calcItemTotals, calcDiscount, calcSubtotal (110 lineas, JSDoc)
│       ├── kits.js             # Kit CRUD + rendering (27 funciones, ~600 lineas, JSDoc)
│       ├── editor.js           # Catalog editor + install editor (20 funciones, 661 lineas, JSDoc) — bulk editor, no se usa desde el visor
│       ├── modals.js           # Product/cart detail, help, templates (17 funciones, 384 lineas, JSDoc)
│       ├── history.js          # Saved quotes, status, new quote (8 funciones, 237 lineas, JSDoc)
│       ├── auth.js             # Login, sesion, perfiles
│       ├── sync.js             # Sync Google Sheets ↔ Supabase (4 tablas)
│       ├── catalog.js          # Stub
│       └── quote.js            # Template CRUD (Supabase-backed)
├── db/
│   ├── migrate_catalog.sql     # Query para insertar 400 productos (legacy)
│   ├── migrate_v3_three_tables.sql  # Schema 3 tablas: equipos/materiales/servicios
│   ├── migrate_v3_1_fix_types.sql   # Fix tipos de datos
│   ├── migrate_v3_2_add_flags.sql   # Agregar ganancia_flag, instalacion_flag
│   ├── reset_all_tables.sql    # Reset completo con schema correcto
│   ├── add_cant_costo_columns.sql  # Agregar cantidad_default y costo_total a equipos/materiales
│   ├── verify_supabase.sql     # Verificacion de tablas
│   ├── next_cot_seq.sql        # Tabla辅助 quote_sequences + RPC next_quote_seq()
│   └── rename_items_to_productos.sql  # Migra columna items→productos en saved_quotes y templates
├── public/
│   ├── content/
│   │   ├── logo-gemeseg-back-white.png   # Logo login
│   │   ├── logo-gemeseg-back-blue.png    # Logo topbar/impresion
│   │   └── logo-gemeseg-back-orange.png  # Logo alternativo
│   ├── sw.js                      # Service worker (offline cache)
│   └── favicon.svg
├── .env                        # Variables de entorno (gitignored)
├── vite.config.js              # Config Vite (base: /)
└── package.json
```

### Funcionalidades Clave

1. **Autenticacion**: Login via Supabase Auth (`signInWithPassword`). Soporta email completo o username corto.
2. **Perfiles**: Tabla `profiles` con trigger auto-create en `auth.users`. Roles: admin / vendedor.
3. **Catalogo desde Google Sheets**: Sincronizacion automatica de 3 pestañas del Google Sheet a tablas Supabase via `sync.js`.
4. **Visor de catalogo**: Modal de solo lectura (todos los usuarios). Busqueda + filtro por subcategoria.
5. **Editor de catalogo**: Todos los usuarios pueden editar. Edicion inline, agregar/eliminar productos, batch save a Supabase. Select de categoría obligatorio para mostrar columnas específicas por tabla.
6. **Carrito**: Agregar productos, cantidades, eliminar, totales con IVA 15%.
7. **Cotizador vs PDF (Cliente)**:
   - **Cotizador (pantalla)** ve: #, Descripción, Und, Costo Unit. (=costo REAL, sin ganancia), Cant, Costo Total (=Costo Unit.×Cant), Ganancia (=margen prov.×Cant, oculta en PDF), PVP (=Costo Total+Ganancia, oculta en PDF), Inst, ✕.
   - **Cliente (PDF)** ve: #, Descripción, Und, Costo Unit. (=priceBeforeIva, con ganancia incluida pero invisible), Cant, Costo Total (=priceBeforeIva×Cant), Inst. PVP y Ganancia ocultos.
   - Valores duales en HTML: `print-hide-col` muestra baseCost en pantalla; `print-only` muestra priceBeforeIva en PDF.
8. **Sistema de precios**: Costo → supplier margin (% editable, default 15%) → IVA 15% → installation margin (global, default 35%). Servicios: costo directo + IVA.
9. **Cotizacion**: Numeracion automatica secuencial global (COT-YYYYMMDD-NNNN, sin reset diario), guardado en Supabase. Secuencia atómica via RPC `next_quote_seq()` en tabla `quote_sequences`.
10. **Historial**: Filtros por cliente, fecha, estado. Dropdown para cambiar estado.
11. **PDF**: Layout print-only con logo, tabla, condiciones, firmas.
12. **Paneles redimensionables**: Divider draggable entre catalogo y cotizacion.
13. **Borrador**: Se guarda automaticamente en localStorage.
14. **Plantillas**: CRUD en Supabase (compartidas entre usuarios). Crear, cargar, vista previa, descargar PDF, eliminar.
15. **Modales custom**: Confirmar accion, guardar plantilla, detalle de producto (reemplazan dialogs nativos del navegador).
16. **Manual de usuario**: Modal con 11 secciones colapsables que explica todas las funcionalidades (servicios de instalación, cargo del asesor, catálogo, etc.).
17. **Descuentos**: Select (Sin descuento / Porcentaje / Valor fijo) + input. Se muestra en totales como "-Descuento (15%)" o "-Descuento $50". Se guarda en la cotización.
18. **Sistema de Kits**: Tabs Productos/Kits en el catálogo. CRUD de kits con nombre + componentes. Kits guardados en Supabase (tabla `kits`). Agregar un kit agrega sus componentes como productos individuales al carrito, editables por separado (qty, instalación, costo técnico, margen). Cada cotización es independiente. Búsqueda de productos en el editor de kits con lista de resultados visible. Separación visual entre kits e productos individuales en la cotización.
19. **Notas opcionales**: Campo de notas adicionales debajo de las condiciones comerciales.
20. **Responsive/Movil**: 3 breakpoints (900px, 768px, 640px). Touch targets 44px, toggles de colapso para catálogo/cotización, grids responsive, modales fullscreen, tarjetas de instalación adaptadas.
21. **Code Splitting**: Bundle dividido en chunks: app + supabase separado. Build optimizado.
22. **Service Worker**: Cache de assets estaticos para modo offline. Network-first con fallback a cache.
23. **Servicios de instalación (tabla independiente y UI en 2 filas)**: Pestaña Instalaciones en el visor de catálogo con sync separado. Editor de instalaciones con dropdowns de categoría/subcategoría poblados desde la DB. El picker de instalaciones (modal) se abre desde 🔧 Ganancia por instalación y muestra servicios del catálogo. Los servicios de instalación agregados se editan con costo custom e individual margin (35% default, editable) y NO llevan IVA. Solo aparecen en la sección de configuración de márgenes, NO en la tabla de detalle de cotización. Maquetación con estructura en 2 filas adaptada para móvil y escritorio.
24. **Cargo del Asesor en Perfil**: Selección/edición de cargo (`profiles.cargo`) desde el menú de usuario que aparece impreso en la firma de la cotización PDF.
25. **Recuperación de Contraseña**: Flujo de restablecimiento de contraseña enviando enlace por correo electrónico a través de Supabase Auth.
26. **Filtro por Vendedor**: Búsqueda y filtrado de cotizaciones en el historial por el nombre del vendedor/asesor creador (`vendor_name`).
27. **Visor de catálogo con edición e interactividad**: El catálogo (modal) tiene 3 pestañas: Productos, Instalaciones, Kits. Cada pestaña muestra una tabla con botones ✏️ (editar) y ✕ (eliminar) lado a lado en cada fila. Botones `[+ Nuevo]` en la barra superior abren modales dedicados (`createProductModal` con selección previa de categoría obligatoria y subcategoría libre, y `createInstallModal` con categoría/subcategoría opcionales). Redimensión de columnas arrastrando bordes. Carga inteligente de datos en modales vía `getProductoDBValue`. Estructura visual de edición agrupada por secciones. Actualización en tiempo real con `setCatalog(updated)` sin recargar pantalla.
28. **Gestión de estado centralizado**: `setCatalog(c)` muta `CATALOG` en lugar en `state.js` para que todos los módulos y listas se refresquen al instante.
29. **Mejoras de Impresión PDF e Interacción de Instalaciones**:
    - **Botón indicador de instalación**: La columna `Inst.` en la tabla de cotización es un botón cuadrado interactivo (`🟩` Verde para requerida / `⬜` Gris para inactiva) que funciona como un flag/indicador visual sin alterar los costos de la fila del producto. Mantiene su color cuadrado en el PDF impreso.
    - **Sección SERVICIOS DE INSTALACIÓN en PDF**: En el PDF impreso del cliente se genera la tabla titulada **SERVICIOS DE INSTALACIÓN** que mapea la sección interna **🔧 Ganancia por instalación** del cotizador, mostrando la lista limpia (`# | Servicio / Descripción | Cant | Precio Total`) con precios públicos al cliente, sin revelar costos internos ni ganancias.
    - **Visualización de Servicios**: Los servicios muestran tanto su Nombre corto (`servicio`) como su Descripción extendida (`descripcion`) formateada en listas tanto en el panel de catálogo como en la tabla de cotización.
    - **Formato de Costo**: Todos los inputs de costo y celdas muestran el prefijo `$` y formato decimal con centavos (`.00`).

### Flujo de precios (confirmado)

- **Servicios**: price = costo_mensual (o costo_anual/12 si mensual=0) + IVA 15%. Sin ganancia, sin instalacion.
- **Equipos/Materiales**: costo → si Ganancia flag=1: +supplier margin (% editable, default 15%) → +IVA 15% (siempre) → si Instalacion flag=1 Y activa: +costo_tecnico + empresa margin (% global, default 35%). NO IVA on installation.
- **Margen por proveedor**: Cada proveedor tiene su propio %. Los productos sin proveedor ("Sin proveedor") tambien tienen un margen individual configurable.
- **Servicios de instalación del catálogo**: Fixed cost from sheet → +individual margin (default 35%, editable per service) → NO IVA. Added as separate line items in cart, ONLY visible in 🔧 Ganancia por instalación section.

### Sync (Google Sheets → Supabase)

- **CSV export URL**: `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}`
- **Parser CSV**: `parseCsv()` maneja campos multi-línea entre comillas, `splitCsvLine()` separa por comas.
- **Header maps**: Normalizan headers (toLowerCase → NFD → quitar tildes → trim) y mapean a campos de DB.
- **Schema detection**: `getTableColumns()` detecta columnas existentes via dummy insert o SELECT *.
- **Filtrado**: `filterRowToColumns()` quita columnas que no existen en la tabla (fallback V3_2_COLUMNS).
- **Comparacion**: `compareRows()` detecta cambios campo por campo y loguea diferencias.
- **Sorting**: Productos ordenados por source_id (natural sort: EQ-0001, EQ-0002, MT-0001, SV-0001, etc.).
- **INSTALACIÓN BD**: Sync separado via `syncInstalacionesOnly()`. Parser posicional (5 columnas sin header): servicio, costo_unitario, categoria, subcategoria, observaciones.

### Comandos

```bash
npm install
npm run dev        # Dev server en http://localhost:5174 (vite.config.js: base /)
npm run build      # Build a dist/
npm run preview    # Preview del build
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier format
npm run format:check # Prettier check
npm run test       # Vitest run
npm run test:watch # Vitest watch mode
```

### Variables de entorno (.env)

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### Notas Importantes

- 175 tests unitarios (sync: 18, helpers: 16, utils: 31, templates: 18, kits: 17, history: 10, auth: 22, editor: 27, cartCalculations: 16)
- Deploy automatico via GitHub Pages al hacer push a `master`
- **NUNCA hacer push sin confirmacion del usuario**
- El catalogo original de 400 productos esta en `db/migrate_catalog.sql` (legacy, reemplazado por sync desde Google Sheets)
- **NUNCA hacer push sin confirmacion del usuario**
- El catalogo original de 400 productos esta en `db/migrate_catalog.sql` (legacy, reemplazado por sync desde Google Sheets)
