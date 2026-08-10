# Handoff entre CLIs

Actualiza este archivo al concluir cada tarea. El código y este registro, junto con los commits de Git, son la fuente de verdad compartida.

## Estado actual

- **Fecha:** 2026-08-09
- **Objetivo actual:** estabilizar y completar las pruebas del sistema POS de papelería.
- **Último cambio funcional identificado:** se implementó la cancelación lógica de ventas desde el historial. La acción pide confirmación, marca la venta como cancelada, restaura el inventario de los productos y permite mostrar las ventas canceladas.
- **Archivos principales de ese cambio:**
  - `pos-papeleria/electron/db/client.ts`
  - `pos-papeleria/electron/ipc/sales.ipc.ts`
  - `pos-papeleria/electron/preload.ts`
  - `pos-papeleria/src/components/ConfirmModal.tsx`
  - `pos-papeleria/src/pages/Sales/SalesHistoryPage.tsx`
  - `pos-papeleria/src/pages/POS/POSPage.tsx`

## Verificaciones realizadas

- `tsc --noEmit`: correcto.
- `vite build`: correcto.
- `electron-builder`: generó `release/win-unpacked`, pero el instalador NSIS falló al extraer `winCodeSign` porque Windows no concede el privilegio para crear enlaces simbólicos. No es un error de compilación del POS.

## Actualización 2026-08-09: transacciones de ventas

- **Completado:** la creación de una venta ahora ejecuta en una sola transacción la generación del folio, venta, ítems y descuento de stock. La cancelación agrupa reposición de stock y marcado de cancelación.
- **Protección:** si una operación SQL falla, se hace `ROLLBACK`; la base no conserva una venta parcial ni un inventario a medias. La persistencia a disco ocurre sólo después de `COMMIT`.
- **Interfaz:** el historial ya no elimina una venta de la pantalla cuando el proceso principal responde que no se pudo cancelar.
- **Archivos modificados:** `electron/db/helpers.ts`, `electron/ipc/sales.ipc.ts` y `src/pages/Sales/SalesHistoryPage.tsx`.
- **Verificado:** `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: zona horaria de Guatemala

- **Zona operativa:** se fijó `America/Guatemala` para la fecha comercial; a las 18:00 ya no cambia al día siguiente por UTC.
- **Ventas y cortes:** creación de venta, folio, ventas del día, resúmenes y corte de caja usan la fecha comercial.
- **Horas:** las nuevas ventas guardan `created_at` en ISO UTC con `Z`; el historial, tickets y registros heredados se convierten explícitamente a la hora de Guatemala.
- **Orden cronológico:** las consultas usan `datetime(created_at)`, por lo que conservan el orden correcto al mezclar registros antiguos y nuevos.
- **Cobertura adicional:** reportes, tickets PDF y fechas predeterminadas de compras ya usan la misma zona.
- **Verificado:** límite de las 23:30/00:00, orden de timestamps antiguos/nuevos, `tsc --noEmit` y `vite build`.
## Actualización 2026-08-09: stock inicial de productos

- **Catálogo:** los productos creados desde Inventario siempre se guardan con stock `0`.
- **Protección:** el proceso principal ignora cualquier stock inicial recibido y las actualizaciones de producto ya no pueden modificar existencias directamente.
- **Flujo:** las existencias aumentan mediante Compras; el producto rápido de ese módulo también inicia en `0` antes de registrar la entrada.
- **Interfaz:** el campo de stock queda informativo y bloqueado al crear o editar un producto.
- **Verificado:** `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: NIT de proveedores

- **Base de datos:** La tabla `suppliers` ahora incluye `nit TEXT`. Al abrir una base de datos existente se agrega la columna automáticamente mediante migración, sin eliminar proveedores previos.
- **Gestión:** La creación y edición de proveedores guardan el NIT junto con los demás datos.
- **Interfaz:** El formulario muestra un campo opcional de NIT y las tarjetas de proveedores muestran el valor cuando existe.
- **Verificado:** Migración y persistencia comprobadas con sql.js; `tsc --noEmit` y `vite build` completaron correctamente.
## Actualización 2026-08-09: buscador de proveedores

