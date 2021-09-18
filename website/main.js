
// ** GLOBALS ** //

const apiURL = 'http://api.emissionsintrade.com/v1/'

// add basemap layer
var map = L.map('map').setView({lat: 51.5, lon: 11}, 3);   //Set center coordinates and zoom level (3)
var tileURL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
L.tileLayer(tileURL, {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
}).addTo(map);

// add layer group
var lyrGroup = L.layerGroup().addTo(map);
 
// Color arrow depending on sector
var colorDict = {"accommodation_and_food_services": "blue", 
                "agriculture": "red",
                "construction": "green",
                "electricity": "yellow",
                "finance_and_real_estate": "black",
                "manufacturing": "white",
                "mining": "purple",
                "public_services": "teal",
                "retail":"brown",
                "transport": "pink",
                "water_and_waste":"orange"};

var maxVals = {
    "co2":     4901975988251.285,
    "economy": 15968584.67,
    "vl":      424087.81680835114
};


// ** FUNCTIONS ** // 

// Load stressors
async function loadStressors() {
    const response = await fetch(apiURL+'stressors');
    const data = await response.json();
    console.log("STRESSORS");
    
    var options = ""; //<option> -- Select stressor --</option>

    for (let stressor of data.result) {
        options += `<option value="${stressor.path_var}">${stressor.name}</option>`;
    }

    document.getElementById("stressor").innerHTML=options;
}
loadStressors();

// Load regions
async function loadRegions() {
    const response = await fetch(apiURL+'regions');
    const data = await response.json();
    console.log("REGIONS")

    var options = "";//'<option value=""> -- Select country --</option>'
    //data.sort() // cannot sort because its a dictionart from the API (this is an OBJECT) needs to be aray
    data.result.sort(function(a,b){
        if (a.region_name < b.region_name) { //needed to call region name because a and b are objects 
            return -1;
        } //need the ifs becasue its strings (numbers would be a-b)
        if (a.region_name > b.region_name) {
            return 1;
        }
            // names must be equal
        return 0;
    }); 

    for (let country of data.result) { //data.result is an array
        //console.log(country.region_name);

        options += `<option value="${country.region_id}">${country.region_name}</option>`;
        //var lat = country.region_lat
        //var lon = country.region_lon
        //console.log(lat,lon)
        
    }
    document.getElementById("region-from").innerHTML=options;
    document.getElementById("region-to").innerHTML=options;
}
loadRegions();

// Load sectors
async function loadSectors() {
    const response = await fetch(apiURL+'sectors');
    const data = await response.json(); 
    console.log("SECTORS")
    var options = ""; //<option> -- Select sector --</option>

    for (let sector of data.result) {
        options += `<option value="${sector.sector}">${sector.sector}</option>`;
    }
    document.getElementById("sector-from").innerHTML=options;
    document.getElementById("sector-to").innerHTML=options;
}
loadSectors();

// Check how many Leaflet layers at start
function layerStart(){
    let qq = 0;
    map.eachLayer(function(){ qq += 1; });
    //console.log('Map has', qq, 'layers at start.');
}
layerStart();

// Count layers
function countLayers() {
    let ll = 0;
    map.eachLayer(function(){ ll += 1; });
    //console.log('Map has', ll, 'layers.');
}

// Delete old layers 
function deleteLayers(){
    // Remove old polylines/markers on each submit
    if(map.hasLayer(lyrGroup)){
        lyrGroup.eachLayer(
            function(i){
                lyrGroup.removeLayer(i);
        });
    }
}

function readData() {
    var stressor   = document.getElementById('stressor').value;
    var regionTo   = document.getElementById('region-to').value;
    var regionFrom = document.getElementById('region-from').value;
    var sectorFrom = document.getElementById('sector-from').value;
    var sectorTo   = document.getElementById('sector-to').value;

    return {
        "stressor": stressor,
        "regionTo": regionTo,
        "regionFrom": regionFrom,
        "sectorFrom": sectorFrom,
        "sectorTo": sectorTo
    }
}

