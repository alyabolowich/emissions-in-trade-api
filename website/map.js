
const apiURL = 'http://api.emissionsintrade.com/v1/';

//Adding Leaflet
// add map
var map = L.map('map').setView({lat: 53, lon: 15}, 3);

// add OSM tiles
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
}).addTo(map);

// Add polylines
// create a red polyline from an array of LatLng points
var latlngs = [
    [45.51, -122.68],
    [37.77, -122.43],
    [34.04, -118.2]
];

var polyline = L.polyline(latlngs, {color: 'red'}).addTo(map);

// zoom the map to the polyline (need to make this _only_ when polyline is activated)
map.fitBounds(polyline.getBounds());

/* 
// Add polylines connecting two countries
document.getElementById('api-form').addEventListener('submit', function (e){ //e for event
    e.preventDefault(); //
    var stressor = document.getElementById('stressor').value;
    var regionTo = document.getElementById('region-to').value;
    var regionFrom = document.getElementById('region-from').value;
    var sectorFrom = document.getElementById('sector-from').value;
    var sectorTo = document.getElementById('sector-to').value;
    var endpoint = apiURL+`stressors/${stressor}?region_to=${regionTo}&region_from=${regionFrom}&sector_from=${sectorFrom}&sector_to=${sectorTo}`; 

    $.ajax({
        url: endpoint,
        type:'get',
        success: function(data){
            myArray = data.result
            createTable(myArray) //local function in main
            //console.log(myArray)
        //console.log(data);
        
        //document.getElementById('log').innerHTML = JSON.stringify(data); // This shows the JSON string on the website
        }
    })
}); */

// Need to add a layer group to the map that will store the polylines
var layerGroup = L.layerGroup().addTo(map);

// Add polyline
var polyline = L.polyline(latlngs, {color: 'blue'}).addTo(map);

function drawLine(marray) {
    var polyline = L.polyline(marray, {color: 'blue'}).addTo(map);
    polyline.addTo(layerGroup);
}

/*
// function to get an endpoint on leaflet
function testFunction(){
    // clear any existing polylines (since we do not want to see old material)
    layerGroup.clearLayers();
    map.closePopup();
    marker = L.marker([]).addTo(layerGroup);
    marker.bindPopup("Spiderman").openPopup();
}
*/
