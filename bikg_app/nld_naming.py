"""Helper utilities to rename exemplar terms in RDF graphs."""
from rdflib import Graph, Namespace, URIRef

from .nld_constants import EXEMPLAR_TERM


def rename_graph_exemplar_term(
    graph: Graph,
    new_term: str | None = None,
    old_term: str = "exemplar",
) -> Graph:
    """Rename exemplar nodes and edges in ``graph`` to ``new_term``.

    The default ``old_term`` is ``"exemplar"`` which matches existing test data.
    If ``new_term`` is not provided, :data:`EXEMPLAR_TERM` is used.
    """
    if new_term is None:
        new_term = EXEMPLAR_TERM

    if new_term == old_term:
        return graph

    old_ns = Namespace(f"http://example.com/{old_term}#")
    new_ns = Namespace(f"http://example.com/{new_term}#")

    old_edge = URIRef(f"http://customnamespace.com/has{old_term.capitalize()}")
    new_edge = URIRef(f"http://customnamespace.com/has{new_term.capitalize()}")

    triples_to_remove = []
    triples_to_add = []

    for s, p, o in graph:
        new_s = _replace_uri(s, old_ns, new_ns, old_term, new_term)
        new_o = _replace_uri(o, old_ns, new_ns, old_term, new_term)
        new_p = new_edge if p == old_edge else p

        if new_s != s or new_p != p or new_o != o:
            triples_to_remove.append((s, p, o))
            triples_to_add.append((new_s, new_p, new_o))

    for triple in triples_to_remove:
        graph.remove(triple)
    for triple in triples_to_add:
        graph.add(triple)

    return graph


def _replace_uri(
    uri: URIRef,
    old_ns: Namespace,
    new_ns: Namespace,
    old_term: str,
    new_term: str,
) -> URIRef:
    uri_str = str(uri)
    if uri_str.startswith(str(old_ns)):
        uri_str = uri_str.replace(str(old_ns), str(new_ns))
    if f"_{old_term}_" in uri_str:
        uri_str = uri_str.replace(f"_{old_term}_", f"_{new_term}_")
    return URIRef(uri_str)
