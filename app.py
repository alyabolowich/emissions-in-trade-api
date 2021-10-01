import psycopg2
import psycopg2.extras
from flask import request, jsonify, Flask, render_template
from markupsafe import escape
from flask_caching import Cache
import sys


''' API code Inspired from: Patrick Smyth, "Creating Web APIs with Python and Flask," 
    The Programming Historian 7 (2018), https://doi.org/10.46430/phen0072. '''

app = Flask(__name__)

app.config['DEBUG'] = True
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True


cache = Cache(config={'CACHE_TYPE': 'simple'}) 
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
# Singleton pattern
 
class Connection:
    __instance = None
    
    def __init__(self):
        self.cur = self.get_con()  
        
    def __new__(cls):
        if cls.__instance is None:
            cls.__instance = object.__new__(cls)
        return cls.__instance
            
    def get_con(self):
        con = psycopg2.connect(database="bsp3", user="postgres", password="5555", host="localhost")
        cur = con.cursor(cursor_factory=psycopg2.extras.DictCursor)
        return cur


#%% 
@app.route('/api/v1', methods=['GET'])
def home():
    return render_template("index.html")


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

## Test URL: http://api.emissionsintrade.com/v1/sectors

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

## Test URL on localhost: http://127.0.0.1:5000/api/v1/regions

#%%
# Show all regions
@app.route('/api/v1/regions')
def regions(region):

    region = request.args.get("region_id", "").lower() 
    query  = 'SELECT * FROM regions WHERE region_id={};'.format(escape(region))

    to_filter=[]

    if region:
        query += ' region_from=%s AND'
        to_filter.append(region)
    
    try:
        con = Connection()
        con.cur.execute(query)
    except Exception as e:
        return resource_500(str(e))

    record = con.cur.fetchall()
    record = [dict(row) for row in record]
    return response(200, record)

## Test URL: http://api.emissionsintrade.com/v1/regions


#%%
# Show all stressors
@app.route('/v1/stressors')
def allstressors():
    try:
        con = Connection()
        con.cur.execute('SELECT * from stressors;')
    except Exception as e:
        return resource_500(str(e))

    record = con.cur.fetchall()
    record = [dict(row) for row in record]
    return response(200, record)

## Test URL: http://api.emissionsintrade.com/v1/stressors

#%%
# Get specific, region-to-region data
@app.route('/api/v1/stressors/<stressor>')
def info(stressor):
    list_stressors  = ['co2', 'vl', 'economy']  
    
    
    region_from     = request.args.get('region_from') 
    region_to       = request.args.get('region_to')
    sector_from     = request.args.get('sector_from')
    sector_to       = request.args.get('sector_to')

    query = 'SELECT * FROM {} WHERE'.format(escape(stressor)) 
    to_filter = []
    
        
    stressor = stressor.lower()    
    if stressor not in list_stressors:
        return response(400, message="Bad request - Looks like you need to provide a stressor. Please check the spelling of the stressor and ensure it is in lowercase.")
     
    if region_from:
        for i in region_from:
           query += ' region_from=%s OR '
           to_filter.append(i)
    if region_to:
        for i in region_to:
           query += ' region_to=%s OR '
           to_filter.append(i)
    if sector_from:
        for i in sector_from:
           query += ' sector_from=%s OR '
           to_filter.append(i)
    if sector_to:
        for i in region_from:
           query += ' sector_to=%s OR '
           to_filter.append(i)
           
    if not (region_from or region_to or sector_from or sector_to):
        return response(400, message="Bad request - Please check that you have at least one sector or region selected.")
    
    
    query = (query[:-4])


    try:
        con = Connection()
        con.cur.execute(query, tuple(to_filter))
    except Exception as e:
        return resource_500(str(e))
    
        
    record = con.cur.fetchall() 
    record = [dict(row) for row in record]
    
    if not record:
        return response(400, message="Bad request - Please check that your region and/or sector query is correctly entered.") #do not need to provide data because data is already none by default
    
    return response(200, record) 

# Test URL: http://api.emissionsintrade.com/v1/stressors/co2?region_to=at&region_from=be&sector_to=agriculture
# Test URL localhost: http://127.0.0.1:5000/api/v1/stressors/co2?region_to=fr&sector_from=agriculture

 #%%
@app.route('/data')