- **Búsqueda local:** La lista de proveedores se filtra instantáneamente por nombre, empresa, NIT, teléfono y correo.
- **Interfaz:** Muestra el conteo de resultados y un estado vacío cuando no hay coincidencias.
- **Verificado:** `tsc --noEmit` y `vite build` completaron correctamente.
## Actualización 2026-08-09: módulo de clientes y ventas

- **Clientes:** Se agregó la ruta `Clientes`, buscador, alta, edición y archivado/reactivación; se preservan los clientes con historial en vez de eliminarlos.
- **Duplicados:** SQLite normaliza nombre, NIT y teléfono. Impide guardar la misma combinación de nombre/NIT/teléfono, pero permite nombres iguales cuando cambia el NIT o el teléfono.
- **POS:** El carrito usa `Consumidor final / C/F` por defecto, permite buscar un cliente por nombre, NIT o teléfono y crear uno rápido sin perder la venta en curso; el nuevo cliente queda seleccionado automáticamente.
- **Ventas y tickets:** La transacción de venta valida que el cliente esté activo y guarda una instantánea del nombre y NIT. Tickets nuevos y reimpresiones usan esa instantánea, incluso si el cliente se edita o archiva después.
- **Verificado:** Regla de duplicados comprobada con sql.js; `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: tamaño del botón de compras

- **Interfaz:** El botón principal de Registrar compra usa el tamaño estándar de los demás módulos (`btn btn-primary`), ícono de 16 px y texto sin prefijo redundante.
- **Verificado:** `tsc --noEmit` correcto.
## Actualización 2026-08-09: etiqueta de creación rápida en compras

- **Interfaz:** Se eliminó el signo `+` redundante del texto “Crear producto rápido”; el ícono conserva la acción visual.
- **Verificado:** `tsc --noEmit` correcto.
## Actualización 2026-08-09: cancelación lógica de compras

- **Cancelación:** Compras ahora ofrece una acción de cancelar con confirmación. La compra se conserva marcada como cancelada y deja de aparecer en el listado operativo.
- **Inventario:** La cancelación resta las cantidades ingresadas por esa compra dentro de una transacción SQLite. Se rechaza íntegramente si alguna existencia no alcanza, evitando stock negativo o reversiones parciales.
- **Consistencia adicional:** La creación de compras ahora también inserta entrada, ítems y aumento de stock en una única transacción.
- **Verificado:** Casos de reversión, doble cancelación y stock insuficiente comprobados con sql.js; `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: confirmación al eliminar proveedores

- **Interfaz:** El borrado de proveedores dejó de usar el diálogo nativo y ahora muestra el modal de confirmación visual del sistema.
- **Protección:** Incluye acción de peligro, nombre del proveedor y mensaje de error si existen compras o productos relacionados.
- **Verificado:** `tsc --noEmit` correcto.
## Actualización 2026-08-09: precio de venta en compras

- **Formulario:** Cada artículo de una nueva compra permite ingresar precio de costo, precio de venta y cantidad. El precio de venta inicia con el valor actual del producto.
- **Persistencia:** La misma transacción SQLite guarda `sale_price` en el detalle de compra, aumenta el stock y actualiza el precio de costo y de venta del producto.
- **Compatibilidad:** La migración añade `sale_price` con valor predeterminado `0` a las bases de datos existentes; el detalle de compras muestra ese valor histórico.
- **Verificado:** Prueba sql.js de persistencia de stock y precios; `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: precios históricos en ventas

- **Precio de venta:** Ya se preservaba correctamente en `sale_items.unit_price`, incluida cualquier modificación de precio hecha en el carrito antes de cobrar.
- **Costo histórico:** Cada nueva venta guarda `sale_items.unit_cost` con el `purchase_price` vigente del producto, obtenido en el proceso principal dentro de la transacción de venta.
- **Compatibilidad:** La migración agrega `unit_cost` como valor nulo a líneas de venta anteriores, pues su costo real ya no se puede reconstruir con fiabilidad. Servicios nuevos conservan costo `0`.
- **Verificado:** Migración, inmutabilidad de costo y precio tras cambiar el producto, `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: historial de precios y proveedor preferido

