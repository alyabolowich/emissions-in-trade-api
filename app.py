import psycopg2
import psycopg2.extras
from flask import request, jsonify, Flask, render_template
from markupsafe import escape
from flask_caching import Cache


''' API code Inspired from: Patrick Smyth, "Creating Web APIs with Python and Flask," 
    The Programming Historian 7 (2018), https://doi.org/10.46430/phen0072. '''

app = Flask(__name__)
app.config['DEBUG'] = True


cache = Cache(config={'CACHE_TYPE': 'simple'}) #Check cache type - WHAT CAN I STORE IN SIMPLE CACHE
cache.init_app(app)



#%%
@app.errorhandler(Exception)
def response(status, data=None, message="OK"):
    return jsonify({"status": status, "result": data, "message": message})

#Error handler from pallets projects Flask documentation: https://flask.palletsprojects.com/en/1.1.x/patterns/errorpages/
@app.errorhandler(404)
def resource_404(e):
    return jsonify({"status": 404, "result": None, "message": "Not found. The URL is not valid, please verify the URL is correct."})

@app.errorhandler(500)
def resource_500(e):
    return jsonify({"status": 500, "result": None, "message": e})

#%%
# Singleton code adapted from Wikipedia article on Singleton pattern 
class Connection:
    __instance = None
    
    def __init__(self):
        self.cur = self.get_con()  
        
    def __new__(cls):
        # cur = cache.get('cursor') #storing variable in cache
        if cls.__instance is None:
            cls.__instance = object.__new__(cls)
        return cls.__instance
            
    def get_con(self):

        con = psycopg2.connect("dbname=bsp3 user=postgres password=5555")
        #cur = cache.get('cursor')
        cur = con.cursor(cursor_factory=psycopg2.extras.DictCursor)
            # cache.set('cursor', cur )
        return cur


#%% 
@app.route('/api/v1', methods=['GET'])
def home():
    return render_template("index.html")


#%%
@app.route('/api/v1/stressors/<stressor>/all')
#Cache the output for 5 minutes because this endpoint returns  a lot of data and will save on reloading every time
#@cache.cached(timeout=3) 
def show_stressor(stressor):
    stressor = stressor.lower()
    list_stressors = ['co2', 'vl', 'economy']
    query = 'SELECT * FROM '
    
    if stressor in list_stressors:
        query = query + stressor + ';'
        
        try:
            con = Connection()
            con.cur.execute(query)
        except Exception as e:
            return resource_500(str(e))
        

        record = con.cur.fetchall()
        record = [dict(row) for row in record]
        return response(200, record, "OK")
    else:
        return response(400, message="Bad request - Looks like you need to provide a stressor. Please check the spelling of the stressor and ensure it is in lowercase.")
# # Test URL: http://127.0.0.1:5000/api/v1/stressors/vl/all

#%%
# Get specific, region-to-region data
@app.route('/api/v1/stressors/<stressor>')
def info(stressor):
    list_stressors  = ['co2', 'vl', 'economy']  
    
    region_from     = request.args.get('region_from', "").lower() 
    region_to       = request.args.get('region_to', "").lower() 
    sector_from     = request.args.get('sector_from', "").lower() 
    sector_to       = request.args.get('sector_to', "").lower() 

    query = 'SELECT * FROM {} WHERE'.format(escape(stressor)) #can insert ? as place holder in query 
    to_filter       = []
    
    stressor = stressor.lower()    
    if stressor not in list_stressors:
        return response(400, message="Bad request - Looks like you need to provide a stressor. Please check the spelling of the stressor and ensure it is in lowercase.")
    
        
    if region_from:
        query += ' region_from=%s AND'
        to_filter.append(region_from)
    if region_to:
        query += ' region_to=%s AND'
        to_filter.append(region_to)
    if sector_from:
        query += ' sector_from=%s AND'
        to_filter.append(sector_from)
    if sector_to:
        query += ' sector_to=%s AND'
        to_filter.append(sector_to)
        
        
    if not (region_from or region_to or sector_from or sector_to):
        return response(400, message="Bad request - Please check that you have at least one sector or region selected.")
    
    query = query[:-4] + ';'
    
    try:
        con = Connection()
        con.cur.execute(query, to_filter)
    except Exception as e:
        return resource_500(str(e))
    
        
    #con.cur.execute(query, to_filter) #here i could put in the ? to resolve - avoid sanitizing myself. good practice to use placeholders.
    record = con.cur.fetchall() 
    record = [dict(row) for row in record]
    
    if not record:
        return response(400, message="Bad request - Please check that your region and/or sector query is correctly entered.") #do not need to provide data because data is already none by default
    
    return response(200, record)

