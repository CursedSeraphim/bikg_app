import json
from rdflib import Graph

file_name = "bikg_app/ttl/ex51_filtered.ttl"
cytoscape_file_name = "bikg_app/json/ex51_cytoscape.json"

def process_nodes_edges_for_cytoscape(file_path):
        
    g = Graph().parse(file_path, format="turtle")
    nodes, edges, processed_nodes = [], [], {}
    for s, p, o in g:
        for node in (s, o):
            if node not in processed_nodes:
                position = {"x": 0, 
                            "y": 0}
                nodes.append({"data": {"id": node, "label": node}, "grabbable": True, "locked": False, "position": position})
                processed_nodes[node] = True
        
        edges.append({"data": {"id": str(s) + str(o), "source": str(s), "target": str(o)}})
    
    return nodes, edges

nodes, edges = process_nodes_edges_for_cytoscape(file_name)
data = {"data": {"nodes": nodes, "edges": edges}}
with open(cytoscape_file_name, "w") as f:
    json.dump(data, f)
