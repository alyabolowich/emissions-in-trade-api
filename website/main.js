//const cors = require('./cors');

//app.use(cors())

( function (){
    
const apiURL = 'http://api.emissionsintrade.com/v1/'

// add basemap layer
var map = L.map('map').setView({lat: 53, lon: 15}, 3);
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
    console.log('Map has', qq, 'layers at start.');
}
layerStart();

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

// Load result from API
function loadResult(){
    document.getElementById('api-form').addEventListener('submit', function (e){ //e for event
        e.preventDefault(); //
        deleteLayers();
        var stressor = document.getElementById('stressor').value;
        var regionTo = document.getElementById('region-to').value;
        var regionFrom = document.getElementById('region-from').value;
        var sectorFrom = document.getElementById('sector-from').value;
        var sectorTo = document.getElementById('sector-to').value;
        var endpoint = apiURL+`stressors/${stressor}?region_to=${regionTo}&region_from=${regionFrom}&sector_from=${sectorFrom}&sector_to=${sectorTo}`; 
        var regionLatLon = apiURL+"regions";
        /*$.ajax({
            url: endpoint,
            type:'get',
            success: function(data){
                myArray = data.result;
                createTable(myArray);
            }
        }) */
        $.ajax({
            url: regionLatLon,
            type:'get',
            success: function(latlondata){
                // Yields array of all lat/lon for all 29 countries
                arrayLatLon = latlondata.result;
                createTableLatLon(arrayLatLon, [regionTo, regionFrom]);
            }
        })
    })
}
loadResult();

// Create a table from the results. Regions is an array containing rTo and rFrom
function createTableLatLon(latlondata, regions){

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
    //region to is first element in the object.
    var regionToLatLon = [regionsLatLon[Object.keys(regionsLatLon)[0]]];
    //console.log(regionToLatLon);

    var regionFromLatLon = [regionsLatLon[Object.keys(regionsLatLon)[1]]]; 
    var fromToLatLon = [...regionFromLatLon, ...regionToLatLon];
    //console.log(fromToLatLon);

    if (regionsLatLon[regions[0]] === regionsLatLon[regions[1]]) {
        //console.log(regionLatLon[regions[0]]);
        //console.log(regionLatLon[regions[1]]);
        lyrGroup.addLayer(L.marker(regionsLatLon[regions[0]]).addTo(map));

    } else {
        lyrGroup.addLayer(L.polyline(fromToLatLon, {color: 'red'}).addTo(map));
    }
    let ll = 0;
    map.eachLayer(function(){ ll += 1; });
    console.log('Map has', ll, 'layers.');
}
//

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

