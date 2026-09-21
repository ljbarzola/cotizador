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

**Tablas (administradas directamente en Supabase, vía el editor de catálogo de la app):**

- `profiles` - Perfiles de usuario (id, correo, nombre, rol, cargo, telefono). Trigger auto-create.
- `equipos` - Catalogo de equipos (source_id, categoria, subcategoria, modelo, producto, unidades, costo_unitario, ganancia_flag, instalacion_flag, ultima_act, proveedor, observaciones).
- `materiales` - Catalogo de materiales (source_id, categoria, subcategoria, producto, unidades, costo_unitario, ganancia_flag, instalacion_flag, observaciones).
- `servicios` - Catalogo de servicios (source_id, categoria, subcategoria, servicio, descripcion, costo_mensual, costo_anual, costo_unitario, observaciones).
- `instalaciones` - Servicios de instalación (source_id, categoria, subcategoria, servicio, costo_unitario, observaciones). Tabla independiente, NO es una categoría.
- `saved_quotes` - Cotizaciones guardadas (id, user_id, cot_num, cot_date, client JSONB, margin, productos JSONB, status, updated_at).
- `templates` - Plantillas compartidas (id, name, description, client_type, industry, client JSONB, productos JSONB, ...).
- `quote_sequences` - Secuencia global de cotizaciones (id, last_seq). Genera IDs únicos via RPC `next_quote_seq()` (consume/incrementa, solo al guardar de verdad) y `peek_quote_seq()` (solo lectura, para mostrar un número tentativo en pantalla sin gastarlo).

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
│       ├── sync.js             # Lectura de catalogo desde Supabase (equipos/materiales/servicios/instalaciones)
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
│   ├── next_cot_seq.sql        # Tabla auxiliar quote_sequences + RPC next_quote_seq() (consume número real)
│   ├── peek_quote_seq.sql      # RPC peek_quote_seq() de solo lectura (número tentativo, no consume)
│   ├── rename_items_to_productos.sql  # Migra columna items→productos en saved_quotes y templates
│   ├── add_cargo_column.sql           # Agregar columna cargo a profiles
│   ├── add_phone_column.sql           # Agregar columna telefono a profiles
│   └── next_source_seq.sql            # RPC next_source_seq(tabla, prefijo) para sugerir el próximo source_id de equipos/materiales/servicios/instalaciones (reemplaza el cálculo por conteo de items cargados)
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
3. **Catalogo en Supabase**: Equipos, materiales, servicios e instalaciones se administran directamente en Supabase desde el editor de catálogo de la app (altas, bajas y cambios de precio), sin dependencia de fuentes externas.
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
17. **Descuentos**: Select (Sin descuento / Porcentaje / Valor fijo) + input. Se muestra en totales como "Descuento (15%)" con valor "-$XX". El descuento se aplica sobre "Costo base total" (productos + instalaciones sin IVA), y el IVA se calcula sobre el subtotal resultante (costo base - descuento). Se guarda en la cotización. Preview en tiempo real al cambiar márgenes/costos.
18. **Sistema de Kits**: Tabs Productos/Kits en el catálogo. CRUD de kits con nombre + componentes. Kits guardados en Supabase (tabla `kits`). Agregar un kit agrega sus componentes como productos individuales al carrito, editables por separado (qty, instalación, costo técnico, margen). Cada cotización es independiente. Búsqueda de productos en el editor de kits con lista de resultados visible. Separación visual entre kits e productos individuales en la cotización.
19. **Notas opcionales**: Campo de notas adicionales debajo de las condiciones comerciales.
20. **Responsive/Movil**: 3 breakpoints (900px, 768px, 640px). Touch targets 44px, toggles de colapso para catálogo/cotización, grids responsive, modales fullscreen, tarjetas de instalación adaptadas.
21. **Code Splitting**: Bundle dividido en chunks: app + supabase separado. Build optimizado.
22. **Service Worker**: Cache de assets estaticos para modo offline. Network-first con fallback a cache.
23. **Servicios de instalación (tabla independiente y UI en 2 filas)**: Pestaña Instalaciones en el visor de catálogo con sync separado. Editor de instalaciones con dropdowns de categoría/subcategoría poblados desde la DB. El picker de instalaciones (modal) se abre desde 🔧 Ganancia por instalación y muestra servicios del catálogo. Los servicios de instalación agregados se editan con costo custom e individual margin (35% default, editable) y SÍ llevan IVA 15% sobre costo + ganancia. Solo aparecen en la sección de configuración de márgenes, NO en la tabla de detalle de cotización. Se pueden agregar servicios de instalación aunque el carrito esté vacío (sin restricción de mínimo de artículos). Maquetación con estructura en 2 filas adaptada para móvil y escritorio.
24. **Cargo y Teléfono del Asesor en Perfil**: Selección/edición de cargo (`profiles.cargo`) y teléfono (`profiles.telefono`) desde el menú de usuario. El cargo aparece impreso en la firma de la cotización PDF. El teléfono aparece en el encabezado del PDF con valor por defecto `+593 99 897 4909`.
25. **Recuperación de Contraseña**: Flujo de restablecimiento de contraseña enviando enlace por correo electrónico a través de Supabase Auth.
26. **Filtro por Vendedor**: Búsqueda y filtrado de cotizaciones en el historial por el nombre del vendedor/asesor creador (`vendor_name`).
27. **Visor de catálogo con edición e interactividad**: El catálogo (modal) tiene 3 pestañas: Productos, Instalaciones, Kits. Cada pestaña muestra una tabla con botones ✏️ (editar) y ✕ (eliminar) lado a lado en cada fila. Botones `[+ Nuevo]` en la barra superior abren modales dedicados (`createProductModal` con selección previa de categoría obligatoria y subcategoría libre, y `createInstallModal` con categoría/subcategoría opcionales). Redimensión de columnas arrastrando bordes. Carga inteligente de datos en modales vía `getProductoDBValue`. Estructura visual de edición agrupada por secciones. Actualización en tiempo real con `setCatalog(updated)` sin recargar pantalla.
28. **Gestión de estado centralizado**: `setCatalog(c)` muta `CATALOG` en lugar en `state.js` para que todos los módulos y listas se refresquen al instante.
29. **Mejoras de Impresión PDF e Interacción de Instalaciones**:
    - **Botón indicador de instalación**: La columna `Inst.` en la tabla de cotización es un botón cuadrado interactivo (`🟩` Verde para requerida / `⬜` Gris para inactiva) que funciona como un flag/indicador visual sin alterar los costos de la fila del producto. Mantiene su color cuadrado en el PDF impreso.
    - **Sección SERVICIOS DE INSTALACIÓN en PDF**: En el PDF impreso del cliente se genera la tabla titulada **SERVICIOS DE INSTALACIÓN** que mapea la sección interna **🔧 Ganancia por instalación** del cotizador, mostrando la lista limpia (`# | Servicio / Descripción | Cant | Precio Total`) con precios públicos al cliente (sin IVA), sin revelar costos internos ni ganancias.
    - **Cuadro de Totales con fondo azul en PDF**: El cuadro de totales del PDF usa el mismo fondo azul oscuro (`linear-gradient(135deg, #0f172a, #1e1b4b)`) que la versión web, con texto blanco y acentos de colores para legibilidad.
    - **Visualización de Servicios**: Los servicios muestran tanto su Nombre corto (`servicio`) como su Descripción extendida (`descripcion`) formateadas en listas tanto en el panel de catálogo como en la tabla de cotización.
    - **Formato de Costo**: Todos los inputs de costo y celdas muestran el prefijo `$` y formato decimal con centavos (`.00`).
