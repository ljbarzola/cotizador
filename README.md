# Cotizador GEMESEG Tecnologia

Herramienta web para crear cotizaciones profesionales de productos y servicios de seguridad y tecnologia.

## Que es este sistema?

Aplicacion web para el equipo de ventas de GEMESEG. Permite buscar productos, armar cotizaciones, calcular precios con IVA, y generar PDFs listos para entregar al cliente. Los datos se almacenan en Supabase (base de datos en la nube).

## Funcionalidades

- **Login seguro**: Autenticacion con Supabase Auth. Usuarios: admin y vendedor.
- **Catalogo desde base de datos**: Productos cargados en Supabase, con busqueda por codigo/descripcion y filtro por categorias.
- **Visor de catalogo**: Tabla de solo lectura visible para todos los usuarios (boton "Catalogo" en la barra superior).
- **Editor de catalogo**: Solo administradores pueden editar, agregar o eliminar productos (desde el dropdown de usuario).
- **Doble esquema de precios**: Precio con instalacion (35%) o solo equipo (15%).
- **Carrito de cotizacion**: Agregar productos, cantidades, eliminar items, totales con IVA 15%.
- **Guardado en la nube**: Cotizaciones se guardan en Supabase (RLS: admin ve todo, vendedor solo lo suyo).
- **Historial de cotizaciones**: Filtros por cliente, fecha y estado. Cambio de estado con dropdown.
- **Estados de cotizacion**: Borrador, Enviada, Vista, Aceptada, Rechazada, Vencida.
- **PDF profesional**: Logo GEMESEG, datos del cliente, tabla de productos, condiciones comerciales, firmas.
- **Borrador automatico**: Se guarda en localStorage mientras se edita.
- **Paneles redimensionables**: Divider draggable entre catalogo y cotizacion.

## Como se usa?

1. Abrir la aplicacion en el navegador
2. Iniciar sesion con usuario y clave (ej: `sistemas@gemeseg.com`)
3. Buscar y agregar productos al carrito
4. Completar datos del cliente
5. Seleccionar modalidad de venta (con/sin instalacion)
6. Guardar cotizacion o imprimir como PDF

## Stack tecnico

- **Frontend**: HTML5 + CSS3 + JavaScript ES6+ (SPA vanilla)
- **Bundler**: Vite
- **Base de datos**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: GitHub Pages (deploy automatico)

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173
```

## Despliegue

Automatico via GitHub Pages al hacer push a la rama `master`.
