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
## Pendiente inmediato

1. Prueba manual completa: crear venta de producto, venta de servicio, reimprimir ticket, cancelar venta y confirmar que el stock se repone una sola vez.
2. Validar stock y cantidades también en el proceso principal antes de crear una venta.
3. Resolver el empaquetado del instalador en Windows (habilitar privilegio de enlaces simbólicos o ajustar la configuración de firma) y definir un icono propio.


## Protocolo de trabajo

- Antes de editar: revisa `git status --short`, el último commit y este archivo.
- Una tarea por rama. Para trabajo simultáneo, usa `git worktree` y evita que dos CLIs modifiquen el mismo archivo.
- Al entregar: actualiza este archivo, ejecuta las pruebas relevantes y crea un commit descriptivo.
