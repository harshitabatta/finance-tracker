import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const SPENDING_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Rent / Housing', 'Subscriptions', 'Travel', 'Other']
const RECEIVED_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Refund', 'Interest', 'Other']

function getToday() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}
function monthKey(date) { return date.slice(0, 7) }
function yearKey(date) { return date.slice(0, 4) }
function formatMonth(key) { return new Date(`${key}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
function shiftMonth(key, amount) { const date = new Date(`${key}-01T12:00:00`); date.setMonth(date.getMonth() + amount); return monthKey(date.toISOString().slice(0, 10)) }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
function formatCurrency(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value) }
function escapeCsv(value) { const text = value == null ? '' : String(value); return `"${text.replaceAll('"', '""')}"` }

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Checking Supabase...')
  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(monthKey(getToday()))
  const [view, setView] = useState('monthly')
  const [date, setDate] = useState(getToday)
  const [type, setType] = useState('spent')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const categories = useMemo(() => (type === 'spent' ? SPENDING_CATEGORIES : RECEIVED_CATEGORIES), [type])
  const selectedYear = yearKey(selectedMonth)
  const yearTransactions = useMemo(() => transactions.filter((t) => yearKey(t.date) === selectedYear), [transactions, selectedYear])
  const monthlyTransactions = useMemo(() => transactions.filter((t) => t.date.slice(0, 7) === selectedMonth), [transactions, selectedMonth])

  const calculateDashboard = (items) => {
    const received = items.filter((t) => t.type === 'received').reduce((sum, t) => sum + Number(t.amount), 0)
    const spent = items.filter((t) => t.type === 'spent').reduce((sum, t) => sum + Number(t.amount), 0)
    const categoryTotals = items.filter((t) => t.type === 'spent').reduce((totals, t) => { totals[t.category] = (totals[t.category] || 0) + Number(t.amount); return totals }, {})
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
    const topThree = sortedCategories.slice(0, 3)
    const others = sortedCategories.slice(3).reduce((sum, [, value]) => sum + value, 0)
    const ratio = received > 0 ? (spent / received) * 100 : null
    return { received, spent, remaining: received - spent, ratio, topThree, others }
  }

  const dashboard = useMemo(() => calculateDashboard(monthlyTransactions), [monthlyTransactions])
  const yearlyDashboard = useMemo(() => calculateDashboard(yearTransactions), [yearTransactions])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setConnectionStatus('Supabase is not configured'); return undefined }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session || !supabase) { setConnectionStatus(session ? 'Supabase connected' : ''); return undefined }
    let active = true
    async function loadTransactions() {
      setLoadingTransactions(true)
      const { data, error: queryError } = await supabase.from('transactions').select('id, date, type, amount, category, note, created_at').order('date', { ascending: false }).order('created_at', { ascending: false })
      if (!active) return
      setLoadingTransactions(false)
      if (queryError) { setConnectionStatus('Database access failed'); setError(queryError.message); return }
      setTransactions(data || []); setConnectionStatus('Supabase connected'); setError('')
    }
    loadTransactions()
    return () => { active = false }
  }, [session])

  useEffect(() => { setCategory('') }, [type])

  async function handleAuth(event) {
    event.preventDefault(); setStatus(''); setError('')
    if (!supabase) return setError('Supabase is not configured. Check .env.local and restart Vite.')
    if (!email || !password) return setError('Enter your email and password.')
    if (mode === 'sign-in') { const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) setError(authError.message); return }
    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) return setError(authError.message)
    setStatus(data.session ? 'Account created and signed in.' : 'Account created. Check your email to confirm your account, then sign in.')
  }

  async function handleSignOut() { if (!supabase) return; await supabase.auth.signOut(); setStatus(''); setError(''); setTransactions([]) }

  async function handleAddTransaction(event) {
    event.preventDefault(); setStatus(''); setError('')
    if (!supabase || !session) return setError('You must be signed in to add a transaction.')
    const numericAmount = Number(amount)
    if (!date || !category || !Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Enter a valid date, amount, and category.')
    setSaving(true)
    const { data, error: insertError } = await supabase.from('transactions').insert({ user_id: session.user.id, date, type, amount: numericAmount, category, note: note.trim() || null }).select('id, date, type, amount, category, note, created_at').single()
    setSaving(false)
    if (insertError) return setError(insertError.message)
    setTransactions((current) => [data, ...current].sort((a, b) => `${b.date}${b.created_at}`.localeCompare(`${a.date}${a.created_at}`)))
    setStatus('Transaction added successfully.'); setAmount(''); setCategory(''); setNote(''); setDate(getToday()); setSelectedMonth(monthKey(date))
  }

  function downloadMonthlyCsv() {
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Note']
    const rows = monthlyTransactions.map((t) => [t.date, t.type, Number(t.amount).toFixed(2), t.category, t.note || ''])
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finance-transactions-${selectedMonth}.csv`
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }

  if (!isSupabaseConfigured) return <main className="app-shell"><section className="welcome-card"><p className="eyebrow">PERSONAL FINANCE</p><h1>Finance Tracker</h1><p className="subtitle">Supabase is not configured yet.</p><div className="status-pill">Check .env.local and restart Vite</div></section></main>

  if (!session) return <main className="app-shell"><section className="auth-card"><p className="eyebrow">PERSONAL FINANCE</p><h1>Finance Tracker</h1><p className="subtitle">Sign in to keep your transactions private and synced across your devices.</p><form className="auth-form" onSubmit={handleAuth}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" /></label>{error && <p className="form-error">{error}</p>}{status && <p className="form-success">{status}</p>}<button className="primary-button" type="submit">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</button></form><button className="text-button" type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setStatus('') }}>{mode === 'sign-in' ? 'Create a new account' : 'Already have an account? Sign in'}</button></section></main>

  const visibleDashboard = view === 'monthly' ? dashboard : yearlyDashboard
  const visibleItems = view === 'monthly' ? monthlyTransactions : yearTransactions

  return <main className="app-shell"><section className="finance-card">
    <header className="dashboard-header"><div><p className="eyebrow">PERSONAL FINANCE</p><h1>Finance Tracker</h1></div><button className="secondary-button" type="button" onClick={handleSignOut}>Sign out</button></header>

    <section className="dashboard-section">
      <div className="view-toggle"><button type="button" className={view === 'monthly' ? 'view-button active' : 'view-button'} onClick={() => setView('monthly')}>Monthly</button><button type="button" className={view === 'yearly' ? 'view-button active' : 'view-button'} onClick={() => setView('yearly')}>Yearly</button></div>
      <div className="month-header"><button type="button" className="month-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>‹</button><div><p className="eyebrow">{view === 'monthly' ? 'MONTHLY OVERVIEW' : 'YEARLY OVERVIEW'}</p><h2>{view === 'monthly' ? formatMonth(selectedMonth) : selectedYear}</h2></div><button type="button" className="month-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>›</button></div>
      <div className="summary-grid"><div className="summary-card"><span>Received</span><strong className="received-text">{formatCurrency(visibleDashboard.received)}</strong></div><div className="summary-card"><span>Spent</span><strong className="spent-text">{formatCurrency(visibleDashboard.spent)}</strong></div><div className="summary-card"><span>Remaining</span><strong>{formatCurrency(visibleDashboard.remaining)}</strong></div><div className="summary-card"><span>Spend ratio</span><strong>{visibleDashboard.ratio === null ? '—' : `${visibleDashboard.ratio.toFixed(1)}%`}</strong><small>Spent ÷ received</small></div></div>

      <div className="spending-card"><div className="section-heading"><div><h2>Where your money went</h2><p>Top 3 spending categories, with the rest grouped as Others.</p></div></div>{visibleDashboard.topThree.length === 0 ? <div className="empty-state">No spending recorded for {view === 'monthly' ? formatMonth(selectedMonth) : selectedYear}.</div> : <div className="category-list">{visibleDashboard.topThree.map(([name, value], index) => <div className="category-row" key={name}><div className="category-rank">{index + 1}</div><div className="category-info"><strong>{name}</strong><span>{visibleDashboard.spent > 0 ? `${((value / visibleDashboard.spent) * 100).toFixed(1)}% of spending` : ''}</span></div><strong>{formatCurrency(value)}</strong></div>)}{visibleDashboard.others > 0 && <div className="category-row others-row"><div className="category-rank">4</div><div className="category-info"><strong>Others</strong><span>{visibleDashboard.spent > 0 ? `${((visibleDashboard.others / visibleDashboard.spent) * 100).toFixed(1)}% of spending` : ''}</span></div><strong>{formatCurrency(visibleDashboard.others)}</strong></div>}</div>}</div>

      {view === 'monthly' && <div className="download-row"><button className="secondary-button download-button" type="button" onClick={downloadMonthlyCsv} disabled={monthlyTransactions.length === 0}>Download {formatMonth(selectedMonth)} CSV</button><span>Includes Date, Type, Amount, Category and Note.</span></div>}
    </section>

    <div className="transaction-section"><div className="section-heading"><div><h2>Add transaction</h2><p>Record money received or spent.</p></div><div className="status-pill">{connectionStatus}</div></div><form className="transaction-form" onSubmit={handleAddTransaction}><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><fieldset className="type-fieldset"><legend>Type</legend><div className="type-toggle"><button type="button" className={type === 'spent' ? 'type-button active spent' : 'type-button'} onClick={() => setType('spent')}>Spent</button><button type="button" className={type === 'received' ? 'type-button active received' : 'type-button'} onClick={() => setType('received')}>Received</button></div></fieldset><label>Amount<div className="amount-input"><span>₹</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Select a category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Note <span className="optional">(optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Add a note if you want to remember the details" /></label>{error && <p className="form-error">{error}</p>}{status && <p className="form-success">{status}</p>}<button className="primary-button add-button" type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add transaction'}</button></form></div>

    <div className="history-section"><div className="section-heading history-heading"><div><h2>Transaction history</h2><p>{view === 'monthly' ? 'Your transactions for this month, newest first.' : 'Your transactions for this year, newest first.'}</p></div><div className="transaction-count">{visibleItems.length} {view === 'monthly' ? 'this month' : 'this year'}</div></div>{loadingTransactions ? <div className="empty-state">Loading transactions...</div> : visibleItems.length === 0 ? <div className="empty-state">No transactions for {view === 'monthly' ? formatMonth(selectedMonth) : selectedYear}.</div> : <div className="transaction-list">{visibleItems.map((transaction) => <div className="transaction-row" key={transaction.id}><div className="transaction-main"><div className="transaction-date">{formatDate(transaction.date)}</div><div className="transaction-category">{transaction.category}</div>{transaction.note && <div className="transaction-note">{transaction.note}</div>}</div><div className={`transaction-amount ${transaction.type}`}>{transaction.type === 'spent' ? '-' : '+'} {formatCurrency(Number(transaction.amount))}</div></div>)}</div>}</div>
  </section></main>
}

export default App
