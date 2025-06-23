import unittest
from rdflib import Graph, Namespace, URIRef

from bikg_app.nld_naming import rename_graph_exemplar_term


class TestRenameGraphExemplarTerm(unittest.TestCase):
    def test_rename(self):
        g = Graph()
        old_ns = Namespace("http://example.com/exemplar#")
        old_edge = URIRef("http://customnamespace.com/hasExemplar")
        subj = URIRef(f"{old_ns}shape_exemplar_1")
        obj = URIRef(f"{old_ns}foo_exemplar_2")
        g.add((subj, old_edge, obj))

        rename_graph_exemplar_term(g, new_term="group")

        new_ns = Namespace("http://example.com/group#")
        new_edge = URIRef("http://customnamespace.com/hasGroup")
        new_subj = URIRef(f"{new_ns}shape_group_1")
        new_obj = URIRef(f"{new_ns}foo_group_2")

        assert (new_subj, new_edge, new_obj) in g
        assert (subj, old_edge, obj) not in g


if __name__ == "__main__":
    unittest.main()
