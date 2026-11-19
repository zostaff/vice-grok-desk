import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Desk } from './desk.mjs';
import { classify } from './grok.mjs';
async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args[0].startsWith('--') || args.slice(1).some(x => x !== '--grok')) throw new Error('Usage: npm run replay -- path/to/events.jsonl [--grok]');
  const events = (await readFile(resolve(args[0]), 'utf8')).split(/\r?\n/).filter(x => x.trim()).map((line, i) => {
    try { return JSON.parse(line); } catch { throw new Error(`Invalid JSON on line ${i+1}`); }
  });
  const desk = new Desk();
  console.log('VICE GROK DESK / PAPER REPLAY / no transactions submitted');
  if (args[0].includes('demo-events')) console.log('SYNTHETIC FIXTURES — not historical performance');
  for (const event of events) {
    if (args.includes('--grok') && event.type === 'news') {
      if (typeof event.text !== 'string') throw new Error('Grok classification requires news.text');
      event.keywords = await classify(event.text);
    }
    desk.process(event);
  }
  const dir = resolve('runs', new Date().toISOString().replaceAll(':', '-') + '-' + process.pid);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'journal.jsonl'), desk.journal.map(x => JSON.stringify(x)).join('\n') + '\n');
  await writeFile(resolve(dir, 'summary.json'), JSON.stringify(desk.summary(), null, 2) + '\n');
  for (const row of desk.journal) console.log(`${new Date(row.ts).toISOString()}  ${row.action.toUpperCase().padEnd(7)} ${row.mint ?? row.keyword} ${row.reasons?.join(', ') ?? row.reason ?? ''}`);
  console.log(JSON.stringify(desk.summary(), null, 2));
  console.log(`Journal: ${dir}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