30. **Mejoras de Visor de Catálogo, Selección de Categoría y Edición de Servicios**:
    - **Paginación Inicial**: El catálogo inicia por defecto mostrando 10 resultados por página alineado al selector.
    - **Vistas por Categoría en Visor**: Columnas dinámicas según categoría seleccionada. Para `SERVICIOS` muestra _Categoría | Subcategoría | Nombre | Descripción | Costo Mensual | Costo Anual | Observaciones | Acciones_. `MATERIALES` omite la columna Modelo.
    - **Respeto de Listas Multi-Línea**: Soporte `white-space: pre-line` en celdas y tarjetas para descripciones de servicios con viñetas o saltos de línea.
    - **Edición de Servicios**: Modal de edición mapea correctamente `descriptionExtended` a un campo `<textarea>` amplio y ajustable verticalmente.
    - **Eliminación de Instalaciones**: Corrección de mapeo de IDs (`_id` / `id`) garantizando el borrado atómico en Supabase y refresco inmediato del catálogo.
    - **Edición de Kits**: Dropdowns de componentes estilizados con delimitación de texto y etiquetas limpias `($0.00)`.
    - **Diseño de Barra Superior y Separadores**: Botones de la barra superior uniformes con efecto hover sutil; separadores de kits y productos diferenciados en pantalla e impresión PDF.
    - **Cálculo de Totales en Vista Previa de Plantillas**: Corrección en el cálculo de `grandTotal` en `openTemplatePreview` para incluir el costo total de los servicios de instalación (`totalInstallServicesPvp`), haciendo que el total del modal coincida al 100% con el total del carrito al cargar la plantilla.
    - **Guardar como Plantilla**: Corrección en `saveCurrentAsTemplate()` mapeando correctamente Kits (`isKit`), componentes, servicios de instalación y productos regulares con la clave `productos`, garantizando su almacenamiento en Supabase y restauración completa al importar o previsualizar la plantilla.
    - **Cálculo de Totales en Historial**: `quoteTotal(q)` calcula de forma precisa el total general incluyendo IVA (15%), costo y margen de instalaciones de productos, servicios de instalación del catálogo y aplicando el descuento registrado.
    - **Validación y Límites de Descuentos**: `updateDiscount()` y `calcDiscount()` aseguran que el descuento en porcentaje jamás supere el 100% y que el descuento de valor fijo no exceda el subtotal general de la cotización, mostrando una advertencia interactiva al usuario.
