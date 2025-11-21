// src/components/LangChain/rdfQueryEngine.ts
/* Minimal, cached SPARQL over in-memory RDF using N3 + Comunica.
   Strictly typed using RDFJS types + Comunica 4.x.
*/

import { QueryEngine } from '@comunica/query-sparql';
import type { BindingsStream, QuerySourceUnidentified } from '@comunica/types';

import { Parser, Store, Writer } from 'n3';

import type { BlankNode, Literal, NamedNode, Quad, Quad_Object, Quad_Subject, Term } from '@rdfjs/types';

type SourceKind = 'ontology' | 'instance' | 'report' | 'union';
type OutputKind = 'table' | 'turtle' | 'nt';
type QueryKind = 'SELECT' | 'ASK' | 'CONSTRUCT' | 'DESCRIBE';

type QueryEnvelope = {
  query: string;
  source?: SourceKind;
  limit?: number;
  output?: OutputKind;
};

type CombinedState = {
  rdfString?: string;
  originalInstanceData?: string;
  originalViolationReport?: string;
};

const DEFAULT_SELECT_LIMIT = 50;
const DEFAULT_QUAD_LIMIT = 200;

const engine = new QueryEngine();

/* eslint-disable no-bitwise */
function hash(s: string | undefined): string {
  if (!s) return '0';
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h << 5) + h + s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

// --- PARSING -------------------------------------------------------------

