import json
from rdflib import Graph

# file_name = "bikg_app/rdf/omics_model.ttl"
# layout_file_name = "bikg_app/json/omics_model_layout.json"
# cytoscape_file_name = "bikg_app/json/omics_model_cytoscape.json"
file_name = "bikg_app/rdf/ex51_filtered.ttl"
layout_file_name = "bikg_app/json/ex51_layout.json"
cytoscape_file_name = "bikg_app/json/ex51_cytoscape.json"
scaling_factor = 1000

def process_nodes_edges_for_cytoscape(file_path):
    with open(layout_file_name) as f_layout:
        layout_data = json.load(f_layout)
        
    g = Graph().parse(file_path, format="turtle")
    nodes, edges, processed_nodes = [], [], {}
    for s, p, o in g:
        for node in (s, o):
            if node not in processed_nodes:
                layout_info = layout_data.get(str(node), [])
                position = {"x": layout_info[0]*scaling_factor if len(layout_info) > 0 else 0, 
                            "y": layout_info[1]*scaling_factor if len(layout_info) > 0 else 0}
                nodes.append({"data": {"id": node, "label": node}, "grabbable": True, "locked": False, "position": position})
                processed_nodes[node] = True
        
        edges.append({"data": {"id": str(s) + str(o), "source": str(s), "target": str(o)}})
    
    return nodes, edges

nodes, edges = process_nodes_edges_for_cytoscape(file_name)
data = {"data": {"nodes": nodes, "edges": edges}}
with open(cytoscape_file_name, "w") as f:
    json.dump(data, f)
