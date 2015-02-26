
require(['../caleydo/data', '../caleydo/vis', 'altsplice-gui'], function (data, visPlugins, gui) {
  'use strict';
  var vis;

  data.create({
    type: 'genomeDataLink',
    name: 'AltSplice',
    serveradress: '/api/genomebrowser'
  }).then(function (genome) {

    gui.init(genome);

    var visses = visPlugins.list(genome);

    //console.log(document.location.search.substring(1))

    var mode = document.location.search.substring(1);

    if (mode==='bilal' || mode==''){
      var junctionVis = visses.filter(function (vis) { return vis.id === 'altsplice-junctions'})[0];
      junctionVis.load().then(function (plugin) {
        vis = plugin.factory(genome, document.querySelector("#vis1") );
      });
    }

    if (mode==='joseph' || mode=='') {
        var readVis = visses.filter(function (vis) {
          return vis.id === 'altsplice-reads'
        })[0];
        readVis.load().then(function (plugin) {
          vis = plugin.factory(genome, document.querySelector("#vis2"));
        });
    }


    gui.start();


  });
});
