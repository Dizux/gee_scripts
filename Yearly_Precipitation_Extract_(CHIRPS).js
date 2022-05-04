var ug_adm0 = ee.FeatureCollection("users/desire/ug_adm0"),
    chirps_daily = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY"),
    chirps_pentad = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD");
    
    
//add AOI to map
Map.addLayer(ug_adm0);
//zoom to AOI on map
Map.centerObject(ug_adm0);


//to generate statistics for summarisation to feature collection
var reducers = ee.Reducer.mean()
.combine({
  reducer2: ee.Reducer.min(),
  sharedInputs: true
}).combine({
  reducer2: ee.Reducer.max(),
  sharedInputs: true
}).combine({
  reducer2: ee.Reducer.sum(),
  sharedInputs: true
});


var years = ee.List.sequence(1981, 2022);

//generate yearly sums based on range above
var byYear = ee.ImageCollection.fromImages(
  years.map(function(y) {
      return chirps_pentad
        .filter(ee.Filter.calendarRange(y, y, 'year'))
        .sum()
        .set('year', y).set('bands', chirps_pentad
        .filter(ee.Filter.calendarRange(y, y, 'year'))
        .sum().bandNames().length());
}).flatten().filter(ee.Filter.gt('bands', 0)));
print(byYear);

//clip the summarised imageCollection to display on map
var clipped_data = byYear.map(function(image){return image.clip(ug_adm0)});
//add to map
Map.addLayer(clipped_data.first().select('precipitation'));

//attach data to feature collection

var data = byYear.map(function(image) {
  return image.reduceRegions({
    collection: ug_adm0,
    reducer: reducers,
    scale: 5566, //normally same spatial resolution as dataset or features
  }).map(function(feat) {
    return feat.copyProperties(image, image.propertyNames())
  })
}).flatten()

var nowDate = new Date(); 
var date = nowDate.getFullYear()+'-'+(nowDate.getMonth()+1)+'-'+nowDate.getDate();
// Export the FeatureCollection.
Export.table.toDrive({
  collection: data,
  folder: 'Rainfall_Data/' + date,
  description: 'Yearly_precipitation_data',
  fileFormat: 'CSV'
});
