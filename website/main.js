// ** GLOBALS ** //

const apiURL = 'http://api.emissionsintrade.com/v1/'

// add basemap layer
var map = L.map('map')
           .setView({lat: 51.5, lon: 11}, 3)
           .setMinZoom(2);   //Set center coordinates and zoom level (2)
var tileURL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
L.tileLayer(tileURL, {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
    interactive: true
}).addTo(map);

// add layer group
var lyrGroup = L.featureGroup().addTo(map);
 
// Match a sector to a color (used to color polylines)
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
    "co2":     4901975988251,
    "economy": 15968584,
    "vl":      424087
};

document.getElementById("info-table").style.visibility="hidden";

// ** FUNCTIONS ** // 

// Load stressors
async function loadStressors() {
    const response = await fetch(apiURL+'stressors');
    const data = await response.json();
    
    var options = ""; //<option> -- Select stressor --</option>

    for (let stressor of data.result) {
        options += `<option value="${stressor.path_var}">${stressor.name}</option>`;
    }

    document.getElementById("stressor").innerHTML=options;
}

// Load regions
async function loadRegions() {
    const response = await fetch(apiURL+'regions');
    const data = await response.json();

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
        options += `<option value="${country.region_id}">${country.region_name}</option>`;
    }

    document.getElementById("region-from").innerHTML=options;
    document.getElementById("region-to").innerHTML=options;
}

// Load sectors
async function loadSectors() {
    const response = await fetch(apiURL+'sectors');
    const data = await response.json(); 

    var options = ""; //<option> -- Select sector --</option>

    for (let sector of data.result) {
        options += `<option value="${sector.sector}">${sector.sector}</option>`;
    }
    document.getElementById("sector-from").innerHTML=options;
    document.getElementById("sector-to").innerHTML=options;
}

// Check how many Leaflet layers at start
function layerStart(){
    let qq = 0;
    map.eachLayer(function(){ qq += 1; });
    console.log('Map has', qq, 'layers at start.');
}

// Count layers
function countLayers() {
    let ll = 0;
    map.eachLayer(function(){ ll += 1; });
    console.log('Map has', ll, 'layers.');
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

    var regionFrom  = Array.from(document.querySelectorAll('#region-from > option:checked'),
    ({value}) => value
    );
    var regionTo    = Array.from(document.querySelectorAll('#region-to > option:checked'),
    ({value}) => value
    );
    var sectorFrom  = Array.from(document.querySelectorAll('#sector-from > option:checked'),
    ({value}) => value
    );
    var sectorTo   = Array.from(document.querySelectorAll('#sector-to > option:checked'),
    ({value}) => value
    );

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
        return data;


    } catch {
        console.log("Error in the API request"); 
    }
}

async function regData() {
    // Read the data that the user has chosen from the form
    formData = readData();
    var results  = await getResults();
    // Get all lat/lon data from the regions API
    var regionURL = apiURL+"regions";

        try {
            // Retrieve lat/lon data from the regions API. This will return the data for all countries
            const response = await fetch(regionURL);
            const latlondata = await response.json();

            // arrayLL will return an array nested with dicts of all the region ids, region names & their lats/lons
            // example: arrayLL[0] = {region_id:"at", region_lat: 47.xx, region_lon: 14.xx, region_name:"austria"}
            var arrayLL  = latlondata.result;

            // userRequest will return a list of results of the data that the user is requesting in the form
            var userRequest = results.result;

            // for each row in userRequest
            for (var p=0; p < userRequest.length; p++ ){
                // and for each row in the list of country coordinate data
                for (var t=0; t < arrayLL.length; t++ ){
                    // if the country id at row t in the array matches the region_from (also the id) data requested by the user
                    if (arrayLL[t].region_id === userRequest[p].region_from) {
                        //create a dictionary that houses the region from coordinates 
                        userRequest[p]["coords_from"] = {"lat" : arrayLL[t].region_lat, "lon" : arrayLL[t].region_lon}
                    }
                    // and do the same when region_id matches the region_to id
                    if (arrayLL[t].region_id === userRequest[p].region_to) { 
                        userRequest[p]["coords_to"] = {"lat" : arrayLL[t].region_lat, "lon" : arrayLL[t].region_lon}
                    }
                }
            }            

            return userRequest;

        } catch(err) {
            console.log(err.message);
            console.log("Error parsing the location data");
            
    }   
}

