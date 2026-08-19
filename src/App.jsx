import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const SPENDING_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Education',
  'Rent / Housing',
  'Subscriptions',
  'Travel',
  'Other',
]

const RECEIVED_CATEGORIES = [
  'Salary',
  'Freelance',
  'Gift',
  'Refund',
  'Interest',
  'Other',
]

function getToday() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateString}T00:00:00`))
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Checking Supabase...')
  const [date, setDate] = useState(getToday)
  const [type, setType] = useState('spent')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const categories = useMemo(
    () => (type === 'spent' ? SPENDING_CATEGORIES : RECEIVED_CATEGORIES),
    [type],
  )

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
      setTransactions([])
      return undefined
    }

    let active = true

    async function loadTransactions() {
      setLoadingTransactions(true)
      setHistoryError('')

      const { data, error: queryError } = await supabase
        .from('transactions')
        .select('id, date, type, amount, category, note, created_at')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!active) return

      setLoadingTransactions(false)

      if (queryError) {
        setConnectionStatus('Database access failed')
        setHistoryError(queryError.message)
        return
      }

      setConnectionStatus('Supabase connected')
      setHistoryError('')
      setTransactions(data ?? [])
    }

    loadTransactions()

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    setCategory('')
  }, [type])

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

  async function handleAddTransaction(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    if (!supabase || !session) {
      setError('You must be signed in to add a transaction.')
      return
    }

    const numericAmount = Number(amount)

    if (!date || !category || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid date, amount, and category.')
      return
    }

    setSaving(true)

    const { data: insertedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
        date,
        type,
        amount: numericAmount,
        category,
        note: note.trim() || null,
      })
      .select('id, date, type, amount, category, note, created_at')
      .single()

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setStatus('Transaction added successfully.')
    setAmount('')
    setCategory('')
    setNote('')
    setDate(getToday())
    setTransactions((current) => [insertedTransaction, ...current])
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
      <section className="finance-card">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">PERSONAL FINANCE</p>
            <h1>Finance Tracker</h1>
          </div>
          <button className="secondary-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </header>

        <div className="transaction-section">
          <div className="section-heading">
            <div>
              <h2>Add transaction</h2>
              <p>Record money received or spent.</p>
            </div>
            <div className="status-pill">{connectionStatus}</div>
          </div>

          <form className="transaction-form" onSubmit={handleAddTransaction}>
            <label>
              Date
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>

            <fieldset className="type-fieldset">
              <legend>Type</legend>
              <div className="type-toggle">
                <button
                  className={type === 'spent' ? 'type-button active spent' : 'type-button'}
                  type="button"
                  onClick={() => setType('spent')}
                >
                  Spent
                </button>
                <button
                  className={type === 'received' ? 'type-button active received' : 'type-button'}
                  type="button"
                  onClick={() => setType('received')}
                >
                  Received
                </button>
              </div>
            </fieldset>

            <label>
              Amount
              <div className="amount-input">
                <span>₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </label>

            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Select a category</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Note <span className="optional">(optional)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows="3"
                placeholder="Add a note if you want to remember the details"
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {status && <p className="form-success">{status}</p>}

            <button className="primary-button add-button" type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add transaction'}
            </button>
          </form>
        </div>

        <section className="history-section">
          <div className="section-heading history-heading">
            <div>
              <h2>Transaction history</h2>
              <p>Your transactions, newest first.</p>
            </div>
            <span className="transaction-count">
              {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          {loadingTransactions ? (
            <div className="empty-state">Loading transactions...</div>
          ) : historyError ? (
            <div className="empty-state error-state">{historyError}</div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">No transactions yet.</div>
          ) : (
            <div className="transaction-list">
              {transactions.map((transaction) => (
                <article className="transaction-row" key={transaction.id}>
                  <div className="transaction-main">
                    <div className="transaction-date">{formatDate(transaction.date)}</div>
                    <div className="transaction-category">{transaction.category}</div>
                    {transaction.note && <div className="transaction-note">{transaction.note}</div>}
                  </div>
                  <div className={transaction.type === 'spent' ? 'transaction-amount spent' : 'transaction-amount received'}>
                    {transaction.type === 'spent' ? '-' : '+'} ₹{formatAmount(transaction.amount)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
