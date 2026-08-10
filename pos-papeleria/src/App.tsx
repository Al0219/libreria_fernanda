import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
import POSPage from './pages/POS/POSPage'
import InventoryPage from './pages/Inventory/InventoryPage'
import PurchasesPage from './pages/Purchases/PurchasesPage'
import SalesHistoryPage from './pages/Sales/SalesHistoryPage'
import SuppliersPage from './pages/Suppliers/SuppliersPage'
import CustomersPage from './pages/Customers/CustomersPage'
import ReportsPage from './pages/Reports/ReportsPage'
import CashRegisterPage from './pages/CashRegister/CashRegisterPage'
import SettingsPage from './pages/Settings/SettingsPage'

export default function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/pos" replace />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/sales" element={<SalesHistoryPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/cash-register" element={<CashRegisterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </HashRouter>
  )
}
