"""
This module defines some unit tests for the get_violation_report_groups function.
"""
import unittest
from collections import defaultdict

from rdflib import Graph, Namespace, URIRef
from rdflib.compare import graph_diff, isomorphic, to_isomorphic

from bikg_app.routers.utils import get_violation_report_groups


def print_graph_human_readable(graph):
    lines = []
    for s, p, o in graph:
        lines.append(f"{s} {p} {o}")
    print("\n".join(sorted(lines)))


def print_defaultdict_human_readable(d):
    lines = []
    for k1, v1 in d.items():
        for k2, v2 in v1.items():
            lines.append(f"{k1} {k2} {v2}")
    print("\n".join(sorted(lines)))


class TestGetViolationReportGroups(unittest.TestCase):
    SH = Namespace("http://www.w3.org/ns/shacl#")
    RDFS = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
    RUT = Namespace("http://rdfunit.aksw.org/ns/core#")

    shape1_group_1 = URIRef("http://www.w3.org/ns/shacl#shape1_group_1")
    shape1_group_2 = URIRef("http://www.w3.org/ns/shacl#shape1_group_2")
    shape2_group_3 = URIRef("http://www.w3.org/ns/shacl#shape2_group_3")
    shape2_group_4 = URIRef("http://www.w3.org/ns/shacl#shape2_group_4")
    shape1 = URIRef(SH.shape1)
    shape2 = URIRef(SH.shape2)
    edge1 = URIRef(SH.edge1)
    object1 = URIRef(SH.object1)
    edge2 = URIRef(SH.edge2)
    object2 = URIRef(SH.object2)
    edge3 = URIRef(SH.edge3)
    object3 = URIRef(SH.object3)
    edge4 = URIRef(SH.edge4)
    object4 = URIRef(SH.object4)
    edge5 = URIRef(SH.edge5)
    object5 = URIRef(SH.object5)
    fn1 = URIRef(SH.fn1)
    fn2 = URIRef(SH.fn2)
    fn3 = URIRef(SH.fn3)
    fn4 = URIRef(SH.fn4)
    fn5 = URIRef(SH.fn5)
    fn6 = URIRef(SH.fn6)

    base_dir = "bikg_app/bikg_app/tests/test_cases_group_violations/"

    test_cases = [
        # test case for one group and only one occurrence of the violation, now including focus node as well
        {
            "ontology_file": base_dir + "ontology_1.ttl",
            "violation_report_file": base_dir + "violation_report_1.ttl",
            "result_graph_file": base_dir + "result_graph_1.ttl",
            "expected_edge_count_dict": defaultdict(
                lambda: defaultdict(int),
                {
                    shape1_group_1: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape1): 1,
                        (edge1, object1): 1,
                        (edge2, object2): 1,
                    }
                },
            ),
            "expected_group_focus_node_dict": defaultdict(lambda: defaultdict(set), {shape1_group_1: {fn1}}),
            "expected_focus_node_group_dict": defaultdict(lambda: defaultdict(set), {fn1: {shape1_group_1}}),
        },
        # test case for one group and multiple occurrences of the violation
        {
            "ontology_file": base_dir + "ontology_1.ttl",
            "violation_report_file": base_dir + "violation_report_2.ttl",
            "result_graph_file": base_dir + "result_graph_2.ttl",
            "expected_edge_count_dict": defaultdict(
                lambda: defaultdict(int),
                {
                    shape1_group_1: {
                        (RDFS.type, SH.ValidationResult): 2,
                        (RDFS.type, RUT.TestCaseResult): 2,
                        (SH.sourceShape, shape1): 2,
                        (edge1, object1): 2,
                        (edge2, object2): 2,
                    },
                    shape1_group_2: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape1): 1,
                        (edge1, object1): 1,
                    },
                },
            ),  # Missing comma was added here
            "expected_group_focus_node_dict": defaultdict(
                lambda: defaultdict(set),
                {shape1_group_1: {fn1, fn2}, shape1_group_2: {fn3}},
            ),
            "expected_focus_node_group_dict": defaultdict(
                lambda: defaultdict(set),
                {
                    fn1: {shape1_group_1},
                    fn2: {shape1_group_1},
                    fn3: {shape1_group_2},
                },
            ),
        },
        # test case for ignored edges
        {
            "ontology_file": base_dir + "ontology_1.ttl",
            "violation_report_file": base_dir + "violation_report_3.ttl",
            "result_graph_file": base_dir + "result_graph_1.ttl",
            "expected_edge_count_dict": defaultdict(
                lambda: defaultdict(int),
                {
                    shape1_group_1: {
                        (RDFS.type, SH.ValidationResult): 2,
                        (RDFS.type, RUT.TestCaseResult): 2,
                        (SH.sourceShape, shape1): 2,
                        (edge1, object1): 2,
                        (edge2, object2): 2,
                    }
                },
            ),
            "expected_group_focus_node_dict": defaultdict(lambda: defaultdict(set), {shape1_group_1: {fn1, fn2}}),
            "expected_focus_node_group_dict": defaultdict(
                lambda: defaultdict(set),
                {fn1: {shape1_group_1}, fn2: {shape1_group_1}},
            ),
        },
        # test case for multiple shapes with multiple groups and multiple occurrences of the violation and ignored edges
        {
            "ontology_file": base_dir + "ontology_4.ttl",
            "violation_report_file": base_dir + "violation_report_4.ttl",
            "result_graph_file": base_dir + "result_graph_4.ttl",
            "expected_edge_count_dict": defaultdict(
                lambda: defaultdict(int),
                {
                    shape1_group_1: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape1): 1,
                        (edge1, object1): 1,
                        (edge2, object2): 1,
                    },
                    shape1_group_2: {
                        (RDFS.type, SH.ValidationResult): 2,
                        (RDFS.type, RUT.TestCaseResult): 2,
                        (SH.sourceShape, shape1): 2,
                        (edge1, object1): 2,
                        (edge2, object2): 2,
                        (edge3, object3): 2,
                    },
                    shape2_group_3: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape2): 1,
                        (edge1, object1): 1,
                        (edge4, object4): 1,
                    },
                    shape2_group_4: {
                        (RDFS.type, SH.ValidationResult): 2,
                        (RDFS.type, RUT.TestCaseResult): 2,
                        (SH.sourceShape, shape2): 2,
                        (edge1, object1): 2,
                        (edge5, object5): 2,
                    },
                },
            ),
            "expected_group_focus_node_dict": defaultdict(
                lambda: defaultdict(set),
                {
                    shape1_group_1: {fn1},
                    shape1_group_2: {fn2, fn5},
                    shape2_group_3: {fn3},
                    shape2_group_4: {fn4, fn6},
                },
            ),
            "expected_focus_node_group_dict": defaultdict(
                lambda: defaultdict(set),
                {
                    fn1: {shape1_group_1},
                    fn2: {shape1_group_2},
                    fn3: {shape2_group_3},
                    fn4: {shape2_group_4},
                    fn5: {shape1_group_2},
                    fn6: {shape2_group_4},
                },
            ),
        },
        # fn has multiple groups
        {
            "ontology_file": base_dir + "ontology_5.ttl",
            "violation_report_file": base_dir + "violation_report_5.ttl",
            "result_graph_file": base_dir + "result_graph_5.ttl",
            "expected_edge_count_dict": defaultdict(
                lambda: defaultdict(int),
                {
                    shape1_group_1: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape1): 1,
                        (edge1, object1): 1,
                        (edge2, object2): 1,
                    },
                    shape1_group_2: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape1): 1,
                        (edge3, object3): 1,
                        (edge4, object4): 1,
                    },
                },
            ),
            "expected_group_focus_node_dict": defaultdict(
                lambda: defaultdict(set),
                {shape1_group_1: {fn1}, shape1_group_2: {fn1}},
            ),
            "expected_focus_node_group_dict": defaultdict(lambda: defaultdict(set), {fn1: {shape1_group_1, shape1_group_2}}),
        },
    ]

    def test_graph_structure(self):
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case):
                g = Graph()
                g.parse(test_case["ontology_file"], format="ttl")

                g_v = Graph()
                g_v.parse(test_case["violation_report_file"], format="ttl")
                result_graph, _, _, _, _ = get_violation_report_groups(g, g_v)
                expected_graph = Graph()
                expected_graph.parse(test_case["result_graph_file"], format="turtle")
                if not isomorphic(result_graph, expected_graph):
                    iso1 = to_isomorphic(result_graph)
                    iso2 = to_isomorphic(expected_graph)
                    in_both, in_first, in_second = graph_diff(iso1, iso2)

                    print(f"Test case {test_case} failed:")
                    print("In both:")
                    print(in_both.serialize(format="turtle"))
                    print("In result only:")
                    print(in_first.serialize(format="turtle"))
                    print("In expected only:")
                    print(in_second.serialize(format="turtle"))

                    self.fail("Graphs are not isomorphic; see details above.")

    def test_edge_count(self):
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case):
                g = Graph()
                g.parse(test_case["ontology_file"], format="ttl")

                g_v = Graph()
                g_v.parse(test_case["violation_report_file"], format="ttl")
                _, edge_count_dict, _, _, _ = get_violation_report_groups(g, g_v)
                expected_edge_count_dict = test_case["expected_edge_count_dict"]
                # print('\nsorted(edge_count_dict)')
                # print_defaultdict_human_readable(edge_count_dict)
                # print('\nsorted(expected_edge_count_dict)')
                # print_defaultdict_human_readable(expected_edge_count_dict)
                assert edge_count_dict == expected_edge_count_dict

    def test_focus_node_group_dict(self):
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case):
                g = Graph()
                g.parse(test_case["ontology_file"], format="ttl")

                g_v = Graph()
                g_v.parse(test_case["violation_report_file"], format="ttl")
                _, _, focus_node_group_dict, _, _ = get_violation_report_groups(g, g_v)
                exepected_focus_node_group_dict = test_case["expected_focus_node_group_dict"]
                # print('\n tcprint focus_node_group_dict')
                # [print(k,v) for k,v in focus_node_group_dict.items()]
                # print()
                # print('\n tcprint exepected_focus_node_group_dict')
                # [print(k,v) for k,v in exepected_focus_node_group_dict.items()]
                # print()
                assert focus_node_group_dict == exepected_focus_node_group_dict

    def test_expected_group_focus_node_dict(self):
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case):
                g = Graph()
                g.parse(test_case["ontology_file"], format="ttl")

                g_v = Graph()
                g_v.parse(test_case["violation_report_file"], format="ttl")
                _, _, _, group_focus_node_dict, _ = get_violation_report_groups(g, g_v)
                expected_group_focus_node_dict = test_case["expected_group_focus_node_dict"]
                # print('\n tcprint group_focus_node_dict')
                # [print(k,v) for k,v in group_focus_node_dict.items()]
                # print()
                # print('\n tcprint expected_group_focus_node_dict')
                # [print(k,v) for k,v in expected_group_focus_node_dict.items()]
                # print()
                assert group_focus_node_dict == expected_group_focus_node_dict


if __name__ == "__main__":
    unittest.main(verbosity=2)