def data():
    debug = request.args.get('debug', type=bool) ## create a debug var to print the query
   
    region_from = request.args.getlist('region_from')
    region_to   = request.args.getlist('region_to')
    sector_from = request.args.getlist('sector_from')
    sector_to   = request.args.getlist('sector_to')
    
    query = 'SELECT * FROM co2 WHERE'
    
    #to filter will match the escape chars to the corresponding region/sector to/from
    to_filter = []
    r_from = ""
    r_to   = ""
    s_from = ""
    s_to   = ""
    
    
    for i in region_from:
       r_from += '%s'
       to_filter.append( "'" + i + "'" )
    
    for i in sector_from:
       s_from += '%s'
       to_filter.append(i)
     
    for i in sector_to:
       s_to  += '%s'
       to_filter.append("'" +i + "'")
       
    for i in region_to:
       r_to  += '%s'
       to_filter.append("'" + i + "'")
     
   
    
    # Check that not empty - need to avoid including the AND if empty.   
    if len(r_from) > 0:
        query += ' region_from IN %s AND'   
        
    if len(s_from) > 0:
        query += ' sector_from IN %s AND'   
    
    if len(r_to) > 0:
        query += ' region_from IN %s AND'   
        
    if len(s_to) > 0:
        query += ' region_from IN (' + s_to + ') AND'   
        
    if query.endswith("AND"):
        query = (query[:-3])
    
    s = []
    for i in to_filter:
        s += i.split(',')
        
        
    if debug:
        return response( 200, query % tuple(to_filter)) 
        # make bool and return the query that is being submitted
        

# Execute program

    try:
        con = Connection()
        con.cur.execute(query, tuple(to_filter))
    
    except Exception as e:
        return resource_500(str(e))
    
    record = con.cur.fetchall()
    record = [dict(row) for row in record]

   
    return response(200, query % tuple(to_filter)) 
    
#%%
# =============================================================================
# def normalize_query_param(value):
#     return value if len(value) > 1 else value[0]
# 
# def normalize_query(params):
#     params_non_flat = params.to_dict(flat=False)
#     return {k: normalize_query_param(v) for k, v in params_non_flat.items()}
# 
# 
# @app.route('/data1')
# 
# def datas():
#     debug = request.args.get('debug', type=bool) 
#     req_args = request.args
#     req_args = req_args.to_dict(flat=False)
#     
#     rfrom = []
#     for i in range(len(req_args['region_from'])):
#         di = {}
#         for key in req_args.keys():
#             di[key] = req_args[key][i]
# 
# 
# 
# # =============================================================================
# #             if key == "region_from":
# #               rfrom += req_args[key][i]
# # =============================================================================
#     to_filter = []
#     #mu = []
#     #for l in to_filter:
#     #    mu += " ' " + l + " ' "
#         
#     # for i in region_from:
#         
# 
#         
# # =============================================================================
# # =============================================================================
# #     for i in region_to:
# #         r_to.append('{}'.format(i))
# #         to_filter.append(i)
# #          
# # =============================================================================
# 
#     query = 'SELECT * FROM co2 WHERE'
#       
#     # Check that not empty - need to avoid including the AND if empty.   
#     if len(to_filter) > 0:
#         query += ' region_from IN ( %s ) AND'
# 
# # =============================================================================
# #     if len(r_to) > 0:
# #         query += ' region_to IN (' + str(r_to)[1:-1] + ') AND'  
# 
# # =============================================================================
#  
#     if query.endswith("AND"):
#         query = (query[:-3]) 
#     
#     if debug:
#         return response(200, di)
#         # make bool and return the query that is being submitted
# 
# 
# # =============================================================================
# #     try:
# #         con = Connection()
# #         con.cur.execute(query, to_filter)
# # 
# #     except Exception as e:
# #         return resource_500(str(e))
# #     
# #     record = con.cur.fetchall()
# #     record = [dict(row) for row in record]
# #         
# #     if not record:
# #         return response(400, message="Bad request - Please check that your region and/or sector query is correctly entered.")
# # 
# #         
# #     return response(200, record)
# # =============================================================================
# 
# =============================================================================
#%%
# =============================================================================
# @app.route("/testquery")
# def testquery():
#     debug = request.args.get('debug', type=bool) ## create a debug var to print the query
#    
#     args = request.args.getlist('region_from')
#     
#     rf = args[0]
#     
#     if debug:
#         return response(200, rf) 
# =============================================================================

#%%
@app.route("/query")
def query():
    '''request.args.getlist returns an IMMUTABLE multi dict. You must copy this 
    another list in order to parse it. The result of 
    region_from = request.args.getlist('region_from') is one value (for ex. 'xx,yy,zz',
    for three entries in the query parameter or 'xx' for one) so in the copied 
    list, you need to select the first element in that list. Then, you can split 
    the list and assign each to a region_to/from or sector to/from.'''
    
    # REMOVE DEBUG FROM PRODUCTION CODE 
    debug = request.args.get('debug', type=bool) 
   