function parseToStore(text?: string): Store {
  const store = new Store();
  if (!text || !text.trim()) return store;

  const tryFormats: (string | undefined)[] = [undefined, 'text/turtle', 'application/trig', 'application/n-triples', 'application/n-quads'];

  let lastErr: unknown = null;
  for (const fmt of tryFormats) {
    try {
      const parser = fmt ? new Parser({ format: fmt }) : new Parser();
      const quads = parser.parse(text);
      store.addQuads(quads);
      return store;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(`RDF parse failed: ${String(lastErr)}`);
}

// --- CACHE ---------------------------------------------------------------

const cache = {
  ontologyHash: '',
  instanceHash: '',
  reportHash: '',
  ontology: new Store(),
  instance: new Store(),
  report: new Store(),
};

function ensureStores(c: CombinedState): void {
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

// --- UTILITIES -----------------------------------------------------------

function inferKind(q: string): QueryKind {
  const s = q.trim().toUpperCase();
  if (s.startsWith('SELECT')) return 'SELECT';
  if (s.startsWith('ASK')) return 'ASK';
  if (s.startsWith('CONSTRUCT')) return 'CONSTRUCT';
  if (s.startsWith('DESCRIBE')) return 'DESCRIBE';
  return 'SELECT';
}

function maybeAddLimit(query: string, limit: number): string {
  const upper = query.toUpperCase();
  if (!upper.startsWith('SELECT')) return query;
  if (/\bLIMIT\s+\d+/i.test(upper)) return query;
  return `${query.trim()}\nLIMIT ${limit}`;
}

function pickSources(source: SourceKind | undefined): [QuerySourceUnidentified, ...QuerySourceUnidentified[]] {
  // always return at least one element to satisfy the tuple typing
  switch (source) {
    case 'ontology':
      return [{ type: 'rdfjsSource', value: cache.ontology }];
    case 'instance':
      return [{ type: 'rdfjsSource', value: cache.instance }];
    case 'report':
      return [{ type: 'rdfjsSource', value: cache.report }];
    case 'union':
    default:
      return [
        { type: 'rdfjsSource', value: cache.ontology },
        { type: 'rdfjsSource', value: cache.instance },
        { type: 'rdfjsSource', value: cache.report },
      ];
  }
}

// --- TERM SERIALIZATION --------------------------------------------------

function termToString(term: Term): string {
  switch (term.termType) {
    case 'NamedNode':
      return term.value;

    case 'BlankNode':
      return `_:${term.value}`;

    case 'Literal': {
      const lit = term as Literal;
      const escaped = JSON.stringify(lit.value);
      if (lit.language) return `${escaped}@${lit.language}`;
      if (lit.datatype) return `${escaped}^^<${lit.datatype.value}>`;
      return escaped;
    }

    default:
      return term.value;
  }
}

function quadComponentToNT(term: NamedNode | BlankNode | Literal): string {
  if (term.termType === 'NamedNode') return `<${term.value}>`;
  if (term.termType === 'BlankNode') return `_:${term.value}`;

  const lit = term as Literal;
  const escaped = JSON.stringify(lit.value);
  if (lit.language) return `${escaped}@${lit.language}`;
  if (lit.datatype) return `${escaped}^^<${lit.datatype.value}>`;
  return escaped;
}

// --- RESULT HANDLING -----------------------------------------------------

async function bindingsToTable(stream: BindingsStream, cap: number): Promise<string> {
  const rows: Record<string, string>[] = [];
  const colSet = new Set<string>();

  let count = 0;

  for await (const b of stream) {
    const row: Record<string, string> = {};

    b.forEach((term, variable) => {
      // variable is RDF.Variable, e.g. { termType: "Variable", value: "s" }
      const varName = variable.value;

      colSet.add(varName);
      row[varName] = termToString(term);
    });

    rows.push(row);
    count++;
    if (count >= cap) break;
  }

  return JSON.stringify(
    {
      type: 'table',
      columns: [...colSet],
      rows,
    },
    null,
    2,
  );
}

async function quadsToSerialization(stream: AsyncIterable<Quad>, cap: number, fmt: OutputKind): Promise<string> {
  const quads: Quad[] = [];
  let count = 0;

  for await (const q of stream) {
    quads.push(q);
    count++;
    if (count >= cap) break;
  }

  if (fmt === 'nt') {
    return quads
      .map((q) => {
        const sTerm = q.subject as Quad_Subject;
        const oTerm = q.object as Quad_Object;

        if (sTerm.termType === 'Variable') {
          throw new Error('Unexpected variable in quad subject.');
        }
        if (oTerm.termType === 'Variable') {
          throw new Error('Unexpected variable in quad object.');
        }

        const s = quadComponentToNT(sTerm as NamedNode | BlankNode | Literal);
        const p = `<${q.predicate.value}>`;
        const o = quadComponentToNT(oTerm as NamedNode | BlankNode | Literal);
        return `${s} ${p} ${o} .`;
      })
      .join('\n');
  }

  const writer = new Writer({ format: 'Turtle' });
  writer.addQuads(quads);

  return new Promise((resolve, reject) => {
    writer.end((err, result) => (err ? reject(err) : resolve(result ?? '')));
  });
}

// --- MAIN ENTRY ----------------------------------------------------------

export async function sparqlQuery(rawInput: string, combined: CombinedState): Promise<string> {
  ensureStores(combined);

  const trimmed = rawInput.trim();
  const env: QueryEnvelope = trimmed.startsWith('{') ? JSON.parse(trimmed) : { query: rawInput };

  const qKind = inferKind(env.query);

  const limitRows = Math.max(1, env.limit ?? (qKind === 'SELECT' || qKind === 'ASK' ? DEFAULT_SELECT_LIMIT : DEFAULT_QUAD_LIMIT));

  const sources = pickSources(env.source);

  const qPrepared = qKind === 'SELECT' ? maybeAddLimit(env.query, limitRows) : env.query;

  if (qKind === 'ASK') {
    const ok = await engine.queryBoolean(qPrepared, { sources });
    return JSON.stringify({ type: 'boolean', value: ok }, null, 2);
  }

  if (qKind === 'SELECT') {
    const bindings = await engine.queryBindings(qPrepared, { sources });
    return bindingsToTable(bindings, limitRows);
  }

  const quadStream = await engine.queryQuads(qPrepared, { sources });
  const outFmt: OutputKind = env.output ?? 'turtle';
  return quadsToSerialization(quadStream, limitRows, outFmt);
}
