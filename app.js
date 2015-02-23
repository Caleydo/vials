
require(['../caleydo/data', '../caleydo/vis'], function (data, visPlugins) {
  'use strict';
  var vis;

  data.create({
    type: 'genomeDataLink',
    name: 'AltSplice',
    serveradress: '/api/genomebrowser'
  }).then(function (genome) {
    var visses = visPlugins.list(genome);
    var junctionVis = visses.filter(function (vis) { return vis.id === 'altsplice-junctions'})[0];
    junctionVis.load().then(function (plugin) {
      vis = plugin.factory(genome, document.querySelector("#vis1") );
    });

    //var readVis = visses.filter(function (vis) { return vis.id === 'altsplice-reads'})[0];
    //readVis.load().then(function (plugin) {
    //  vis = plugin.factory(genome, document.querySelector("#vis2") );
    //});


  });
});