# =============================================================================
    # Get query parameter arguments
    region_from = request.args.getlist('region_from')
    region_to   = request.args.getlist('region_to')
    sector_from = request.args.getlist('sector_from')
    sector_to   = request.args.getlist('sector_to')
# =============================================================================
    # to_filter will match the escape chars to the corresponding region/sector to/from
    # This will connect the string of %s found in r_from (one %s per argument), 
    # and input the correct value in the string.
    to_filter = []
    
    # Store the %s as a string. Several entries are separated by a comma
    r_from  = ""
    r_to    = ""
    s_from  = ""
    s_to    = ""
    
    query = 'SELECT * FROM co2 WHERE'
    
# =============================================================================

    if len(region_from) > 0:
        rf          = region_from[0]
        rf_split    = rf.split(',')
        rf_string   = ', '.join("'" + item + "'" for item in rf_split)
        for i in rf_string:
            r_from  += '%s'
            to_filter.append( "'" + r_from + "'" )
            
        query += ' region_from IN (' + rf_string + ') AND'
            
            
    if len(region_to) > 0:
        rt          = region_to[0]
        rt_split    = rt.split(',')
        rt_string   = ', '.join("'" + item + "'" for item in rt_split)
        for i in rt_string:
            r_to    += '%s'
            to_filter.append( "'" + i + "'" )
            
        query += ' region_to IN (' + rt_string + ') AND'
        
    if len(sector_from) > 0:
        sf          = sector_from[0]
        sf_split    = sf.split(',')
        sf_string   = ', '.join("'" + item + "'" for item in sf_split)
        for i in sf_string:
            s_from  += '%s'
            to_filter.append( "'" + i + "'" )
            
        query += ' sector_from IN (' + sf_string + ') AND'
    
    if len(sector_to) > 0:
        st          = sector_to[0] 
        st_split    = st.split(',')
        st_string   = ', '.join("'" + item + "'" for item in st_split)
        for i in st_string:
            s_to    += '%s'
            to_filter.append( "'" + i + "'" )
            
        query += ' sector_to IN (' + st_string + ') AND'
  
    
    if query.endswith("AND"):
        query = (query[:-3]) 
    
    # REMOVE DEBUG FROM PRODUCTION CODE
    if debug:
        return response(200, query)
    
    try:
        con = Connection()
        con.cur.execute(query, to_filter)

    except Exception as e:
        return resource_500(str(e))
    
    record = con.cur.fetchall()
    record = [dict(row) for row in record]
        
    if not record:
        return response(400, message="Bad request - Please check that your region and/or sector query is correctly entered.")

        
    return response(200, record)


#%%
# Imports
@app.route('/api/v1/stressors/<stressor>/imports')
# "SELECT region_from, SUM(val) FROM co2 WHERE region_to='se' AND NOT region_from= 'se' GROUP BY region_from;"
# Get the regions from which emission come (region_from) to a certain region (region_to). 
# The receiving region (region_to) should not include itself as an emitter of emission. 
# Group the values by the regions from which the emission are sent (imported) to the select region.


def imports(stressor):
    try:
        region_to = request.args.get('region_to', "").lower()
    except AttributeError:
        return response(400, message="Bad request. The query parameter should be 'region_to'.")
        
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
# Test URL: http://api.emissionsintrade.com/v1/stressors/economy/imports?region_to=se

#%%
# Exports
@app.route('/api/v1/stressors/<stressor>/exports')

# "SELECT region_to, SUM(val) FROM co2 WHERE region_from='se' AND NOT region_to= 'se' GROUP BY region_to;"
# Get the regions to which emissions are sent (region_to) from an 
# emitting region (region_from). The emitting region (region_from) should not 
# include itself as a receiver of emissions. Group the values by the regions
# to which the emissions are sent (exported). 


def exports(stressor):
    
    try:
        region_from = request.args.get('region_from').lower()
    except AttributeError:
        return response(400, message="Bad request. The query parameter should be 'region_from'.")
    
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
        return response(400, message="Bad request - Please check that your region and/or sector query is correctly entered.")

        
    return response(200, record)
# Test URL: http://api.emissionsintrade.com/v1/stressors/economy/exports?region_from=se


#%%
if __name__ == "__main__":
	app.run(debug=True)
    
    