import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Checking Supabase...')

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setConnectionStatus('Supabase is not configured')
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session || !supabase) {
      setConnectionStatus(session ? 'Supabase connected' : '')
      return
    }

    let active = true

    async function verifyAccess() {
      const { error: queryError } = await supabase
        .from('transactions')
        .select('id')
        .limit(1)

      if (!active) return

      if (queryError) {
        setConnectionStatus('Database access failed')
        setError(queryError.message)
      } else {
        setConnectionStatus('Supabase connected')
        setError('')
      }
    }

    verifyAccess()

    return () => {
      active = false
    }
  }, [session])

  async function handleAuth(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Check .env.local and restart Vite.')
      return
    }

    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }

    if (mode === 'sign-in') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) setError(authError.message)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      return
    }

    if (data.session) {
      setStatus('Account created and signed in.')
    } else {
      setStatus('Account created. Check your email to confirm your account, then sign in.')
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setStatus('')
    setError('')
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="app-shell">
        <section className="welcome-card">
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Finance Tracker</h1>
          <p className="subtitle">Supabase is not configured yet.</p>
          <div className="status-pill">Check .env.local and restart Vite</div>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Finance Tracker</h1>
          <p className="subtitle">
            Sign in to keep your transactions private and synced across your devices.
          </p>

          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                placeholder="At least 6 characters"
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {status && <p className="form-success">{status}</p>}

            <button className="primary-button" type="submit">
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            className="text-button"
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
              setError('')
              setStatus('')
            }}
          >
            {mode === 'sign-in' ? 'Create a new account' : 'Already have an account? Sign in'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="welcome-card">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">PERSONAL FINANCE</p>
            <h1>Finance Tracker</h1>
          </div>
          <button className="secondary-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
        <p className="subtitle">
          Your account is connected. The transaction database is ready for the next step.
        </p>
        <div className="status-pill">{connectionStatus}</div>
        {error && <p className="connection-error">{error}</p>}
      </section>
    </main>
  )
}

export default App