31. **Sesión, generación de IDs y número de cotización (correcciones)**:
    - **Manejo de sesión expirada**: `initSessionWatcher()` (`modules/auth.js`, iniciado desde `main.js`) escucha `supabase.auth.onAuthStateChange` y, si la sesión se cae mientras la app está abierta (JWT/refresh token inválido), limpia la sesión local y recarga a la pantalla de login con un mensaje consistente, en vez de que cada pantalla falle por su cuenta con el error crudo de Supabase. `validateSession()` solo confía en la sesión local guardada (ventana de 7 días) ante un error de **red** real, no ante una sesión efectivamente inválida. Los guardados críticos (cotización, producto, instalación, editor de catálogo) usan `isSessionExpiredError()`/`showSessionExpiredToast()` (`utils.js`) para mostrar un mensaje claro de reautenticación.
    - **ID sugerido de productos/servicios/instalaciones**: en vez de contar los ítems cargados en memoria (`.length + 1`, que repetía códigos si había ítems borrados o filtrados), el código sugerido se pide vía RPC `next_source_seq(tabla, prefijo)` (`db/next_source_seq.sql`), que calcula el máximo real vigente en `source_id`. Con fallback local si el RPC no está disponible. Afecta creación individual (`app.js`) y el editor/importación CSV de instalaciones (`editor.js`, `sync.js`).
    - **Número de cotización tentativo vs. confirmado**: al abrir/recargar la pantalla o pulsar "Nueva cotización" ya NO se consume un número real de `quote_sequences` — se usa `previewNextCotNumber()` (RPC `peek_quote_seq()`, solo lectura) para mostrar un número tentativo. Solo `saveQuote()` pide el número real y definitivo (`generateNextCotNumberFromDB()` / `next_quote_seq()`), controlado por el flag `cotNumIsTentative` en `state.js`. Antes de este fix, cada recarga sin guardar quemaba un número real.
    - **Notificaciones e impresión**: el toast (`#toast`) se oculta en `@media print` para que no aparezca superpuesto en el PDF si estaba visible al imprimir. El proveedor de cada ítem (`item.supplier`, junto al código del producto) ahora tiene su propia clase `.supplier-line`, oculta solo en `@media print` — en pantalla se sigue mostrando igual, pero no se filtra al cliente en el documento impreso.
    - **Cotizaciones guardadas ya no se corrompen al borrar un producto del catálogo**: cada ítem del carrito (individual o componente de kit) solo guardaba `catalogIdx` — su **posición** en el catálogo al momento de guardar, no un identificador estable. Como el catálogo se reordena por `source_id` en cada carga, borrar CUALQUIER producto corre una posición hacia atrás a todos los que van después, y una cotización guardada antigua podía terminar mostrando/calculando silenciosamente OTRO producto al reabrirse. `buildQuoteData()` ahora guarda también `sourceId` por ítem (`snapshotCartForSave()`, `app.js`), y `loadSaved()`/`quoteTotal()` (`history.js`) resuelven primero por `sourceId` contra el catálogo actual (via `resolveTemplateProductos()`, reutilizado de `quote.js`), usando `catalogIdx` solo como respaldo para cotizaciones guardadas ANTES de este fix (que no tienen `sourceId`). Nota: las cotizaciones ya guardadas antes de este fix no se migran ni se tocan — siguen dependiendo de `catalogIdx` tal cual, así que borrar un producto del catálogo puede seguir afectando su visualización si ya fueron guardadas; el fix protege las que se guarden de ahora en adelante.

