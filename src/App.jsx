import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { FaCrown, FaWallet, FaShoppingBag, FaStar, FaBolt } from 'react-icons/fa'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

// --- Google Sheets configuration ---
const SHEET_ID = import.meta.env.VITE_SHEET_ID || '1QR8OYiGOqTP9LsFxUlIaDnaai9tEdzipT62e2vfFhug' // Your sheet ID
const SHEET_NAME = import.meta.env.VITE_SHEET_NAME || 'Sheet1' // Change to your exact tab name if different

// Fetch rows from Google Sheets using the public gviz API (no API key needed if the sheet is viewable to anyone with the link)
async function fetchSheet(sheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  // The response wraps JSON in a function call — extract the JSON substring
  const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
  const data = JSON.parse(jsonStr)
  const cols = data.table.cols.map((c) => c.label || '')
  const rows = data.table.rows.map((r) => {
    const obj = {}
    cols.forEach((label, i) => {
      const cell = r.c[i]
      // Prefer formatted value if available, else raw value
      const v = cell?.f ?? cell?.v ?? null
      obj[label] = v
    })
    return obj
  })
  return { cols, rows }
}

// Helpers to find columns by common names
const columnSynonyms = {
  date: ['date', 'day', 'order date', 'trans date'],
  item: ['item', 'product', 'name', 'menu item'],
  quantity: ['quantity', 'qty', 'count', 'sold', 'units'],
  revenue: ['revenue', 'amount', 'total', 'sales', 'price', 'gross'],
  category: ['category', 'type', 'group', 'section'],
}

function normalizeColNames(cols) {
  const result = {}
  for (const [key, synonyms] of Object.entries(columnSynonyms)) {
    for (const col of cols) {
      if (synonyms.some((syn) => col.toLowerCase().includes(syn))) {
        result[key] = col
        break
      }
    }
  }
  return result
}

