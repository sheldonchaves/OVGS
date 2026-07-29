import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api, getToken, setSession } from '../api'

type LoginResponse = {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@gmail.com')
  const [password, setPassword] = useState('12345678')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getToken()) {
    return <Navigate to="/" replace />
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password })
      setSession(data.accessToken, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-panel stack" onSubmit={submit}>
        <div>
          <div className="brand-mark">OV<span>GS</span></div>
          <p className="muted">Acesse o sistema de gestão de ordens</p>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="muted login-hint">
          admin@gmail.com / user@gmail.com — senha 12345678
        </p>
      </form>
    </div>
  )
}
