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

- **Interfaz:** El botón principal de Registrar compra ahora usa el tamaño estándar de los demás módulos (`btn btn-primary`).
- **Verificado:** `tsc --noEmit` correcto.
## Pendiente inmediato

1. Prueba manual completa: crear venta de producto, venta de servicio, reimprimir ticket, cancelar venta y confirmar que el stock se repone una sola vez.
2. Validar stock y cantidades también en el proceso principal antes de crear una venta.
3. Resolver el empaquetado del instalador en Windows (habilitar privilegio de enlaces simbólicos o ajustar la configuración de firma) y definir un icono propio.


## Protocolo de trabajo

- Antes de editar: revisa `git status --short`, el último commit y este archivo.
- Una tarea por rama. Para trabajo simultáneo, usa `git worktree` y evita que dos CLIs modifiquen el mismo archivo.
- Al entregar: actualiza este archivo, ejecuta las pruebas relevantes y crea un commit descriptivo.
