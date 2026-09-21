# Cotizador GEMESEG Tecnologia

Herramienta web para crear cotizaciones profesionales de productos y servicios de seguridad y tecnología.

## ¿Qué es este sistema?

Aplicación web para el equipo de ventas de GEMESEG. Permite buscar productos en el catálogo, armar cotizaciones, calcular precios con IVA, administrar servicios de instalación y generar PDFs oficiales listos para entregar al cliente. Los datos se almacenan en Supabase (base de datos en la nube).

## Funcionalidades Clave

- **Login seguro y Recuperación de Contraseña**: Autenticación con Supabase Auth (`signInWithPassword`) y flujo de recuperación de clave por correo.
- **Catálogo en Supabase (4 tablas)**: `equipos`, `materiales`, `servicios` e `instalaciones`, administradas directamente desde el visor/editor de catálogo de la app.
- **Visor de Catálogo Interactivo**: 3 pestañas (Productos, Instalaciones, Kits) con edición inline, eliminación, creación de productos/instalaciones y redimensión de columnas.
- **Servicios de Instalación**: Pestaña dedicada y picker de servicios de instalación con costo configurable por ítem, margen editable (35% por defecto) y sin cobro de IVA.
- **Sistema de Precios Dinámico**: Costo base → +Margen Proveedor (editable, default 15%) → +IVA 15% → +Servicios de Instalación sin IVA.
- **Sistema de Kits**: CRUD completo de Kits compartidos en Supabase. Al agregar un kit, se cargan sus componentes como ítems independientes en la cotización.
- **Carrito y Cotizador**: Gestión de productos, cantidades, márgenes individuales y descuentos globales (porcentaje o valor fijo).
- **Cargo Personalizado de Perfil**: Menú de usuario con opción "✏️ Mi cargo" para definir el cargo comercial que aparece en la firma del PDF.
- **Numeración Secuencial de Cotización**: Generación de números secuenciales formateados (`COT-YYYYMMDD-0001`).
- **Guardado en la Nube e Historial**: Cotizaciones guardadas en Supabase con RLS, filtrado por cliente, vendedor y estado.
- **Plantillas Compartidas**: Almacenamiento e importación de plantillas en Supabase con vista previa y descarga directa de PDF.
- **Separación Confidencial (Pantalla vs PDF)**: Ocultamiento total de costos bases, márgenes de ganancia y proveedor de cada ítem en el PDF del cliente.
- **Diseño Responsive y Adaptado**: Maquetación optimizada para móviles y escritorio en tarjetas de instalación, tablas y modales.
- **Borrador Automático**: Respaldo continuo en localStorage.

## ¿Cómo se usa?

1. Abrir la aplicación en el navegador.
2. Iniciar sesión con usuario y clave (o usar la opción de recuperación de clave).
3. Buscar y agregar productos, kits o servicios de instalación a la oferta.
4. Completar los datos obligatorios del cliente (Razón Social, RUC/Cédula, Teléfono, Email).
5. Configurar márgenes o descuentos según aplique.
6. Guardar cotización en la nube, usar como plantilla o imprimir el PDF comercial.

## Stack Técnico

- **Frontend**: HTML5 + CSS3 (Grid/Flexbox/Print) + JavaScript ES6+ (SPA Vanilla)
- **Bundler**: Vite
- **Base de Datos**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: Google Cloud Run (imagen Docker/Nginx, build vía Google Cloud Build)

## Desarrollo Local

```bash
npm install
npm run dev        # Dev server en http://localhost:5174/
npm run test       # Vitest suite de pruebas unitarias
npm run build      # Compilación para producción
```

## Despliegue

Automático vía Google Cloud Build (`cloudbuild.yaml`) al hacer push a la rama `master`: construye la imagen Docker (`Dockerfile`) y actualiza el servicio de Cloud Run `cotizador`.
