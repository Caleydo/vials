/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 9/17/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */

import * as event from 'phovea_core/src/event';
import * as gui from './vials-gui';
import * as helper from './vials-helper';
import * as d3 from 'd3';


/**
 * a simple template class of a visualization. Up to now there is no additional logic required.
 * @param data
 * @param parent
 * @constructor
 */
export function VialsGenomeAxis(data, parent) {
  this.data = data;
  this.parent = parent;
  this.node = this.build(d3.select(parent));
}
export const VialsReadVis = VialsGenomeAxis;

/**
 * factory method of this module
 * @param data the data to show
 * @param parent the parent dom element to append
 * @returns {VialsGenomeAxis} the visualization
 */
export function create(data, parent) {
  return new VialsGenomeAxis(data, parent);
}

// GLOBAL VARIABLES & STATUS
var margin = {top: 5, right: 150, bottom: 5, left: 150};
var fullHeight = 30;
var height = fullHeight - margin.top - margin.bottom;

/**
 * build the vis and return node
 * @param $parent - the d3 selection of parent node
 * @returns {Node} the node
 */
VialsGenomeAxis.prototype.build = function ($parent) {

  /*
   ================= INIT =====================
   */


  //-- initial parametrization:
  var that = this;
  var axis = that.data.genomeAxis;
  var width = axis.getWidth();
  var genomeCoord = null;


  var textLabelPadding = 0;


  //--  create the outer DOM structure:
  var head = $parent.append('div').attr({
    'class': 'gv'
  });
  var svg = head.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style({
      'left': '20px',
      'position': 'relative'
    });

  //--  create textLabel and retrieve its width
  textLabelPadding = 40;
  helper.drawSideLabel(svg, height, margin, 'center', 'x');


  //--  create a group offset by the label
  var svgMain = svg.append('g').attr({
    'class': 'axisMain',
    'transform': 'translate(' + textLabelPadding + ',0)'
  });

  var crosshairGroup = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + 0 + ')',
    'class': 'crosshair_group'
  });

  function reset() {
    //TODO: add avrs here

  }

  reset();

  function initView() {

    // create crosshair
    crosshairGroup.append('line').attr({
      'class': 'crosshair',
      'x1': 0,
      'y1': 0,
      'x2': 0,
      'y2': fullHeight
    }).style({
      'stroke-width': '1',
      'stroke': 'black',
      'pointer-events': 'none'
    });

    //crosshairGroup.append('text').attr('class', 'crosshairPosBG')
    crosshairGroup.append('text').attr('class', 'crosshairPos');

    var currentX = 0;
    svg.on('mousemove', function () {
      currentX = d3.mouse(this)[0] - 40;
      event.fire('crosshair', currentX);

    });

    //var offsetX = 0;
    //guiPanel.buttons.forEach(function (d) {
    //    d.x = offsetX;
    //    offsetX += d.w + guiPanel.buttonPadding;
    //    d.h = guiPanel.buttonHeight;
    //    d.y = 0;
    //
    //    drawButton(guiPanel.g, d)
    //
    //})


    initEventHandlers();
  }


  function initEventHandlers() {

    // -- global Events
    event.on('newDataLoaded', dataUpdate);
    event.on('crosshair', updateCrosshair);
    event.on('updateVis', updateVis);
    event.on('axisChange', updateVis);

    // *****************
    // ******** Internal Data Events: highlights & selections
    // *****************


    // *****************
    // ******** External Data Events: highlights & selections
    // *****************


    function updateCrosshair(event, x) {
      var visible = (x < 0 || x > axis.getWidth()) ? 'hidden' : 'visible';

      crosshairGroup.selectAll('.crosshair').attr({
        'x1': x,
        'x2': x,
        'visibility': visible
      });

      //crosshairGroup.selectAll('.crosshairPosBG')
      //  .text(function (d) {
      //    return axis.screenPosToGenePos(x)
      //  }).attr({
      //      'x': x + 9,
      //      'y': 14,
      //      'visibility': visible
      //    });

      crosshairGroup.selectAll('.crosshairPos')
        .text(function (d) {
          return axis.screenPosToGenePos(x);
        })
        //.attr({
        //  'x': x + 10,
        //  'y': 15,
        //  'visibility': visible
        //});
        .each(function () {
          var self = d3.select(this);
          var xoffset = x > width / 2 ? -10 - (<any>self.node()).getBBox().width : 10;


          self.attr({
            'x': x + xoffset,
            'y': 15,
            'visibility': visible
          });
        });
    }

  }

  /*
   ================= DRAW METHODS =====================
   */

  function updateAxis() {

    if (genomeCoord) {

      //var diff = genomeCoord.end - genomeCoord.start;
      var scale = d3.scale.linear().domain([0, 100]).range([genomeCoord.start, genomeCoord.end]);
      var stepSize = (genomeCoord.end - genomeCoord.start) / 100;


      var ticks = svgMain.selectAll('.ticks').data(d3.range(0, 101));
      ticks.exit().remove();

      //// --- adding Element to class ticks
      //var ticksEnter = ticks.enter().append('line').attr({
      //  'class': 'ticks'
      //})
      //
      //// --- changing nodes for ticks
      //ticks.transition().attr({
      //  x1: function (d) {
      //    return axis.genePosToScreenPos(scale(d));
      //  },
      //  x2: function (d) {
      //    return axis.genePosToScreenPos(scale(d));
      //  },
      //  y1: 0,
      //  y2: height
      //})


      // --- adding Element to class ticks
      ticks.enter().append('polygon').attr({
        'class': 'ticks'
      });

      // --- changing nodes for ticks
      ticks.transition().attr({
        points: function (d) {
          if (genomeCoord.strand === '+') {
            return axis.genePosToScreenPos(scale(d)) + ',0 ' +
              ((d !== 100) ? axis.genePosToScreenPos(scale(d) + stepSize) + ',' + height / 2 + ' ' : '') +
              axis.genePosToScreenPos(scale(d)) + ',' + height;
          } else {
            return axis.genePosToScreenPos(scale(d)) + ',0 ' +
              ((d !== 0) ? axis.genePosToScreenPos(scale(d) - stepSize) + ',' + height / 2 + ' ' : '') +
              axis.genePosToScreenPos(scale(d)) + ',' + height;


          }
        }

      });


      // // --- adding Element to class ticks
      //var ticksEnter = ticks.enter().append('rect').attr({
      //  'class': 'ticks'
      //})
      //
      //// --- changing nodes for ticks
      //ticks.transition().attr({
      //  class:function(d){return d%2==0?'ticks even':'ticks odd';},
      //  x: function (d) {
      //    return axis.genePosToScreenPos(scale(d));
      //  },
      //  width: function (d) {
      //    return axis.genePosToScreenPos(scale(d)+stepSize)-axis.genePosToScreenPos(scale(d));
      //  },
      //  y: 0,
      //  height: height
      //})

    }


  }

  function updateReverseButton() {
    var directionToggleGroup = svgMain.selectAll('.directionToggleGroup').data([1]);
    var directionToggleGroupEnter = directionToggleGroup.enter().append('g').attr({
      'class': 'directionToggleGroup'
    });
    directionToggleGroupEnter.append('rect').attr({
      'class': 'directionToggle',
      'width': 125,
      'height': 20,
      'rx': 10,
      'ry': 10
    }).on('click', function () {
      axis.reverse();
      d3.select(this).classed('selected', !axis.ascending);
      event.fire('axisChange');
    });

    directionToggleGroupEnter.append('line').attr({
      'x1': 20,
      'x2': 50,
      'y1': 10,
      'y2': 10,
      //'stroke': 'black',
      'stroke-width': 5,
      'marker-end': 'url(\#scaleArrow)',
      'marker-start': 'url(\#scaleArrow)',
    }).style('pointer-events', 'none');
    var directionToggleText = directionToggleGroupEnter.append('text').attr({}).text('reverse');
    directionToggleText.attr('transform', 'translate(65, 14)');
    directionToggleText.style('pointer-events', 'none');

    directionToggleGroup.attr({
      'transform': 'translate(' + (axis.width + 10) + ',0)'
    });


  }


  /*
   ================= LAYOUT METHODS =====================
   */


  /*
   ================= HELPERMETHODS =====================
   */


  /*
   ================= GENERAL METHODS =====================
   */

  //var exploreArea = svgMain.append('g').attr('transform', 'translate(0, 5)').attr('id','exploreArea');
  //jxnArea = exploreArea.append('g').attr('id', 'jxnArea');


  function updateVis() {

    width = axis.getWidth() + margin.left + margin.right;
    svg.attr({
      width: width
    });

    updateAxis();
    updateReverseButton();


  }


  function dataUpdate() {
    var curGene = gui.current.getSelectedGene();
    var curProject = gui.current.getSelectedProject();

    that.data.getGeneData(curProject, curGene).then(function (sampleData) {

      reset();
      axis = that.data.genomeAxis;
      width = axis.getWidth();
      svg.attr('width', axis.getWidth() + margin.left + margin.right + textLabelPadding);
      genomeCoord = {
        start: sampleData.gene.start,
        end: sampleData.gene.end,
        strand: sampleData.gene.strand
      };

      updateVis();

    });


  }


  // start the whole thing:
  initView();

  return head.node();
};