### Flujo de precios (confirmado)

- **Servicios**: price = costo_mensual (o costo_anual/12 si mensual=0) + IVA 15%. Sin ganancia, sin instalacion.
- **Equipos/Materiales**: costo → si Ganancia flag=1: +supplier margin (% editable, default 15%) → +IVA 15% (siempre) → si Instalacion flag=1 Y activa: +costo_tecnico + empresa margin (% global, default 35%). NO IVA on equipment installation.
- **Margen por proveedor**: Cada proveedor tiene su propio %. Los productos sin proveedor ("Sin proveedor") tambien tienen un margen individual configurable.
- **Servicios de instalación del catálogo**: Fixed cost desde Supabase → +individual margin (default 35%, editable per service) → +IVA 15%. Added as separate line items in cart, ONLY visible in 🔧 Ganancia por instalación section.

### Catálogo (Supabase)

- `sync.js` (nombre legado del módulo) expone solo lecturas: `loadAllProducts()` (equipos/materiales/servicios), `loadAllInstalaciones()`, `normalizeCategory()`, `getCategoryHierarchy()`.
- Altas, bajas y cambios de precio se hacen desde el editor de catálogo de la app (`editor.js`), que escribe directo a Supabase — no hay fuente externa ni sincronización.
- **Sorting**: Productos ordenados por source_id (natural sort: EQ-0001, EQ-0002, MT-0001, SV-0001, etc.).

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

- 166 tests unitarios (helpers: 16, utils: 31, templates: 18, kits: 17, history: 13, auth: 22, editor: 27, cartCalculations: 16, catalog-crud-sync: 6)
- **Deploy**: build de imagen Docker (`Dockerfile`, Node 20 + Nginx) vía **Google Cloud Build** (`cloudbuild.yaml`) y despliegue al servicio **Cloud Run** `cotizador` (region `us-central1`), disparado por un Cloud Build Trigger sobre push a `master`. Las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` se inyectan como `--build-arg` en el paso de build. **Ya NO se despliega vía GitHub Pages** — el workflow `.github/workflows/deploy.yml` que hacía eso se eliminó el 2026-07-30 (commit `b32a344`, "Eliminar flujo de GitHub Pages"); solo queda `.github/workflows/backup.yml` (respaldo programado de Supabase), que es un job no relacionado con el deploy.
- **NUNCA hacer push sin confirmacion del usuario**
- El catalogo original de 400 productos esta en `db/migrate_catalog.sql` (legacy, reemplazado por sync desde Google Sheets)
- **NUNCA hacer push sin confirmacion del usuario**
- El catalogo original de 400 productos esta en `db/migrate_catalog.sql` (legacy, reemplazado por sync desde Google Sheets)
