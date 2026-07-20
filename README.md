# Cotizador GEMESEG Tecnologia

Herramienta web para crear cotizaciones profesionales de productos y servicios de seguridad y tecnologia.

## Que es este sistema?

Aplicacion web para el equipo de ventas de GEMESEG. Permite buscar productos en un catalogo sincronizado desde Google Sheets, armar cotizaciones, calcular precios con IVA, y generar PDFs listos para entregar al cliente. Los datos se almacenan en Supabase (base de datos en la nube).

## Funcionalidades

- **Login seguro**: Autenticacion con Supabase Auth. Usuarios: admin y vendedor.
- **Catalogo desde Google Sheets**: 3 pestanas del Google Sheet se sincronizan automaticamente a 3 tablas Supabase (equipos, materiales, servicios).
- **Visor de catalogo**: Tabla de solo lectura visible para todos los usuarios, con busqueda y filtro por subcategoria.
- **Editor de catalogo**: Solo administradores pueden editar, agregar o eliminar productos.
- **Sistema de precios dinamico**: Margen de proveedor por producto, margen de instalacion global, IVA 15%.
- **Carrito de cotizacion**: Agregar productos, cantidades, eliminar items, configurar margen por item.
- **Guardado en la nube**: Cotizaciones se guardan en Supabase (RLS: admin ve todo, vendedor solo lo suyo).
- **Historial de cotizaciones**: Filtros por cliente, fecha y estado. Cambio de estado con dropdown.
- **Estados de cotizacion**: Borrador, Enviada, Vista, Aceptada, Rechazada, Vencida.
- **PDF profesional**: Logo GEMESEG, datos del cliente, tabla de productos, condiciones comerciales, firmas.
- **Borrador automatico**: Se guarda en localStorage mientras se edita.
- **Paneles redimensionables**: Divider draggable entre catalogo y cotizacion.

## Como se usa?

1. Abrir la aplicacion en el navegador
2. Iniciar sesion con usuario y clave (ej: `sistemas@gemeseg.com`)
3. Sincronizar catalogo desde Google Sheets (boton de refresh)
4. Buscar y agregar productos al carrito
5. Completar datos del cliente
6. Seleccionar modalidad de venta (con/sin instalacion)
7. Guardar cotizacion o imprimir como PDF

## Stack tecnico

- **Frontend**: HTML5 + CSS3 + JavaScript ES6+ (SPA vanilla)
- **Bundler**: Vite
- **Base de datos**: Supabase (PostgreSQL + Auth + RLS)
- **Datos**: Google Sheets como fuente, sincronizados via CSV export
- **Hosting**: GitHub Pages (deploy automatico)

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5174/cotizador/
```

## Despliegue

Automatico via GitHub Pages al hacer push a la rama `master`.
