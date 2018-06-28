(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */

    // Module definition, note the dependency.
    angular.module('facetApp', ['seco.facetedSearch'])

    /*
     * RPP service
     * Handles SPARQL queries and defines facet configurations.
     */
    .service('sgovService', sgovService);

    /* @ngInject */
    function sgovService(FacetResultHandler) {

        /* Public API */

        // Get the results from DBpedia based on the facet selections.
        this.getResults = getResults;
        // Get the facet definitions.
        this.getFacets = getFacets;
        // Get the facet options.
        this.getFacetOptions = getFacetOptions;

        /* Implementation */

        // Facet definitions
        // 'facetId' is a "friendly" identifier for the facet,
        //  and should be unique within the set of facets.
        // 'predicate' is the property that defines the facet (can also be
        //  a property path, for example).
        // 'name' is the title of the facet to show to the user.
        // If 'enabled' is not true, the facet will be disabled by default.
        var facets = {
            // Text search facet for names
            pojem: {
                facetId:  'pojem',
                predicate: '<http://www.w3.org/2004/02/skos/core#prefLabel>',
                enabled: true,
                name: 'Pojem'
            },
            glosar: {
                facetId: 'glosar',
                predicate:'<http://www.w3.org/2004/02/skos/core#inScheme>/<http://www.w3.org/2000/01/rdf-schema#label>',
                enabled: true,
                name: 'Glosář'
            },
	    typ: {
                facetId:  'typ',
                predicate: 'a',
                enabled: true,
                name: 'Typ'
            },
        };

        var endpointUrl = 'https://ssp.opendata.cz/sparql';

        // We are building a faceted search for writers.
        var rdfClass = '<http://www.w3.org/2004/02/skos/core#Concept>';

        // The facet configuration also accept a 'constraint' option.
        // The value should be a valid SPARQL pattern.
        // One could restrict the results further, e.g., to writers in the
        // science fiction genre by using the 'constraint' option:
        //
        // var constraint = '?id <http://dbpedia.org/ontology/genre> <http://dbpedia.org/resource/Science_fiction> .';
        //
        // Note that the variable representing a result in the constraint should be "?id".
        //
        // 'rdfClass' is just a shorthand constraint for '?id a <rdfClass> .'
        // Both rdfClass and constraint are optional, but you should define at least
        // one of them, or you might get bad results when there are no facet selections.
        var facetOptions = {
            endpointUrl: endpointUrl, // required
            rdfClass: rdfClass, // optional
            // constraint: constraint, // optional, not used in this demo
            preferredLang : 'cs' // required
        };

        var prefixes =
        ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>' +
        ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
        ' PREFIX zs: <https://ssp.opendata.cz/slovník/základní/pojem/>'  +
        ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>';


        // This is the result query, with <RESULT_SET> as a placeholder for
        // the result set subquery that is formed from the facet selections.
        // The variable names used in the query will be the property names of
        // the reusulting mapped objects.
        // Note that ?id is the variable used for the result resource here,
        // as in the constraint option.
        // Variable names with a '__' (double underscore) in them will results in
        // an object. I.e. here ?work__id, ?work__label, and ?work__link will be
        // combined into an object:
        // writer.work = { id: '[work id]', label: '[work label]', link: '[work link]' }
        var queryTemplate =
        ' SELECT * WHERE {' +
        '  <RESULT_SET> ' +
	' { ?id a skos:Concept .' +
        '  OPTIONAL { '+
        '   ?id skos:prefLabel ?nazev . ' +
        '  }' +
        '  OPTIONAL { '+
        '   ?id a ?typ__id . ' +
        '   FILTER(?typ__id != skos:Concept) ' +
	'   OPTIONAL { ?typvlastnosti__id rdfs:domain ?id . ?typvlastnosti__id skos:prefLabel ?typvlastnosti__nazev ; a zs:typ-vlastnosti . FILTER(?typ__id = zs:typ-objektu) }' +
	'   OPTIONAL { ?typvztahu__id rdfs:domain ?id . ?typvztahu__id skos:prefLabel ?typvztahu__nazev ; a zs:typ-vztahu . FILTER(?typ__id = zs:typ-objektu) }' +
        '  }' +
        '  OPTIONAL {'+
        '    ?id skos:inScheme ?glosar__id . ' +
        '    ?glosar__id rdfs:label ?glosar__nazev . ' +
        '  }}' +
        ' }';

        var resultOptions = {
            prefixes: prefixes, // required if the queryTemplate uses prefixes
            queryTemplate: queryTemplate, // required
            resultsPerPage: 1000, // optional (default is 10)
            pagesPerQuery: 10, // optional (default is 1)
            paging: true // optional (default is true), if true, enable paging of the results
        };

        // FacetResultHandler is a service that queries the endpoint with
        // the query and maps the results to objects.
        var resultHandler = new FacetResultHandler(endpointUrl, resultOptions);

        // This function receives the facet selections from the controller
        // and gets the results from DBpedia.
        // Returns a promise.
        function getResults(facetSelections) {
            // If there are variables used in the constraint option (see above),
            // you can also give getResults another parameter that is the sort
            // order of the results (as a valid SPARQL ORDER BY sequence, e.g. "?id").
            // The results are sorted by URI (?id) by default.
            return resultHandler.getResults(facetSelections).then(function(pager) {
                // We'll also query for the total number of results, and load the
                // first page of results.
                return pager.getTotalCount().then(function(count) {
                    pager.totalCount = count;
                    return pager;
                }).then(function() {
                    return pager;
                });
            });
        }

        // Getter for the facet definitions.
        function getFacets() {
            return facets;
        }

        // Getter for the facet options.
        function getFacetOptions() {
            return facetOptions;
        }
    }
})();
