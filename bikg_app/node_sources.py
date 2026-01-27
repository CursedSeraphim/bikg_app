"""Utilities for resolving which source TTL file a node originates from."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Iterable

from rdflib import Graph, Literal, URIRef

ORIGINAL_ONTOLOGY_FILE_PATH = "bikg_app/ttl/omics_model.ttl"
ORIGINAL_INSTANCE_DATA_FILE_PATH = "bikg_app/ttl/study.ttl"
ORIGINAL_VIOLATION_REPORT_FILE_PATH = "bikg_app/ttl/violation_report.ttl"


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


def _normalize_literal_value(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return value[1:-1]
    return value


def _collect_graph_objects(graph: Graph, namespace_manager) -> set[str]:
    objects: set[str] = set()
    for obj in graph.objects():
        if isinstance(obj, URIRef):
            objects.add(_to_qname(namespace_manager, obj))
        elif isinstance(obj, Literal):
            objects.add(_normalize_literal_value(str(obj)))
    return objects


def _normalize_node_id(namespace_manager, node_id: str) -> str:
    node_id = _normalize_literal_value(node_id)
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

    def __init__(
        self,
        namespace_manager,
        ontology_subjects: set[str],
        ontology_objects: set[str],
        instance_subjects: set[str],
        instance_objects: set[str],
        violation_objects: set[str],
    ):
        self._namespace_manager = namespace_manager
        self._ontology_subjects = ontology_subjects
        self._ontology_objects = ontology_objects
        self._instance_subjects = instance_subjects
        self._instance_objects = instance_objects
        self._violation_objects = violation_objects

    def normalize_node_id(self, node_id: str) -> str:
        return _normalize_node_id(self._namespace_manager, node_id)

    def get_sources(self, node_id: str) -> NodeSourceInfo:
        normalized_id = self.normalize_node_id(node_id)
        normalized_lower = normalized_id.lower()
        if normalized_id in self._ontology_subjects:
            return NodeSourceInfo(normalized_id, [NodeSource.ONTOLOGY])
        if normalized_id in self._instance_subjects:
            return NodeSourceInfo(normalized_id, [NodeSource.INSTANCE])
        if normalized_id in self._ontology_objects:
            return NodeSourceInfo(normalized_id, [NodeSource.ONTOLOGY])
        if normalized_id in self._instance_objects:
            return NodeSourceInfo(normalized_id, [NodeSource.INSTANCE])
        if normalized_lower.startswith("ex:"):
            return NodeSourceInfo(normalized_id, [NodeSource.VIOLATION])
        if normalized_id in self._violation_objects:
            return NodeSourceInfo(normalized_id, [NodeSource.VIOLATION])
        return NodeSourceInfo(normalized_id, [NodeSource.UNKNOWN])

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

    ontology_subjects = _collect_graph_subjects(ontology_graph, namespace_manager)
    ontology_objects = _collect_graph_objects(ontology_graph, namespace_manager)
    instance_subjects = _collect_graph_subjects(instance_graph, namespace_manager)
    instance_objects = _collect_graph_objects(instance_graph, namespace_manager)
    violation_objects = _collect_graph_objects(violation_graph, namespace_manager)

    return NodeSourceResolver(
        namespace_manager,
        ontology_subjects,
        ontology_objects,
        instance_subjects,
        instance_objects,
        violation_objects,
    )