const parseNumber = (val) => {
  if (val === null || val === undefined) return 0
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function computeAnalytics(rows, cols) {
  if (!rows || rows.length === 0) return null
  const colmap = normalizeColNames(cols)

  const by = () => new Map()
  const sumByMap = (map, k, add) => map.set(k, (map.get(k) || 0) + add)

  let totalRevenue = 0
  let totalQty = 0
  const byItem = by()
  const byCategory = by()
  const byDateQty = by()
  const byDateRevenue = by()
  const byDateItem = new Map() // date -> Map(item -> qty)
  const dateSet = new Set()

  for (const r of rows) {
    const qty = colmap.quantity ? parseNumber(r[colmap.quantity]) : 1
    const revenue = colmap.revenue ? parseNumber(r[colmap.revenue]) : 0
    const item = colmap.item ? r[colmap.item] : 'Unknown'
    const category = colmap.category ? r[colmap.category] : 'Other'
    const dateVal = colmap.date ? r[colmap.date] : null

    totalRevenue += revenue
    totalQty += qty
    sumByMap(byItem, item, qty)
    sumByMap(byCategory, category || 'Other', qty)

    if (dateVal) {
      const d = new Date(dateVal)
      const key = isNaN(d) ? String(dateVal) : d.toISOString().slice(0, 10)
      dateSet.add(key)
      sumByMap(byDateQty, key, qty)
      sumByMap(byDateRevenue, key, revenue)
      let m = byDateItem.get(key)
      if (!m) { m = new Map(); byDateItem.set(key, m) }
      m.set(item, (m.get(item) || 0) + qty)
    }
  }

  let bestItem = '—'
  let bestQty = -1
  for (const [k, v] of byItem.entries()) {
    if (v > bestQty) { bestQty = v; bestItem = k }
  }

  const daysCount = Math.max(dateSet.size, 1)
  const dailyAvg = totalRevenue / daysCount

  // Build pie as item distribution (top items) so each slice is an item
  const itemsEntries = Array.from(byItem.entries()).sort((a, b) => b[1] - a[1])
  const topItems = itemsEntries.slice(0, 8).map(([name, value]) => ({ name, value }))
  const otherSum = itemsEntries.slice(8).reduce((s, [, v]) => s + v, 0)
  const pieData = otherSum > 0 ? [...topItems, { name: 'Others', value: otherSum }] : topItems

  const sortedDates = Array.from(dateSet.values()).sort()
  const barData = sortedDates.slice(-7).map((name) => ({ name, sold: byDateQty.get(name) || 0 }))
  const revData = sortedDates.slice(-7).map((name) => ({ name, revenue: byDateRevenue.get(name) || 0 }))

  const dailySummaries = sortedDates.reverse().map((date) => {
    const itemsMap = byDateItem.get(date) || new Map()
    const topItems = Array.from(itemsMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([item, qty]) => ({ item, qty }))
    return {
      date,
      revenue: byDateRevenue.get(date) || 0,
      itemsSold: byDateQty.get(date) || 0,
      topItems,
    }
  })

  return {
    kpis: [
      { label: 'Total Revenue', value: `₹${Math.round(totalRevenue).toLocaleString('en-IN')}`, delta: '', icon: FaWallet },
      { label: 'Items Sold', value: `${Math.round(totalQty)}`, delta: '', icon: FaShoppingBag },
      { label: 'Best Selling', value: String(bestItem), delta: 'Most Popular', icon: FaStar },
      { label: 'Daily Average', value: `₹${Math.round(dailyAvg).toLocaleString('en-IN')}`, delta: '', icon: FaBolt },
    ],
    pieData,
    barData,
    revData,
    dailySummaries,
  }
}

const FALLBACK = {
  kpis: [
    { label: 'Total Revenue', value: '₹15,150', delta: '+12.5%', icon: FaWallet },
    { label: 'Items Sold', value: '67', delta: '+8.2%', icon: FaShoppingBag },
    { label: 'Best Selling', value: 'Momo', delta: 'Most Popular', icon: FaStar },
    { label: 'Daily Average', value: '₹3,788', delta: '+5.7%', icon: FaBolt },
  ],
  pieData: [
    { name: 'Coffee', value: 45 },
    { name: 'Snacks', value: 25 },
    { name: 'Desserts', value: 18 },
    { name: 'Beverages', value: 12 },
  ],
  barData: [
    { name: 'Mon', sold: 20 },
    { name: 'Tue', sold: 15 },
    { name: 'Wed', sold: 18 },
    { name: 'Thu', sold: 22 },
    { name: 'Fri', sold: 12 },
    { name: 'Sat', sold: 25 },
    { name: 'Sun', sold: 10 },
  ],
  revData: [
    { name: 'Mon', revenue: 3200 },
    { name: 'Tue', revenue: 3450 },
    { name: 'Wed', revenue: 2600 },
    { name: 'Thu', revenue: 2900 },
    { name: 'Fri', revenue: 3100 },
    { name: 'Sat', revenue: 3700 },
    { name: 'Sun', revenue: 2500 },
  ],
  dailySummaries: [
    {
      date: '2025-08-10',
      revenue: 3100,
      itemsSold: 28,
      topItems: [
        { item: 'Cappuccino', qty: 8 },
        { item: 'Veg Sandwich', qty: 6 },
        { item: 'Brownie', qty: 5 },
      ],
    },
    {
      date: '2025-08-11',
      revenue: 2850,
      itemsSold: 24,
      topItems: [
        { item: 'Momo', qty: 7 },
        { item: 'Latte', qty: 6 },
        { item: 'Iced Tea', qty: 4 },
      ],
    },
    {
      date: '2025-08-12',
      revenue: 3320,
      itemsSold: 30,
      topItems: [
        { item: 'Espresso', qty: 9 },
        { item: 'Chocolate Cake', qty: 5 },
        { item: 'French Fries', qty: 5 },
      ],
    },
  ],
}

const COLORS = ['#10b981', '#34d399', '#059669', '#047857']

function StatCard({ label, value, delta, icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="kpi-label">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="kpi-value">{value}</span>
            {delta && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-600/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-600/20 dark:border-emerald-400/20">{delta}</span>
            )}
          </div>
        </div>
        <div className="h-9 w-9 rounded-full bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-600/20 dark:border-emerald-500/20">
          <Icon className="text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
    </div>
  )
}

