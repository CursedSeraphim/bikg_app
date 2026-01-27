"""Utilities for resolving which source TTL file a node originates from."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Optional, Union

from rdflib import BNode, Graph, Literal, URIRef
from rdflib.term import Identifier
from rdflib.util import from_n3

ORIGINAL_ONTOLOGY_FILE_PATH = "bikg_app/ttl/omics_model.ttl"
ORIGINAL_INSTANCE_DATA_FILE_PATH = "bikg_app/ttl/study.ttl"
ORIGINAL_VIOLATION_REPORT_FILE_PATH = "bikg_app/ttl/violation_report.ttl"
VIOLATION_TTL_FILE_PATHS = (
    ORIGINAL_VIOLATION_REPORT_FILE_PATH,
    "bikg_app/ttl/violations.ttl",
    "bikg_app/ttl/violations_original.ttl",
)


class NodeSource(str, Enum):
    ONTOLOGY = "ontology"
    INSTANCE = "instance"
    VIOLATION = "violation"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class NodeSourceInfo:
    """The normalized id and its data sources."""

    node_id: str
    sources: list[NodeSource]


def _load_graph(path: str) -> Graph:
    graph = Graph()
    graph.parse(path, format="ttl")
    return graph


def _load_existing_graphs(paths: Iterable[str]) -> list[Graph]:
    graphs: list[Graph] = []
    for path in paths:
        if Path(path).exists():
            graphs.append(_load_graph(path))
    return graphs


def _build_namespace_manager(graphs: Iterable[Graph]):
    namespace_graph = Graph()
    for graph in graphs:
        for prefix, namespace in graph.namespaces():
            namespace_graph.namespace_manager.bind(prefix, namespace, replace=True)
    return namespace_graph.namespace_manager


def _is_probable_iri(value: str) -> bool:
    v = value.strip()
    if "://" in v:
        return True
    if v.startswith("urn:"):
        return True
    return False


def _try_parse_n3(token: str, namespace_manager) -> Optional[Identifier]:
    t = token.strip()
    if not t:
        return None
    if t.startswith("<") or t.startswith('"') or t.startswith("_:"):
        try:
            return from_n3(t, namespace_manager)
        except Exception:
            return None
    return None


def _parse_node_id(namespace_manager, node_id: str) -> Union[URIRef, Literal, BNode, str]:
    """
    Parse a node id coming from the client into an RDF term when possible.

    Returns:
      - URIRef / Literal / BNode for recognizable RDF syntaxes
      - otherwise returns a plain stripped string (for "display-only" / unknown tokens)
    """
    raw = (node_id or "").strip()
    if not raw:
        return ""

    # 1) If client sent proper N3/Turtle token (<iri>, "lit"@en, "lit"^^xsd:int, _:b0)
    parsed = _try_parse_n3(raw, namespace_manager)
    if parsed is not None:
        return parsed

    # 2) If it looks like a real IRI (http(s), urn, etc.), treat as IRI
    if _is_probable_iri(raw):
        return URIRef(raw)

    # 3) If it looks like CURIE/prefixed name, expand only if prefix is known; else treat as IRI-ish string
    if ":" in raw:
        prefix = raw.split(":", 1)[0]
        if namespace_manager.store.namespace(prefix) is not None:
            try:
                expanded = namespace_manager.expand_curie(raw)
                return URIRef(str(expanded))
            except Exception:
                return raw
        # Unknown prefix: could be a URN-like / custom scheme; treat as IRI token
        return URIRef(raw)

    # 4) Fallback: plain literal-like token (no quotes given)
    return raw


def _display_id(namespace_manager, term: Union[URIRef, Literal, BNode, str]) -> str:
    """
    Produce a stable string id to send back to the client:
      - URIRef: QName only when it is from a *known* namespace; otherwise full IRI (prevents ns1:... churn)
      - Literal: lexical form
      - BNode: _:...
      - str: as-is
    """
    if isinstance(term, URIRef):
        s = str(term)
        # Avoid rdflib auto-prefixing (ns1/ns2/...) for URNs or unknown namespaces
        if s.startswith("urn:") or "://" not in s:
            return s
        try:
            prefix, namespace, _ = namespace_manager.compute_qname(term, generate=False)
            return f"{prefix}:{str(term)[len(str(namespace)):]}"
        except Exception:
            return s

    if isinstance(term, Literal):
        return str(term)

    if isinstance(term, BNode):
        return str(term)

    return str(term)


def _collect_subject_uris(graph: Graph) -> set[URIRef]:
    subjects: set[URIRef] = set()
    for subject in graph.subjects():
        if isinstance(subject, URIRef):
            subjects.add(subject)
    return subjects


def _collect_object_terms(graph: Graph) -> tuple[set[URIRef], set[str]]:
    """
    Collect:
      - URIRef objects as URIRef terms
      - Literal objects as lexical strings (str(lit))
    """
    uri_objects: set[URIRef] = set()
    literal_lexicals: set[str] = set()

    for obj in graph.objects():
        if isinstance(obj, URIRef):
            uri_objects.add(obj)
        elif isinstance(obj, Literal):
            literal_lexicals.add(str(obj))

    return uri_objects, literal_lexicals


class NodeSourceResolver:
    """Resolver for identifying node sources across the original TTL files."""

    def __init__(
        self,
        namespace_manager,
        ontology_subjects: set[URIRef],
        ontology_object_uris: set[URIRef],
        ontology_object_literals: set[str],
        instance_subjects: set[URIRef],
        instance_object_uris: set[URIRef],
        instance_object_literals: set[str],
        violation_object_uris: set[URIRef],
        violation_object_literals: set[str],
    ):
        self._namespace_manager = namespace_manager

        self._ontology_subjects = ontology_subjects
        self._ontology_object_uris = ontology_object_uris
        self._ontology_object_literals = ontology_object_literals

        self._instance_subjects = instance_subjects
        self._instance_object_uris = instance_object_uris
        self._instance_object_literals = instance_object_literals

        self._violation_object_uris = violation_object_uris
        self._violation_object_literals = violation_object_literals

    def get_sources(self, node_id: str) -> NodeSourceInfo:
        raw = (node_id or "").strip()
        term = _parse_node_id(self._namespace_manager, raw)
        display = _display_id(self._namespace_manager, term)

        # Priority rules (as described)
        if isinstance(term, URIRef) and term in self._ontology_subjects:
            return NodeSourceInfo(display, [NodeSource.ONTOLOGY])

        if isinstance(term, URIRef) and term in self._instance_subjects:
            return NodeSourceInfo(display, [NodeSource.INSTANCE])

        if isinstance(term, URIRef) and term in self._instance_object_uris:
            return NodeSourceInfo(display, [NodeSource.INSTANCE])

        if raw.lower().startswith("ex:"):
            return NodeSourceInfo(display, [NodeSource.VIOLATION])

        if isinstance(term, URIRef) and term in self._violation_object_uris:
            return NodeSourceInfo(display, [NodeSource.VIOLATION])

        # New fallback checks (objects)
        if isinstance(term, URIRef) and term in self._ontology_object_uris:
            return NodeSourceInfo(display, [NodeSource.ONTOLOGY])

        # Literal matching (lexical form)
        if isinstance(term, Literal):
            lex = str(term)
            if lex in self._instance_object_literals:
                return NodeSourceInfo(display, [NodeSource.INSTANCE])
            if lex in self._violation_object_literals:
                return NodeSourceInfo(display, [NodeSource.VIOLATION])
            if lex in self._ontology_object_literals:
                return NodeSourceInfo(display, [NodeSource.ONTOLOGY])
        elif isinstance(term, str):
            # "unquoted literal" style ids from the client
            if term in self._instance_object_literals:
                return NodeSourceInfo(display, [NodeSource.INSTANCE])
            if term in self._violation_object_literals:
                return NodeSourceInfo(display, [NodeSource.VIOLATION])
            if term in self._ontology_object_literals:
                return NodeSourceInfo(display, [NodeSource.ONTOLOGY])

        print("Unknown node id source:", node_id, "parsed as", term, "display as", display)
        return NodeSourceInfo(display, [NodeSource.UNKNOWN])

    def get_sources_for_nodes(self, node_ids: Iterable[str]) -> dict[str, list[NodeSource]]:
        return {node_id: self.get_sources(node_id).sources for node_id in node_ids}


@lru_cache(maxsize=1)
def get_node_source_resolver() -> NodeSourceResolver:
    ontology_graph = _load_graph(ORIGINAL_ONTOLOGY_FILE_PATH)
    instance_graph = _load_graph(ORIGINAL_INSTANCE_DATA_FILE_PATH)
    violation_graphs = _load_existing_graphs(VIOLATION_TTL_FILE_PATHS)

    namespace_manager = _build_namespace_manager([ontology_graph, instance_graph, *violation_graphs])

    ontology_subjects = _collect_subject_uris(ontology_graph)
    ontology_object_uris, ontology_object_literals = _collect_object_terms(ontology_graph)

    instance_subjects = _collect_subject_uris(instance_graph)
    instance_object_uris, instance_object_literals = _collect_object_terms(instance_graph)

    violation_object_uris: set[URIRef] = set()
    violation_object_literals: set[str] = set()
    for vg in violation_graphs:
        uris, lits = _collect_object_terms(vg)
        violation_object_uris.update(uris)
        violation_object_literals.update(lits)

    return NodeSourceResolver(
        namespace_manager=namespace_manager,
        ontology_subjects=ontology_subjects,
        ontology_object_uris=ontology_object_uris,
        ontology_object_literals=ontology_object_literals,
        instance_subjects=instance_subjects,
        instance_object_uris=instance_object_uris,
        instance_object_literals=instance_object_literals,
        violation_object_uris=violation_object_uris,
        violation_object_literals=violation_object_literals,
    )