async function getResults() {
    formData     = readData();
    var endpoint = apiURL+`stressors/${formData.stressor}?region_to=${formData.regionTo}&region_from=${formData.regionFrom}&sector_from=${formData.sectorFrom}&sector_to=${formData.sectorTo}`; 
    
    //console.log(endpoint);
    try {
        const response = await fetch(endpoint);
        const data     = await response.json();
        //console.log("this is data from getResults");
        //console.log(data);
        var data1 = data;
        return data;


    } catch {
        console.log("Error in API request"); 
    }
}


async function regionalData(){
    formData = readData();
    //console.log(formData);

    var regionURL = apiURL+"regions";

        try {
            const response = await fetch(regionURL);
            //console.log(regionURL);
            //console.log("regionLatLon fetched");
            const latlondata = await response.json();
            var arrayLatLon  = latlondata.result;
            //console.log([formData.regionTo, formData.regionFrom]);
            //console.log(arrayLatLon);
            var geographicData = await getLatLon(arrayLatLon, [formData.regionTo, formData.regionFrom]);
            //console.log(geographicData);
            //console.log(typeof geographicData);

            return geographicData;
        } catch {
            console.log("Error in API request");
    }              
}

function getLatLon(latlondata, regions){
    // Get the latitude and longitude of the regions to/from.
    var regionsLatLon = {}
    for (var i=0; i<regions.length; i++) {
        for (var j=0; j<latlondata.length; j++) {
            if (latlondata[j].region_id === regions[i]) {
                // Get an object of the region lat and lons
                regionsLatLon[regions[i]] = {'lat':latlondata[j].region_lat,
                                            'lon':latlondata[j].region_lon}
            }
        }
    }

    //console.log(regionsLatLon);
    //console.log(Object.keys(regionsLatLon).length);
    
    /* if rTo===rFrom, regionsLatLon only returns 1 data point. A duplicate of that region
    is needed for the map.  */ 
    if (Object.keys(regionsLatLon).length === 1) {
        var regionToLatLon   = [regionsLatLon[Object.keys(regionsLatLon)[0]]];
        var regionFromLatLon   = [regionsLatLon[Object.keys(regionsLatLon)[0]]];
    } else {
        var regionToLatLon   = [regionsLatLon[Object.keys(regionsLatLon)[0]]];
        var regionFromLatLon = [regionsLatLon[Object.keys(regionsLatLon)[1]]];
    }
     
    var fromToLatLon     = [...regionFromLatLon, ...regionToLatLon];

    return fromToLatLon;

}


function setPopUp(results) {
    for (var i=0; i<results.result.length; i++){
    var popUpTable = `<div class="row" id="pop-up-container">
                            <table id="pop-up-table">
                            <th>
                            </th>
                                <tr id="pop-up-table-row">
                                    <td>Region: </td>
                                    <td>${results.result[i].region_from}</td>
                                </tr>
                                <tr id="pop-up-table-row">
                                    <td>Sector From: </td>
                                    <td> ${results.result[i].sector_from}</td>
                                </tr>
                                <tr id="pop-up-table-row">
                                    <td>Sector To: </td> 
                                    <td>${results.result[i].sector_to}</td>
                                </tr>
                            </th>
                            </table>
                        </div>
                        <div class="row" id="pop-up-container">
                            <div class="column" id="pop-up-value-column">
                                <p id="pop-up-value"> ${Math.round(results.result[i].val)} </p>
                            </div>
                            <div class="column" id="pop-up-value-column">
                                <p id="pop-up-unit"> ${results.result[i].unit} </p>
                            </div>
                        </div>`;
    }

    var popup = L.popup({offset: [-2, -24]})
                .setContent(popUpTable)

    return popup;
}

