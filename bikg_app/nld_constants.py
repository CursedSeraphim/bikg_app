# Central constants for naming in the NLD (Ontology) output
from rdflib import Namespace, URIRef

# Term used to denote exemplar nodes and related edge names
EXEMPLAR_TERM = "exemplar"

# Namespace where exemplar nodes are created
EXEMPLAR_NAMESPACE = Namespace(f"http://example.com/{EXEMPLAR_TERM}#")

# Predicate connecting focus nodes to exemplars
EXEMPLAR_EDGE_URI = URIRef(f"http://customnamespace.com/has{EXEMPLAR_TERM.capitalize()}")