function createPopUpTable(userData) {
    var popUpTable = document.getElementById('results-pop-up-body');
    popUpTable.innerHTML = `<tr>`;
    for (var i=0; i<userData.length; i++){
        var row = ` <td>${userData[i].region_from}</td>
                    <td>${userData[i].sector_from}</td>
                    <td>${userData[i].sector_to}</td>
                    <td>${Math.round(userData[i].val)}</td>
                    <td>${userData[i].unit}</td>`;
        popUpTable.innerHTML += row;
    }
    popUpTable.innerHTML += `</tr>`;
    var popup = L.popup({offset: [-2, -24], maxWidth: "auto"})
                .setContent(document.getElementById("pop-up-table"))

    return popup;
}

/* Hide the map if the button "View Table" at the top of the page is selected */
function viewTable(userData) {
    var tableBtn = document.getElementById('table-btn');
    tableBtn.onclick = function() {
        var showMap = document.getElementById('map');
        showMap.style.display = 'none';
        var infoTable = document.getElementById('info-table');
        infoTable.style.display= 'block';
        console.log("Map hidden - table shown");
    }  
    createTable(userData);
}  

function createTable(userData){
    /* createTable() accepts the results from the user input (comes from the getResults())
    and makes a table from these results. */
    document.getElementById("info-table").style.visibility="visible";
    var table = document.getElementById('results-table-body');
    table.innerHTML = "";
    for (var i=0; i<userData.length; i++){
        
        //console.log(data.length);
        var row = ` <td>${userData[i].region_from}</td>
                    <td>${userData[i].region_to}</td>
                    <td>${userData[i].sector_from}</td>
                    <td>${userData[i].sector_to}</td>
                    <td>${Math.round(userData[i].val)}</td>
                    <td>${userData[i].unit}</td>`;
        table.innerHTML += row;
    }
}

function lineFactor(userData) { 

    /*The number of arrows that appear on the map are influenced by two factors: the number of 
    (rf,rt) pairs and the number of sectors from (sf). In the case of overlapping lines, this is due to one 
    (rf,rt) pair having multiple sectors to/from, so we need to separate these overlapping lines. 
    To do so, we make a set (to remove duplicate (sf-st) pairs of other countries) to know how many
    (sf,st) pairs will exist for each (rf, rt) pair. 
    */

    var setSF = new Set()

    for (var i=0; i < userData.length; i++ ){
        setSF.add(userData[i].sector_from);
    }

    // Add 3 to the set size to reduce having a large factor value (which will result in a large curve)
    var numSF = setSF.size + 2
    
    arrayFactors = []
    for (var i=0; i < (setSF.size); i++ ){
        /* Need to add i+1 in the Math.sqrt() else i will be 0, since the first value of i < (setSF.size) 
        will be 0 (0th position). We do not, however, add 1 to setSF.size because then this would provide
        yield an array of 3 values instead of two (thus three arrows)
        */
        arrayFactors.push(Math.sqrt(i+1 / numSF))
    }
    return arrayFactors
}

