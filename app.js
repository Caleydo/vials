
require(['../caleydo/main','../caleydo/data', '../caleydo/vis', 'altsplice-gui'], function (C,data, visPlugins, gui) {
  'use strict';
  var vis;

  data.create({
    type: 'genomeDataLink',
    name: 'AltSplice',
    serveradress: '/api/genomebrowser'
  }).then(function (genome) {

    gui.current.init(genome);

    var visses = visPlugins.list(genome);

    //console.log(document.location.search.substring(1))

    var mode = document.location.search.substring(1);


    var vis1Loaded = C.promised(function(resolve,reject){
      if (mode==='bilal' || mode==''){
        var junctionVis = visses.filter(function (vis) { return vis.id === 'altsplice-junctions'})[0];
        junctionVis.load().then(function (plugin) {
          vis = plugin.factory(genome, document.querySelector("#vis1") );
          resolve();
        });
      }else{
        resolve();
      }
    })

    var vis2Loaded = C.promised(function(resolve,reject){
    if (mode==='joseph' || mode=='') {
        var readVis = visses.filter(function (vis) {
          return vis.id === 'altsplice-reads'
        })[0];
        readVis.load().then(function (plugin) {
          vis = plugin.factory(genome, document.querySelector("#vis2"));
          resolve();
        });
    }else{
      resolve();
    }
  });

    var vis3Loaded = C.promised(function(resolve,reject){
      if (mode==='hen' || mode=='') {
        var readVis = visses.filter(function (vis) {
          return vis.id === 'altsplice-isoforms'
        })[0];
        readVis.load().then(function (plugin) {
          vis = plugin.factory(genome, document.querySelector("#vis3"));
          resolve();
        });
      }else{
        resolve();
      }
    });



    C.all([vis1Loaded, vis2Loaded, vis3Loaded]).then(function () {
      gui.current.start();
    })




  });
});
