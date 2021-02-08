import pymrio
import matplotlib.pyplot as plt
import pandas as pd

exio3 = pymrio.parse_exiobase3(path='/Volumes/SD/bsp3/IOT_2019_ixi.zip')
exio3.meta


exio3.get_sectors()

exio3.get_regions()

exio3.calc_all()

plt.figure(figsize=(15,15))
plt.imshow(exio3.A, vmin=0, vmax=1E-3)
plt.xlabel('Countries - sectors')
plt.ylabel('Countries - sectors')
plt.show()



cba = pd.DataFrame(exio3.satellite.D_cba)
pba = pd.DataFrame(exio3.satellite.D_pba)

#cba.to_excel('cba_test.xlsx')
