import { create } from 'zustand'

export type CartItemType = 'product' | 'print' | 'research'

export interface CartItem {
  id: string // uuid temporal
  itemType: CartItemType
  productId?: number
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  metadataJson?: Record<string, any>
  maxStock?: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updatePrice: (id: string, price: number) => void
  clearCart: () => void
  total: () => number
  subtotal: () => number
}

let itemCounter = 0

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    const newItem: CartItem = {
      ...item,
      id: `item-${++itemCounter}-${Date.now()}`,
      subtotal: item.unitPrice * item.quantity,
    }
    set(state => ({ items: [...state.items, newItem] }))
  },

  removeItem: (id) => {
    set(state => ({ items: state.items.filter(i => i.id !== id) }))
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id)
      return
    }
    set(state => ({
      items: state.items.map(i => {
        if (i.id === id) {
          const finalQty = i.maxStock !== undefined ? Math.min(quantity, i.maxStock) : quantity
          return { ...i, quantity: finalQty, subtotal: i.unitPrice * finalQty }
        }
        return i
      })
    }))
  },

  updatePrice: (id, price) => {
    set(state => ({
      items: state.items.map(i =>
        i.id === id ? { ...i, unitPrice: price, subtotal: price * i.quantity } : i
      )
    }))
  },

  clearCart: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
  total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
}))
