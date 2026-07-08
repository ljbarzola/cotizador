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

**Tablas:**
- `profiles` - Perfiles de usuario (id, email, nombre, rol). Se crea automaticamente al registrar usuario via trigger.
- `products` - Catalogo de productos (code, category, description, cost, pvp35, pvp15, last_update, days_old, supplier, is_service, unit).
- `saved_quotes` - Cotizaciones guardadas (id, user_id, cot_num, cot_date, client JSONB, margin, items JSONB, status, updated_at).

**RLS (Row Level Security):**
- `profiles`: Los usuarios ven solo su perfil. Admin puede ver todos.
- `products`: Lectura publica, escritura solo admin.
- `saved_quotes`: Admin ve todas, vendedor solo las suyas.

**Estados de cotizacion:** borrador → enviada → vista → aceptada → rechazada → vencida

### Arquitectura

SPA vanilla sin frameworks de frontend.

```
Cotizador/
├── index.html                  # HTML principal (modales, topbar, layout)
├── src/
│   ├── main.js                 # Entry point, init de auth
│   ├── app.js                  # Logica principal (~985 lineas)
│   ├── styles.css              # Estilos (~1150 lineas)
│   ├── lib/
│   │   └── supabase.js         # Cliente Supabase (variables de entorno)
│   └── modules/
│       └── auth.js             # Login, sesion, perfiles
├── db/
│   ├── migrate_catalog.sql     # Query para insertar 400 productos
│   ├── create_saved_quotes.sql # Tabla de cotizaciones + RLS
│   └── add_quote_status.sql    # Migracion: agregar columna status
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
3. **Catalogo**: Productos en tabla `products` de Supabase. Carga al iniciar, fallback a localStorage.
4. **Visor de catalogo**: Modal de solo lectura (todos los usuarios). Busqueda + filtro por categoria.
5. **Editor de catalogo**: Solo admin. Edicion inline, agregar/eliminar productos, batch save a Supabase.
6. **Carrito**: Agregar items, cantidades, eliminar, totales con IVA 15%.
7. **Modalidad**: 35% margen (con instalacion) vs 15% (solo equipo).
8. **Cotizacion**: Numeracion automatica (COT-YYYYMMDD-NNN), guardado en Supabase.
9. **Historial**: Filtros por cliente, fecha, estado. Dropdown para cambiar estado.
10. **PDF**: Layout print-only con logo, tabla, condiciones, firmas.
11. **Paneles redimensionables**: Divider draggable entre catalogo y cotizacion.
12. **Borrador**: Se guarda automaticamente en localStorage.

### Comandos

```bash
npm install
npm run dev        # Dev server en http://localhost:5173
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
- Los modulos en `src/modules/catalog.js`, `quote.js`, `sync.js` son stubs (funcionalidad esta en `app.js`)
- El catalogo original de 400 productos esta en `db/migrate_catalog.sql`
- Deploy automatico via GitHub Pages al hacer push a `master`
- **NUNCA hacer push sin confirmacion del usuario**
