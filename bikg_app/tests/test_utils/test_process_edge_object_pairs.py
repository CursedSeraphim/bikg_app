# test_process_edge_object_pairs
import json
import os
import unittest
from collections import defaultdict

from rdflib import RDF, Graph, Namespace, URIRef

from bikg_app.routers.utils import (
    load_nested_counts_dict_json,
    process_edge_object_pairs,
    save_nested_counts_dict_json,
    serialize_nested_count_dict,
)


class TestProcessEdgeObjectPairs(unittest.TestCase):
    def setUp(self):
        self.ontology_g = Graph()
        self.sh = Namespace("http://www.w3.org/ns/shacl#")
        self.edge_count_dict = defaultdict(lambda: defaultdict(int))

    def test_empty_pairs(self):
        edge_object_pairs = []
        group_name = URIRef("http://example.com/group1")
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            edge_object_pairs,
            group_name,
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
        group_name = URIRef("http://example.com/group1")
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            edge_object_pairs,
            group_name,
        )

        # Check if edge_count_dict is updated correctly
        assert self.edge_count_dict[group_name][f"{self.sh.sourceShape}__{URIRef('http://example.com/shape1')}"] == 1
        assert (
            self.edge_count_dict[group_name][f"{URIRef('http://example.com/predicate1')}__{URIRef('http://example.com/object1')}"] == 1
        )

        # Check if triples are added to ontology_g
        assert (
            URIRef("http://example.com/shape1"),
            URIRef("http://customnamespace.com/hasGroup"),
            group_name,
        ) in self.ontology_g
        assert (
            group_name,
            URIRef("http://example.com/predicate1"),
            URIRef("http://example.com/object1"),
        ) in self.ontology_g
        assert (group_name, RDF.type, self.sh.PropertyShape) in self.ontology_g
        print("self.edge_count_dict: ", self.edge_count_dict)


class TestSerializeEdgeCountDict(unittest.TestCase):
    def test_empty_dict(self):
        assert serialize_nested_count_dict({}) == "{}"

    def test_simple_dict(self):
        input_dict = {"a": 1, "b": 2}
        expected_output = json.dumps(input_dict)
        assert serialize_nested_count_dict(input_dict) == expected_output

    def test_dict_with_set(self):
        input_dict = {"a": {1, 2}, "b": 2}
        expected_output = json.dumps({"a": [1, 2], "b": 2})
        assert serialize_nested_count_dict(input_dict) == expected_output

    def test_dict_with_nested_dict(self):
        input_dict = {"a": {"nested": 1}, "b": 2}
        expected_output = json.dumps(input_dict)
        assert serialize_nested_count_dict(input_dict) == expected_output

    def test_dict_with_varied_keys(self):
        input_dict = {1: 1, "b": 2}
        expected_output = json.dumps({"1": 1, "b": 2})
        assert serialize_nested_count_dict(input_dict) == expected_output


class TestSaveAndLoadEdgeCountJson(unittest.TestCase):
    def setUp(self):
        self.test_filename = "test.json"

    def tearDown(self):
        if os.path.exists(self.test_filename):
            os.remove(self.test_filename)

    def test_save_and_load_empty_dict(self):
        test_dict = {}
        save_nested_counts_dict_json(test_dict, self.test_filename)

        loaded_dict = load_nested_counts_dict_json(self.test_filename)
        assert test_dict == loaded_dict

    def test_save_and_load_simple_dict(self):
        test_dict = {"a": 1, "b": 2}
        save_nested_counts_dict_json(test_dict, self.test_filename)

        loaded_dict = load_nested_counts_dict_json(self.test_filename)
        assert test_dict == loaded_dict

    def test_save_and_load_complex_dict(self):
        test_dict = {"a": 1, "b": {"nested": 2}, "c": [1, 2, 3]}
        save_nested_counts_dict_json(test_dict, self.test_filename)

        loaded_dict = load_nested_counts_dict_json(self.test_filename)
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

    def add_groups_to_graph(self):
        group1 = URIRef("http://example.com/group1")
        group2 = URIRef("http://example.com/group2")
        po_pair = (
            URIRef("http://example.com/predicate"),
            URIRef("http://example.com/object"),
        )

        self.ontology_g.add((group1, *po_pair))
        self.ontology_g.add((group2, *po_pair))

        po_str = f"{po_pair[0]}__{po_pair[1]}"
        self.edge_count_dict[group1][po_str] += 1
        self.edge_count_dict[group2][po_str] += 1
        self.edge_count_dict[group1][po_str] += 1  # Reoccurring pair for group1

    def test_save_and_load_edge_count_with_graph(self):
        self.add_groups_to_graph()
        save_nested_counts_dict_json(self.edge_count_dict, self.test_filename)

        loaded_edge_count_dict = load_nested_counts_dict_json(self.test_filename)

        expected_dict = {
            "http://example.com/group1": {"http://example.com/predicate__http://example.com/object": 2},
            "http://example.com/group2": {"http://example.com/predicate__http://example.com/object": 1},
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

    def add_groups_using_function(self):
        group1 = URIRef("http://example.com/group_func1")
        group2 = URIRef("http://example.com/group_func2")
        po_pairs = [
            (
                URIRef("http://example.com/predicate"),
                URIRef("http://example.com/object"),
            )
        ]

        process_edge_object_pairs(self.ontology_g, self.sh, self.edge_count_dict, po_pairs, group1)
        process_edge_object_pairs(self.ontology_g, self.sh, self.edge_count_dict, po_pairs, group2)
        process_edge_object_pairs(self.ontology_g, self.sh, self.edge_count_dict, po_pairs, group1)  # Reoccurring pair for group1

    def test_process_edge_object_pairs_with_save_and_load(self):
        self.add_groups_using_function()
        save_nested_counts_dict_json(self.edge_count_dict, self.test_filename)

        loaded_edge_count_dict = load_nested_counts_dict_json(self.test_filename)

        expected_dict = {
            "http://example.com/group_func1": {"http://example.com/predicate__http://example.com/object": 2},
            "http://example.com/group_func2": {"http://example.com/predicate__http://example.com/object": 1},
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
        group1 = URIRef("http://example.com/group_multipair1")
        group2 = URIRef("http://example.com/group_multipair2")

        # Multiple different p, o pairs for each group
        po_pairs_group1 = [
            (
                URIRef("http://example.com/predicate1"),
                URIRef("http://example.com/object1"),
            ),
            (
                URIRef("http://example.com/predicate2"),
                URIRef("http://example.com/object2"),
            ),
        ]
        po_pairs_group2 = [
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
            po_pairs_group1,
            group1,
        )
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            po_pairs_group2,
            group2,
        )
        process_edge_object_pairs(
            self.ontology_g,
            self.sh,
            self.edge_count_dict,
            po_pairs_group1,
            group1,
        )  # Reoccurring pair for group1

    def test_process_edge_object_pairs_with_multiple_pairs(self):
        self.add_multiple_po_pairs()
        save_nested_counts_dict_json(self.edge_count_dict, self.test_filename)

        loaded_edge_count_dict = load_nested_counts_dict_json(self.test_filename)

        expected_dict = {
            "http://example.com/group_multipair1": {
                "http://example.com/predicate1__http://example.com/object1": 2,
                "http://example.com/predicate2__http://example.com/object2": 2,
            },
            "http://example.com/group_multipair2": {
                "http://example.com/predicate3__http://example.com/object3": 1,
                "http://example.com/predicate4__http://example.com/object4": 1,
            },
        }

        assert loaded_edge_count_dict == expected_dict


if __name__ == "__main__":
    unittest.main()
