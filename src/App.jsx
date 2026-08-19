import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

function App() {
  const [status, setStatus] = useState('Checking Supabase connection...')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function checkConnection() {
      if (!isSupabaseConfigured || !supabase) {
        if (active) {
          setStatus('Supabase is not configured')
          setError('Check that .env.local contains both Supabase variables, then restart Vite.')
        }
        return
      }

      const { error: queryError } = await supabase
        .from('transactions')
        .select('id')
        .limit(1)

      if (!active) return

      if (queryError) {
        setStatus('Supabase connection failed')
        setError(queryError.message)
        return
      }

      setStatus('Supabase connected')
      setError('')
    }

    checkConnection()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="welcome-card">
        <p className="eyebrow">PERSONAL FINANCE</p>
        <h1>Finance Tracker</h1>
        <p className="subtitle">
          Your simple place to track what you receive, what you spend, and where your money goes.
        </p>
        <div className="status-pill">{status}</div>
        {error && <p className="connection-error">{error}</p>}
      </section>
    </main>
  )
}

export default App
