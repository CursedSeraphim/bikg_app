// src/components/LangChain/rdfQueryEngine.ts
/* Minimal, cached SPARQL over in-memory RDF using N3 + Comunica.
   Supports SELECT / ASK / CONSTRUCT / DESCRIBE.
   Input: raw SPARQL string OR JSON:
     {
       "query": "SELECT ...",
       "source": "instance" | "ontology" | "report" | "union",
       "limit": 50,
       "output": "table" | "turtle" | "nt"
     }
   Notes:
   - Caps results to keep LLM context small.
   - Caches parsed stores by cheap hashes to avoid reparsing on every call.
*/

import { QueryEngine } from '@comunica/query-sparql';
import { Parser, Quad, Store, Writer } from 'n3';

type SourceKind = 'ontology' | 'instance' | 'report' | 'union';
type OutputKind = 'table' | 'turtle' | 'nt';

type QueryEnvelope = {
  query: string;
  source?: SourceKind;
  limit?: number;     // hard cap for returned rows/quads
  output?: OutputKind; // default: table for SELECT/ASK, turtle for CONSTRUCT/DESCRIBE
};

type CombinedState = {
  rdfString?: string;                // ontology + SHACL shapes
  originalInstanceData?: string;     // KG instance data
  originalViolationReport?: string;  // SHACL validation report
};

const DEFAULT_SELECT_LIMIT = 50;
const DEFAULT_QUAD_LIMIT = 200;

const engine = new QueryEngine();

// Simple fast string hash (djb2)
function hash(s: string | undefined): string {
  if (!s) return '0';
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  // force unsigned 32-bit, return as hex
  return (h >>> 0).toString(16);
}

// Try a few RDF syntaxes; return an N3.Store (RDFJS Store)
function parseToStore(text?: string): Store {
  const store = new Store();
  if (!text || !text.trim()) return store;

  const tryFormats = [
    undefined,                    // let N3 guess
    'text/turtle',
    'application/trig',
    'application/n-triples',
    'application/n-quads',
  ];

  let lastErr: unknown = null;
  for (const fmt of tryFormats) {
    try {
      const parser = new Parser(fmt ? { format: fmt } : undefined as any);
      const quads = parser.parse(text);
      store.addQuads(quads);
      return store;
    } catch (e) {
      lastErr = e;
    }
  }
  // If all parsers failed:
  throw new Error(`RDF parse failed; unsupported syntax or invalid data. ${String(lastErr)}`);
}

const cache = {
  ontologyHash: '' as string,
  instanceHash: '' as string,
  reportHash: '' as string,
  ontology: new Store() as Store,
  instance: new Store() as Store,
  report: new Store() as Store,
};

function ensureStores(c: CombinedState) {
  const hOnt = hash(c.rdfString);
  const hInst = hash(c.originalInstanceData);
  const hRep = hash(c.originalViolationReport);

  if (hOnt !== cache.ontologyHash) {
    cache.ontology = parseToStore(c.rdfString);
    cache.ontologyHash = hOnt;
  }
  if (hInst !== cache.instanceHash) {
    cache.instance = parseToStore(c.originalInstanceData);
    cache.instanceHash = hInst;
  }
  if (hRep !== cache.reportHash) {
    cache.report = parseToStore(c.originalViolationReport);
    cache.reportHash = hRep;
  }
}

function pickSources(source: SourceKind | undefined) {
  // Comunica accepts RDFJS sources; unioning by passing an array
  switch (source) {
    case 'ontology':
      return [{ type: 'rdfjsSource', value: cache.ontology } as any];
    case 'instance':
      return [{ type: 'rdfjsSource', value: cache.instance } as any];
    case 'report':
      return [{ type: 'rdfjsSource', value: cache.report } as any];
    case 'union':
    default:
      return [
        { type: 'rdfjsSource', value: cache.ontology } as any,
        { type: 'rdfjsSource', value: cache.instance } as any,
        { type: 'rdfjsSource', value: cache.report } as any,
      ];
  }
}

function inferKind(q: string): 'SELECT' | 'ASK' | 'CONSTRUCT' | 'DESCRIBE' {
  const s = q.trim().toUpperCase();
  if (s.startsWith('SELECT')) return 'SELECT';
  if (s.startsWith('ASK')) return 'ASK';
  if (s.startsWith('CONSTRUCT')) return 'CONSTRUCT';
  if (s.startsWith('DESCRIBE')) return 'DESCRIBE';
  // crude heuristic: treat unknown as SELECT to avoid huge returns
  return 'SELECT';
}

