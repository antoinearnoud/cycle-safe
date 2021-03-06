var L = require('leaflet'),
    Router = require('./router'),
    util = require('./util'),
    extent = require('turf-extent');
    gauge = require('gauge-progress')(),
    lineDistance = require('@turf/line-distance'),
    config = require('./config');

L.Icon.Default.imagePath = 'images/';

require('leaflet.icon.glyph');
require('leaflet-routing-machine');
require('leaflet-control-geocoder');

var map = L.map('map');

L.tileLayer('https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}{r}.png?access_token={token}', {
        attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
        token: config.apiToken
    })
    .addTo(map);

gauge.start();
var xhr = new XMLHttpRequest();
xhr.addEventListener('progress', function(oEvent) {
    if (oEvent.lengthComputable) {
        gauge.progress(oEvent.loaded, oEvent.total);
    }
});
xhr.onload = function() {
    gauge.stop();
    if (xhr.status === 200) {
        gauge.progress(100, 100);
        setTimeout(function() {
            initialize(JSON.parse(xhr.responseText));
        });
    }
    else {
        alert('Could not load routing network :( HTTP ' + xhr.status);
    }
};
xhr.open('GET', 'static/map1.geojson');
xhr.send();

var control;
function initialize(network) {
    // var bbox = extent(network);
    // var bounds = L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
    // map.fitBounds(bounds);

    // L.rectangle(bounds, {color: 'orange', weight: 1, fillOpacity: 0.03, interactive: false}).addTo(map);

    var router = new Router(network);
    control = L.Routing.control({
        createMarker: function(i, wp) {
            return L.marker(wp.latLng, {
                icon: L.icon.glyph({ prefix: '', glyph: String.fromCharCode(65 + i) }),
                draggable: true
            })
        },
        geocoder: L.Control.Geocoder.mapbox(config.apiToken),
        router: router,
        routeWhileDragging: true,
        routeDragInterval: 100,
        lineOptions: {
            styles: [{color: 'green', opacity: 1, weight: 5}]
         }
        })
        .on('routesfound', function(e) {
            var infoContainer = document.querySelector('.leaflet-testbox');
            var routes = e.routes;
            // infoContainer.innerHTML = 'Average estimated risk: ' + (routes[0].summary.totalTime/routes[0].coordinates.length);
            infoContainer.innerHTML = 'Cumulated risk: ' + routes[0].summary.totalTime.toFixed(2);
        })
        .addTo(map);

        var container = L.DomUtil.create('div', 'leaflet-testbox');
    // 	input = L.DomUtil.create('input', '', container);
    // control.getContainer().appendChild(container);
    // control.getContainer().appendChild(input);
    var infoContainer = document.querySelector('.leaflet-routing-container');
    infoContainer.appendChild(container);

    control.setWaypoints([
		[42.350, -71.097], // home
		[42.350, -71.050],  // insight
    ]);

    L.Routing.errorControl(control).addTo(map);

    var totalDistance = network.features.reduce(function(total, feature) {
            if (feature.geometry.type === 'LineString') {
                return total += lineDistance(feature, 'kilometers');
            } else {
                return total;
            }
        }, 0),
        graph = router._pathFinder._graph.compactedVertices,
        nodeNames = Object.keys(graph),
        totalNodes = nodeNames.length,
        totalEdges = nodeNames.reduce(function(total, nodeName) {
            return total + Object.keys(graph[nodeName]).length;
        }, 0);

    var infoContainer = document.querySelector('#info-container');
    [
        ['Total Road Length', totalDistance, 'km'],
        ['Network Nodes', totalNodes / 1000, 'k'],
        ['Network Edges', totalEdges / 1000, 'k'],
        ['Coordinates', router._points.features.length / 1000, 'k']
    ].forEach(function(info) {
        var li = L.DomUtil.create('li', '', infoContainer);
        li.innerHTML = info[0] + ': <strong>' + Math.round(info[1]) + (info[2] ? '&nbsp;' + info[2] : '') + '</strong>';
    });

    var networkLayer = L.layerGroup(),
        vertices = router._pathFinder._graph.sourceVertices,
        renderer = L.canvas().addTo(map);
    nodeNames.forEach(function(nodeName) {
        var node = graph[nodeName];
        Object.keys(node).forEach(function(neighbor) {
            var c1 = vertices[nodeName],
                c2 = vertices[neighbor];
            L.polyline([[c1[1], c1[0]], [c2[1], c2[0]]], { weight: 1, opacity: 0.4, renderer: renderer, interactive: false })
                .addTo(networkLayer)
                .bringToBack();
        });
    });

    L.control.layers(null, {
        'Routing Network': networkLayer
    }, { position: 'bottomright'}).addTo(map);

}

// $.getJSON("static/Existing_Bike_Network.geojson",function(data){
	// add GeoJSON layer to the map once the file is loaded
    // L.geoJson(data).addTo(map).bringToBack();
//   });


window.onload = function() {
	// setup the JSON Submit button 
	document.getElementById("JSONsubmit").onclick = function() {
		sendJSON();
	};
}

function sendJSON() {
	// collect variables 
	// var name = document.getElementById('nameVar').value;
	// var age = document.getElementById('ageVar').value;
	// var country = document.getElementById('countryVar').value;

	// build a JavaScript object using the variables
	var data_object = {
			// "name"		: name,
			// "age"		: age,
			// "country" 	: country 
		};

	// convert JavaScript object to JSON object
	var data_json = JSON.stringify(data_object);
	
	// log state and the JavaScript object (to be sent in JSON format)
	console.log(">> JSON data : ");
	console.log(data_object);
	console.log(">> Sending..");

	// AJAX the JSON object to the server 
	// and process the incoming data (JSON)
	$.ajax({
		type: "POST",
		url: "/json_receiver",
		data: data_json, 
		contentType:"application/json; charset=utf-8",
  		dataType:"json",
		success : function(data) {
			// log the current state
			console.log("<< Received JSON data : ");
			// console.log(data);
			console.log("<< Success!");
			// genrate reponse and print on the document
			// var message = "Hello, <b>" + data['name'] + "</b>. You are : <b>" + data['status'] + "</b> !";
			// $('#JSONresultHolder').html(message);
			
			update(data);
		},
		error : function(){
			console.log("<< Error!")
		}
	});
	
	// stop link from reloading the page
	event.preventDefault();
}

function update(network) {
	// var firstload = 1;
	
    // var router = new Router(network);
    options = {
        serviceUrl: 'https://api.mapbox.com/directions/v5',
        profile: 'mapbox/cycling',
        useHints: false
    };
    var router = L.routing.mapbox(config.apiToken, options);
    control.router = control._router = control.options.router = router;
    control.route({});
}
