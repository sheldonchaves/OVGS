import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getStoredUser, isAdmin, AuthUser } from './api'
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute'
import MonitoringPage from './pages/MonitoringPage'
import OrdersPage from './pages/OrdersPage'
import SchedulingPage from './pages/SchedulingPage'
import ClientsPage from './pages/ClientsPage'
import TransportTypesPage from './pages/TransportTypesPage'
import ItemsPage from './pages/ItemsPage'
import AuditPage from './pages/AuditPage'
import LoginPage from './pages/LoginPage'

const allLinks = [
  { to: '/', label: 'Monitoramento' },
  { to: '/ordens', label: 'Ordens' },
  { to: '/agendamento', label: 'Agendamento' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/transportes', label: 'Transportes' },
  { to: '/itens', label: 'Itens' },
  { to: '/auditoria', label: 'Auditoria', adminOnly: true },
]

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const location = useLocation()
  const navigate = useNavigate()

  const links = useMemo(
    () => allLinks.filter((link) => !link.adminOnly || isAdmin(user)),
    [user],
  )

  useEffect(() => {
    setMenuOpen(false)
    setUser(getStoredUser())
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-shell ${menuOpen ? 'menu-open' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="brand brand-compact">
          <div className="brand-mark">OV<span>GS</span></div>
        </div>
        <button type="button" className="btn secondary topbar-logout" onClick={logout}>
          Sair
        </button>
      </header>

      <div
        className="nav-backdrop"
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">OV<span>GS</span></div>
          <div className="brand-sub">Gestão de Ordens de Venda</div>
        </div>
        {user && (
          <div className="user-chip">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span className="badge">{user.role}</span>
          </div>
        )}
        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn secondary logout-btn" onClick={logout}>
          Sair
        </button>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<MonitoringPage />} />
          <Route path="/ordens" element={<OrdersPage />} />
          <Route path="/agendamento" element={<SchedulingPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/transportes" element={<TransportTypesPage />} />
          <Route path="/itens" element={<ItemsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/auditoria" element={<AuditPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppShell />} />
      </Route>
    </Routes>
  )
}
