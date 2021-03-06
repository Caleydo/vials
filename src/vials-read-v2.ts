/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 9/17/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */

import * as event from 'phovea_core/src/event';
import * as d3 from 'd3';
import * as gui from './vials-gui';
import * as helper from './vials-helper';
import * as _ from 'lodash';

/**
 * a simple template class of a visualization. Up to now there is no additional logic required.
 * @param data
 * @param parent
 * @constructor
 */
export function VialsReadVis(data, parent) {
  this.data = data;
  this.parent = parent;
  this.node = this.build(d3.select(parent));
}

/**
 * factory method of this module
 * @param data the data to show
 * @param parent the parent dom element to append
 * @returns {VialsReadVis} the visualization
 */
export function create(data, parent) {
  return new VialsReadVis(data, parent);
}

// GLOBAL VARIABLES & STATUS
const margin = {top: 40, right: 150, bottom: 20, left: 150};
let fullHeight = 370;
const height = fullHeight - margin.top - margin.bottom;


const guiPanel = {
  g: null,
  buttonHeight: 20,
  buttonPadding: 5,
  y: 5,
  buttons: [
    {
      x: 0,
      y: 0,
      h: 0,
      w: 150,
      label: 'group selected',
      event: 'buttonGroupSelected'
    },
    {
      x: 0,
      y: 0,
      h: 0,
      w: 150,
      label: 'ungroup selected',
      event: 'buttonUnGroupSelected'

    },
    //{
    //  w: 150,
    //  label: 'unselect all',
    //  event: 'buttonUnselectAll'
    //
    //},
    //{
    //  w: 150,
    //  label: 'group by attribute',
    //  event: 'buttonGroupByAttribute'
    //}
  ]


};

const readsPlot = {
  g: null,
  height: 200,
  prefix: 'readsPlot',
  y: guiPanel.buttonHeight + guiPanel.y + 5,
  labelWidth: 300,
  panels: {
    std: {
      height: 20,
      xDiff: 25
    }
  }
};


/**
 * build the vis and return node
 * @param $parent - the d3 selection of parent node
 * @returns {Node} the node
 */
