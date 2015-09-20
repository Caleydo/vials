define(['../caleydo_core/main', '../caleydo_core/data', '../caleydo_core/vis', './vials-gui', '../caleydo_core/event'], function (C, data, visPlugins, gui, event) {
  'use strict';
  var vis;

  window.GoogleAnalyticsObject = 'ga';
  window.ga = { q: [['create', 'UA-45998043-2', 'vials.io'], ['send', 'pageview']], l: Date.now() };
  require(['http://www.google-analytics.com/analytics.js']);

  // d3 extension
  d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
      this.parentNode.appendChild(this);
    });
  };

  data.create({
    type: 'caleydo-genome-data-link',
    name: 'Vials',
    serveradress: '/api/vials'
  }).then(function (genomeDataLink) {

    gui.current.init(genomeDataLink);

    var visses = visPlugins.list(genomeDataLink);

    //console.log(document.location.search.substring(1))

    var options = getJsonFromUrl();

    if (options.file) {
      genomeDataLink.useFile(options.file);

    }


    var vis1Loaded = new Promise(function (resolve, reject) {
      if (!options.mode || options.mode.indexOf('jxn') > -1) {
        var junctionVis = visses.filter(function (vis) {
          return vis.id === 'vials-junctions'
        })[0];
        junctionVis.load().then(function (plugin) {
          vis = plugin.factory(genomeDataLink, document.querySelector("#visJxns"));
          resolve();
        });
      } else {
        resolve();
      }
    })

    var vis2Loaded = new Promise(function (resolve, reject) {
      if (!options.mode || options.mode.indexOf('reads') > -1) {
        var readVis = visses.filter(function (vis) {
          return vis.id === 'vials-reads'
        })[0];
        readVis.load().then(function (plugin) {
          vis = plugin.factory(genomeDataLink, document.querySelector("#visReads"));
          resolve();
        });
      } else {
        resolve();
      }
    });

    var vis3Loaded = new Promise(function (resolve, reject) {
      if (!options.mode || options.mode.indexOf('iso') > -1) {
        var readVis = visses.filter(function (vis) {
          return vis.id === 'vials-isoforms'
        })[0];
        readVis.load().then(function (plugin) {
          vis = plugin.factory(genomeDataLink, document.querySelector("#visIso"));
          resolve();
        });
      } else {
        resolve();
      }
    });

    var vis4Loaded = new Promise(function (resolve, reject) {
      if (!options.mode || options.mode.indexOf('axis') > -1) {
        var readVis = visses.filter(function (vis) {
          return vis.id === 'vials-axis'
        })[0];
        readVis.load().then(function (plugin) {
          vis = plugin.factory(genomeDataLink, document.querySelector("#visAxis"));
          resolve();
        });
      } else {
        resolve();
      }
    });


    // start here !!
    Promise.all([vis1Loaded, vis2Loaded, vis3Loaded, vis4Loaded]).then(function () {
      gui.current.start(options.projectID, options.geneID, options.exonLength);
    })


    event.on('resizeCanvas', function (event, w, h) {
      var $visCanvas = $('#vis_canvas');
      $visCanvas.css({
        width: w,
        height: h
      })
      if ($visCanvas.css("opacity") == 0) {
        $visCanvas.fadeTo('fast', 1);
      }
    })

    $(window).resize(function () {
      event.fire('resizeCanvas',
        $(window).width(),
        $(window).height() - $('#navbar').height() - 5)

    });

    event.fire('resizeCanvas',
      $(window).width(),
      $(window).height() - $('#navbar').height() - 5)


    // ==============
    // -- HELPERS ---
    // ==============

    function getJsonFromUrl() {
      var query = location.search.substr(1);
      var result = {};
      query.split("&").forEach(function (part) {
        var item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
      });
      return result;
    }


  });
});
