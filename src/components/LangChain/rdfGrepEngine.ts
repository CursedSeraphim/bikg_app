// src/components/LangChain/rdfGrepEngine.ts
/*
  Parser-free "grep around" search over RDF text strings stored in Redux.
  - Searches one or more sources: ontology, instance, report, or union
  - Returns line-numbered snippets with N lines of context around matches
  - Extracts IRI / CURIE candidates near matches to help the LLM disambiguate
  - Designed to be stable and fast even if RDF is malformed or incomplete

  Input (raw string or JSON string):
    {
      "q": "frodo",
      "source": "instance" | "ontology" | "report" | "union",
      "caseSensitive": false,
      "patternIsRegex": false,
      "context": 2,                // lines before/after
      "limitMatches": 50,          // total matches across all sources
      "scanCapCharsPerSource": 0,  // 0 = unlimited; otherwise truncate each source to first N chars
      "dedupeLines": true          // dedupe identical line+source combos
    }

  Output (JSON string):
    {
      "type": "grep_result",
      "q": "...",
      "caseSensitive": false,
      "patternIsRegex": false,
      "stats": {
        "searched": { "ontology": N, "instance": M, "report": K },
        "matches":  { "ontology": A, "instance": B, "report": C },
        "truncated": { "ontology": false, "instance": false, "report": false }
      },
      "matches": [
        {
          "source": "instance",
          "line": 123,          // 1-based
          "col": 18,            // 0-based column of first occurrence on that line
          "lineText": " ... ",
          "before": ["...","..."],
          "after":  ["...","..."]
        },
        ...
      ],
      "iriCandidates": [
        "http://example.org/lotr#FrodoBaggins",
        "lotr:FrodoBaggins",
        "http://www.w3.org/ns/shacl#ValidationResult",
        ...
      ],
      "notes": [
        "Use these IRIs directly in follow-up selections or narrower searches."
      ]
    }
*/

type SourceKind = 'ontology' | 'instance' | 'report' | 'union';

type Envelope = {
  q?: string;
  source?: SourceKind;
  caseSensitive?: boolean;
  patternIsRegex?: boolean;
  context?: number;
  limitMatches?: number;
  scanCapCharsPerSource?: number; // 0 = unlimited
  dedupeLines?: boolean;
};

type CombinedState = {
  rdfString?: string;                // ontology + SHACL shapes
  originalInstanceData?: string;     // KG instance data
  originalViolationReport?: string;  // SHACL validation report
};

type Match = {
  source: 'ontology' | 'instance' | 'report';
  line: number;       // 1-based
  col: number;        // 0-based col of first occurrence on that line
  lineText: string;
  before: string[];
  after: string[];
};

const DEFAULTS = {
  caseSensitive: false,
  patternIsRegex: false,
  context: 2,
  limitMatches: 50,
  scanCapCharsPerSource: 0,
  dedupeLines: true,
};

function parseEnvelope(raw: string): Required<Envelope> & { q: string } {
  if (!raw || !raw.trim()) throw new Error('grep_around: empty input');
  let env: Envelope;
  if (raw.trim().startsWith('{')) {
    env = JSON.parse(raw) as Envelope;
  } else {
    env = { q: raw };
  }
  const q = (env.q ?? '').toString();
  if (!q) throw new Error('grep_around: missing "q" (search term)');

  return {
    q,
    source: env.source ?? 'union',
    caseSensitive: env.caseSensitive ?? DEFAULTS.caseSensitive,
    patternIsRegex: env.patternIsRegex ?? DEFAULTS.patternIsRegex,
    context: Math.max(0, env.context ?? DEFAULTS.context),
    limitMatches: Math.max(1, env.limitMatches ?? DEFAULTS.limitMatches),
    scanCapCharsPerSource: Math.max(0, env.scanCapCharsPerSource ?? DEFAULTS.scanCapCharsPerSource),
    dedupeLines: env.dedupeLines ?? DEFAULTS.dedupeLines,
  };
}

function sliceCap(text: string, cap: number): string {
  if (!cap || cap <= 0) return text;
  if (!text) return '';
  return text.length > cap ? text.slice(0, cap) : text;
}