VialsReadVis.prototype.build = function ($parent) {

  /*
   ================= INIT =====================
   */


  //-- initial parametrization:
  const that = this;
  let axis = that.data.genomeAxis;
  let width = axis.getWidth();

  // data const:
  let allData: any = {}; // api data
  let dataExtent = [0, 1]; // data extent
  let allWiggles = [];
  let groupWiggleCache: any = {};


  let textLabelPadding = 0;


  //--  create the outer DOM structure:
  const head = $parent.append('div').attr({
    'class': 'gv'
  });
  const svg = head.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style({
      'left': '20px',
      'position': 'relative'
    });

  //--  create textLabel and retrieve its width
  textLabelPadding = 40;
  helper.drawSideLabel(svg, height, margin, 'right', 'reads');


  //--  create a group offset by the label
  const svgMain = svg.append('g').attr({
    'class': 'readsMain',
    'transform': 'translate(' + textLabelPadding + ',0)'
  });

  guiPanel.g = svg.append('g').attr({
    'class': 'guiPanel',
    'transform': 'translate(' + textLabelPadding + ',' + guiPanel.y + ')'
  });

  readsPlot.g = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + readsPlot.y + ')',
    'class': readsPlot.prefix + 'Group'
  });

  const crosshairGroup = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + 0 + ')',
    'class': 'crosshair_group'
  });

  function reset() {
    allData = {};// api data
    dataExtent = [0, 1]; // data extent
    allWiggles = [];
    groupWiggleCache = {};
    that.data.clearAllGroups();

  }

  reset();

  /*
   ================= HELPERMETHODS =====================
   */

  /**
   * a centralized method to decide if a flag is pointing left based on conditions
   * @param type - the site type (donor or receptor)
   * @param positiveStrand - boolean if on a positive strand
   * @returns {boolean}
   */

  const drawButton = function (d3sel, options) {
    //x, y, w, h, label, event
    const buttonG = d3sel.append('g').attr('class', 'guiButton');
    buttonG.attr({
      'transform': 'translate(' + options.x + ',' + options.y + ')'
    });


    buttonG.append('rect').attr({
      class: 'guiButtonBG',
      width: options.w,
      height: options.h,
      rx: 3,
      ry: 3
    }).on({
      click() {
        event.fire(options.event);
      }
    });

    const buttonLabel = buttonG.append('text').text(options.label);
    const bb = buttonLabel.node().getBBox();


    buttonLabel.attr({
      class: 'guiButtonLabel',
      x: (options.w - bb.width) / 2,
      y: options.h - (options.h - bb.height) / 2 - 3
    });


  };


  function regularSorting(a, b) {
    const aType = a.type || 'std';
    const bType = b.type || 'std';

    if (aType === bType) {
      return a.sample.localeCompare(b.sample);
    } else if (aType === 'grp') {
      return -1;
    } else {
      return 1;
    }

  }

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

    //crosshairGroup.append('text').attr('class', 'crosshairPos')

    let currentX = 0;
    svg.on('mousemove', function () {
      currentX = d3.mouse(this)[0] - 40;
      event.fire('crosshair', currentX);

    });

    let offsetX = 0;
    guiPanel.buttons.forEach(function (d) {
      d.x = offsetX;
      offsetX += d.w + guiPanel.buttonPadding;
      d.h = guiPanel.buttonHeight;
      d.y = 0;

      drawButton(guiPanel.g, d);

    });


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

    event.on('buttonGroupSelected', function () {

      const allSelected = svgMain.selectAll('.sampleGroup.selected');
      const ids = _.map(
        _.filter(allSelected.data(), // only the non-groups !!
          function (d: any) {
            return !(d.type && d.type === 'grp');
          })
        , 'sample');

      if (ids.length > 1) {

        const groupName = that.data.setGroup(ids);


        // unselect all group member
        _.each(ids, function (sampleID) {
          gui.current.releaseColorForSelection(sampleID);
          event.fire('sampleSelect', sampleID, false);
        });

        event.fire('groupingChanged', groupName, ids);

      }


    });

    event.on('buttonUnGroupSelected', function () {

      const allSelected = svgMain.selectAll('.sampleGroup.selected');

      const ids = _.map(
        _.filter(allSelected.data(), // only groups !!
          function (d: any) {
            return (d.type && d.type === 'grp');
          })
        , 'sample');

      if (ids.length > 0) {
        _.each(ids, function (groupName) {
          event.fire('groupingChanged', groupName, null);
        });

      }

    });


    // *****************
    // ******** External Data Events: highlights & selections
    // *****************


    // -- grouping changed
    event.on('groupingChanged', function (e, groupName, ids) {

      let groupings = that.data.getGroups();
      let groupMappedSamples = [];


      if (ids && ids.length > 0) {
        that.data.retainGroup(groupName);

        groupMappedSamples = _.flatten(_.map(groupings, 'samples'));

        const groupedData = _.filter(allData.measures.wiggles,
          function (d: any) {
            return _.includes(groupMappedSamples, d.sample);
          });

        const sampleLength = groupedData[0].data.length;
        const wiggleSummary = _.map(_.range(0, sampleLength), function () {
          return {
            all: []
          };
        });


        _.each(groupedData, function (d) {
          _.each(d.data, function (wi, i) {
            wiggleSummary[i].all.push(wi);
          });
        });

        _.each(wiggleSummary, function (wi: any) {
          wi.low = _.min(wi.all);
          wi.high = _.max(wi.all);
          wi.median = d3.median(wi.all);
          delete wi.all;
        });


        groupWiggleCache[groupName] = wiggleSummary;
      } else {
        groupings = _.filter(groupings, function (d: any) {
          return d.name !== groupName;
        });

        groupMappedSamples = _.flatten(_.map(groupings, 'samples'));

        if (groupName in groupWiggleCache) {
          delete groupWiggleCache[groupName];
        }

        gui.current.releaseColorForSelection(groupName);
        that.data.releaseGroup(groupName);

      }


      allWiggles = _.filter(allData.measures.wiggles,
        function (d: any) {
          return !_.includes(groupMappedSamples, d.sample);
        });

      _.each(groupings, function (grouping) {

        const name = grouping.name;
        allWiggles.push({
          sample: name,
          type: 'grp',
          grpItems: grouping.samples,
          data: (name in groupWiggleCache) ? groupWiggleCache[name] : []
        });

      });


      allWiggles.sort(regularSorting);

      updateVis();

    });


    // -- highlight a Junction
    event.on('highlightJxn', function (e, key, highlight) {

      //TODO: maybe del

    });

    // -- hover over a flag
    event.on('highlightFlag', function (e, loc, highlight) {
      //TODO: mayb del
    });

    event.on('sampleHighlight', function (e, sample, highlight) {
      svgMain.selectAll('.sampleGroup')
        .filter(function (d) {
          return d.sample === sample;
        })
        .classed('highlighted', highlight);
    });

    event.on('sampleSelect', function (e, sample, isSelected) {
      const allSelected = svgMain.selectAll('.sampleGroup')
        .filter(function (d) {
          return d.sample === sample;
        });
      allSelected.classed('selected', isSelected);

      if (isSelected) {
        allSelected.select('.sampleGroupLabelBG').style({
          fill: gui.current.getColorForSelection(sample),
          'fill-opacity': .5
        });
      } else {
        gui.current.releaseColorForSelection(sample);
        allSelected.select('.sampleGroupLabelBG').style({
          fill: null,
          'fill-opacity': null
        });
      }

    });

    event.on('groupHighlight', function (e, groupID, highlight) {
      const allSelected = svgMain.selectAll('.sampleGroup')
        .filter(function (d) {
          return d.sample === groupID;
        });
      allSelected.classed('highlighted', highlight);
    });

    event.on('groupSelect', function (e, groupID, isSelected) {
      const allSelected = svgMain.selectAll('.sampleGroup')
        .filter(function (d) {
          return d.sample === groupID;
        });
      allSelected.classed('selected', isSelected);
      if (isSelected) {
        allSelected.select('.sampleGroupLabelBG').style({
          fill: gui.current.getColorForSelection(groupID),
          'fill-opacity': .5
        });
      } else {
        gui.current.releaseColorForSelection(groupID);
        allSelected.select('.sampleGroupLabelBG').style({
          fill: null,
          'fill-opacity': null
        });
      }


    });

    event.on('isoFormSelect', function (e, isoInfo) {
      //TODO maybe del
    });


  }


  /*
   ================= DRAW METHODS =====================
   */

  function updateCrosshair(event, x) {
    const visible = (x < 0 || x > axis.getWidth()) ? 'hidden' : 'visible';

    crosshairGroup.selectAll('.crosshair').attr({
      'x1': x,
      'x2': x,
      'visibility': visible
    });

    //d3.selectAll('.crosshairPos')
    //  .text(function (d) {
    //    return axis.screenPosToGenePos(x)
    //  })
    //  .each(function () {
    //    const self = d3.select(this),
    //      bb = self.node().getBBox();
    //    self.attr({
    //      'x': x + 10,
    //      'y': 0,//fullHeight - heatmapPlot.y - bb.height / 2,
    //      'visibility': visible
    //    });
    //  })
  }


  function updateWiggles() {
    axis.setArrayWidth(allData.measures.wiggle_sample_size - 1);

    const areaScale = d3.scale.linear().domain([0, dataExtent[1]]).clamp(true).range([readsPlot.panels.std.height, 0]);

    const area = d3.svg.area<any>()
      .x(function (d, i) {
        return axis.arrayPosToScreenPos(i);
      })
      .y0(readsPlot.panels.std.height)
      .y1(function (d) {
        return areaScale(d);
      });

    const areaGrp = d3.svg.area<any>()
      .x(function (d, i) {
        return axis.arrayPosToScreenPos(i);
      })
      .y0(function (d) {
        return areaScale(d.low);
      })
      .y1(function (d) {
        return areaScale(d.high);
      });


    const sampleGroup = readsPlot.g.selectAll('.sampleGroup').data(allWiggles, function (d) {
      return d.sample;
    });
    sampleGroup.exit().remove();

    // --- adding Element to class sampleGroup
    const sampleGroupEnter = sampleGroup.enter().append('g').attr({
      'class': 'sampleGroup'
    });

    // draw BG rect
    sampleGroupEnter.append('rect').attr({
      'class': 'sampleGroupBG',
      x: 0,
      y: 0,
      height: readsPlot.panels.std.height,
      width: axis.getWidth()
    }).on({
      mouseenter(d) {
        if (d.type && d.type === 'grp') {
          event.fire('groupHighlight', d.sample, true);
        } else {
          event.fire('sampleHighlight', d.sample, true);
        }

      },
      mouseout(d) {
        if (d.type && d.type === 'grp') {
          event.fire('groupHighlight', d.sample, false);
        } else {
          event.fire('sampleHighlight', d.sample, false);
        }
      },
      click(d) {
        const isSelected = d3.select(this.parentNode).classed('selected');

        if (d.type && d.type === 'grp') {
          event.fire('groupSelect', d.sample, !isSelected);
        } else {
          event.fire('sampleSelect', d.sample, !isSelected);
        }


      }
    });

    sampleGroupEnter.append('rect').attr({
      'class': 'sampleGroupLabelBG',
      x: axis.getWidth() + 5,
      y: 0,
      height: readsPlot.panels.std.height,
      width: readsPlot.labelWidth
    }).on({
      mouseenter(d) {
        if (d.type && d.type === 'grp') {
          event.fire('groupHighlight', d.sample, true);
        } else {
          event.fire('sampleHighlight', d.sample, true);
        }

      },
      mouseout(d) {
        if (d.type && d.type === 'grp') {
          event.fire('groupHighlight', d.sample, false);
        } else {
          event.fire('sampleHighlight', d.sample, false);
        }
      },
      click(d) {
        const isSelected = d3.select(this.parentNode).classed('selected');
        if (d.type && d.type === 'grp') {
          event.fire('groupSelect', d.sample, !isSelected);
        } else {
          event.fire('sampleSelect', d.sample, !isSelected);
        }

      }
    }).append('title').text(function (d) {
      if (d.type && d.type === 'grp') {
        return d.grpItems.join('\n');
      } else {
        return d.sample;
      }

    });

    sampleGroupEnter.append('text').attr({
      'class': 'sampleGroupLabelText',
      y: readsPlot.panels.std.height - (readsPlot.panels.std.height - 14) / 2
    }).text(function (d) {
      return d.sample;
    });


    // --- changing nodes for sampleGroup
    sampleGroup.transition().attr({
      transform(d, i) {
        return 'translate(' + 0 + ',' + i * readsPlot.panels.std.xDiff + ')';
      }
    });

    sampleGroup.select('.sampleGroupBG').attr({
      width: axis.getWidth()
    });

    sampleGroup.select('.sampleGroupLabelBG').attr({
      x: axis.getWidth()
    });
    sampleGroup.select('.sampleGroupLabelText').attr({
      x: axis.getWidth() + 5
    });


    /*
     * =============
     * drawing the wiggle lines
     * =============
     * */


    const sampleGraph = sampleGroup.selectAll('.sampleGraph').data(function (data) {
      return [data];
    });
    sampleGraph.exit().remove();

    // --- adding Element to class sampleGraph
    const sampleLineEnter = sampleGraph.enter().append('path').attr({
      'class': 'sampleGraph'
    });

    // --- changing nodes for sampleGraph
    sampleGraph.attr('d', (d) => {
      if (d.type && d.type === 'grp') {
        return areaGrp(d.data);
      } else {
        return area(d.data);
      }
    }).classed('groupArea', function (d) {
      return (d.type && d.type === 'grp');
    });


  }


  /*
   ================= LAYOUT METHODS =====================
   */


  /*
   ================= GENERAL METHODS =====================
   */

  //const exploreArea = svgMain.append('g').attr('transform', 'translate(0, 5)').attr('id','exploreArea');
  //jxnArea = exploreArea.append('g').attr('id', 'jxnArea');


  function updateVis() {
    //TODO
    fullHeight = allData.measures.wiggles.length * readsPlot.panels.std.xDiff + readsPlot.y;
    svg.attr('height', fullHeight)
      .attr('width', axis.getWidth() + margin.left + margin.right);

    crosshairGroup.select('.crosshair').attr({
      'y2': fullHeight
    });

    updateWiggles();


  }

  function cleanVis() {
    readsPlot.g.selectAll('*').remove();
  }

  function dataUpdate() {

    reset();


    axis = that.data.genomeAxis;
    width = axis.getWidth();
    svg.attr('width', width + margin.left + margin.right + textLabelPadding);

    const curGene = gui.current.getSelectedGene();
    const curProject = gui.current.getSelectedProject();

    that.data.getGeneData(curProject, curGene).then(function (sampleData) {


      //console.time('dataLoading');
      allData = sampleData;
      allWiggles = allData.measures.wiggles.sort(regularSorting);

      const positiveStrand = (sampleData.gene.strand === '+');


      const extents = [];
      sampleData.measures.wiggles.forEach(function (wig) {
        const extentX = d3.extent(wig.data);
        extents.push(extentX[0]);
        extents.push(extentX[1]);
      });
      dataExtent = d3.extent(extents);


      //console.timeEnd('dataLoading');

      //console.time('updatevis');
      cleanVis();
      updateVis();
      //console.timeEnd('updatevis');
    });


  }


  // start the whole thing:
  initView();

  return head.node();
};