function bboxLatLng(userData) {
    bnds  = []

    // Get latlon data for each region selected
    for (var i=0; i < userData.length; i++ ){
        var reg1 = Object.values(userData[i].coords_from);
        var reg2 = Object.values(userData[i].coords_to);

        bnds.push(reg1, reg2)
    }

    // Remove duplicates (from SO: https://stackoverflow.com/questions/44014799/javascript-how-to-remove-duplicate-arrays-inside-array-of-arrays)
    // Comments my own
    
    // Create an object to hold the lats and lons
    var removeDuplicates = {}

    // For each array in the bnds element, join it to remove duplicates as a key
    // and as value {45.1, 15.2: [45.1, 15.2]. Since we get the key as the lat/lon
    // we can get these later (since a dict will not have a duplicate key)
    // so this allows us to only get once instance each of the lat/lon as an array

    bnds.forEach(function(arr){
        removeDuplicates[arr.join(",")] = arr;
    });

    //console.log(removeDuplicates);
    var bndsOnce = Object.keys(removeDuplicates).map(function(i) {
        return removeDuplicates[i]
    });

    //console.log(bndsOnce)
    return bndsOnce
}

/* function colorArrow(userData){
    var setColors = new Set()
    for (var c=0; c < userData.length; c++ ){
        var sectorFrom = userData[c].sector_from;
        var lineColor  = colorDict[sectorFrom];
        setColors.add(lineColor);
    }
    var arrayColors = Array.from(setColors);
    return arrayColors
}
 */
function getRanFloat(){
    counter = []
    // Assign min/max values 
    min = 0.1
    max = 0.8
    // num will yield a number between 0.1 and 0.8*random float
    num = min + Math.random() * (max);

    // Check that the same number doesn't get used more than once
    if (counter.includes(num)) {
        getRanFloat();
    } else {
        counter.push(num);
    }
    return num;
}

function swoops(userData, pop, bounds) {
    var formData = readData();
    console.log(userData)
    for (var i=0; i < userData.length; i++ ){
      
        var sectorFrom = userData[i].sector_from;
        var lineColor  = colorDict[sectorFrom];

        var value   = userData[i].val;
        var latlng1 = Object.values(userData[i].coords_from);
        var latlng2 = Object.values(userData[i].coords_to);

        // Get weight of line
        var stressor = formData.stressor;
        var stressorMax = maxVals[stressor];
        var stressorRatio =  Math.log(value)/Math.log(stressorMax);
        var lineSize = 15
        var lineWeight = lineSize*stressorRatio

        // Get values for tooltip
        var ud_rf   = userData[i].region_from;
        console.log("rf " + ud_rf)
        var ud_rt   = userData[i].region_to;
        console.log("rt " + ud_rt)
        var ud_sf   = userData[i].sector_from;
        var ud_st   = userData[i].sector_to;
        var ud_val  = Math.round(userData[i].val);
        console.log(ud_val)
        var ud_unit = userData[i].unit;

        if (userData[i].region_from === userData[i].region_to) {
            region = userData[i].coords_from;
            markerIcon(region, pop);

        // When region_from = ROW, print "rest of the world" at the end of the polyline
        // so it is clear to the user where this arrow is "coming from"

        } else if (userData[i].region_from === "row") {
            lyrGroup.addLayer(L.swoopyArrow(latlng1, latlng2, {
                iconAnchor: [35, -15],  // Adjust html test positioning
                color: lineColor,       // Color polyline and arrowhead
                arrowFilled: true,
                factor: getRanFloat(),            // Control the bend of the arrow
                weight: lineWeight,     // Change polyline weight 
                html: 'Rest of the world' // Include as explanation for the ROW region_from
            })).addTo(map);
            //addTextTooltip(ud_rf, ud_rt, ud_sf, ud_st, ud_val, ud_unit);

        } else { 
            lyrGroup.addLayer(L.swoopyArrow(latlng1, latlng2, {
                color: lineColor,
                arrowFilled: true,
                factor: getRanFloat(),
                weight: lineWeight
            }) 
            ).addTo(map); 
                    addTextTooltip(ud_rf, ud_rt, ud_sf, ud_st, ud_val, ud_unit);
        }

        // Accepts the bounds from the bboxLatLng function and bounds around all polyines
        map.fitBounds(L.latLngBounds(bounds));
    }
}

