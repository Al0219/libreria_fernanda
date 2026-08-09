import { NavLink } from 'react-router-dom'
import {
  ShoppingCart, Package, Truck, BarChart2,
  Settings, Store, ShoppingBag, Receipt
} from 'lucide-react'

const navItems = [
  { to: '/pos',       icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/inventory', icon: Package,      label: 'Inventario' },
  { to: '/purchases', icon: ShoppingBag,  label: 'Compras' },
  { to: '/sales',     icon: Receipt,      label: 'Ventas' },
  { to: '/suppliers', icon: Truck,        label: 'Proveedores' },
  { to: '/reports',   icon: BarChart2,    label: 'Reportes' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Store size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-primary)' }} />
          <span>Papelería</span>
        </div>
        <div className="sidebar-subtitle">Sistema POS v1.0</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Principal</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 'auto' }}>Sistema</div>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={16} />
          Configuración
        </NavLink>
      </nav>
    </aside>
  )
}
