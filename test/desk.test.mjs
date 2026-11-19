import test from 'node:test';
import assert from 'node:assert/strict';
import { Desk, filterToken } from '../src/desk.mjs';
import { classify } from '../src/grok.mjs';
const news = (ts, source, id) => ({ type: 'news', ts, source, id, keywords: ['GTA6'] });
const candidate = (overrides = {}) => ({ type: 'candidate', ts: 2000, mint: 'fixture', keyword: 'gta6', strategy: 'fresh', price: 1, createdAt: 0, checkedAt: 2000, bundled: false, devShare: 0, holders: 100, liquiditySol: 10, ...overrides });
function ready(options) { const d = new Desk(options); d.process(news(0, 'rockstar', 'a')); d.process(news(1000, 'ct', 'b')); return d; }
test('two distinct sources required; duplicate source does not count', () => {
  const d = new Desk(); d.process(news(0,'ct','a')); d.process(news(1000,'ct','b')); d.process(candidate());
  assert.equal(d.positions.size,0); assert.ok(d.journal.at(-1).reasons.includes('no_active_consensus'));
});
test('consensus boundary expires based on the older distinct source', () => {
  const d = ready(); d.process(candidate({ts:60000,checkedAt:60000})); assert.equal(d.positions.size,1);
  const expired = ready(); expired.process(news(59000,'ct','c')); expired.process(candidate({ts:60001,checkedAt:60001})); assert.equal(expired.positions.size,0);
});
test('duplicate news cannot refresh consensus', () => {
  const d=ready(); d.process(news(59000,'rockstar','a')); d.process(candidate({ts:61000,checkedAt:61000})); assert.equal(d.positions.size,0);
});
test('risk rejects unknown, stale and bundled data', () => {
  assert.ok(filterToken(candidate({bundled:null})).includes('unknown_bundle_status'));
  assert.ok(filterToken(candidate({bundled:true})).includes('bundled_launch'));
  assert.ok(filterToken(candidate({devShare:null})).includes('dev_supply_or_unknown'));
  assert.ok(filterToken(candidate({checkedAt:-100000})).includes('stale_or_unknown_risk_snapshot'));
});
test('only fresh strategy has maximum age', () => {
  const old = {ts:3600000,checkedAt:3600000};
  assert.ok(filterToken(candidate(old)).includes('older_than_30_minutes'));
  assert.deepEqual(filterToken(candidate({...old,strategy:'momentum'})),[]);
});
test('trailing stop sells at observed gap price and accounts for costs', () => {
  const d=ready(); d.process(candidate()); d.process({type:'price',ts:3000,mint:'fixture',price:2}); d.process({type:'price',ts:4000,mint:'fixture',price:1.3});
  assert.equal(d.positions.size,0); assert.equal(d.journal.at(-1).reason,'trailing_stop');
  const expected=1.2-.101+(.1/1.01)*1.3*.99*.99;
  assert.ok(Math.abs(d.cash-expected)<1e-12); assert.ok(Math.abs(d.summary().realizedPnlSol-(expected-1.2))<1e-12);
});
test('hard stop and duplicate entry protection', () => {
  const d=ready(); d.process(candidate()); d.process(candidate()); assert.ok(d.journal.at(-1).reasons.includes('already_open'));
  d.process({type:'price',ts:3000,mint:'fixture',price:.5}); assert.equal(d.journal.at(-1).reason,'hard_stop');
});
test('open positions are marked, not counted as realized profit', () => {
  const d=ready(); d.process(candidate()); assert.equal(d.summary().realizedPnlSol,0); assert.equal(d.summary().openPositions,1); assert.ok(d.summary().equitySol<1.2);
});
test('insufficient cash, invalid prices and out-of-order input rejected', () => {
  const d=ready({cash:.1}); d.process(candidate()); assert.ok(d.journal.at(-1).reasons.includes('insufficient_cash'));
  assert.throws(()=>d.process(candidate({price:NaN})),/Invalid candidate/);
  assert.throws(()=>d.process(news(0,'ct','old')),/chronological/);
});
test('Grok parses response and rejects unexpected labels', async () => {
  const opts={apiKey:'test',model:'test',fetchImpl:async (url,init)=> {
    assert.equal(url,'https://api.x.ai/v1/responses'); assert.equal(JSON.parse(init.body).model,'test');
    return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'["gta6"]'}]}]})};
  }};
  assert.deepEqual(await classify('fixture',opts),['gta6']);
  await assert.rejects(classify('fixture',{...opts,fetchImpl:async()=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'["buy now"]'}]}]})})}),/invalid labels/);
  await assert.rejects(classify('fixture',{...opts,fetchImpl:async()=>({ok:false,status:429})}),/HTTP 429/);
});
test('irrelevant news cannot create consensus', () => {
  const d=new Desk(); d.process({...news(0,'ct','a'),keywords:[]}); d.process({...news(1,'gaming','b'),keywords:[]}); assert.equal(d.signals.size,0);
});