function markerIcon (region, pop) {

    /* When rTo and rFrom are same, a marker is added. The original blue marker is swapped
    with a nicer marker (made in ppt). The iconAnchor puts the top left corner of the icon at the 
    designated latlong. The iconAnchor is moved up by the length of the icon (30) and to the left by 15 pixels
    since the midpoint is assumed to be in the middle of the bottom edge of the icon.  */

    //var newMarker = L.icon({iconUrl: 'images/marker.svg', 
    //                        iconSize: [24, 30], 
    //                        iconAnchor: [15, 30]});

    lyrGroup.addLayer(L.marker(region)
            .bindPopup(pop).addTo(map));

    var newmap = map.setView(region, zoom=6);

    return newmap
}

/* Hide the table */ 
async function viewMap(userData, pop, bounds) {
    var mapBtn = document.getElementById('map-btn');
    mapBtn.onclick = function() {
        var infoTable = document.getElementById('info-table');
        infoTable.style.display = 'none';
        var showMap = document.getElementById('map');
        showMap.style.display= 'block';
        console.log("Table hidden - map shown")
    }
    swoops(userData, pop, bounds);

}

function maxZIndex() {
    return Array.from(document.querySelectorAll('body *'))
      .map(a => parseFloat(window.getComputedStyle(a).zIndex))
      .filter(a => !isNaN(a))
      .sort()
      .pop();
}

function addTextTooltip(tt_regionFrom, tt_regionTo, tt_sectorFrom, tt_sectorTo, tt_Val, tt_Unit) { // CAN innerHTML ONMOUSEOVER event instead to get tooltip.
    var arrowPath = document.getElementsByTagName('path');
    console.log(arrowPath)

    // getElementsBy (class, tag name, ...) will always return a node list, so we need to iterate through this
    for (var i = 0; i < arrowPath.length; i++) {
        arrowPath[i].addEventListener("mouseenter", function(e) {
            // client may be relev to viewport and page to document
            var tooltipTest = document.getElementById('results-arrow-body');
            tooltipTest.innerHTML = ``;
            //for (var i=0; i<userData.length; i++){
                var row = ` <td>${tt_regionFrom}</td>
                            <td>${tt_regionTo}</td>
                            <td>${tt_sectorFrom}</td>
                            <td>${tt_sectorTo}</td>
                            <td>${tt_Val}</td>
                            <td>${tt_Unit}</td>`;
                tooltipTest.innerHTML += row;
            //}
            tooltipTest.innerHTML += `</tbody>`;

            tooltipTest.style.position = 'absolute'; // move to css
            // get mouse coords (relative or absol)
            tooltipTest.style.top = (e.pageY - tooltipTest.offsetHeight/2)+'px';
            tooltipTest.style.left = (e.pageX - tooltipTest.offsetWidth/2)+'px';
            tooltipTest.style.zIndex = maxZIndex() ;
            tooltipTest.style.display = "hidden";
            tooltipTest.addEventListener("mouseleave",function(){
                tooltipTest.innerHTML = ""; 
                tooltipTest.style.display = "hidden"; //display auto or display hidden
            })
            // to center, subtract dimension
            // need to computer highest value of z index because this is what is getting hte value
            // to show up above the map (the map is hiding the tooltip information at the moment)
        })
            // can change cursor style to pointer in css (cursor: pointer;)

    }
}


function getFormData(){
    document.getElementById('api-form').addEventListener('submit', async function (e){
        e.preventDefault(); 
        deleteLayers();
        var userData = await regData();
        var pop      = createPopUpTable(userData);
        var bounds   = bboxLatLng(userData);

        viewTable(userData);
        viewMap(userData, pop, bounds);

        })
}

async function main(){
    // Load the API data into the form selection (list all str, reg, and sec in form)
    await loadStressors();
    await loadRegions();
    await loadSectors();

    // Implement the business logic

    layerStart();
    getFormData();



    map.on('zoomend',function(e) {
        console.log('Actual zoom: ' + e.target.getZoom());
     })
}

main();