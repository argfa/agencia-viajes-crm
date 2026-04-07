# 🛠️ Manual del Administrador de Sistemas (Sysadmin) - Beach Camp CRM

Este documento sirve como manual oficial para **Administradores de la Base de Datos** e IT. Describe el uso exclusivo de `Prisma Studio`, la interfaz gráfica interna con la cual podrás realizar operaciones críticas, de emergencia o auditorías que eluden las validaciones de la interfaz de usuario estándar (Next.js).

## 1. ¿Qué es Prisma Studio y para qué sirve?
Prisma Studio es un explorador visual en tiempo real de tu base de datos (SQLite). Imagínalo como un "Excel" con privilegios absolutos sobre las entrañas del sistema.

Permite solucionar problemas técnicos y contables sin necesidad de tocar código, por ejemplo:
- Forzar la corrección de deudas alteradas.
- Inyectar destinos geográficos en masa.
- Destruir registros erróneos o fraudulentos creados por un empleado.
- Registrar un Agente directamente si la pantalla de login presenta una caída.

---

## 2. Iniciar el Panel de Administración

Abre tu terminal, ubícate en la raíz del proyecto (`agencia-viajes`) y ejecuta el script preparado del ecosistema:

```bash
npm run db:admin
```

> **Nota:** Internamente este comando invoca el motor global de `npx prisma studio`.

Una vez que te señale el estatus `Prisma Studio is up`, dirígete a tu navegador web favorito (Chrome, Edge, Safari) e ingresa la siguiente URL administrativa:  
🌐 **http://localhost:5555**

---

## 3. Comprendiendo las Tablas Principales (Modelos)

Al lograr el acceso, observarás múltiples tarjetas que emulan el control de Tablas que dictamina la arquitectura SQL del software.

1. **`User` (Agentes de Venta):** El personal que posee acceso verificado a la plataforma. Posee su cédula de identidad, nombre legible y el hash criptográfico irrompible de su contraseña generada desde la raíz, sin formato texto. 
2. **`ClientRecord` (Reservas y Titulares):** El corazón de ingresos y movimientos comerciales. Cada fila es una hoja o paquete vendido, que detalla de forma individual el balance del cliente, y sus acompañantes anexos.
3. **`DestinoPrecargado`:** Un archivo de autoayuda estática gestionado para que el cuadro desplegable de la página principal mantenga su origen coherente y no haya que sobreescribir destinos manuales permanentemente.
4. **`Receipt` (Recibos de Abono):** Un muro intocable por el portal UI. En él yacen cada uno de los comprobantes generados mediante cualquier pago derivado en el tiempo.

---

## 4. Manual de Operaciones Críticas paso a paso

### 4.1 Inyectar Registro Manualmente (Insert)
Ya que en Prisma Studio **no actúan las ataduras restrictivas del Front-End (React)**, puedes vaciar datos arbitrarios con extrema flexibilidad en situaciones raras.
1. Entra al modelo deseado pulsando en su nombre (ej. `DestinoPrecargado`).
2. Dale clic al botón superior derecho **"Add record"** verde claro.
3. Automáticamente se dibuja un pasillo tabular debajo tuya, rellena las celdillas. Puedes moverte con las flechas o con el botón **Tabulador** y efectuar la intervención haciendo doble clic en lo que precises editar.
4. Finaliza apretando el gran botón flotante de confirmación **"Save 1 change"** para efectuar el salvado profundo de SQLite.

### 4.2 Corregir Deudas y Errores Contables (Update)
Si ocurre el escenario desafortunado donde un vendedor se equivocó insertando tarifas que superaron los abonos lógicos, como administrador eres el único capacitado para "parchar" el bache.
1. Da entrada principal al sector en el tablero a `ClientRecord`.
2. Filtra la víctima por la **cédula** del cliente o un aproximado del destino usando la barra central inteligente `Filter`.
3. Haz doble clic seco en la superficie de recuadros `restante_por_pagar` o `abonos` y redacta la cifra equilibrada numéricamente de forma dura.
4. Fija los cambios de vuelta y ordena guardar usando **"Save changes"**. Inmediatamente al recargar la red del Dashboard todos los empleados apreciarán la cuenta reparada.

### 4.3 Borrado Definitivo y Exterminación (Delete)
Si es prioritaria la remolción por abandono de cargo, cancelaciones abruptas de contrataciones, o en su defecto un vaciado del ciclo.
1. Dirigite velozmente a las casillas del margen izquierdo.
2. Selecciona la minúscula caja del "Check" o "Checkbox" acoplado a la raíz que da nombre al renglón averiado, puedes hacer clics en cascada para llevar a cabo múltiple exterminación si quisieras.
3. Desplegará una nueva subestación superior de un brillante índigo rojo estipulando el botón amenazante **Delete X records**.
4. Pulsa para reaccionar la clausura con una verificación extra requerida y con esto el rastro contable del implicado, sencillamente dejará de existir en la app entera.

> ⚠️ **ALERTA CRÍTICA TÉCNICA (BORRADOS CASCADA):**
> Al someter a ejecución `Delete` a las capas matrices altas como un titular reservado directamente de `ClientRecord`, esta dictamina una destrucción a sub-capas (Cascades), es decir, por mera arquitectura base SQL se volatilizarán a conjunto sus recibos asociados pertenecientes dentro del campo `Receipt` inmutables. Manipúlese bajo sumo escepticismo de acción en auditorias.
