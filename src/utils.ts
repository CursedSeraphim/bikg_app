export function exampleUtil() {
  return 'example';
}

const prefixes = {
  'http://www.metaphacts.com/resource/': ':',
  'http://www.metaphacts.com/ontologies/platform/repository/lookup#': 'lookup:',
  'http://www.metaphacts.com/resource/user/': 'User:',
  'http://help.metaphacts.com/resource/': 'Help:',
  'http://www.metaphacts.com/ontologies/platform#': 'Platform:',
  'http://www.w3.org/2002/07/owl#': 'owl:',
  'http://www.w3.org/2001/XMLSchema#': 'xsd:',
  'http://www.metaphacts.com/ontologies/platform/service/': 'Service:',
  'http://www.w3.org/2004/02/skos/core#': 'skos:',
  'http://www.w3.org/2000/01/rdf-schema#': 'rdfs:',
  'http://www.metaphacts.com/resource/admin/': 'Admin:',
  'https://data.boehringer.com/ontology/clinicaltrial/': 'bi-clinicaltrial:',
  'tag:stardog:api:search:': 'stardog-fts:',
  'http://www.metaphacts.com/ontologies/repository#': 'Repository:',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf:',
  'http://www.w3.org/ns/shacl#': 'sh:',
  'http://www.metaphacts.com/resource/assets/': 'Assets:',
  'http://www.metaphacts.com/ontologies/platform/ephedra#': 'ephedra:',
  'http://spinrdf.org/sp#': 'sp:',
  'http://data.boehringer.com/ontology/omics': 'omics:',
  'https://data.boehringer.com/id/': 'id:',
};

export const replaceUrlWithPrefix = (url) => {
  if (typeof url !== 'string') {
    return url;
  }
  for (const prefixUrl in prefixes) {
    if (url.startsWith(prefixUrl)) {
      return url.replace(prefixUrl, prefixes[prefixUrl]);
    }
  }

  // If no prefix found, return the original URL
  return url;
};

export const replaceKeysAndValuesInArray = (dataArray, replaceFn) => {
  return dataArray.map((item) => {
    const newItem = {};
    Object.entries(item).forEach(([key, value]) => {
      const newKey = replaceFn(key);
      let newValue = value;
      if (typeof value === 'string') {
        newValue = replaceFn(value);
      }
      newItem[newKey] = newValue;
    });
    return newItem;
  });
};