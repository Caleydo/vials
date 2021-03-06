import 'file-loader?name=index.html!extract-loader!html-loader!./index.html';
import 'file-loader?name=404.html!./404.html';
import 'file-loader?name=robots.txt!./robots.txt';
import 'font-awesome/scss/font-awesome.scss';
import 'bootstrap-sass/assets/stylesheets/_bootstrap.scss';
import './style.scss';

import * as data from 'phovea_core/src/data';
import * as visPlugins from 'phovea_core/src/vis';
import * as event from 'phovea_core/src/event';
import * as gui from './vials-gui';
import 'imports-loader?jQuery=jquery!bootstrap-sass/assets/javascripts/bootstrap.js';
import * as $ from 'jquery';
import * as d3 from 'd3';


let vis;

(<any>window).GoogleAnalyticsObject = 'ga';
(<any>window).ga = {q: [['create', 'UA-45998043-2', 'vials.io'], ['send', 'pageview']], l: Date.now()};
{
  const s = document.createElement('script');
  s.src = 'http://www.google-analytics.com/analytics.js';
  document.head.appendChild(s);
}

// d3 extension
(<any>(d3.selection.prototype)).moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};

data.create({
  id: undefined,
  type: 'caleydo-genome-data-link',
  name: 'Vials',
  fqname: 'vials/Vials',
  description: '',
  serveradress: '/api/vials',
  creator: 'Vials',
  ts: Date.now()
}).then(function (genomeDataLink) {

  gui.current.init(genomeDataLink);

  const visses = visPlugins.list(genomeDataLink);

  //console.log(document.location.search.substring(1))

  const options = getJsonFromUrl();

  if (options.file) {
    (<any>genomeDataLink).useFile(options.file);

  }

  if (options.headless) {
    d3.select('#navbar').attr({hidden: true});
  }


  const vis1Loaded = new Promise(function (resolve, reject) {
    if (!options.mode || options.mode.indexOf('jxn') > -1) {
      const junctionVis = visses.filter(function (vis) {
        return vis.id === 'vials-junctions';
      })[0];
      junctionVis.load().then(function (plugin) {
        vis = plugin.factory(genomeDataLink, document.querySelector('#visJxns'));
        resolve();
      });
    } else {
      resolve();
    }
  });

   const vis2Loaded = new Promise(function (resolve, reject) {
    if (!options.mode || options.mode.indexOf('reads') > -1) {
      const readVis = visses.filter(function (vis) {
        return vis.id === 'vials-reads';
      })[0];
      readVis.load().then(function (plugin) {
        vis = plugin.factory(genomeDataLink, document.querySelector('#visReads'));
        resolve();
      });
    } else {
      resolve();
    }
  });

  const vis3Loaded = new Promise(function (resolve, reject) {
    if (!options.mode || options.mode.indexOf('iso') > -1) {
      const readVis = visses.filter(function (vis) {
        return vis.id === 'vials-isoforms';
      })[0];
      readVis.load().then(function (plugin) {
        vis = plugin.factory(genomeDataLink, document.querySelector('#visIso'));
        resolve();
      });
    } else {
      resolve();
    }
  });

  const vis4Loaded = new Promise(function (resolve, reject) {
    if (!options.mode || options.mode.indexOf('axis') > -1) {
      const readVis = visses.filter(function (vis) {
        return vis.id === 'vials-axis';
      })[0];
      readVis.load().then(function (plugin) {
        vis = plugin.factory(genomeDataLink, document.querySelector('#visAxis'));
        resolve();
      });
    } else {
      resolve();
    }
  });


  // start here !!
  Promise.all([vis1Loaded, vis2Loaded, vis3Loaded, vis4Loaded]).then(function () {
    gui.current.start(options.projectID, options.geneID, options.exonLength);
  });


  event.on('resizeCanvas', function (event, w, h) {
    const $visCanvas = $('#vis_canvas');
    $visCanvas.css({
      width: w,
      height: h
    });
    if (+$visCanvas.css('opacity') === 0) {
      $visCanvas.fadeTo('fast', 1);
    }
  });

  $(window).resize(function () {
    event.fire('resizeCanvas',
      $(window).width(),
      $(window).height() - ($('#navbar').attr('hidden') ? 0 : +$('#navbar').height()) - 5);

  });

  //console.log($('#navbar').attr('hidden'),'\n-- $(.css('opacity') --');
  event.fire('resizeCanvas',
    $(window).width(),
    $(window).height() - ($('#navbar').attr('hidden') ? 0 : +$('#navbar').height()) - 5);


  // ==============
  // -- HELPERS ---
  // ==============

  function getJsonFromUrl() {
    const query = location.search.substr(1);
    const result : any = {};
    query.split('&').forEach(function (part) {
      const item = part.split('=');
      result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
  }


});
