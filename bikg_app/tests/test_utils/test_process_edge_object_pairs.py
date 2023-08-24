# test_process_edge_object_pairs
import json
import os
import unittest
from collections import defaultdict

from rdflib import RDF, Graph, Namespace, URIRef

from bikg_app.routers.utils import (
    load_edge_count_json,
    process_edge_object_pairs,
    save_edge_count_json,
    serialize_edge_count_dict,
)


class TestProcessEdgeObjectPairs(unittest.TestCase):
    def setUp(self):
        self.ontology_g = Graph()
        self.sh = Namespace("http://www.w3.org/ns/shacl#")
        self.edge_count_dict = defaultdict(lambda: defaultdict(int))

    def test_empty_pairs(self):
        edge_object_pairs = []
        exemplar_name = URIRef("http://example.com/exemplar1")
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            edge_object_pairs,
            exemplar_name,
        )
        assert len(self.ontology_g) == 0  # type: ignore
        assert self.edge_count_dict == defaultdict(lambda: defaultdict(int))

    def test_non_empty_pairs(self):
        edge_object_pairs = [
            (self.sh.sourceShape, URIRef("http://example.com/shape1")),
            (
                URIRef("http://example.com/predicate1"),
                URIRef("http://example.com/object1"),
            ),
        ]
        exemplar_name = URIRef("http://example.com/exemplar1")
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            edge_object_pairs,
            exemplar_name,
        )

        # Check if edge_count_dict is updated correctly
        assert self.edge_count_dict[exemplar_name][f"{self.sh.sourceShape}__{URIRef('http://example.com/shape1')}"] == 1
        assert (
            self.edge_count_dict[exemplar_name][f"{URIRef('http://example.com/predicate1')}__{URIRef('http://example.com/object1')}"] == 1
        )

        # Check if triples are added to ontology_g
        assert (
            URIRef("http://example.com/shape1"),
            URIRef("http://customnamespace.com/hasExemplar"),
            exemplar_name,
        ) in self.ontology_g
        assert (
            exemplar_name,
            URIRef("http://example.com/predicate1"),
            URIRef("http://example.com/object1"),
        ) in self.ontology_g
        assert (exemplar_name, RDF.type, self.sh.PropertyShape) in self.ontology_g
        print("self.edge_count_dict: ", self.edge_count_dict)


class TestSerializeEdgeCountDict(unittest.TestCase):
    def test_empty_dict(self):
        assert serialize_edge_count_dict({}) == "{}"

    def test_simple_dict(self):
        input_dict = {"a": 1, "b": 2}
        expected_output = json.dumps(input_dict)
        assert serialize_edge_count_dict(input_dict) == expected_output

    def test_dict_with_set(self):
        input_dict = {"a": {1, 2}, "b": 2}
        expected_output = json.dumps({"a": [1, 2], "b": 2})
        assert serialize_edge_count_dict(input_dict) == expected_output

    def test_dict_with_nested_dict(self):
        input_dict = {"a": {"nested": 1}, "b": 2}
        expected_output = json.dumps(input_dict)
        assert serialize_edge_count_dict(input_dict) == expected_output

    def test_dict_with_varied_keys(self):
        input_dict = {1: 1, "b": 2}
        expected_output = json.dumps({"1": 1, "b": 2})
        assert serialize_edge_count_dict(input_dict) == expected_output


class TestSaveAndLoadEdgeCountJson(unittest.TestCase):
    def setUp(self):
        self.test_filename = "test.json"

    def tearDown(self):
        if os.path.exists(self.test_filename):
            os.remove(self.test_filename)

    def test_save_and_load_empty_dict(self):
        test_dict = {}
        save_edge_count_json(test_dict, self.test_filename)

        loaded_dict = load_edge_count_json(self.test_filename)
        assert test_dict == loaded_dict

    def test_save_and_load_simple_dict(self):
        test_dict = {"a": 1, "b": 2}
        save_edge_count_json(test_dict, self.test_filename)

        loaded_dict = load_edge_count_json(self.test_filename)
        assert test_dict == loaded_dict

    def test_save_and_load_complex_dict(self):
        test_dict = {"a": 1, "b": {"nested": 2}, "c": [1, 2, 3]}
        save_edge_count_json(test_dict, self.test_filename)

        loaded_dict = load_edge_count_json(self.test_filename)
        assert test_dict == loaded_dict


