"""Utilities for resolving which source TTL file a node originates from."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Iterable

from rdflib import Graph, URIRef

ORIGINAL_ONTOLOGY_FILE_PATH = "bikg_app/ttl/omics_model.ttl"
ORIGINAL_INSTANCE_DATA_FILE_PATH = "bikg_app/ttl/study.ttl"
ORIGINAL_VIOLATION_REPORT_FILE_PATH = "bikg_app/ttl/violation_report.ttl"


class NodeSource(str, Enum):
    ONTOLOGY = "ontology"
    INSTANCE = "instance"
    VIOLATION = "violation"
    UNKNOWN = "unknown"


_SOURCE_ORDER = {
    NodeSource.ONTOLOGY: 0,
    NodeSource.INSTANCE: 1,
    NodeSource.VIOLATION: 2,
    NodeSource.UNKNOWN: 3,
}


@dataclass(frozen=True)
class NodeSourceInfo:
    """The normalized id and its data sources."""

    node_id: str
    sources: list[NodeSource]


def _load_graph(path: str) -> Graph:
    graph = Graph()
    graph.parse(path, format="ttl")
    return graph


def _build_namespace_manager(graphs: Iterable[Graph]):
    namespace_graph = Graph()
    for graph in graphs:
        for prefix, namespace in graph.namespaces():
            namespace_graph.namespace_manager.bind(prefix, namespace, replace=True)
    return namespace_graph.namespace_manager


def _to_qname(namespace_manager, uri: URIRef) -> str:
    try:
        return namespace_manager.qname(uri)
    except ValueError:
        return str(uri)


def _collect_graph_subjects(graph: Graph, namespace_manager) -> set[str]:
    subjects: set[str] = set()
    for subject in graph.subjects():
        if isinstance(subject, URIRef):
            subjects.add(_to_qname(namespace_manager, subject))
    return subjects


def _normalize_node_id(namespace_manager, node_id: str) -> str:
    if node_id.startswith(("http://", "https://")):
        return _to_qname(namespace_manager, URIRef(node_id))
    if ":" in node_id:
        try:
            expanded = namespace_manager.expand_curie(node_id)
            return _to_qname(namespace_manager, URIRef(str(expanded)))
        except ValueError:
            return node_id
    return node_id


class NodeSourceResolver:
    """Resolver for identifying node sources across the original TTL files."""

    def __init__(self, namespace_manager, node_sources: dict[str, set[NodeSource]]):
        self._namespace_manager = namespace_manager
        self._node_sources = node_sources

    def normalize_node_id(self, node_id: str) -> str:
        return _normalize_node_id(self._namespace_manager, node_id)

    def get_sources(self, node_id: str) -> NodeSourceInfo:
        normalized_id = self.normalize_node_id(node_id)
        sources = self._node_sources.get(normalized_id)
        if not sources:
            return NodeSourceInfo(normalized_id, [NodeSource.UNKNOWN])
        ordered = sorted(sources, key=lambda source: _SOURCE_ORDER[source])
        return NodeSourceInfo(normalized_id, ordered)

    def get_sources_for_nodes(self, node_ids: Iterable[str]) -> dict[str, list[NodeSource]]:
        result = {}
        for node_id in node_ids:
            result[node_id] = self.get_sources(node_id).sources
        return result


@lru_cache(maxsize=1)
def get_node_source_resolver() -> NodeSourceResolver:
    ontology_graph = _load_graph(ORIGINAL_ONTOLOGY_FILE_PATH)
    instance_graph = _load_graph(ORIGINAL_INSTANCE_DATA_FILE_PATH)
    violation_graph = _load_graph(ORIGINAL_VIOLATION_REPORT_FILE_PATH)

    namespace_manager = _build_namespace_manager([ontology_graph, instance_graph, violation_graph])

    node_sources: dict[str, set[NodeSource]] = {}
    graph_sources = (
        (NodeSource.ONTOLOGY, ontology_graph),
        (NodeSource.INSTANCE, instance_graph),
        (NodeSource.VIOLATION, violation_graph),
    )

    for source, graph in graph_sources:
        for node_id in _collect_graph_subjects(graph, namespace_manager):
            node_sources.setdefault(node_id, set()).add(source)

    return NodeSourceResolver(namespace_manager, node_sources)
