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

    var options = '<option value=""> -- Select country --</option>';
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


let results; 

function main(){
    document.getElementById('api-form').addEventListener('submit', function (e){
        e.preventDefault(); //
        var stressor   = document.getElementById('stressor').value;
        var regionTo   = document.getElementById('region-to').value;
        var regionFrom = document.getElementById('region-from').value;
        var sectorFrom = document.getElementById('sector-from').value;
        var sectorTo   = document.getElementById('sector-to').value;
        var endpoint   = apiURL+`stressors/${stressor}?region_to=${regionTo}&region_from=${regionFrom}&sector_from=${sectorFrom}&sector_to=${sectorTo}`; 
        
        console.log(endpoint);
        async function getResults() {
            try {
                const response  = await fetch(endpoint);
                const data      = await response.json();

                var dictResults = Object.values(data);
                console.log(dictResults);
            } catch {
                console.log("Network error");
            }

        }
        getResults();
  
    })

    document.getElementById('api-form').addEventListener('submit', function (e){
        e.preventDefault(); //
    
        // Get the region data selected
        var regionTo = document.getElementById('region-to').value;
        var regionFrom = document.getElementById('region-from').value;
        var regionLatLon = apiURL+"regions";
        //console.log(regionTo);
    
        async function getRegionGeo() {
            try {
                const response = await fetch(regionLatLon);
                const latlondata = await response.json();
                var arrayLatLon = latlondata.result;
                getLatLon(arrayLatLon, [regionTo, regionFrom]);
            } catch {
                alert("Network error");
            }              

        }
        getRegionGeo();
    })

    function getLatLon(latlondata, regions){
        deleteLayers();
        var table = document.getElementById('results-latlon');
        var regionsLatLon = {}
        table.innerHTML = "";
        for (var i=0; i<regions.length; i++) {
            for (var j=0; j<latlondata.length; j++) {
                if (latlondata[j].region_id === regions[i]) {
                    // Get an object of the region lat and lons
                    regionsLatLon[regions[i]] = {'lat':latlondata[j].region_lat,
                                                'lon':latlondata[j].region_lon}
                }
            }
        }

        //rTo is first element in the object.
        var regionToLatLon = [regionsLatLon[Object.keys(regionsLatLon)[0]]];
        var regionFromLatLon = [regionsLatLon[Object.keys(regionsLatLon)[1]]]; 
        var fromToLatLon = [...regionFromLatLon, ...regionToLatLon];
    
        //countLayers();
    
        // Create a marker if rTo === rFrom
        if (regionsLatLon[regions[0]] === regionsLatLon[regions[1]]) {
            lyrGroup.addLayer(L.marker(regionsLatLon[regions[0]]).addTo(map));
    
        } else { //rTo != rFrom
    
            // Get the values from the form 
            var sectorFrom = document.getElementById('sector-from').value;
            var stressor   =  document.getElementById('stressor').value;
    
    
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
    
                if (colorDict.hasOwnProperty(sectorFrom)){
                var lineColor = colorDict[sectorFrom]
    
                } else {
                var lineColor = "red";
                }
            
            // Adjust size of line depending on weight 
    
            // Dict of maximum value from each stressor to adjust the polyline width
            var maxVals = {
                "co2": 4901975988251.285,
                "economy": 15968584.67,
                "vl": 424087.81680835114
            };
            
            //console.log(maxVals[Object.keys(maxVals)[0]]);
            // console.log(maxVals[stressor]);  //Check this returns the value associated to each stressor
            var stressorWeight = maxVals[stressor];
    
    
            if (stressorWeight <1){
                var lineWeight = 0.01;
            } else {
                var lineWeight = 1 + 29*(Math.log(1000000)/(Math.log(stressorWeight)));
                console.log(lineWeight);
            }
            
            // Calculate lineweight based on API result
    
            var polyline = lyrGroup.addLayer(L.polyline(fromToLatLon, {color: lineColor, weight: lineWeight})
                .arrowheads({size: '20px',
                            yawn: 55,
                            fill: true}));
            polyline.addTo(map);
        }
    }
}

main();





/*
    function milestokm(miles) {
        var km = miles * 1.6;
        return km
    }
    
    function setup (){
        var km = milestokm(26.3);
        console.log(km);
        var km2 = milestokm(1000);
        console.log(km2);
    }
    
    setup();

    */