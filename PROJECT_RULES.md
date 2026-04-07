# 🏖️ Agencia de Viajes Beach Camp - Reglas y Directrices del Proyecto

Este documento consolida las reglas de arquitectura, diseño base, y buenas prácticas que se deben respetar de forma estricta al trabajar o proponer cambios en el proyecto.

---

## 1. Stack Tecnológico (Core)

- **Framework:** Next.js (App Router). No se permite el uso de convenciones del antiguo enrutador tipo "Pages" (ex: `getServerSideProps`).
- **ORM y Base de Datos:** Prisma ORM, enlazado actualmente a una base de datos local embebida **SQLite** (`dev.db`). No agregar dependencias de base de datos extra sin justificación.
- **Librerías de Exportación:** Se utilizan explícitamente `jspdf` / `jspdf-autotable` para boletas/recibos en PDF, y la librería `xlsx` para los cortes de caja y matrices de clientes.
- **Autenticación:** Tokens firmados usando `jose` y credenciales encriptadas con `bcryptjs`. Las rutas protegidas se manejan a nivel de Layout o Middleware (ver `proxy.js` dependiendo de la estructura).

## 2. Directrices de UI/UX y Sistema de Diseño (CSS)

- **Estética Predominante:** Diseño "Glassmorphism" con tarjetas translúcidas (`.glass-card`), desenfoque (`backdrop-filter`) y sombras sutiles.
- **Sistema de Colores y Tokens:** Están definidos estrictamente en `src/app/globals.css`. Todo elemento nuevo **debe usar estas variables** y no hardcodear colores genéricos:
  - `--primary`: Deep Teal (`#094553`)
  - `--secondary`: Cyan (`#1ab5c4`)
  - `--accent`: Sunset Orange (`#f15d22`)
  - `--success`: Verde para pagos limpios (`#2d6a4f`)
  - `--warning`: Naranja para alertas (`#fba11b`)
- **Estilos:** Utilizar las clases CSS definidas en `globals.css` como `.btn`, `.btn-primary`, `.input-group`, `.glass-card`.
- **Formularios Dinámicos:** Evita obligar al usuario a recargar la página. Usa los hooks nativos de react (`useState`, `useEffect`) y haz cálculos matemáticos preventivos (ver alerta de deudas discordantes en el *dashboard*).

## 3. Directrices de Lógica de Negocios y Flujos

### 3.1 Portal de Agentes (Login y Registro)
- Forzar la estandarización de inputs: El nombre siempre se guardará en MAYÚSCULAS.
- Las fechas en el sistema deben seguir la convención e input mask **DD/MM/YYYY** predeterminadas en el proyecto. No usar inputs genéricos tipo `<input type="date">` si desentonan con el diseño.
- Requisitos estrictos: Validar siempre coincidencia de contraseñas.

### 3.2 Dashboard Comercial (Reservas)
- Existe una relación de `1` a `N` entre Titular (ClientRecord) y Acompañantes. Los acompañantes se guardan bajo el control numérico del campo `cantidad_pax`.
- Es fundamental mantener la coherencia financiera: **Restante por Pagar = Monto Total - Reserva Inicial - Abonos**.
- Ante una divergencia manual de montos, el sistema levanta una "Vigilante Alert". Todo cambio contable en la interfaz debe mantener la opción de corrección automática (`Autocorregir`).
- **Modalidades de Pagos:** Las reservas pueden tratarse como "Pago Completo" o en partes. Todas las deudas pre-existentes deben saldarse a través del mecanismo modal de **Abonos**. Cada abono generará una constancia `Receipt` automática.
- **Seguridad Preventiva en Formularios y Botones:** Las acciones de alto riesgo (ej. guardar registro, o exportaciones PDF/Excel) **deben bloquearse físicamente en la interfaz (atributo `disabled` y diseño atenuado opaco)** si la información base está incompleta, si las tablas de clientes están vacías, o si falta capturar un dato vital numérico o asociativo.

## 4. Reglas del Código / Criterios de Modificación (Para Agentes IA)

