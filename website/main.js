( function (){
    
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

    var options = ""; //<option> -- Select Region --</option>
    //data.sort() // cannot sort because its a dictionart from the API (this is an OBJECT) needs to be aray
    data.result.sort(function(a,b){
        if (a.region_name < b.region_name) { //needed to call regionname because a and b are objects 
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

// Create helper function to allow two independent actions on the Submit button
var apiForm = document.getElementById('api-form');

/*for (var i=0; i<tabs.length; i++) {
    var currentTab = tabs[i];
    currentTab.onclick = extractUserInput();
    currentTab.onclick = extractRegion();
}

function multipleListeners() {

}

multipleListeners(
    document.getElementById('api-form'),
    ['submit']) */

function extractUserInput() {
    document.getElementById('api-form').addEventListener('click', function (e){
        e.preventDefault(); //
        var stressor = document.getElementById('stressor').value;
        var regionTo = document.getElementById('region-to').value;
        var regionFrom = document.getElementById('region-from').value;
        var sectorFrom = document.getElementById('sector-from').value;
        var sectorTo = document.getElementById('sector-to').value;
        var endpoint = apiURL+`stressors/${stressor}?region_to=${regionTo}&region_from=${regionFrom}&sector_from=${sectorFrom}&sector_to=${sectorTo}`; 
    
        //console.log(endpoint);
        async function getURL() {
            const response = await fetch(endpoint);
            const data = await response.json();
            console.log(response);
            console.log(data);
        
            // Create the table that shows the emissions
            createTable(data.result);
        }
        
        getURL();
    })
}
//extractUserInput();



// Create a table from the results
function createTable(data){
    var table = document.getElementById('results-table');
    table.innerHTML = "";
    for (var i=0; i<data.length; i++){
        //console.log(data.length);
        var row = ` <td>${data[i].region_from}</td>
                    <td>${data[i].region_to}</td>
                    <td>${data[i].sector_from}</td>
                    <td>${data[i].sector_to}</td>
                    <td>${data[i].val}</td>
                    <td>${data[i].unit}</td>`;
        table.innerHTML += row;
    }
}


async function test() {
    var endpoint = "http://api.emissionsintrade.com/v1/stressors/co2?region_to=at&region_from=at&sector_from=accommodation_and_food_services&sector_to=accommodation_and_food_services"
    const response = await fetch(endpoint);
    const data = await response.json();
    //console.log(await data.result)
}
test();


// Load result from API

function extractRegion(){
    document.getElementById('api-form').addEventListener('click', function (e){
        e.preventDefault(); //
    
        // Get the region data selected
        var regionTo = document.getElementById('region-to').value;
        var regionFrom = document.getElementById('region-from').value;
        var regionLatLon = apiURL+"regions";
        console.log(regionTo);
    
        async function getRegionGeo() {
            const response = await fetch(regionLatLon);
            const latlondata = await response.json();
            //console.log(latlondata);
        
            var arrayLatLon = latlondata.result;
            getLatLon(arrayLatLon, [regionTo, regionFrom]);
        }
        getRegionGeo();
    })
}
extractRegion();



// Create a table from the results. Regions is an array containing rTo and rFrom
function getLatLon(latlondata, regions){

    var table = document.getElementById('results-latlon');
    var regionsLatLon = {}
    table.innerHTML = "";
    for (var i=0; i<regions.length; i++) {
        for (var j=0; j<latlondata.length; j++) {
            if (latlondata[j].region_id === regions[i]) {
                // Get an object of the region lat and lons
                regionsLatLon[regions[i]] = {'lat':latlondata[j].region_lat,
                                            'lon':latlondata[j].region_lon}
                // Put into a table 
                var row = ` <td>${latlondata[j].region_id}</td>
                            <td>${latlondata[j].region_lat}</td>
                            <td>${latlondata[j].region_lon}</td>`;
                table.innerHTML += row;
            }
        }
    }

    //rTo is first element in the object.
    var regionToLatLon = [regionsLatLon[Object.keys(regionsLatLon)[0]]];
    //console.log(regionToLatLon);

    var regionFromLatLon = [regionsLatLon[Object.keys(regionsLatLon)[1]]]; 
    var fromToLatLon = [...regionFromLatLon, ...regionToLatLon];
    //console.log(fromToLatLon);

    //countLayers();

    // Create a marker if rTo === rFrom
    if (regionsLatLon[regions[0]] === regionsLatLon[regions[1]]) {
        //console.log(regionLatLon[regions[0]]);
        //console.log(regionLatLon[regions[1]]);
        lyrGroup.addLayer(L.marker(regionsLatLon[regions[0]]).addTo(map));

    } else { //rTo != rFrom
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

        document.getElementById('api-form').addEventListener('submit', function (e){
            e.preventDefault(); //
            var sectorFrom= document.getElementById('sector-from').value;

            if (colorDict.hasOwnProperty(sectorFrom)){
            var lineColor = colorDict[sectorFrom]

            } else {
            var lineColor = "red";
            }
        var polyline = lyrGroup.addLayer(L.polyline(fromToLatLon, {color: lineColor}).arrowheads());
        polyline.addTo(map);
        })
        
    }
}

function myFunc(){
    extractRegion();
    extractUserInput();
}
myFunc();
/*
function polylineColor(){
    // List all sectors with corresponding colors in dict
    var colorDict = {"accommodation_and_food_services": "blue", 
                    "agriculture": "red",
                    "construction": "green",
                    "electricity": "yellow",
                    "finance_and_real_estate": "black",
                    "manufacturing": "white"};

    document.getElementById('api-form').addEventListener('submit', function (e){
        e.preventDefault(); //
        var sectorFrom= document.getElementById('sector-from').value;

        if (colorDict.hasOwnProperty(sectorFrom)){
            var color = colorDict[sectorFrom]
            
        } else {
            var color = "red";
        }
        return color; 
    })
}

polylineColor();
*/

})();







  /* CODE FOR SUBMIT FUNCTION TO CHECK VALIDITY

  form.addEventListener('submit', function (event) {

    if (!form.checkValidity()) {
      // TODO: Display alert or modal window to inform the user.
      
      // Also return early because the form was not valid.
      return false;
    }
    
    // Flag form as already validated.
    form.classList.add('was-validated');
  
    // In any case don't send the form, to prevent a full-page request.
    event.preventDefault();
  
    // TODO: Call the API via Ajax.
    
  }, false); */

  // Example starter JavaScript for disabling form submissions if there are invalid fields

  // Example starter JavaScript for disabling form submissions if there are invalid fields

