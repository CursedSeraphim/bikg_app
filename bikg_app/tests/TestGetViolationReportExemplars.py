import inspect
import unittest
from rdflib import Graph, Namespace, URIRef
from rdflib.compare import isomorphic
from collections import defaultdict
from bikg_app.routers.utils import get_violation_report_exemplars


def print_graph_human_readable(graph):
    lines = []
    for s, p, o in graph:
        lines.append(f'{s} {p} {o}')
    print('\n'.join(sorted(lines)))


def print_defaultdict_human_readable(d):
    lines = []
    for k1, v1 in d.items():
        for k2, v2 in v1.items():
            lines.append(f'{k1} {k2} {v2}')
    print('\n'.join(sorted(lines)))


def unittest_verbosity():
        """Return the verbosity setting of the currently running unittest program, or 0 if none is running."""
        frame = inspect.currentframe()
        while frame:
            self = frame.f_locals.get('self')
            if isinstance(self, unittest.TestProgram):
                return self.verbosity
            frame = frame.f_back
        return 0


class TestGetViolationReportExemplars(unittest.TestCase):

    verbosity = unittest_verbosity()

    SH = Namespace("http://www.w3.org/ns/shacl#")
    RDFS = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
    RUT = Namespace("http://rdfunit.aksw.org/ns/core#")

    shape1 = URIRef(SH.shape1)
    edge1 = URIRef(SH.edge1)
    object1 = URIRef(SH.object1)
    edge2 = URIRef(SH.edge2)
    object2 = URIRef(SH.object2)
    edge3 = URIRef(SH.edge3)
    object3 = URIRef(SH.object3)
    edge4 = URIRef(SH.edge4)
    object4 = URIRef(SH.object4)

    base_dir = 'bikg_app/bikg_app/tests/test_cases_exemplar_violations/'

    test_cases = [
        {
            'ontology_file': base_dir + 'ontology_1.ttl',
            'violation_report_file': base_dir + 'violation_report_1.ttl',
            'result_graph_file': base_dir + 'result_graph_1.ttl',
            'expected_edge_count_dict': defaultdict(
                lambda: defaultdict(int),
                {
                    shape1: {
                        (RDFS.type, SH.ValidationResult): 1,
                        (RDFS.type, RUT.TestCaseResult): 1,
                        (SH.sourceShape, shape1): 1,
                        (edge1, object1): 1,
                        (edge2, object2): 1
                    }
                }
            )
        },
        {
            'ontology_file': base_dir + 'ontology_1.ttl',
            'violation_report_file': base_dir + 'violation_report_2.ttl',
            'result_graph_file': base_dir + 'result_graph_1.ttl',
            'expected_edge_count_dict': defaultdict(
                lambda: defaultdict(int),
                {
                    shape1: {
                        (RDFS.type, SH.ValidationResult): 3,
                        (RDFS.type, RUT.TestCaseResult): 3,
                        (SH.sourceShape, shape1): 3,
                        (edge1, object1): 3,
                        (edge2, object2): 2
                    }
                }
            )
        },
        {
            'ontology_file': base_dir + 'ontology_1.ttl',
            'violation_report_file': base_dir + 'violation_report_3.ttl',
            'result_graph_file': base_dir + 'result_graph_2.ttl',
            'expected_edge_count_dict': defaultdict(
                lambda: defaultdict(int),
                {
                    shape1: {
                        (RDFS.type, SH.ValidationResult): 6,
                        (RDFS.type, RUT.TestCaseResult): 6,
                        (SH.sourceShape, shape1): 6,
                        (edge1, object1): 3,
                        (edge2, object2): 3,
                        (edge3, object3): 3,
                        (edge4, object4): 3,
                    }
                }
            )
        },
    ]

    def test_graph_structure(self):
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case):
                result_graph, _ = get_violation_report_exemplars(
                    test_case['ontology_file'],
                    test_case['violation_report_file'])
                expected_graph = Graph()
                expected_graph.parse(test_case['result_graph_file'], format="turtle")
                if self.verbosity > 1:
                    print('\nresult_graph')
                    print_graph_human_readable(result_graph)
                    print('\nexpected_graph')
                    print_graph_human_readable(expected_graph)
                assert isomorphic(result_graph, expected_graph)

    def test_edge_count(self):
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case):
                _, edge_count_dict = get_violation_report_exemplars(
                    test_case['ontology_file'],
                    test_case['violation_report_file'])
                expected_edge_count_dict = test_case['expected_edge_count_dict']
                if self.verbosity > 1:
                    print('\nsorted(edge_count_dict)')
                    print_defaultdict_human_readable(edge_count_dict)
                    print('\nsorted(expected_edge_count_dict)')
                    print_defaultdict_human_readable(expected_edge_count_dict)
                self.assertEqual(edge_count_dict, expected_edge_count_dict)


if __name__ == '__main__':
    unittest.main(verbosity=2)