- **Historial:** Inventario incorpora un botón por producto que muestra compras no canceladas con fecha, proveedor, cantidad, costo, precio de venta y variación frente a la compra previa. Resume último costo y menor costo histórico con su proveedor.
- **Proveedor preferido:** Al registrar una compra se puede marcar el proveedor elegido como preferido para todos los productos de esa entrada. Si no se marca, el proveedor actual del producto se conserva; siempre se guarda la compra y su proveedor en el historial.
- **Integridad:** El cambio opcional de proveedor se hace dentro de la transacción SQLite y valida que el proveedor exista.
- **Verificado:** Caso con/sin actualización del proveedor y consulta que excluye compras canceladas comprobados con sql.js; `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: reportes fase 1 — corte operativo

- **Corte por período:** Reportes permite seleccionar fechas manualmente o usar Hoy, últimos 7 días y este mes, siempre según la fecha comercial de Guatemala.
- **Indicadores:** Muestra número de ventas, ingresos netos, descuentos y efectivo; además desglosa efectivo, tarjeta y transferencia con sus cantidades de ventas.
- **Desglose:** Incluye gráficas de ventas por día y por tipo de artículo. Este último identifica explícitamente los importes previos a descuentos globales.
- **Consistencia:** Todas las consultas de reportes —incluidos los puntos ya existentes— excluyen ventas canceladas.
- **Verificado:** Totales, pagos, días y tipos con ventas canceladas mezcladas comprobados con sql.js; `tsc --noEmit` y `vite build` correctos.
## Corrección 2026-08-09: carga de Reportes

- **Causa:** Reportes añadía una hora al valor de fecha antes de llamar al helper comercial; el helper ya añade esa hora, generando una fecha inválida.
- **Solución:** El módulo ahora pasa la fecha comercial sin duplicarla para el título y las gráficas.
- **Verificado:** Formateo de fecha comercial, `tsc --noEmit` y `vite build` correctos.
## Actualización 2026-08-09: caja diaria y gastos

- **Caja:** Se añadió el módulo `Caja` con apertura por fecha comercial de Guatemala, fondo inicial, efectivo esperado, conteo físico, diferencia y un historial de los últimos 30 cortes. Solo se permite una apertura por día y, tras el cierre, sus importes quedan guardados.
- **Gastos:** Durante una caja abierta se pueden registrar gastos de alimentación, gasto personal, suministros, transporte u otro, con descripción y monto. Cada gasto resta el efectivo esperado y queda visible en el corte.
- **Compras y efectivo:** Las compras ahora piden medio de pago. Solo las nuevas compras pagadas en **efectivo** reducen el efectivo esperado; tarjeta, transferencia y crédito no. Las compras anteriores se migran como `unknown`, por lo que no alteran cortes nuevos por una suposición errónea. Las compras y ventas canceladas se excluyen.
- **Fórmula:** `fondo inicial + ventas en efectivo - compras en efectivo - gastos de caja`.
- **Verificado:** `npx tsc --noEmit`, `npx vite build` y prueba aislada de SQLite (incluye compras canceladas, tarjeta e histórico) correctas. El empaquetado completo sigue limitado por el privilegio de enlaces simbólicos de Windows al extraer `winCodeSign`.
## Actualización 2026-08-09: reapertura y corrección de gastos de caja

- **Reapertura:** Un corte ya cerrado puede reabrirse únicamente en la fecha comercial actual. Se limpian el contado, esperado, diferencia y nota de ese cierre para que se recalculen al guardar el nuevo corte.
- **Gastos:** Cada gasto de la caja actual abierta ahora tiene botón de eliminación con confirmación. El proceso principal valida además el identificador, la fecha comercial, la pertenencia a la caja actual y que siga abierta; no permite eliminar gastos de días anteriores ni de cajas cerradas.
- **Verificado:** `npx tsc --noEmit`, `npx vite build` y prueba SQLite de reapertura, eliminación del gasto actual y bloqueo fuera del período correctas.
## Actualización 2026-08-09: reportes fase 2 — detalle y rendimiento de ventas

- **Agrupación:** Reportes permite ver el rendimiento del período por día, semana o mes, usando las mismas fechas comerciales seleccionadas.
- **Comparativo:** Muestra ingresos y cantidad de ventas contra el período anterior de igual duración, con variación porcentual y las fechas comparadas.
- **Rankings:** Incluye los 10 productos, categorías y servicios más vendidos, con cantidad y ventas brutas. Los importes de rankings se identifican como brutos porque el descuento se guarda a nivel de venta, no de línea.
- **Consistencia:** Series, comparativo y rankings excluyen ventas canceladas.
- **Verificado:** `npx tsc --noEmit`, `npx vite build`, pruebas SQLite de series, comparativo, rankings con venta cancelada y agrupación semanal/mensual correctas.

## Protocolo de trabajo

- Antes de editar: revisa `git status --short`, el último commit y este archivo.
- Una tarea por rama. Para trabajo simultáneo, usa `git worktree` y evita que dos CLIs modifiquen el mismo archivo.
- Al entregar: actualiza este archivo, ejecuta las pruebas relevantes y crea un commit descriptivo.
## Actualización 2026-08-09: ventas a crédito y cuentas por cobrar

- **Clientes:** Se agregaron autorización y límite de crédito. El POS y el módulo de Clientes muestran el saldo pendiente para evitar exceder el límite disponible.
- **Venta a crédito:** El cobro permite seleccionar crédito únicamente para clientes autorizados, definir vencimiento y registrar un anticipo por efectivo, tarjeta o transferencia. La creación de la venta, sus líneas, el descuento de inventario, la cuenta por cobrar y el anticipo se ejecutan en una sola transacción SQLite.
- **Cobranza:** Nuevo módulo **Créditos** con saldo total, cartera vencida, búsqueda por cliente/NIT/folio, cuentas abiertas y registro de abonos. Cada abono se registra de forma transaccional y cierra la cuenta cuando liquida el saldo.
- **Caja, historial y reportes:** La caja incluye anticipos y abonos recibidos en efectivo. Historial y tickets, incluso reimpresiones, informan saldo y vencimiento. Reportes identifica las ventas a crédito sin confundirlas con efectivo recibido.
- **Protecciones:** No se permiten créditos sin cliente/autorización/límite, con vencimiento pasado, por encima del límite ni anticipos iguales o mayores al total. No se puede cancelar una venta a crédito que ya tiene dinero aplicado; una cuenta sin pagos sí se cancela junto con la venta y el inventario se restaura.
- **Verificado:** prueba SQLite de límite, anticipo, abonos, cierre de cuenta y cancelación; `npx tsc --noEmit` y `npx vite build` correctos. El empaquetado completo continúa sujeto al privilegio de enlaces simbólicos de Windows ya documentado.

## Actualización 2026-08-09: reportes fase 3 — existencias y alertas

- **Estado actual:** Reportes incorpora el valor total del inventario al costo vigente, unidades disponibles, productos bajo stock y agotados; solo considera productos activos. El valor no usa precio de venta ni existencias negativas.
- **Alertas accionables:** Las tablas separan productos con existencia en o debajo del mínimo de los agotados, e incluyen código, categoría, cantidad mínima y valor al costo.
- **Sin movimiento:** El período del filtro de Reportes identifica productos que no tuvieron ninguna compra ni venta activa dentro de esas fechas. Muestra el último movimiento válido conocido y excluye compras o ventas canceladas.
- **Verificado:** prueba SQLite de valorización, bajo stock, agotados y movimientos cancelados; `npx tsc --noEmit` y `npx vite build` correctos.

## Actualización 2026-08-09: reportes fase 4 — compras y proveedores

- **Compras por período:** Reportes resume costo invertido, compras registradas, unidades adquiridas, costo unitario ponderado y una serie diaria de entradas.
- **Filtros y desglose:** Permite limitar el reporte por proveedor y/o producto, con rankings de inversión, unidades, compras y costo promedio para ambos. Las opciones se forman con las compras activas del período.
- **Precios históricos:** Para el producto elegido —o el de mayor inversión si no se selecciona uno— muestra costo y precio de venta históricos de cada línea de compra. Los valores corresponden al momento de registrar la compra, no al producto actual.
- **Consistencia:** Todos los indicadores, filtros, rankings y gráficas excluyen compras canceladas.
- **Verificado:** prueba SQLite con proveedores, productos, filtros y una compra cancelada; `npx tsc --noEmit` y `npx vite build` correctos.

## Actualización 2026-08-09: reportes fase 5 — clientes e historial comercial

- **Resumen comercial:** Reportes muestra clientes atendidos, número de compras con cliente, monto acumulado y ticket promedio para el período seleccionado.
- **Ranking y frecuencia:** Ordena clientes por monto acumulado, incluye compras, días con actividad y una frecuencia aproximada dentro del rango de fechas; permite elegir un cliente concreto.
- **Historial detallado:** Muestra las ventas activas del cliente elegido —o del cliente con mayor monto por defecto— con fecha, folio, medio de pago, artículos, descuentos y total.
- **Consistencia:** Solo se consideran ventas activas con `customer_id`; ventas canceladas y ventas de mostrador no alteran totales, ranking ni historial.
- **Verificado:** prueba SQLite con dos clientes, venta cancelada y venta sin cliente; `npx tsc --noEmit` y `npx vite build` correctos.

## Actualización 2026-08-09: reportes fase 6 — rentabilidad y margen bruto

- **Base histórica:** Rentabilidad usa `sale_items.unit_cost`, guardado al momento de cada venta, y nunca sustituye ese costo por el costo actual del producto.
- **Venta neta y utilidad:** Los descuentos globales se distribuyen proporcionalmente entre líneas de producto. Reportes calcula venta neta, costo, utilidad bruta y margen por período, producto y categoría; servicios no se mezclan en este análisis de inventario.
- **Cobertura explícita:** Las líneas de ventas anteriores que no tienen costo histórico se muestran como venta sin costo y quedan excluidas de costo, utilidad y margen. Así no se presenta una rentabilidad inventada; el panel informa monto, líneas y porcentaje cubierto.
- **Consistencia:** Ventas canceladas se excluyen de totales, gráfica diaria y todos los desgloses.
- **Verificado:** prueba SQLite con descuento global, costos históricos, venta cancelada y costo faltante; `npx tsc --noEmit` y `npx vite build` correctos.

## Actualización 2026-08-09: reportes fase 7 — salida, exportación y corte

- **Rango común:** Las fechas Desde/Hasta existentes alimentan todas las fases de Reportes y ahora también determinan el corte exportado.
- **CSV:** Se exporta un archivo compatible con hojas de cálculo, con secciones de ventas, inventario, compras, clientes, rentabilidad y sus listados operativos principales. Se guarda y abre desde la carpeta local de exportaciones de la aplicación.
- **PDF e impresión:** El corte PDF resume los indicadores de todas las fases, productos, alertas, clientes y rentabilidad. El botón Imprimir corte genera el mismo PDF con nombre de corte y lo abre en el visor predeterminado del sistema, desde donde se elige impresora y opciones.
- **Seguridad y consistencia:** La aplicación sanea el nombre de archivo, guarda las exportaciones en `userData/exports` y el contenido usa exactamente los datos actualmente cargados con los filtros seleccionados.
- **Verificado:** `npx tsc --noEmit` y `npx vite build` correctos; el bundle incluye la generación PDF, el CSV con BOM UTF-8 y el canal Electron de exportación.

## Pendiente inmediato

1. Prueba manual: abrir Reportes, cambiar el rango de fechas y verificar que CSV/PDF reflejen el mismo corte; abrir el PDF y enviarlo a una impresora.
2. Prueba manual: registrar una venta de producto con descuento y verificar venta neta, costo, utilidad y margen en Reportes.
3. Prueba manual: seleccionar un cliente con varias compras y comprobar su frecuencia, total e historial al cambiar el rango de Reportes.
4. Prueba manual: comparar el costo/precio de dos compras del mismo producto y aplicar los filtros de proveedor y producto en Reportes.
5. Prueba manual: cambiar el rango de fechas de Reportes y confirmar que “sin movimiento” varía sin alterar la valorización actual.
6. Prueba manual: autorizar crédito a un cliente, crear venta con y sin anticipo, registrar abono y comprobar el efectivo esperado de Caja.
7. Definir política operativa para clientes con saldo pendiente que se desactiven; actualmente el historial de la deuda se conserva.
8. Resolver el empaquetado del instalador en Windows (habilitar privilegio de enlaces simbólicos o ajustar la configuración de firma) y definir un icono propio.

## 2026-08-09 — Cuentas por pagar

- Rama `feat/accounts-payable`: se implementaron cuentas por pagar para compras a credito.
- Compras a credito ahora exigen proveedor y vencimiento, admiten anticipo y crean la deuda junto con la entrada e inventario dentro de la misma transaccion SQLite.
- Se agregaron `accounts_payable` y `payable_payments`, la pantalla **Por pagar**, pagos parciales/liquidacion, saldo en Proveedores e historial de Compras.
- Los pagos a proveedores en efectivo se restan del efectivo esperado de Caja; Reportes > Compras muestra el saldo actual por pagar.
- Seguridad: no se puede cancelar una compra a credito que tenga anticipos/abonos, ni borrar un proveedor con saldo pendiente.
- Verificado: `npx tsc --noEmit` y `npx vite build` correctos. `npm run build` compila Vite/Electron, pero electron-builder no genera instalador por falta de privilegio Windows para crear symlinks de `winCodeSign`.
- Siguiente paso recomendado: prueba manual en Electron: compra a credito con/ sin anticipo, pago parcial en Por pagar, comprobacion de Caja y bloqueo de anulacion.
## 2026-08-09 — Rutas configurables y respaldos automaticos

- Configuracion incorpora carpetas seleccionables para respaldos y documentos; los documentos se organizan automaticamente en `Tickets` y `Reportes` dentro de la ruta elegida.
- La base activa sigue en `userData` (recomendado SSD). Al cerrar Caja se crea un respaldo en el HDD seleccionado cuando esta habilitado; un fallo del disco no invalida el corte.
- Cada respaldo incluye `database.sqlite` y fotos de productos en una carpeta fechada. Hay boton de respaldo manual y retencion configurable (1 a 365; predeterminado 30).
- Verificado: `npx tsc --noEmit`, `npx vite build` y `git diff --check` correctos.
- Pendiente manual: en Electron, elegir carpetas del HDD, usar Respaldar ahora, cerrar caja y comprobar las subcarpetas creadas.
## 2026-08-09 — Paquete portable Windows

- Se generó y verificó `pos-papeleria/release/win-unpacked/POS Papelería.exe` con sus recursos actualizados a las 20:59. Es apto para copiar íntegramente a otra laptop Windows 11.
- `app.asar` de la carpeta portable fue generado en la misma ejecución (SHA-256: `4777514F23A487E40CB465DCB9A1BFC515BD544D3D87DE7E4D17B0A2B111E42F`).
- El instalador/paquete electron-builder sigue bloqueado solo al extraer `winCodeSign` por el privilegio de Windows para crear enlaces simbólicos. No afecta la carpeta portable.