class TestSaveAndLoadEdgeCountWithGraph(unittest.TestCase):
    def setUp(self):
        self.test_filename = "test.json"
        self.ontology_g = Graph()
        self.sh = Namespace("http://www.w3.org/ns/shacl#")
        self.edge_count_dict = defaultdict(lambda: defaultdict(int))

    def tearDown(self):
        if os.path.exists(self.test_filename):
            os.remove(self.test_filename)

    def add_exemplars_to_graph(self):
        exemplar1 = URIRef("http://example.com/exemplar1")
        exemplar2 = URIRef("http://example.com/exemplar2")
        po_pair = (
            URIRef("http://example.com/predicate"),
            URIRef("http://example.com/object"),
        )

        self.ontology_g.add((exemplar1, *po_pair))
        self.ontology_g.add((exemplar2, *po_pair))

        po_str = f"{po_pair[0]}__{po_pair[1]}"
        self.edge_count_dict[exemplar1][po_str] += 1
        self.edge_count_dict[exemplar2][po_str] += 1
        self.edge_count_dict[exemplar1][po_str] += 1  # Reoccurring pair for exemplar1

    def test_save_and_load_edge_count_with_graph(self):
        self.add_exemplars_to_graph()
        save_edge_count_json(self.edge_count_dict, self.test_filename)

        loaded_edge_count_dict = load_edge_count_json(self.test_filename)

        expected_dict = {
            "http://example.com/exemplar1": {"http://example.com/predicate__http://example.com/object": 2},
            "http://example.com/exemplar2": {"http://example.com/predicate__http://example.com/object": 1},
        }

        assert loaded_edge_count_dict == expected_dict


class TestProcessEdgeObjectPairsWithSaveAndLoad(unittest.TestCase):
    def setUp(self):
        self.test_filename = "test_process.json"
        self.ontology_g = Graph()
        self.sh = Namespace("http://www.w3.org/ns/shacl#")
        self.edge_count_dict = defaultdict(lambda: defaultdict(int))

    def tearDown(self):
        if os.path.exists(self.test_filename):
            os.remove(self.test_filename)

    def add_exemplars_using_function(self):
        exemplar1 = URIRef("http://example.com/exemplar_func1")
        exemplar2 = URIRef("http://example.com/exemplar_func2")
        po_pairs = [
            (
                URIRef("http://example.com/predicate"),
                URIRef("http://example.com/object"),
            )
        ]

        process_edge_object_pairs(self.ontology_g, self.sh, self.edge_count_dict, po_pairs, exemplar1)
        process_edge_object_pairs(self.ontology_g, self.sh, self.edge_count_dict, po_pairs, exemplar2)
        process_edge_object_pairs(self.ontology_g, self.sh, self.edge_count_dict, po_pairs, exemplar1)  # Reoccurring pair for exemplar1

    def test_process_edge_object_pairs_with_save_and_load(self):
        self.add_exemplars_using_function()
        save_edge_count_json(self.edge_count_dict, self.test_filename)

        loaded_edge_count_dict = load_edge_count_json(self.test_filename)

        expected_dict = {
            "http://example.com/exemplar_func1": {"http://example.com/predicate__http://example.com/object": 2},
            "http://example.com/exemplar_func2": {"http://example.com/predicate__http://example.com/object": 1},
        }

        assert loaded_edge_count_dict == expected_dict


class TestProcessEdgeObjectPairsWithMultiplePairs(unittest.TestCase):
    def setUp(self):
        self.test_filename = "test_process_multiple.json"
        self.ontology_g = Graph()
        self.sh = Namespace("http://www.w3.org/ns/shacl#")
        self.edge_count_dict = defaultdict(lambda: defaultdict(int))

    def tearDown(self):
        if os.path.exists(self.test_filename):
            os.remove(self.test_filename)

    def add_multiple_po_pairs(self):
        exemplar1 = URIRef("http://example.com/exemplar_multipair1")
        exemplar2 = URIRef("http://example.com/exemplar_multipair2")

        # Multiple different p, o pairs for each exemplar
        po_pairs_exemplar1 = [
            (
                URIRef("http://example.com/predicate1"),
                URIRef("http://example.com/object1"),
            ),
            (
                URIRef("http://example.com/predicate2"),
                URIRef("http://example.com/object2"),
            ),
        ]
        po_pairs_exemplar2 = [
            (
                URIRef("http://example.com/predicate3"),
                URIRef("http://example.com/object3"),
            ),
            (
                URIRef("http://example.com/predicate4"),
                URIRef("http://example.com/object4"),
            ),
        ]

        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            po_pairs_exemplar1,
            exemplar1,
        )
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            po_pairs_exemplar2,
            exemplar2,
        )
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            po_pairs_exemplar1,
            exemplar1,
        )  # Reoccurring pair for exemplar1

    def test_process_edge_object_pairs_with_multiple_pairs(self):
        self.add_multiple_po_pairs()
        save_edge_count_json(self.edge_count_dict, self.test_filename)

        loaded_edge_count_dict = load_edge_count_json(self.test_filename)

        expected_dict = {
            "http://example.com/exemplar_multipair1": {
                "http://example.com/predicate1__http://example.com/object1": 2,
                "http://example.com/predicate2__http://example.com/object2": 2,
            },
            "http://example.com/exemplar_multipair2": {
                "http://example.com/predicate3__http://example.com/object3": 1,
                "http://example.com/predicate4__http://example.com/object4": 1,
            },
        }

        assert loaded_edge_count_dict == expected_dict


if __name__ == "__main__":
    unittest.main()