function maybeAddLimit(query: string, limit: number): string {
  // Add LIMIT only for SELECT queries without explicit LIMIT.
  const upper = query.toUpperCase();
  if (!upper.startsWith('SELECT')) return query;
  if (/\bLIMIT\b\s+\d+/i.test(upper)) return query;
  return `${query.trim()}\nLIMIT ${limit}`;
}

async function bindingsToTable(stream: any, cap: number) {
  const rows: Record<string, string>[] = [];
  let count = 0;

  // Columns: collect var names as we go (without leading '?')
  const colSet = new Set<string>();
  for await (const b of stream) {
    // b is RDF/JS Bindings (Map-like)
    const row: Record<string, string> = {};
    // Iterate entries
    for (const [v, term] of (b as any)) {
      const varName = typeof v === 'string'
        ? v.replace(/^\?/, '')
        : (v?.value ?? String(v)).replace(/^\?/, '');
      colSet.add(varName);
      const val = term?.value ?? String(term);
      // Add datatype/lang if useful
      if (term?.termType === 'Literal' && term?.datatype?.value) {
        row[varName] = `${val}^^<${term.datatype.value}>`;
      } else if (term?.termType === 'Literal' && term?.language) {
        row[varName] = `"${val}"@${term.language}`;
      } else if (term?.termType) {
        // NamedNode/BlankNode/DefaultGraph/Quad term.value exists
        row[varName] = term.value ?? String(term);
      } else {
        row[varName] = String(val);
      }
    }
    rows.push(row);
    count++;
    if (count >= cap) break;
  }
  const columns = Array.from(colSet);
  return JSON.stringify({ type: 'table', columns, rows }, null, 2);
}

async function quadsToSerialization(stream: any, cap: number, fmt: OutputKind): Promise<string> {
  const quads: Quad[] = [];
  let count = 0;
  for await (const q of stream) {
    quads.push(q as Quad);
    count++;
    if (count >= cap) break;
  }
  if (fmt === 'nt') {
    // Plain N-Triples
    return quads.map(q => {
      const s = q.subject.termType === 'NamedNode' ? `<${q.subject.value}>` : `_:${(q.subject as any).value}`;
      const p = `<${q.predicate.value}>`;
      const o = (() => {
        if (q.object.termType === 'NamedNode') return `<${q.object.value}>`;
        if (q.object.termType === 'BlankNode') return `_:${(q.object as any).value}`;
        // Literal
        const lit = q.object as any;
        const escaped = JSON.stringify(lit.value); // quotes & escapes
        if (lit.language) return `${escaped}@${lit.language}`;
        if (lit.datatype?.value) return `${escaped}^^<${lit.datatype.value}>`;
        return escaped;
      })();
      return `${s} ${p} ${o} .`;
    }).join('\n');
  }
  // Turtle using N3.Writer (prefix inference is minimal; IRIs will appear full if no prefixes)
  const writer = new Writer({ format: 'Turtle' });
  writer.addQuads(quads);
  return new Promise<string>((resolve, reject) => {
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result ?? '');
    });
  });
}

export async function sparqlQuery(rawInput: string, combined: CombinedState): Promise<string> {
  ensureStores(combined);

  let env: QueryEnvelope;
  if (rawInput.trim().startsWith('{')) {
    try {
      env = JSON.parse(rawInput) as QueryEnvelope;
    } catch {
      throw new Error('Invalid JSON envelope for SPARQL tool.');
    }
  } else {
    env = { query: rawInput };
  }

  const qKind = inferKind(env.query);
  const limitRows = Math.max(1, env.limit ?? (qKind === 'SELECT' || qKind === 'ASK' ? DEFAULT_SELECT_LIMIT : DEFAULT_QUAD_LIMIT));
  const sources = pickSources(env.source);

  // Add default LIMIT only for SELECT without LIMIT to keep outputs small
  const qPrepared = qKind === 'SELECT' ? maybeAddLimit(env.query, limitRows) : env.query;

  if (qKind === 'ASK') {
    const ok = await engine.queryBoolean(qPrepared, { sources });
    return JSON.stringify({ type: 'boolean', value: ok }, null, 2);
  }

  if (qKind === 'SELECT') {
    const stream = await engine.queryBindings(qPrepared, { sources });
    return bindingsToTable(stream, limitRows);
  }

  // CONSTRUCT / DESCRIBE -> quad stream
  const stream = await engine.queryQuads(qPrepared, { sources });
  const outFmt: OutputKind = env.output ?? 'turtle';
  return quadsToSerialization(stream, limitRows, outFmt);
}
