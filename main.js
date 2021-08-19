//const cors = require('./cors');

//app.use(cors())

( function (){
    
const apiURL = 'http://api.emissionsintrade.com/v1/'

// Load stressors
async function loadStressors() {
    const response = await fetch(apiURL+'stressors');
    const data = await response.json();
    console.log("STRESSORS");
    //console.log(data);
    var options = '<option> -- Select stressor --</option>';

    for (let stressor of data.result) {
        //console.log(stressor.name);
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
    //console.log(data);  //this returns the JSON data ({message:, result:, status:})
    var options = '<option> -- Select country --</option>';
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
    }); //keep semicolon because its a statement
    for (let country of data.result) { //data.result is an array
        console.log(country.region_name);

        options += `<option value="${country.region_id}">${country.region_name}</option>`;
        
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
    //console.log(data);
    var options = `<option value=''>-- Select sector --</option>`;

    for (let sector of data.result) {
        //console.log(sector.sector);
        options += `<option value="${sector.sector}">${sector.sector}</option>`;
        
    }
    document.getElementById("sector-from").innerHTML=options;
    document.getElementById("sector-to").innerHTML=options;
}
loadSectors();

// Load result from API
document.getElementById('api-form').addEventListener('submit', function (e){ //e for event
    //e.preventDefault(); //
    var stressor = document.getElementById('stressor').value;
    var regionTo = document.getElementById('region-to').value;
    var regionFrom = document.getElementById('region-from').value;
    var sectorFrom = document.getElementById('sector-from').value;
    var sectorTo = document.getElementById('sector-to').value;
    var endpoint = apiURL+`stressors/${stressor}?region_to=${regionTo}&region_from=${regionFrom}&sector_from=${sectorFrom}&sector_to=${sectorTo}`; 

    $.ajax({
        url: endpoint,
        type:'get',
        crossDomain: true,
        success: function(data){
            myArray = data.result
            createTable(myArray)
            //console.log(myArray)
        //console.log(data);
        
        //document.getElementById('log').innerHTML = JSON.stringify(data); // This shows the JSON string on the website
        }
    })

// Check for form validity


})
/*
*/

// Create a table from the results
function createTable(data){
    var table = document.getElementById('results-table');
    table.innerHTML = "";
    for (var i=0; i<data.length; i++){
        var row = ` <td>${data[i].region_from}</td>
                    <td>${data[i].region_to}</td>
                    <td>${data[i].sector_from}</td>
                    <td>${data[i].sector_to}</td>
                    <td>${data[i].val}</td>
                    <td>${data[i].unit}</td>`;
        table.innerHTML += row;
    }
}

})();
/*
// NEED TO MODIFY FOR VALIDITY may need to be checked before (lpacement in code)
(function () {
    'use strict'
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.querySelectorAll('.needs-validation')
  
    // Loop over them and prevent submission

        form.addEventListener('submit', function (event) {
          if (!form.checkValidity()) {  // NEED TO CALL THIS (if not, then check something else)
            event.preventDefault()
            event.stopPropagation()
          }
  
          form.classList.add('was-validated')
        }, false)
      })
  })()
  */

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