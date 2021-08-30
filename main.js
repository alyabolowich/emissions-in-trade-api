//const cors = require('./cors');

//app.use(cors())

( function (){
    
const apiURL = 'http://api.emissionsintrade.com/v1/'

var map = L.map('map').setView({lat: 53, lon: 15}, 3);
polyLineGroup = L.layerGroup();

// add OSM tiles
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
}).addTo(map);

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


// Load result from API
document.getElementById('api-form').addEventListener('submit', function (e){ //e for event
    e.preventDefault(); //
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
            arrayLatLon = latlondata.result;
            createTableLatLon(arrayLatLon, [regionTo, regionFrom]);
        }
    })
})

// Get selected data
function getData(){
    var regionToLatLon = [regionLatLon[Object.keys(regionLatLon)[0]]];
    console.log(regionToLatLon);
    var regionFromLatLon = [regionLatLon[Object.keys(regionLatLon)[1]]]; 
    var fromToLatLon = [...regionFromLatLon, ...regionToLatLon];
    console.log(fromToLatLon);

    if (regionToLatLon === regionFromLatLon) {
        polyLineGroup.addLayer(L.marker(regionToLatLon).addTo(map));

    } else {
        var latlngs = [
            regionToLatLon,
            regionFromLatLon,
        ];
        polyLineGroup.addLayer(L.polyline(fromToLatLon, {color: 'red'}).addTo(map));
    }
}


// Create a table from the results. Regions is an array containing rTo and rFrom
function createTableLatLon(latlondata, regions){
    var table = document.getElementById('results-latlon');
    var regionLatLon = {}
    table.innerHTML = "";
    for (var i=0; i<regions.length; i++) {
        for (var j=0; j<latlondata.length; j++) {
            if (latlondata[j].region_id === regions[i]) {
                console.log(latlondata[j].region_id)
                console.log(regions[i])
                // Get an object of the region lat and lons
                regionLatLon[regions[i]] = {'lat':latlondata[j].region_lat,
                                            'lon':latlondata[j].region_lon}
                // Put into a table 
                var row = ` <td>${latlondata[j].region_id}</td>
                            <td>${latlondata[j].region_lat}</td>
                            <td>${latlondata[j].region_lon}</td>`;
                table.innerHTML += row;
            }
        }
    }
}


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