function splitLinesSafe(text: string): string[] {
  if (!text) return [];
  // Normalize newlines
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function findLineMatches(
  sourceName: 'ontology' | 'instance' | 'report',
  lines: string[],
  q: string,
  caseSensitive: boolean,
  patternIsRegex: boolean,
  context: number,
  limit: number,
  dedupeLines: boolean
): Match[] {
  const matches: Match[] = [];
  const seen = new Set<string>();

  const needle = caseSensitive ? q : q.toLowerCase();
  const re = patternIsRegex ? new RegExp(q, caseSensitive ? '' : 'i') : null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const hay = caseSensitive ? line : line.toLowerCase();

    let found = false;
    let col = -1;

    if (re) {
      const m = line.match(re);
      if (m && m.index !== undefined) {
        found = true;
        col = m.index;
      }
    } else {
      col = hay.indexOf(needle);
      found = col >= 0;
    }

    if (!found) continue;

    const before: string[] = [];
    for (let k = Math.max(0, i - context); k < i; k++) before.push(lines[k] ?? '');
    const after: string[] = [];
    for (let k = i + 1; k <= Math.min(lines.length - 1, i + context); k++) after.push(lines[k] ?? '');

    const key = `${sourceName}#${i + 1}#${line}`;
    if (dedupeLines) {
      if (seen.has(key)) continue;
      seen.add(key);
    }

    matches.push({
      source: sourceName,
      line: i + 1, // 1-based
      col,
      lineText: line,
      before,
      after,
    });

    if (matches.length >= limit) break;
  }

  return matches;
}

function extractIriCandidates(snippets: Match[]): string[] {
  const out = new Set<string>();
  const iri = /<[^>\s]+>/g;                       // <http://...>
  const curie = /\b[a-zA-Z_][\w.-]*:[^\s"';()<>]+/g; // lotr:FrodoBaggins, sh:ValidationResult

  for (const m of snippets) {
    const bucket = [m.lineText, ...m.before, ...m.after].join('\n');
    const iriHits = bucket.match(iri) || [];
    const curieHits = bucket.match(curie) || [];
    for (const t of iriHits) out.add(t.replace(/[<>]/g, ''));
    for (const t of curieHits) out.add(t);
  }
  // Small cleanup: drop very short curies and obvious punctuation-only tokens
  return Array.from(out).filter(s => s.length >= 4);
}

export async function grepAround(rawInput: string, combined: CombinedState): Promise<string> {
  const env = parseEnvelope(rawInput);

  const sources: Array<{ name: 'ontology' | 'instance' | 'report'; text: string }> = [];
  if (env.source === 'ontology' || env.source === 'union') {
    sources.push({ name: 'ontology', text: combined.rdfString ?? '' });
  }
  if (env.source === 'instance' || env.source === 'union') {
    sources.push({ name: 'instance', text: combined.originalInstanceData ?? '' });
  }
  if (env.source === 'report' || env.source === 'union') {
    sources.push({ name: 'report', text: combined.originalViolationReport ?? '' });
  }

  const stats = {
    searched: { ontology: 0, instance: 0, report: 0 },
    matches: { ontology: 0, instance: 0, report: 0 },
    truncated: { ontology: false, instance: false, report: false },
  };

  const allMatches: Match[] = [];
  let remaining = env.limitMatches;

  for (const s of sources) {
    let text = s.text || '';
    if (env.scanCapCharsPerSource > 0 && text.length > env.scanCapCharsPerSource) {
      text = sliceCap(text, env.scanCapCharsPerSource);
      stats.truncated[s.name] = true as any;
    }
    stats.searched[s.name] = text.length as any;

    const lines = splitLinesSafe(text);
    if (remaining <= 0) continue;

    const chunkMatches = findLineMatches(
      s.name,
      lines,
      env.q,
      env.caseSensitive,
      env.patternIsRegex,
      env.context,
      remaining,
      env.dedupeLines
    );

    stats.matches[s.name] = chunkMatches.length as any;
    allMatches.push(...chunkMatches);
    remaining = Math.max(0, remaining - chunkMatches.length);
  }

  const iriCandidates = extractIriCandidates(allMatches).slice(0, 200);

  const payload = {
    type: 'grep_result',
    q: env.q,
    caseSensitive: env.caseSensitive,
    patternIsRegex: env.patternIsRegex,
    stats,
    matches: allMatches,
    iriCandidates,
    notes: [
      'Use these IRIs directly in follow-up selections or narrower searches.',
      'Increase "context" or "limitMatches" if you need more surrounding lines.',
      'You can also set "source" to ontology, instance, or report to target a single file.',
    ],
  };

  return JSON.stringify(payload, null, 2);
}
