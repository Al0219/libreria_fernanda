/**
 * Safe API accessor — retorna window.api si está en Electron,
 * o lanza un error descriptivo si se accede desde el browser directamente.
 */
export function getApi() {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error(
      'window.api no disponible. Esta aplicación debe ejecutarse en Electron, no en un navegador web.'
    )
  }
  return window.api
}

export const api = new Proxy({} as typeof window.api, {
  get(_target, prop: string) {
    if (typeof window !== 'undefined' && window.api) {
      return (window.api as any)[prop]
    }
    // Retorna un objeto con funciones que retornan valores vacíos (para browser dev)
    return new Proxy({}, {
      get(_t, method: string) {
        return (..._args: any[]) => {
          console.warn(`[API] window.api.${prop}.${method} llamado fuera de Electron`)
          return Promise.resolve([])
        }
      }
    })
  }
})