function App() {
  const [live, setLive] = useState({ loading: true, error: null, rows: [], cols: [] })
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    let disposed = false
    setLive((s) => ({ ...s, loading: true, error: null }))
    fetchSheet(SHEET_ID, SHEET_NAME)
      .then(({ rows, cols }) => {
        if (!disposed) setLive({ loading: false, error: null, rows, cols })
      })
      .catch((err) => {
        if (!disposed) setLive({ loading: false, error: err.message || String(err), rows: [], cols: [] })
      })
    return () => {
      disposed = true
    }
  }, [refetchKey])

  // theme persistence and toggle
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'dark'
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // Theme-aware chart styles
  const axisColor = theme === 'dark' ? '#9ca3af' : '#6b7280'
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const tooltipBg = theme === 'dark' ? '#0f1713' : '#ffffff'
  const tooltipText = theme === 'dark' ? '#e5e7eb' : '#111827'
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,39,0.08)'

  const analytics = useMemo(() => computeAnalytics(live.rows, live.cols) || FALLBACK, [live])
  const { kpis = [], pieData = [], barData = [], revData = [], dailySummaries = [] } = analytics

  const fmtINR = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`
  const fmtDate = (s) => {
    const d = new Date(s)
    return isNaN(d) ? s : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })
  }

  return (
    <div>
      {/* Header */}
      <header className="border-b border-border/60 bg-gradient-to-b from-emerald-50/80 to-transparent dark:from-emerald-500/10">
        <div className="container-max py-10">
          <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="order-2 sm:order-1">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-textPrimary dark:text-textPrimary-dark">
                Welcome to <span className="text-emerald-600 dark:text-emerald-400">Luma Cafe</span>
              </h1>
              <p className="mt-3 text-textSecondary dark:text-textSecondary-dark max-w-2xl">
                Transform your cafe operations with our comprehensive sales dashboard and analytics platform.
              </p>
            </div>
            <div className="order-1 sm:order-2 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-600/20 dark:border-emerald-500/20">
                <FaCrown className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <button
                className="text-sm px-3 py-1 rounded-md border border-border dark:border-border-dark bg-white/70 hover:bg-white text-emerald-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

          {/* Live status bar */}
          <div className="mt-6 flex items-center justify-between text-sm">
            <div className={`flex items-center gap-2 ${live.error ? 'text-red-400' : live.loading ? 'text-textSecondary dark:text-textSecondary-dark' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              <span>
                {live.loading ? 'Connecting to Google Sheets…' : live.error ? `Connection failed: ${live.error}` : 'Live data connected'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-textSecondary dark:text-textSecondary-dark hover:text-textPrimary dark:hover:text-textPrimary-dark underline"
              >
                Open Sheet
              </a>
              <button
                className="text-sm px-3 py-1 rounded-md bg-white/70 hover:bg-white text-emerald-700 border border-border dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-border-dark"
                onClick={() => setRefetchKey((x) => x + 1)}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <main className="container-max py-10 space-y-8">
        <section>
          <h2 className="sr-only">Key Performance Metrics</h2>
          {live.loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-3 w-24 rounded bg-black/10 dark:bg-white/10 mb-3" />
                  <div className="h-6 w-32 rounded bg-black/10 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {kpis.map((k) => (
                <div key={k.label} className="transition-shadow hover:shadow-lg hover:shadow-emerald-500/10">
                  <StatCard {...k} />
                </div>
              ))}
            </div>
          )}
        </section>

        <h3 className="text-center text-xs uppercase tracking-wide text-textSecondary dark:text-textSecondary-dark">Sales Analytics</h3>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
          {live.loading ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="card p-5">
                  <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10 mb-4 animate-pulse" />
                  <div className="h-72 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="card p-5">
                <h3 className="text-sm text-textSecondary dark:text-textSecondary-dark mb-4">Item Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` , borderRadius: 12, color: tooltipText }}
                        labelStyle={{ color: tooltipText }}
                      />
                      <Pie data={(pieData || []).map(p => ({ name: p.name || 'Other', value: Number(p.value) || 0 }))} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        {(pieData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {(pieData || []).map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-textSecondary">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm text-textSecondary dark:text-textSecondary-dark mb-4">Daily Items Sold</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" stroke={axisColor} tickLine={false} axisLine={{ stroke: gridColor }} />
                      <YAxis stroke={axisColor} tickLine={false} axisLine={{ stroke: gridColor }} />
                      <Tooltip
                        contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` , borderRadius: 12, color: tooltipText }}
                        labelStyle={{ color: tooltipText }}
                      />
                      <Bar dataKey="sold" fill="#34d399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Revenue Trend */}
        <section className="mt-6">
          <div className="card p-5">
            <h3 className="text-sm text-textSecondary dark:text-textSecondary-dark mb-4">Revenue Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" stroke={axisColor} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <YAxis stroke={axisColor} tickFormatter={fmtINR} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <Tooltip
                    formatter={(value) => fmtINR(value)}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` , borderRadius: 12, color: tooltipText }}
                    labelStyle={{ color: tooltipText }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Daily Sales Summary */}
        <section className="mt-6">
          <h3 className="text-center text-xs uppercase tracking-wide text-textSecondary dark:text-textSecondary-dark mb-3">Daily Sales Summary</h3>
          <div className="space-y-3">
            {live.loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card px-4 py-3">
                  <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10 mb-3 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-8 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              dailySummaries.map((d, idx) => (
                <details key={idx} className="card">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <span className="text-textPrimary dark:text-textPrimary-dark">{fmtDate(d.date)}</span>
                    <span className="text-sm text-textSecondary dark:text-textSecondary-dark">Revenue: <span className="text-textPrimary dark:text-textPrimary-dark">{fmtINR(d.revenue)}</span> · Items: <span className="text-textPrimary dark:text-textPrimary-dark">{d.itemsSold}</span></span>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-textSecondary dark:text-textSecondary-dark">
                    <p className="mb-2">Top items</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {d.topItems.map((t, i) => (
                        <li key={i} className="flex items-center justify-between bg-black/[0.04] dark:bg-white/5 rounded-md px-3 py-2 border border-black/10 dark:border-white/10">
                          <span>{t.item}</span>
                          <span className="text-textPrimary dark:text-textPrimary-dark">{t.qty}</span>
                        </li>
                      ))}
                      {d.topItems.length === 0 && <li className="text-textSecondary dark:text-textSecondary-dark">No breakdown available</li>}
                    </ul>
                  </div>
                </details>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
