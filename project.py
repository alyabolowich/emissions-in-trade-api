import pymrio
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import psycopg2
from psycopg2 import sql
import flask 
from flask import request, jsonify, Flask

#%%
# Load exiobase, concordance matrix, and get metadata
exio3 = pymrio.parse_exiobase3(path='/Volumes/SD/bsp3/IOT_2018_ixi.zip')
con_mat = pd.read_excel('/Volumes/SD/bsp3/concord_matrix_bjelle_2020.xlsx').iloc[:,4:15]
engine = create_engine('postgresql://postgres:uuc1se7F@localhost:5432/bsp3')
exio3.meta

#%%
# Get sector information 
sectors = exio3.get_sectors()
regions = exio3.get_regions()

#%%
# Calculate all matrices and fetch interindustry flows (Z) and stressors (S)
exio3.calc_all()
Z       = exio3.Z

#%%
# Get list of EU countries, aggregate the non-EU countries to create new list of regions to study (EU and 1 ROW)
EUcountry       = exio3.get_regions()[:28].tolist()
reg_agg_list    = EUcountry + (49-28)*['ROW']

#%%
# Aggregate sectors. 
# Sector aggregation matrix based on ISIC sectors (UN Stats) and Bjelle et al (2020)
sector_names    = ['Agriculture', 'Mining', 'Manufacturing', 'Electricity', 'Water_and_waste', 'Construction', 'Retail', 'Transport', 'Accomodation_and_food_services', 'Finance_and_real_estate', 'Public_services']
sec_agg_matrix  = con_mat.values.T
#Modify the exio3 data to aggregate into the regions. Followed example from pymrio documentation.
ag              = exio3.aggregate(region_agg=reg_agg_list, 
                              sector_agg=sec_agg_matrix,
                              sector_names= sector_names,
                              inplace=False)

#%%

# After aggregation, matrices need to be reset and recalculated (per pymrio documentation)
ag.reset_all_full().calc_all()
#Show relevant matrices after aggregation reset
Z_sec  = ag.Z
S = ag.satellite.S
# Turn all negs to 0s
num             = Z_sec._get_numeric_data()
num[num < 0]    = 0

#%%
# Diagonalize CO2 emissions
CO2_ag          = ag.satellite.S.loc['CO2 - combustion - air']
CO2_ag_diag     = pd.DataFrame(np.diag(CO2_ag),
                           index=CO2_ag.index,
                           columns=CO2_ag.index)
CO2_agri_diag   = CO2_ag_diag.xs('Agriculture', level='sector')


### ========
# Matrix needed
CO2_econ = CO2_ag_diag.dot(ag.Z)

#%%

# Test that the data is correct
# Values in CO2_agri should match what is in CO2_econ for Ag-Ag
results = CO2_econ.loc[:,CO2_econ.columns.get_level_values(1).isin({'Agriculture'})]
## ^^ This returns the same as CO2_agri actually....

#%%

#regions dataframe
regions = pd.DataFrame(ag.get_regions())
#sectors dataframe
sectors = pd.DataFrame(ag.get_sectors())

#%% Just get agriculture sector emissions
CO2_agri = CO2_econ.xs('Agriculture', level='sector', axis=1)

#Flatten agriculture matrix so values are all in one column
CO2_agri = CO2_agri.unstack().to_frame().sort_index(level=0)

#Give value column a name
CO2_agri.rename(columns = { CO2_agri.columns[0]: "value" }, inplace = True)

#Rename indices
CO2_agri.rename_axis(['region_from','region_to'], inplace=True)

#%% Get all sector emissions
CO2_econ = CO2_econ.stack(level=[0,1])
CO2_econ = CO2_econ.to_frame()
CO2_econ.columns = ['value']
CO2_econ.index.names = ['region_from', 'sector_from', 'region_to', 'sector_to']

#add unit column
CO2_agri['unit']='kgCO2'
CO2_econ['unit']='kgCO2'


#%% 
### Create tables in Postgres

#regions
regions.to_sql('region', engine)

#sectors
sectors.to_sql('sector', engine)

#co2 agriculture
CO2_agri.to_sql('agriculture_CO2', engine)

#co2 all sectors
CO2_econ.to_sql('allco2', engine)

#%% Querying the SQL database

con = psycopg2.connect("dbname=bsp3 user=postgres password=uuc1se7F")
con.rollback()
cur = con.cursor()

app = flask.Flask(__name__)

#%% Select all from agriculture_CO2
regions = cur.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier('agricultureco2')))
rows    = cur.fetchall()
print(rows)

#%% Select exports from Austria
regions = cur.execute("SELECT value from agricultureco2 WHERE region_from='AT'")
rows    = cur.fetchall()
DroexpAT   = sum(i[0] for i in rows)


#%% Test if Austrian exports equal results from postgres

sumpsql = sum(i[0] for i in rows)
sumdata = CO2_agri.loc['AT'].iloc[1:29].sum().loc['value']


if round(sumpsql,4) == round(sumdata,4):
    print("The data matches!")
else:
    print("Sums do not match")

#%% Select all CO2 emissions imported to Sweden
swed    = cur.execute("SELECT value from agricultureco2 WHERE region_to='SE' AND NOT region_from= 'SE'")
rows    = cur.fetchall()
sumrows = sum(i[0] for i in rows)


# This was more complicated to make a small test for.

#%% Run on FLASK
# =============================================================================
## Example
# @app.route('/api/v1/books', methods=['GET'])
# 
# books = cursor.execute('SELECT * from ...')
#
# def api_all():
#     return jsonify(books)
# app.run()
# =============================================================================

app = flask.Flask(__name__)
app.config["DEBUG"] = True

regions = cur.execute("SELECT * from agricultureco2")
record = cur.fetchall()
print(record)

@app.route('/', methods=['GET'])

def home():
    regions = cur.execute("SELECT * from agricultureco2")
    return jsonify(regions)

app.run()

# =============================================================================
# con.rollback()
# postgreSQL_select_Query = "SELECT * FROM public.agriculture_CO2"
# cursor.execute(postgreSQL_select_Query)
# print("Selecting rows from mobile table using cursor.fetchall")
# mobile_records = cursor.fetchall()
# =============================================================================

#%%

# api.mywri.com/co2/?from=lu&to=de
# api.mywri.com/co2/from=lu&to=de
# api.mywri.com/co2/?from=lu&to=de
# api.mywri.com/co2/?from=lu
# api.mywri.com/co2/?to=lu
# api.mywri.com/co2/export/?to=lu
# api.mywri.com/co2/export/
# api.mywri.com/co2/export/?from=lu