# Test URL: http://127.0.0.1:5000/api/v1/stressors/co2?region_to=at&region_from=be&sector_to=agriculture

#%%
# Show all sectors
@app.route('/api/v1/sectors')
def allsectors():
    try:
        con = Connection()
        con.cur.execute('SELECT * from sectors;')
    except Exception as e:
        return resource_500(str(e))
    
    record = con.cur.fetchall()
    record = [dict(row) for row in record]
    return response(200, record)

## Test URL: http://127.0.0.1:5000/api/v1/sectors

#%%
# Show all regions
@app.route('/api/v1/regions')
def allregions():
    try:
        con = Connection()
        con.cur.execute('SELECT * from regions;')
    except Exception as e:
        return resource_500(str(e))

    record = con.cur.fetchall()
    record = [dict(row) for row in record]
    return response(200, record)

## Test URL: http://127.0.0.1:5000/api/v1/regions
#%%
# Imports
@app.route('/api/v1/stressors/<stressor>/imports')
# "SELECT region_from, SUM(val) FROM co2 WHERE region_to='se' AND NOT region_from= 'se' GROUP BY region_from;"
# Get the regions from which emission come (region_from) to a certain region (region_to). The receiving region (region_to) should not include itself as an emitter of emission. 
# Group the values by the regions from which the emission are sent (imported) to the select region.


def imports(stressor):
    region_to = request.args.get('region').lower()  #default case is empty string, but now i can lower all requests

    query = 'SELECT region_from, SUM(val) FROM {} WHERE'.format(escape(stressor))
    to_filter = []
    
    list_stressors  = ['co2', 'vl', 'economy']  
    stressor = stressor.lower()
    if stressor not in list_stressors:
        return response(400, message="Bad request - Looks like you need to provide a stressor. Please check the spelling of the stressor and ensure it is in lowercase.")
 
    
    query += ' region_to=%s AND NOT'
    to_filter.append(region_to)
    region_from = region_to
    query += ' region_from=%s GROUP BY region_from;'
    to_filter.append(region_from)
    
    try:
        con = Connection()
        con.cur.execute(query, to_filter)
    except Exception as e:
        return resource_500(str(e))

    record = con.cur.fetchall()
    record = [dict(row) for row in record]
    
    if not record:
        return response(400, message="Bad Request. Please ensure your syntax is correct.")
    
    return response(200, record)
# Test URL: http://127.0.0.1:5000/api/v1/stressors/economy/imports?region=se

#%%
# Exports
@app.route('/api/v1/stressors/<stressor>/exports')

# "SELECT region_to, SUM(val) FROM co2 WHERE region_from='se' AND NOT region_to= 'se' GROUP BY region_to;"
# Get the regions to which emissions are sent (region_to) from an 
# emitting region (region_from). The emitting region (region_from) should not 
# include itself as a receiver of emissions. Group the values by the regions
# to which the emissions are sent (exported). 


def exports(stressor):
    region_from = request.args.get('region').lower()

    query = 'SELECT region_to, SUM(val) FROM {} WHERE'.format(escape(stressor))
    to_filter = []
    
    list_stressors  = ['co2', 'vl', 'economy']  
    stressor = stressor.lower()
    if stressor not in list_stressors:
        return response(400, message="Bad request - Looks like you need to provide a stressor. Please check the spelling of the stressor and ensure it is in lowercase.")
 
    query += ' region_from=%s AND NOT'
    to_filter.append(region_from)
    region_to = region_from
    query += ' region_to=%s GROUP BY region_to;'
    to_filter.append(region_to)
    
    try:
        con = Connection()
        con.cur.execute(query, to_filter)
    except Exception as e:
        return resource_500(str(e))
    
    record = con.cur.fetchall()
    record = [dict(row) for row in record]
    
    if not record:
        return response(400, message="Bad Request. Please ensure your syntax is correct.")

    return response(200, record)
# Test URL: http://127.0.0.1:5000/api/v1/stressors/economy/exports?region=se

    #%%
if __name__ == "__main__":
	app.run(debug=True)