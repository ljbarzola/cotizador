# Cotizador GEMESEG Tecnologia

Herramienta web para crear cotizaciones profesionales de productos y servicios de seguridad y tecnologia.

## Que es este sistema?

Es una aplicacion que permite al equipo de ventas de GEMESEG generar cotizaciones rapida y sencillamente. Desde una sola pantalla se puede buscar productos, armar una cotizacion, calcular precios con IVA, y generar un PDF listo para entregar al cliente.

## Funcionalidades principales

- **Busqueda de productos**: Catalogo con cientos de productos de seguridad (camaras Hikvision, DVRs, NVRs, accesorios, servicios de instalacion) con busqueda por codigo o descripcion.
- **Doble esquema de precios**: Precio con instalacion (margen 35%) o solo equipo (margen 15%), segun el tipo de venta.
- **Cotizacion automatica**: Genera numeros de cotizacionsecuenciales (COT-YYYYMMDD-NNN) con fecha del dia.
- **Calculo de IVA**: Calculo automatico del 15% de IVA en todos los items.
- **PDF profesional**: Genera un documento impreso con logo de la empresa, datos del cliente, tabla de productos, condiciones comerciales y espacios de firma.
- **Guardado local**: Las cotizaciones se guardan en el navegador para consultarlo despues.
- **Sincronizacion de catalogo**: Se puede actualizar el catalogo desde Google Sheets o subiendo un archivo CSV.

## Como se usa?

1. Abrir la aplicacion en el navegador
2. Iniciar sesion con usuario y clave autorizados
3. Buscar y agregar productos al carrito
4. Completar datos del cliente
5. Imprimir o guardar la cotizacion

## Archivos del proyecto

| Archivo | Descripcion |
|---------|-------------|
| `index (1).html` | Archivo original completo (HTML + CSS + JS en un solo archivo) |
| `nuevo-proyecto/` | Version modular en progreso (Vite + ES Modules) |

## Despliegue

La aplicacion se puede-hosted gratis en [Netlify](https://app.netlify.com/drop) simplemente arrastrando el archivo HTML.
