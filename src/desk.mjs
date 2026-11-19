export const SOURCES = ['rockstar', 'gaming', 'ct'];
const positive = n => Number.isFinite(n) && n > 0;
const fraction = n => Number.isFinite(n) && n >= 0 && n <= 1;
export function validateEvent(e) {
  if (!e || !Number.isFinite(e.ts) || e.ts < 0) throw new Error('Event requires a nonnegative timestamp in milliseconds');
  if (e.type === 'news') {
    if (!SOURCES.includes(e.source) || typeof e.id !== 'string' || !e.id || !Array.isArray(e.keywords) || e.keywords.some(k => typeof k !== 'string' || !k.trim())) throw new Error('Invalid news event');
  } else if (e.type === 'candidate') {
    if (!['fresh', 'momentum'].includes(e.strategy) || typeof e.mint !== 'string' || !e.mint || typeof e.keyword !== 'string' || !e.keyword.trim() || !positive(e.price)) throw new Error('Invalid candidate');
  } else if (e.type === 'price') {
    if (typeof e.mint !== 'string' || !e.mint || !positive(e.price)) throw new Error('Invalid price event');
  } else throw new Error('Unknown event type');
}
const key = s => s.trim().toLowerCase();
export function filterToken(e) {
  const reasons = [];
  if (!Number.isFinite(e.createdAt) || e.createdAt < 0 || e.createdAt > e.ts) reasons.push('unknown_or_invalid_age');
  else if (e.strategy === 'fresh' && e.ts - e.createdAt > 1_800_000) reasons.push('older_than_30_minutes');
  if (e.bundled !== false) reasons.push(e.bundled === true ? 'bundled_launch' : 'unknown_bundle_status');
  if (!fraction(e.devShare) || e.devShare > 0.02) reasons.push('dev_supply_or_unknown');
  if (!Number.isInteger(e.holders) || e.holders < 10) reasons.push('too_few_or_unknown_holders');
  if (!positive(e.liquiditySol) || e.liquiditySol < 5) reasons.push('low_or_unknown_liquidity');
  if (!Number.isFinite(e.checkedAt) || e.checkedAt > e.ts || e.ts - e.checkedAt > 60_000) reasons.push('stale_or_unknown_risk_snapshot');
  return reasons;
}
export class Desk {
  constructor({ cash = 1.2, size = 0.1, feeBps = 100, slippageBps = 100 } = {}) {
    if (!positive(cash) || !positive(size) || !Number.isFinite(feeBps) || feeBps < 0 || feeBps >= 10000 || !Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps >= 10000) throw new Error('Invalid desk configuration');
    Object.assign(this, { cash, size, fee: feeBps / 10000, slip: slippageBps / 10000, initial: cash });
    this.news = []; this.seen = new Set(); this.signals = new Map(); this.positions = new Map(); this.journal = []; this.lastTs = -1; this.realized = 0;
  }
  log(ts, action, data = {}) { this.journal.push({ ts, mode: 'paper', action, ...data }); }
  process(e) {
    validateEvent(e);
    if (e.ts < this.lastTs) throw new Error('Events must be in chronological order');
    this.lastTs = e.ts;
    this.news = this.news.filter(n => e.ts - n.ts <= 60_000);
    if (e.type === 'news') {
      const id = e.source + ':' + e.id;
      if (this.seen.has(id)) return;
      this.seen.add(id);
      const n = { ...e, keywords: [...new Set(e.keywords.map(key))] };
      this.news.push(n);
      for (const keyword of n.keywords) {
        const matches = this.news.filter(x => x.keywords.includes(keyword));
        const sources = [...new Set(matches.map(x => x.source))];
        // Reposts from one source cannot renew an old two-source signal.
        const latest = sources.map(source => Math.max(...matches.filter(x => x.source === source).map(x => x.ts))).sort((a,b) => b-a);
        if (sources.length >= 2) {
          const until = latest[1] + 60_000;
          if (until > (this.signals.get(keyword) ?? -1)) {
            this.signals.set(keyword, until);
            this.log(e.ts, 'signal', { keyword, sources, validUntil: until });
          }
        }
      }
    } else if (e.type === 'candidate') {
      const reasons = filterToken(e);
      if ((this.signals.get(key(e.keyword)) ?? -1) < e.ts) reasons.push('no_active_consensus');
      if (this.positions.has(e.mint)) reasons.push('already_open');
      const cost = this.size * (1 + this.fee);
      if (this.cash + 1e-12 < cost) reasons.push('insufficient_cash');
      if (reasons.length) return this.log(e.ts, 'reject', { mint: e.mint, reasons });
      const fill = e.price * (1 + this.slip);
      this.cash -= cost;
      this.positions.set(e.mint, { quantity: this.size / fill, cost, entry: fill, peak: e.price, mark: e.price });
      this.log(e.ts, 'buy', { mint: e.mint, strategy: e.strategy, fill, costSol: cost });
    } else {
      const p = this.positions.get(e.mint);
      if (!p) return;
      p.peak = Math.max(p.peak, e.price); p.mark = e.price;
      const reason = e.price <= p.entry * 0.6 ? 'hard_stop' : e.price <= p.peak * 0.7 ? 'trailing_stop' : null;
      if (reason) {
        const fill = e.price * (1 - this.slip);
        const proceeds = p.quantity * fill * (1 - this.fee);
        this.cash += proceeds; this.realized += proceeds - p.cost;
        this.positions.delete(e.mint);
        this.log(e.ts, 'sell', { mint: e.mint, reason, fill, proceedsSol: proceeds, pnlSol: proceeds - p.cost });
      }
    }
  }
  summary() {
    const openMark = [...this.positions.values()].reduce((s,p) => s + p.quantity * p.mark * (1-this.slip) * (1-this.fee), 0);
    return { mode: 'paper', initialSol: this.initial, cashSol: this.cash, openPositions: this.positions.size, estimatedLiquidationSol: openMark, equitySol: this.cash + openMark, realizedPnlSol: this.realized, returnPct: ((this.cash + openMark) / this.initial - 1) * 100 };
  }
}