1. **Prioridad al Enfoque API de Next.js:** Toda interacción con Prisma (`fetchClients`, `fetchDestinos`, `login`) debe enrutarse por llamadas HTTPS de Node (ej. `fetch('/api/clients')`). Mantén la lógica robusta separada en `src/app/api/...`.
2. **Client Components:** Las vistas `page.js` son explícitamentes "Client Components" (lidian con validaciones UI, estados, XLSX y PDFs en el explorador). Todas deben iniciar con la directiva `'use client'`.
3. **No romper dependencias cruzadas:** Si se actualiza el esquema en `prisma/schema.prisma`, es obligatorio correr `npx prisma db push` o un proceso análogo (que respete las directrices establecidas).
4. **Respetar el diseño Responsive:** Todos los formularios deben usar `display: grid` y la lógica de envoltura (`flex-wrap: wrap`) configurada originariamente en la hoja de estilos global.
5. **Idioma:** Todos los textos, comentarios y nombres de variable genéricas deben priorizar el marco semántico en Español (Ej. `monto_total`, `restante_por_pagar`, `Vendedor`), ya que es un requerimiento regional del cliente.
6. **Protección de Rutas (Middleware Deprecated y Tácticas Anti-BFCache):** Debido a convenciones estrictas de Next.js 16.2.2+ (Turbopack), `middleware.js` está **obsoleto**. La lógica SSR de intercepción debe obligatoriamente figurar en **`src/proxy.js`** anexando cabeceras de muerte (Anti-caché) (`Cache-Control: no-store, max-age=0`). A nivel Front-End (Client) dentro del Dashboard, debes inyectar obligatoriamente una **Trampa de Historial Preventiva** forzando un estado ciego (`window.history.pushState`) e interceptando los eventos `popstate` / `pageshow`, lo cual neutraliza a los botones Adelante/Atrás de los exploradores evitando pantallas zombis permitiendo forzar el relogueo/logout.

## 5. Herramientas de Administración de Base de Datos (Sysadmin)

El sistema cuenta con una herramienta gráfica integrada para que los administradores de sistemas (Sysadmin) tengan acceso directo y visual a la base de datos (SQLite), lo que permite auditar, modificar o eliminar registros de manera directa.

### Prisma Studio
Esta es la GUI (Graphical User Interface) oficial proveída por Prisma. Consiste en un visor tipo Excel conectado a todos los modelos de la base de datos.
Para levantarla en el entorno, utiliza el comando ya preparado:

```bash
npm run db:admin
```
*(Nota: Este script es el equivalente a ejecutar internamente `npx prisma studio`)*

**Instrucciones de uso en el Servidor / Local:**
1. Ejecuta el comando en tu terminal dentro de la carpeta del proyecto. Localmente abrirá en el puerto `http://localhost:5555`.
2. Al ingresar desde tu navegador, observarás pestañas etiquetadas con los Modelos principales: `User`, `ClientRecord`, `Receipt`, `DestinoPrecargado`.
3. Dale clic a la tabla que desees modificar. Podrás crear (`Add record`), editar haciendo doble clic en una celda, o eliminar seleccionando la fila y presionando el botón "Delete".
4. **Alerta de Seguridad (Precaución Sysadm):** Esta vía evade las reglas de validación de la aplicación de React. Cualquier borrado en cascada configurado en la DB se cumplirá silenciosamente. Por favor, realiza modificaciones aquí con cuidado.

## 6. Despliegue en Producción (Infraestructura PM2)

1. El despliegue de producción se orienta a servidores Linux Ubuntu, exigiendo una clonación pura del repositorio y construcción de la base de datos nativa con `npx prisma db push` tras aislar los datos dev.
2. Todas las operaciones vitales de inicio del sistema quedan regidas bajo el supervisor en segundo plano **PM2** con un archivo maestro del proyecto `ecosystem.config.js`. Este garantizará la distribución equilibrada en el núcleo y autorreinicio vitalicio configurado con `pm2 startup`.
3. Está total y absolutamente advertido de no subir la configuración `.env` en repositorios públicos. Los secretos deben implantarse herméticamente o vía inyección SSh/SCP en el directorio raíz del servidor final de turno.
