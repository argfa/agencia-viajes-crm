# 🌴 Agencia de Viajes Beach Camp - CRM Hub

Este proyecto es un **CRM (Customer Relationship Management)** diseñado a medida para controlar y centralizar las ventas, reservas, exportaciones y cobros de la agencia de viajes Beach Camp.

## 🚀 Tecnologías Core

- **Next.js 16+ (App Router):** Motor principal impulsado por Turbopack en frontend y backend.
- **Base de Datos (SQLite + Prisma ORM):** Manejo robusto e íntegro de relaciones contables locales.
- **Autenticación (JWT & Bcrypt):** Conexiones de rutas fuertemente validadas y contraseñas ilegibles.
- **PM2:** Gestor principal de clústers para maximización de recursos en la versión de Producción Ubuntu.
- **Librerías Extra:** `xlsx` (Excel), `jspdf` y `jspdf-autotable` (PDFs y recibos profesionales).

---

## 🔒 Características de Seguridad (Enterprise)
1. **Defensa Anti-BFCache & Navegación Ciega:** Interceptores avanzados sobre `window.history` (`popstate` / `pageshow`) para prohibir que sesiones muertas reaparezcan al abusar del botón "Atrás/Adelante" del navegador.
2. **Despliegues Blindados:** Los recibos PDF y el procesado Excel previenen la ejecución estéril asegurando flujos con datos reales. Todo input form evalúa paridad monetaria para liberar el acceso a la base de datos central.

---

## 💻 Entorno de Desarrollo (Local)

Para configurar e iniciar temporalmente este proyecto en tu entorno local:

1. Instala las paqueterías Node:
   ```bash
   npm install
   ```
2. Recrea el motor Prisma frente al archivo base (`.env` requerido para la URL SQLite):
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

Abre [http://localhost:3000](http://localhost:3000) en el navegador donde la capa React se mantendrá en actualización en vivo (Hot-Reload).

---

## 🛠 Herramientas del Administrador Técnico (Sysadmin)

El sistema soporta modificaciones en vivo al núcleo nativo de base de datos pasando por alto la UI del frente. Está documentado bajo la etiqueta Sysadmin.
Para activar **Prisma Studio**:
```bash
npm run db:admin
```
*(Y visita el puerto 5555 según especifica el manual).*  
Consulta **`SYSADMIN_MANUAL.md`** para guía de inyecciones y exclusiones técnicas en base de datos.

---

## 🏭 Producción (Servidores Linux/Ubuntu)

El proyecto viene provilegiado con un ecosistema preparado (`ecosystem.config.js`) y un script unificado de despliegue automatizado.
- Nunca comprometas el script `.env` públicamente.
- Ejecutar compilación de metales: `npm run build`
- Invocar PM2 en el dominio: `pm2 start ecosystem.config.js --env production`

Consulta **`PROJECT_RULES.md`** para estandarización de códigos, convenciones de pull requests y directrices operativas sobre variables de color (`globals.css`) e intercepción SSR (`proxy.js`).