document.getElementById("info-table").style.visibility="hidden";


function createTable(results){
    document.getElementById("info-table").style.visibility="visible";
    var table = document.getElementById('results-table-body');
    table.innerHTML = "";
    for (var i=0; i<results.result.length; i++){
        
        //console.log(data.length);
        var row = ` <td>${results.result[i].region_from}</td>
                    <td>${results.result[i].region_to}</td>
                    <td>${results.result[i].sector_from}</td>
                    <td>${results.result[i].sector_to}</td>
                    <td>${Math.round(results.result[i].val)}</td>
                    <td>${results.result[i].unit}</td>`;
        table.innerHTML += row;
    }
}

function makePolyline (rData, results) {
    deleteLayers();

    var formData = readData();
    var value    = results.result[0].val;
    var stressor = formData.stressor;

    /* Calculations necessary to make the Bezier curves. 
    From Ryan Catalani: https://ryancatalani.medium.com/?p=dc7188db24b4 */

    var latlng1 = Object.values(rData[0]);
    var latlng2 = Object.values(rData[1]);

    var offsetX = latlng2[1] - latlng1[1],
        offsetY = latlng2[0] - latlng1[0];

    var r = Math.sqrt( Math.pow(offsetX, 2) + Math.pow(offsetY, 2) ),
        theta = Math.atan2(offsetY, offsetX);

    var thetaOffset = (3.14/10);

    var r2 = (r/2)/(Math.cos(thetaOffset)),
        theta2 = theta + thetaOffset;

    var midpointX = (r2 * Math.cos(theta2)) + latlng1[1],
        midpointY = (r2 * Math.sin(theta2)) + latlng1[0];

    var midpointLatLng = [midpointY, midpointX];

    /* Color the polyline based on the sector from */
    var sectorFrom = results.result[0].sector_from;
    var lineColor = colorDict[sectorFrom];

    /* Size the width of the polyline based on the sector's emission intensity.
    Emission intensity is proportional to the query value over the highest value for
    that stressor. The log of both is used to reduce the distance between the two values
    (since stressorMax is a very large value, it always yields a very small value). The
    lineSize is the maximum value that the line should be (anything bigger and it does
    not look good visually) */

    var stressorMax = maxVals[stressor];
    var stressorRatio =  Math.log(value)/Math.log(stressorMax);
    var lineSize = 29
    var lineWeight = 1 + lineSize*stressorRatio

    var pathOptions = {
        color:  lineColor,
        weight: lineWeight
    }

    var curvedPath = lyrGroup.addLayer(L.curve(
        [
            'M', latlng1,
            'Q', midpointLatLng,
                latlng2
        ], pathOptions))
        .arrowheads({size: '20px',
                    yawn: 55,
                    fill: true})
        .addTo(map);
    
    return curvedPath

} 

function markerIcon (start, pop) {

    /* When rTo and rFrom are same, a marker is added. The original blue marker is swapped
    with a nicer marker (made in ppt). The iconAnchor puts the top left corner of the icon at the 
    designated latlong. The iconAnchor is moved up by the length of the icon (30) and to the left by 15 pixels
    since the midpoint is assumed to be in the middle of the bottom edge of the icon.  */

    var newMarker = L.icon({iconUrl: 'images/marker.svg', 
                            iconSize: [24, 30], 
                            iconAnchor: [15, 30]});

    lyrGroup.addLayer(L.marker(start, {icon: newMarker})
            .bindPopup(pop).addTo(map));

    var newmap = map.setView(start, zoom=5);

    return newmap
}

document.getElementById('api-form').addEventListener('submit', async function (e){
    e.preventDefault(); 

    var results  = await getResults();
    var rData    = await regionalData();
    var pop      = setPopUp(results);

    var start = rData[0];
    var end   = rData[1];

    if (start === end) {
        markerIcon(start, pop);

    } else {
        makePolyline(rData, results);
    }

})


