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

## Pendiente inmediato

1. Prueba manual completa: crear venta de producto, venta de servicio, reimprimir ticket, cancelar venta y confirmar que el stock se repone una sola vez.
2. Corregir el uso de fechas UTC en ventas (`toISOString()`), ya que desde las 18:00 en Guatemala puede asignar una venta al día siguiente.
3. Proteger altas y cancelaciones de ventas con transacciones SQLite y validar stock también en el proceso principal.
4. Resolver el empaquetado del instalador en Windows (habilitar privilegio de enlaces simbólicos o ajustar la configuración de firma) y definir un icono propio.

## Protocolo de trabajo

- Antes de editar: revisa `git status --short`, el último commit y este archivo.
- Una tarea por rama. Para trabajo simultáneo, usa `git worktree` y evita que dos CLIs modifiquen el mismo archivo.
- Al entregar: actualiza este archivo, ejecuta las pruebas relevantes y crea un commit descriptivo.
