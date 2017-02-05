/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/9/15.
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
export function VialsJunctionVis(data, parent) {
  this.data = data;
  this.parent = parent;
  this.node = this.build(d3.select(parent));
}

/**
 * factory method of this module
 * @param data the data to show
 * @param parent the parent dom element to append
 * @returns {VialsJunctionVis} the visualization
 */
export function create(data, parent) {
  return new VialsJunctionVis(data, parent);
}

// GLOBAL VARIABLES & STATUS
const margin = {top: 40, right: 150, bottom: 10, left: 150};
const fullHeight = 350;
const height = fullHeight - margin.top - margin.bottom;


//icon: '\uf012',
//  icon
//:
//'\uf24d',
//  icon
//:
//'\uf259'

const guiHead = {
  g: null,
  y: 5,
  height: 17,
  title: 'on click open:',
  options: [
    {
      name: 'dotplot',
      icon: '\uf012',
      id: 'scatter',
      x: 0,
      w: 80,

    },
    {
      name: 'group comparison',
      icon: '\uf24d',
      id: 'groupX',
      x: 81,
      w: 150,

    }


  ],
  defaultOption: 'scatter'
};

const abundancePlot = {
  g: null,
  height: 200,
  prefix: 'jxn_weight',
  y: 30,
  panels: {
    panelGapsize: 4,
    prefix: 'jxn_weight_panel',

    mini: {
      //boxPlotWidth:3,
      boxPlotOffset: 0,
      //width:5,
      currentWidth: 5 // STATIC !!
    },
    std: {
      minWidth: 15,
      boxPlotWidth: 7,
      boxPlotOffset: 0,
      currentWidth: -1 // dynamic
    },
    scatter: {
      minWidth: 100,
      maxWidth: 200,
      boxPlotOffset: 0,
      currentWidth: 100 // dynamic
    },
    groupX: {
      minWidth: 100,
      maxWidth: 200,
      boxPlotOffset: 5,
      currentWidth: 100 // dynamic
    },


    //scatterWidth:100,
    //dynamic paramters:

  }

};

const connectorPlot = {
  g: null,
  height: 100,
  prefix: 'jxn_con',
  y: abundancePlot.height + abundancePlot.y,
  frozenHighlight: null, // dynamic
  upperConnectors: {
    g: null,
    height: 60,
    prefix: 'jxn_con_upper',
    y: 0
  },
  triangles: {
    g: null,
    height: 8,
    y: 60,
    prefix: 'jxn_con_triangle'
  }
  ,
  lowerConnectors: {
    g: null,
    height: 100 - (60 + 8),
    prefix: 'jxn_con_lower',
    y: 60 + 8
  }
};

const heatmapPlot = {
  g: null,
  height: 15,
  prefix: 'jxn_heat',
  y: connectorPlot.y + connectorPlot.height
};


/**
 * build the vis and return node
 * @param $parent - the d3 selection of parent node
 * @returns {Node} the node
 */
VialsJunctionVis.prototype.build = function ($parent) {

  /*
   ================= INIT =====================
   */


  //-- initial parametrization:
  const that = this;
  let axis = that.data.genomeAxis;
  let width = axis.getWidth();

  // data const:
  let allData: any = {}; // api data
  let triangleData = []; // data to draw triangles
  let allJxns = {}; // juncntion information as map
  let allExons = [];
  let jxnGroups = []; // end positions of jxn groups for connector drawing
  let sampleOrder = {definedSize: 0, order: [], valid: false, sortByKey: null}; // sort order for elements in scatterplot view (abundance)

  let groupings = []; // hold grouping information
  let groupingsMeta = []; // separate grouping meta information

  let isSelectedIsoForm = false;

  //visual constiables:
  const weightScale = d3.scale.linear().range([abundancePlot.height - 10, 10]);
  let endOfPanels = 10; // whats the final width of all panels
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
  helper.drawSideLabel(svg, height, margin, 'center', 'junctions');


  //--  create a group offset by the label
  const svgMain = svg.append('g').attr({
    'class': 'jxnMain',
    'transform': 'translate(' + textLabelPadding + ',0)'
  });

  guiHead.g = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + guiHead.y + ')',
    'class': 'guiHead_group'
  });

  abundancePlot.g = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + abundancePlot.y + ')',
    'class': abundancePlot.prefix + '_group'
  });


  heatmapPlot.g = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + heatmapPlot.y + ')',
    'class': heatmapPlot.prefix + '_group'
  });

  const crosshairGroup = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + heatmapPlot.y + ')',
    'class': 'crosshair_group'
  });

  connectorPlot.g = svgMain.append('g').attr({
    'transform': 'translate(' + 0 + ',' + connectorPlot.y + ')',
    'class': connectorPlot.prefix + '_group'
  });

  ['triangles', 'upperConnectors', 'lowerConnectors'].forEach(function (subGroup) {
    connectorPlot[subGroup].g = connectorPlot.g.append('g').attr({
      'transform': 'translate(' + 0 + ',' + connectorPlot[subGroup].y + ')',
      'class': connectorPlot[subGroup].prefix + '_group'
    });
  });

  function reset() {
    // data const:
    allData = {}; // api data
    triangleData = []; // data to draw triangles
    allJxns = {}; // juncntion information as map
    allExons = [];
    jxnGroups = []; // end positions of jxn groups for connector drawing
    sampleOrder = {definedSize: 0, order: [], valid: false, sortByKey: null}; // sort order for elements in scatterplot view (abundance)

    groupings = []; // hold grouping information
    groupingsMeta = []; // separate grouping meta information

    isSelectedIsoForm = false;
  }


  function initView() {

    // create crosshair
    crosshairGroup.append('line').attr({
      'class': 'crosshair',
      'x1': 0,
      'y1': 0,
      'x2': 0,
      'y2': fullHeight - heatmapPlot.y
    }).style({
      'stroke-width': '1',
      'stroke': 'black',
      'pointer-events': 'none'
    });

    //crosshairGroup.append('text').attr('class', 'crosshairPos')

    let currentX = 0;
    heatmapPlot.g.on('mousemove', function () {
      currentX = d3.mouse(this)[0];
      event.fire('crosshair', currentX);

    });

    const ghTitle = guiHead.g.append('text').text(guiHead.title).attr({
      y: guiHead.height - 3
    });
    const bb = ghTitle.node().getBBox();

    const guiHeadOption = guiHead.g.selectAll('.guiHeadOption').data(guiHead.options);
    guiHeadOption.exit().remove();

    // --- adding Element to class guiHeadOption
    const guiHeadOptionEnter = guiHeadOption.enter().append('g').attr({
      'class': 'guiHeadOption',
      'transform'(d, i) {
        return 'translate(' + (d.x + bb.width + 5) + ',' + 0 + ')';
      }

    }).classed('selected', function (dd) {
      return dd.id === guiHead.defaultOption;
    });

    guiHeadOptionEnter.append('rect').attr({
      'class': 'guiButtonBG',
      width(d) {
        return d.w;
      },
      height: guiHead.height
    }).on({
      'click'(d) {
        guiHeadOption.classed('selected', function (dd) {
          return dd.id === d.id;
        });
        _.each(allJxns, function (jxn: any) {
          if (jxn.state === guiHead.defaultOption) {
            jxn.state = d.id;
          }
        });

        guiHead.defaultOption = d.id;

        updateVis();

      }
    });

    guiHeadOptionEnter.append('text').attr({
      'class': 'guiButtonLabel',
      x: 3,
      y: guiHead.height - 3
    }).text(function (d) {
      return d.name;
    });

    guiHeadOptionEnter.append('text').attr({
      'class': 'decoration',
      y: guiHead.height - 3,
      x(d) {
        return d.w - 20;
      }
    }).text(function (d) {
      return d.icon;
    });


    initEventHandlers();
  }


  function initEventHandlers() {

    // -- global Events
    event.on('newDataLoaded', dataUpdate);
    event.on('crosshair', updateCrosshair);
    event.on('updateVis', updateVis);
    event.on('axisChange', updateVis);

    // -- highlight a Junction
    event.on('highlightJxn', function (e, key, highlight) {

      //======== FLAGs =======

      //TODO: potential cause for errors
      if (connectorPlot.frozenHighlight != null) {
        const clean = connectorPlot.frozenHighlight;
        connectorPlot.frozenHighlight = null;
        event.fire('highlightFlag', clean, false);
      }

      const triangles = connectorPlot.triangles.g.selectAll('.triangle');
      const highlightTriangles = triangles.filter(function (d) {
        // TODO: the location could be only a substring of a real location (unlikely but maybe)
        if (key.indexOf(d.loc) > -1) {
          return true;
        }
        return false;
      });
      highlightTriangles.classed('highlighted', highlight);

      //========= CONNECTORS ====

      const lowerConnector = connectorPlot.lowerConnectors.g.selectAll('.con');
      lowerConnector.filter(function (d) {
        // TODO: the location could be only a substring of a real location (unlikely but maybe)
        return (key.indexOf(d.loc) > -1);
      }).classed('highlighted', highlight);

      const directNeighbors = connectorPlot.upperConnectors.g.selectAll('.neighborCon');
      directNeighbors.filter(function (d) {
        return key === (d.jxns[0].start + ':' + d.jxns[0].end); // if start and end assemble to the key
      }).classed('highlighted', highlight);

      const donorConnectors = connectorPlot.upperConnectors.g.selectAll('.donorCon');
      donorConnectors.filter(function (d) {
        return d.key === key;
      }).classed('highlighted', highlight);

      const accConnectors = connectorPlot.upperConnectors.g.selectAll('.accCon');
      accConnectors.filter(function (d) {
        return d.key === key;
      }).classed('highlighted', highlight);


      // ========= Panels =====
      const panels = abundancePlot.g.selectAll('.' + abundancePlot.panels.prefix);
      const keyPanel = panels.filter(function (d) {
        return d.key === key;
      });
      keyPanel.select('.panelIndicator').style('opacity', highlight ? 1 : null);
      keyPanel.select('.panelBG').classed('highlighted', highlight);//.style('fill-opacity',highlight?.1 :null);


    });

    // -- hover over a flag
    event.on('highlightFlag', function (e, loc, highlight) {

      _.keys(allJxns).forEach(function (key) {
        const obj = allJxns[key];
        if (obj.start === loc || obj.end === loc) {
          event.fire('highlightJxn', key, highlight);
        }
      });


    });

    // *****************
    // ******** External Data Events: highlights & selections
    // *****************

    event.on('sampleHighlight', function (e, sample, highlight) {
      const panels = abundancePlot.g.selectAll('.' + abundancePlot.panels.prefix);
      const hDots = panels.selectAll('.dots').filter(function (d) {
        return d.w.sample === sample;
      });
      hDots.classed('highlighted', highlight);
      hDots.attr({r: highlight ? 4 : 2});
    });

    event.on('groupHighlight', function (e, groupID, highlight) {
      const groupSamples = _.find(groupings, 'name', groupID);
      if (groupSamples) {
        const alldots = abundancePlot.g.selectAll('.' + abundancePlot.panels.prefix).selectAll('.dots');

        alldots.filter(function (d) {
          return _.includes(groupSamples.samples, d.w.sample);
        })
          .classed('highlighted', highlight)
          .attr({r: highlight ? 4 : 2});
      }

    });

    event.on('sampleSelect', function (e, sample, isSelected) {
      const allDots = abundancePlot.g.selectAll('.' + abundancePlot.panels.prefix).selectAll('.dots');
      if (isSelected) {
        allDots.filter(function (d) {
          return d.w.sample === sample;
        }).style({
          fill: gui.current.getColorForSelection(sample)
        });
      } else {
        allDots.filter(function (d) {
          return d.w.sample === sample;
        }).style({
          fill: null
        });
      }
    });

    const groupSelect = function (e, groupID, isSelected) {
      const groupSamples = _.find(groupings, 'name', groupID);
      if (groupSamples) {
        const allDots = abundancePlot.g.selectAll('.' + abundancePlot.panels.prefix).selectAll('.dots');

        if (isSelected) {
          allDots.filter(function (d) {
            return _.includes(groupSamples.samples, d.w.sample);
          }).style({
            fill: gui.current.getColorForSelection(groupID)
          });
        } else {
          allDots.filter(function (d) {
            return _.includes(groupSamples.samples, d.w.sample);
          }).style({
            fill: null
          });
        }
      }

    };
    event.on('groupSelect', groupSelect);

    event.on('isoFormSelect', function (e, isoInfo) {
      //{isoform: d.id, index:-1}

      if (isoInfo.index > -1) {
        isSelectedIsoForm = true;
        //const exonIDs = allData.gene.isoforms[isoInfo.isoform].exons;
        const selectedExons = _.sortBy(allExons.filter(function (d) {
          return d.isoformID === isoInfo.isoform;
        }), 'start');


        // all JXNs to std:
        _.values(allJxns).forEach(function (jxn: any) {
          jxn.state = 'mini';
          jxn.selectedIsoform = false;
        });


        //const jxnIDs =[];
        //const matchingJxn = [];
        let lastExon = null;

        selectedExons.forEach(function (exon) {
          if (lastExon != null) {
            //jxnIDs.push(lastExon.end+'_'+exon.start);

            const match = allJxns[lastExon.end + ':' + exon.start];
            if (match != null) {
              match.state = guiHead.defaultOption; // TODO: modify default behavior
              match.selectedIsoform = true; // needed for decoration
              //matchingJxn.push(match);
            }
            lastExon = exon;
          } else {
            lastExon = exon;
          }
        });


      } else {
        isSelectedIsoForm = false;
        // all JXNs to std:
        _.values(allJxns).forEach(function (jxn: any) {
          jxn.state = 'std';
          jxn.selectedIsoform = false;
        });

      }

      updateVis();

    });


    event.on('groupingChanged', function (e, groupName, samples) {


      if (samples && samples.length > 0) {
        that.data.retainGroup(groupName);


        // add grouping
        groupings.push({
          name: groupName,
          samples
        });

        const allBoxPlots = {};
        _.keys(allJxns).forEach(function (jkey) {
          const jxn = allJxns[jkey];


          const allWeights = _.map(jxn.weights.filter(function (d) {
            return _.includes(samples, d.sample);
          }), 'weight');
          if (allWeights.length > 2) {
            allBoxPlots[jkey] = {boxplot: helper.computeBoxPlot(allWeights)};
          }
        });

        groupingsMeta.push(allBoxPlots);

        computeAbundanceLayout();
        updateAbundanceView();
      } else {
        that.data.releaseGroup(groupName);

        //remove grouping
        const index = _.findIndex(groupings, (d: any) => d.name === groupName);
        if (index > -1) {
          groupSelect(null, groupName, false);
          groupings.splice(index, 1);
          groupingsMeta.splice(index, 1);
        }

        computeAbundanceLayout();
        updateAbundanceView();

      }

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
    //      'y': fullHeight - heatmapPlot.y - bb.height / 2,
    //      'visibility': visible
    //    });
    //  })
  }

  // -- HEATMAP PLOT --
  function updateHeatmap() {
    // bind local data
    const heatMapGroup = heatmapPlot.g;

    const startField = axis.ascending ? 'start' : 'end';
    const endField = axis.ascending ? 'end' : 'start';

    // --- D3 update cycle
    const exonHeat = heatMapGroup.selectAll('.exon').data(allExons);
    exonHeat.exit().remove();

    // --- adding Element to class exon
    const exonHeatEnter = exonHeat.enter().append('rect').attr({
      'class': heatmapPlot.prefix + ' exon',
      y: 0,
      height: heatmapPlot.height
    });

    // --- changing attr for exon
    exonHeat.transition().attr({
      x(d) {
        return axis.genePosToScreenPos(d[startField]);
      },
      width(d) {
        return axis.genePosToScreenPos(d[endField]) - axis.genePosToScreenPos(d[startField]);
      }
    });


  }

  /**
   * update flag drawing
   * hidden option is boolean for animation = false
   */
  function updateFlags() {

    const animate = arguments[0] || false;
    const triangleLength = connectorPlot.triangles.height;
    const positiveStrand = allData.gene.strand === '+';

    const triangles = connectorPlot.triangles.g.selectAll('.triangle').data(triangleData);
    triangles.exit().remove();

    triangles.enter().append('polygon').attr({
      'transform' (d, i) {
        return 'translate(' + d.xStart + ',0)';
      },
      'class': connectorPlot.triangles.prefix + ' triangle '
    }).on({
      'mouseover' (d) {
        event.fire('crosshair', axis.genePosToScreenPos(d.loc));
        event.fire('highlightFlag', +d.loc, true);
      },
      'mouseout' (d) {
        if (connectorPlot.frozenHighlight == null) {
          event.fire('highlightFlag', +d.loc, false);
        }
      },
      'click'(d) {
        if (connectorPlot.frozenHighlight == null) {
          connectorPlot.frozenHighlight = +d.loc;
        } else {
          connectorPlot.frozenHighlight = null;
        }
      }
    });

    triangles.classed('donor', function (d) {
      return d.type === 'donor' ? true : null;
    });
    triangles.classed('receptor', function (d) {
      return d.type === 'receptor' ? true : null;
    });

    triangles.attr({
      //+ d.type;},
      'points'(d, i) {
        return isLeftArrow(d.type, positiveStrand) ?
          [
            0, triangleLength / 2,
            triangleLength, 0,
            triangleLength, triangleLength
          ] : [
            triangleLength, triangleLength / 2,
            0, 0,
            0, triangleLength
          ];
      }
    });

    let trans = triangles;
    if (animate) {
      trans = triangles.transition();
    }

    //TODO: remove one transition
    trans.transition().attr({
      'transform'(d, i) {
        return 'translate(' + d.xStart + ',0)';
      }
    });

  }

  function updateConnectors() {
    const triangleLength = connectorPlot.triangles.height;
    const positiveStrand = allData.gene.strand === '+';


    const startField = axis.ascending ? 'start' : 'end';
    const endField = axis.ascending ? 'end' : 'start';


    /* -- update lower connectors - D3 circle -- */
    const lowerConnector = connectorPlot.lowerConnectors.g.selectAll('.con').data(triangleData);
    lowerConnector.exit().remove();

    lowerConnector.enter().append('polyline').attr({
      'class': connectorPlot.lowerConnectors.prefix + ' con'
    });

    lowerConnector.transition().attr({
      'points'(d, i) {
        return [
          d.anchor, 0,
          d.anchor, triangleLength / 2,
          axis.genePosToScreenPos(d.loc), connectorPlot.lowerConnectors.height
        ];
      }
    });

    // draw direct neighbors
    const directNeighbors = connectorPlot.upperConnectors.g.selectAll('.neighborCon').data(jxnGroups.filter(function (d) {
      return d.directNeighbor;
    }));
    directNeighbors.exit().remove();

    directNeighbors.enter().append('polygon').attr({
      'class': 'neighborCon areaCon'
    }).on({
      'mouseover'(d) {
        event.fire('highlightJxn', (d.jxns[0].start + ':' + d.jxns[0].end), true);
      },
      'mouseout'(d) {
        event.fire('highlightJxn', (d.jxns[0].start + ':' + d.jxns[0].end), false);
      }
    });

    let h = connectorPlot.upperConnectors.height;
    directNeighbors.transition().attr({
      points(d) {
        const jxn = d.jxns[0];
        return [
          jxn.x, 0,
          jxn.x + jxn.w, 0,
          jxn[endField + 'Triangle'].anchor, h,
          jxn[startField + 'Triangle'].anchor, h
        ];

      }
    });
    // isoformselection
    directNeighbors.classed('hiddenCon', function (d) {
      return (isSelectedIsoForm && !d.jxns[0].selectedIsoform) ? true : null;
    });


    const allDonors = _.flatten(jxnGroups.filter(function (d) {
      return !d.directNeighbor;
    }).map(function (d) {
      return d.jxns.map(function (jxn) {
        return {endX: jxn.x + jxn.w, jxns: [jxn], key: (jxn.start + ':' + jxn.end)};
      });
    }));


    // -- draw donor connectors
    const donorConnectors = connectorPlot.upperConnectors.g.selectAll('.donorCon')
      .data(allDonors, function (d) {
        return d.key;
      }); //jxnGroups.filter(function(d){return !d.directNeighbor;}) TODO: decide for a strategy: allgroup or single select
    donorConnectors.exit().remove();

    donorConnectors.enter().append('polygon').attr({
      'class': 'donorCon areaCon'
    }).on({
      'mouseover'(d) {
        event.fire('highlightJxn', d.key, true);
      },
      'mouseout'(d) {
        event.fire('highlightJxn', d.key, false);
      }
    });


    h = connectorPlot.upperConnectors.height;
    const connector = (positiveStrand/*==axis.ascending*/) ? 'startTriangle' : 'endTriangle';
    const antiConnector = (positiveStrand/*==axis.ascending*/) ? 'endTriangle' : 'startTriangle';

    donorConnectors.transition().attr({
      points(d) {
        const jxn = d.jxns[0];
        return [
          jxn.x, 0,
          d.endX, 0,
          jxn[connector].anchor, h
        ];

      }
    });

    donorConnectors.classed('hiddenCon', function (d) {
      return (isSelectedIsoForm && !d.jxns[0].selectedIsoform) ? true : null;
    });


    // -- Retrieve Connector Lines
    const allConLines = _.flatten(jxnGroups.filter(function (d) {
      return !d.directNeighbor;
    }).map(function (d) {
      return d.jxns.map(function (jxn) {
        return {
          startX: (jxn.x + jxn.w / 2),
          endX: jxn[antiConnector].anchor,
          key: (jxn.start + ':' + jxn.end),
          jxn
        };
      });
    }));

    //--- plot connector lines
    const accConnectors = connectorPlot.upperConnectors.g.selectAll('.accCon').data(allConLines);
    accConnectors.exit().remove();

    accConnectors.enter().append('line').attr({
      'class': 'accCon lineCon'
    });

    accConnectors.transition().attr({
      x1(d) {
        return d.startX;
      },
      x2(d) {
        return d.endX;
      },
      y1: 0,
      y2: h
    });

    //isoformselction
    accConnectors.classed('hiddenCon', function (d) {
      return (isSelectedIsoForm && !d.jxn.selectedIsoform) ? true : null;
    });


  }

  function updateAbundanceView() {
    const allJxnArray = Object.keys(allJxns).map(function (key) {
      return {
        key, jxn: allJxns[key]
      };
    });


    // --  PANELS
    const panels = abundancePlot.g.selectAll('.' + abundancePlot.panels.prefix)
      .data(allJxnArray, function (d) {
        return d.key;
      });
    panels.exit().remove();

    // --- Enter:
    const panelsEnter = panels.enter().append('g').attr({
      class: abundancePlot.panels.prefix + ' panel'
    });
    panelsEnter.append('rect').attr({
      class: 'panelBG',
      height: abundancePlot.height
    }).on({
      'click'(d) {
        if (d.jxn.state === 'std') {
          d.jxn.state = guiHead.defaultOption;
        } else {
          d.jxn.state = 'std';
        }
        updateVis();
      },
      'mouseover'(d) {
        event.fire('highlightJxn', d.key, true);

        //d3.select(this).style({stroke:'grey'});
      },
      'mouseout'(d) {
        event.fire('highlightJxn', d.key, false);
        //d3.select(this).style({stroke:'none'});
      }
    });
    panelsEnter.append('rect').attr({
      class: 'panelIndicator',
      height: 5,
      x: 3,
      y: abundancePlot.height - 6
    });


    // --- Updates:
    panels.transition().attr({
      'transform'(d) {
        return 'translate(' + d.jxn.x + ',' + 0 + ')';
      }
    });
    const panelBG = panels.select('.panelBG');
    panelBG.transition().attr({
      width(d) {
        return d.jxn.w;
      }
    });
    panelBG.classed('scatter', function (d) {
      return (d.jxn.state === 'scatter' || d.jxn.state === 'groupX') ? true : null;
    });

    panels.select('.panelIndicator').transition().attr({
      width (d) {
        if (d.jxn.state === 'mini') {
          return 1;
        }
        return d.jxn.w - 6;
      }
    });


    const allSampleLength = Object.keys(allData.samples).length;

    /**
     * Update Cycle for the abundance/weight dots per panel
     */
    function updateDots() {

      // precalculations for state 'groupX':
      const gLength = groupings.length;
      const groupingOffset = 12;
      const groupInc = (abundancePlot.panels.groupX.currentWidth - groupingOffset) / (gLength + 1);


      const alldots = panels.selectAll('.dots').data(function (d) {
        if (d.jxn.state === 'std') {
          const randomizer = helper.getPseudoRandom();
          return d.jxn.weights.map(function (w) {
            return {x: (d.jxn.w * 3 / 8 + randomizer() * d.jxn.w / 4), w};
          });

        } else if (d.jxn.state === 'scatter') {
          const res = [];
          if (!sampleOrder.valid) {
            return d.jxn.weights.map(function (w, i) {
              return {
                x: 6 + (i / allSampleLength * (abundancePlot.panels.scatter.currentWidth - 12)),
                w
              };
            });
          } else {
            return d.jxn.weights.map(function (w, i) {
              return {
                x: 6 + (sampleOrder.order.indexOf(w.sample) / allSampleLength * (abundancePlot.panels.scatter.currentWidth - 12)),
                w
              };
            });
          }
        } else if (d.jxn.state === 'mini') {
          return d.jxn.weights.map(function (w) {
            return {x: abundancePlot.panels.mini.currentWidth / 2, w};
          });
        } else if (d.jxn.state === 'groupX') {

          if (groupings.length > 0) {

            const mapIDtoI = {};
            groupings.forEach(function (group, i) {
              group.samples.forEach(function (sample) {
                mapIDtoI[sample] = i;
              });
            });


            return d.jxn.weights.map(function (w) {
              let x = mapIDtoI[w.sample];
              if (x == null) {
                x = groupings.length;
              }
              return {
                x: (groupingOffset + (x + .5) * groupInc + abundancePlot.panels.std.boxPlotWidth / 2),
                w
              };
            });
          } else {
            return d.jxn.weights.map(function (w) {
              return {x: (d.jxn.w / 2), w};
            });
          }

        }

      }, function (d) {
        return d.w.sample;
      });

      alldots.exit().remove();

      alldots.enter().append('circle').attr({
        class: 'dots',
        r: 2
      }).on({
        'mouseover'(d) {
          event.fire('sampleHighlight', d.w.sample, true);
          event.fire('highlightJxn', d3.select(this.parentNode).data()[0].key, true);
        },
        'mouseout'(d) {
          event.fire('sampleHighlight', d.w.sample, false);
          event.fire('highlightJxn', d3.select(this.parentNode).data()[0].key, false);
        },
        'click'(d) {
          if (d3.select(this).classed('selected')) {
            //deselect
            d3.select(this).classed('selected', null);
            event.fire('sampleSelect', d.w.sample, false);
          } else {
            //select
            d3.select(this).classed('selected', true);
            event.fire('sampleSelect', d.w.sample, true);
          }

        }

      }).append('title').text(function (d) {
        return d.w.sample + '\n' + d.w.weight;
      });

      alldots.transition().attr({
        cx(d) {
          return d.x;
        },
        cy(d) {
          return weightScale(d.w.weight);
        }
      });


    }

    updateDots();


    // --- SORT DIVIDER to indicate what is valid sorting and what is random

    const sortDevider = panels.selectAll('.sortDivider')
      .data(function (d) {
          return (sampleOrder.valid && d.jxn.state === 'scatter') ?
            [Math.ceil(6 + ((sampleOrder.definedSize - 1) / allSampleLength * (abundancePlot.panels.scatter.currentWidth - 12)))]
            : [];
        }
      );
    sortDevider.exit().remove();
    sortDevider.enter().append('line').attr({
      class: 'sortDivider',
      x1(d) {
        return 0;
      },
      x2(d) {
        return 0;
      },
      y1: weightScale.range()[0],
      y2: weightScale.range()[1]
    });
    sortDevider.transition().attr({
      x1(d) {
        return d;
      },
      x2(d) {
        return d;
      }
    });


    function updateBoxPlots() {

      //TODO: copied from isoforms.. maybe externalizing ?!

      const height = abundancePlot.panels.std.boxPlotWidth;
      const offsetStd = Math.max(abundancePlot.panels.std.boxPlotOffset, Math.floor((abundancePlot.panels.std.currentWidth - height) / 2));

      const gLength = groupings.length;
      const groupingOffset = 12;
      const groupInc = (abundancePlot.panels.groupX.currentWidth - groupingOffset) / (gLength + 1);

      const boxPlots = panels.selectAll('.boxplot').data(function (d) {
        const res = [];
        if (d.jxn.weights.length > 3 && !(d.jxn.state === 'mini')) {
          if (d.jxn.state === 'groupX') {

            res.push({
              boxPlot: d.jxn.boxPlotData,
              state: d.jxn.state,
              x: abundancePlot.panels.groupX.boxPlotOffset
            });

            groupingsMeta.forEach(function (gMeta, gmIndex) {
              const gm = gMeta[d.key];
              if (gm != null) {
                res.push({
                  boxPlot: gm.boxplot,
                  state: d.jxn.state,
                  x: (groupingOffset + (gmIndex + .5) * groupInc)
                });
              }


            });


            // tODO HEREE
          } else {


            if (d.jxn.state === 'scatter') {
              res.push({
                boxPlot: d.jxn.boxPlotData,
                state: d.jxn.state,
                x: abundancePlot.panels.scatter.boxPlotOffset
              });
            } else {
              res.push({
                boxPlot: d.jxn.boxPlotData,
                state: d.jxn.state,
                x: offsetStd
              });
            }


          }


        }


        return res;

      });
      boxPlots.exit().remove();

      const scaleXScatter = d3.scale.linear().domain(weightScale.domain()).rangeRound(weightScale.range());


      const boxPlotGroup = boxPlots.enter().append('g')
        .attr({
            'class': 'boxplot',
            'transform': 'translate(' + offsetStd + ',' + 0 + ')'
          }
        );
      //boxPlotGroup.attr({'transform':'rotate(90)'});
      boxPlotGroup.selectAll('.vticks').data(function (d) {

        return [
          d.boxPlot.whiskerDown,
          d.boxPlot.Q[1],
          d.boxPlot.Q[2],
          d.boxPlot.Q[3],
          d.boxPlot.whiskerTop];
      }).enter().append('line').attr({
        class: 'vticks',
        y1(d) {
          return scaleXScatter(d);
        },
        y2: scaleXScatter,
        x1: 0,
        x2: height
      });

      boxPlotGroup.selectAll('.hticks').data(function (d) {
        return [
          [0, d.boxPlot.Q[1], d.boxPlot.Q[3]],
          [height, d.boxPlot.Q[1], d.boxPlot.Q[3]]
        ];
      }).enter().append('line').attr({
        class: 'hticks',
        y1(d) {
          return scaleXScatter(d[1]);
        },
        y2(d) {
          return scaleXScatter(d[2]);
        },
        x1(d) {
          return d[0];
        },
        x2(d) {
          return d[0];
        }
      });

      boxPlotGroup.selectAll('.wticks').data(function (d) {
        return [
          [d.boxPlot.whiskerDown, d.boxPlot.Q[1]],
          [d.boxPlot.Q[3], d.boxPlot.whiskerTop]
        ];
      }).enter().append('line').attr({
        class: 'wticks',
        y1(d) {
          return scaleXScatter(d[0]);
        },
        y2(d) {
          return scaleXScatter(d[1]);
        },
        x1: Math.round(height / 2),
        x2: Math.round(height / 2)
      });


      //UPDATE POSITION:
      boxPlots.transition().attr({
        'transform'(d) {
          return 'translate(' + d.x + ',' + 0 + ')';
        }
      });


    }

    updateBoxPlots();


    /**
     * ===== update the menu decoration for each panel ===
     *
     */
    function updateDeco() {
      // --- Decoration gets in here


      const decoLeft = panels.selectAll('.decoration.left').data(function (d) {
        if (d.jxn.state === 'scatter' || d.jxn.state === 'groupX') {
          return [
            {
              icon: '\uf012',
              callOnClick() {
                sortByJxn(d.key);
              },
              description: 'sort by weight',
              d,
              isSelected: (d.key === sampleOrder.sortByKey && sampleOrder.valid)
            },
            {
              icon: '\uf24d', callOnClick() {
              switchGroupState(d.key);
            }, description: 'compare groups', d, isSelected: (d.jxn.state === 'groupX')
            },
            //{
            //  icon: '\uf259', callOnClick: function () {
            //}, description: 'Live long and prosper.', d: d, isSelected: false
            //}
          ];
        } else {
          return [];
        }
      });
      decoLeft.exit().remove();
      decoLeft.enter().append('text').attr({
        class: 'decoration left',
        'transform'(d, i) {
          return 'translate(' + (i * 15 + 2) + ',' + 15 + ')';
        }
      })
        .text(function (d) {
          return d.icon;
        })
        .on({
          'mouseover'(d) {
            event.fire('highlightJxn', d3.select(this.parentNode).data()[0].key, true);
          },
          'mouseout'(d) {
            event.fire('highlightJxn', d3.select(this.parentNode).data()[0].key, false);
          },
          'click'(d) {
            d.callOnClick();
          }

        })
        .append('title').text(function (d) {
        return d.description;
      });
      decoLeft.classed('selected', function (d) {
        return d.isSelected ? true : null;
      });


      // right indicators
      const decoRight = panels.selectAll('.decoration.right').data(function (d) {
        if (d.jxn.state === 'scatter' || d.jxn.state === 'std' || d.jxn.state === 'groupX') {
          if (d.jxn.selectedIsoform) {
            return [{
              icon: '\uf02e',
              callOnClick() {
                // dummy
              },
              description: 'in selected Isoform',
              class: 'inIsoformIndicator',
              d,
              isSelected: false
            }];
          }
        }

        return [];

      });
      decoRight.exit().remove();

      decoRight.enter().append('text').attr({
        class(d) {
          return 'decoration right ' + d.class;
        },
        'transform'(d, i) {
          const w = d.d.jxn.state === 'std' ? abundancePlot.panels.std.currentWidth : abundancePlot.panels.scatter.currentWidth;
          return 'translate(' + (w - (i * 15 + 2)) + ',' + 15 + ')';
        }
      })
        .text(function (d) {
          return d.icon;
        })
        .on({
          'mouseover'(d) {
            event.fire('highlightJxn', d3.select(this.parentNode).data()[0].key, true);
          },
          'mouseout'(d) {
            event.fire('highlightJxn', d3.select(this.parentNode).data()[0].key, false);
          },
          'click'(d) {
            d.callOnClick();
          }

        })
        .append('title').text(function (d) {
        return d.description;
      });

      decoRight.transition().attr({
        'transform'(d, i) {
          const w = d.d.jxn.state === 'std' ? abundancePlot.panels.std.currentWidth : abundancePlot.panels.scatter.currentWidth;
          return 'translate(' + (w - 10 - 2 - (i * 15)) + ',' + 15 + ')';
        }
      });
      decoRight.classed('selected', function (d) {
        return d.isSelected ? true : null;
      });


    }

    updateDeco();


    function sortByJxn(key) {

      const allKeys = Object.keys(allData.samples);

      if (key in allJxns) {

        const sortedWeights =
          _.map(
            _.sortBy(
              allJxns[key].weights
                .filter(function (d) {
                  return d.weight > 0;
                })
              , 'weight')
            , 'sample'
          );

        const allNull = _.difference(allKeys, sortedWeights);


        sampleOrder.definedSize = sortedWeights.length;
        sampleOrder.order = sortedWeights.concat(allNull);
        sampleOrder.sortByKey = key;
        sampleOrder.valid = true;

        updateAbundanceView();//TODO: can be done more subtle / only update dots!
      }


    }

    function switchGroupState(key) {


      const jxnList = allJxnArray.filter(function (d) {
        return d.key === key;
      });
      if (jxnList.length === 1) {
        const jxn = jxnList[0];

        if (jxn.jxn.state !== 'groupX') {
          jxn.jxn.state = 'groupX';
        } else {
          jxn.jxn.state = 'scatter';
        }
      }


      computeAbundanceLayout();
      updateAbundanceView();

    }


    function updateLegend() {
      const dotAxisDef = d3.svg.axis()
        .scale(weightScale)
        .orient('right');

      const dotAxis = abundancePlot.g.selectAll('.axis').data([1]);
      dotAxis.exit().remove();

      // --- adding Element to class dotAxis
      dotAxis.enter().append('g').attr({
        'class': 'axis'
      }).call(dotAxisDef);

      // --- changing nodes for dotAxis
      dotAxis.transition()
        .attr({
          'transform': 'translate(' + (endOfPanels + 5) + ',0)'
        });

    }

    updateLegend();


  }


  /*
   ================= LAYOUT METHODS =====================
   */


  function computeFlagPositions() {

    const triangleLength = connectorPlot.triangles.height;
    const sitePadding = triangleLength / 3;

    const positiveStrand = allData.gene.strand === '+';

    // compute desired positions
    triangleData.forEach(function (triangle, i) {
      const axisLoc = axis.genePosToScreenPos(triangle.loc);

      if (isLeftArrow(triangle.type, positiveStrand)) {
        triangle.xStart = triangle.xStartDesired = axisLoc - triangleLength;
        triangle.xEnd = triangle.xEndDesired = axisLoc;
      } else { // right arrow:
        triangle.xStart = triangle.xStartDesired = axisLoc;
        triangle.xEnd = triangle.xEndDesired = axisLoc + triangleLength;
      }

    });

    const bucketsCopy = triangleData.slice();

    if (!axis.ascending) {
      bucketsCopy.reverse();
    }
    // important to initialize this, as we start from i = 1
    bucketsCopy[0].firstGroupBucket = 0;

    for (let i = 1; i < bucketsCopy.length; ++i) {
      bucketsCopy[i].firstGroupBucket = i;
      let ind = i;
      let shift = -1;
      while (shift < 0 && ind > 0 && (bucketsCopy[ind].xStart < bucketsCopy[ind - 1].xEnd + sitePadding)) {
        const firstInd = bucketsCopy[ind - 1].firstGroupBucket;
        const overlap = bucketsCopy[ind - 1].xEnd + sitePadding - bucketsCopy[ind].xStart;
        for (let j = ind; j <= i; ++j) {
          bucketsCopy[j].xStart += overlap;
          bucketsCopy[j].xEnd += overlap;
          bucketsCopy[j].firstGroupBucket = firstInd;
        }
        const leftGap = bucketsCopy[firstInd].xStartDesired - bucketsCopy[firstInd].xStart;
        const rightGap = bucketsCopy[i].xStart - bucketsCopy[i].xStartDesired;
        shift = (leftGap - rightGap) / 2;
        shift = Math.min(shift, axis.getWidth() - bucketsCopy[i].xStart);
        shift = Math.max(shift, -bucketsCopy[firstInd].xStart);
        for (let j = firstInd; j <= i; ++j) {
          bucketsCopy[j].xStart += shift;
          bucketsCopy[j].xEnd += shift;
        }
        ind = firstInd;
      }
    }

    triangleData.forEach(function (b) {
      b.xStart = Math.floor(b.xStart);
      b.xEnd = Math.floor(b.xEnd);
      b.anchor = isLeftArrow(b.type, positiveStrand) ? b.xEnd : b.xStart;
    });
  }

  function computeAbundanceLayout() {

    const gapSize = abundancePlot.panels.panelGapsize;
    const w = axis.getWidth();
    const positiveStrand = allData.gene.strand === '+';
    const allJXNsorted = Object.keys(allJxns).map(function (d) {
      return allJxns[d];
    });


    const elementWidth = abundancePlot.panels.std.minWidth;//Math.floor(Math.max(w / (1.5*allJXNsorted.length), abundancePlot.panels.std.minWidth));
    abundancePlot.panels.std.currentWidth = elementWidth;


    // start the layout here:
    let groupBy, groupBySecond;
    if (positiveStrand) {
      groupBy = 'start';
      groupBySecond = 'end';
    } else {
      groupBy = 'end';
      groupBySecond = 'start';
    }

    // -- first sort the elements by start or end
    allJXNsorted.sort(function (a, b) {
        let res = d3.ascending(a[groupBy], b[groupBy]);
        if (res === 0) {
          res = d3.ascending(a[groupBySecond], b[groupBySecond]);
        }
        if (res === 0) {
          res = d3.ascending(a.weight, b.weight);
        }
        return res;
      }
    );


    if (!axis.ascending) {
      allJXNsorted.reverse();
    }
    let currentGroupCriterion = -1;
    let lastAddedJxn = null;
    let currentXPos = 0;
    jxnGroups = []; // clean the list
    let currentGroup = [];


    allJXNsorted.forEach(function (jxn) {

      if (currentGroupCriterion === -1 || currentGroupCriterion === jxn[groupBy]) {
        jxn.x = currentXPos;
        currentGroup.push(jxn);
      } else {
        jxnGroups.push({
          endX: currentXPos,
          directNeighbor: (lastAddedJxn.directNeighbor && currentGroup.length === 1),
          jxns: currentGroup
        });
        currentXPos += gapSize;
        jxn.x = currentXPos;
        currentGroup = [jxn];
      }

      if (jxn.state === 'std') {
        jxn.w = elementWidth;
      } else if (jxn.state === 'scatter') {
        jxn.w = abundancePlot.panels.scatter.currentWidth;
      } else if (jxn.state === 'mini') {
        jxn.w = abundancePlot.panels.mini.currentWidth;
      } else if (jxn.state === 'groupX') {
        jxn.w = abundancePlot.panels.groupX.currentWidth;
      }

      currentXPos += jxn.w;
      currentGroupCriterion = jxn[groupBy];

      lastAddedJxn = jxn;

    });

    // set start parameters// dont forget the last one :)
    jxnGroups.push({
      endX: currentXPos,
      directNeighbor: (lastAddedJxn.directNeighbor && currentGroup.length === 1),
      jxns: currentGroup
    });

    //TODO: find better solution for that
    svg.transition().attr('width', Math.max(currentXPos + 300, axis.getWidth()));

    endOfPanels = currentXPos;

  }

  /*
   ================= HELPERMETHODS =====================
   */

  /**
   * a centralized method to decide if a flag is pointing left based on conditions
   * @param type - the site type (donor or receptor)
   * @param positiveStrand - boolean if on a positive strand
   * @returns {boolean}
   */
  function isLeftArrow(type, positiveStrand) {
    return type === ((positiveStrand === axis.ascending ) ? 'donor' : 'receptor');
  }

  /*
   ================= GENERAL METHODS =====================
   */

  //const exploreArea = svgMain.append('g').attr('transform', 'translate(0, 5)').attr('id','exploreArea');
  //jxnArea = exploreArea.append('g').attr('id', 'jxnArea');


  function updateVis() {

    updateHeatmap();

    computeFlagPositions();
    updateFlags();

    computeAbundanceLayout();
    updateAbundanceView();
    //
    updateConnectors();
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

      const positiveStrand = (sampleData.gene.strand === '+');

      allExons = [];
      _.values(sampleData.gene.isoforms).forEach(function (isoform: any) {
        const exonNames = isoform.exonNames.split('_');
        const exonEnds = isoform.exonEnds.split('_');
        const exonStarts = isoform.exonStarts.split('_');


        if ((exonNames.length === exonEnds.length) && (exonNames.length === exonStarts.length)) {

          exonNames.forEach(function (exon, index) {
            allExons.push({
              id: exon,
              end: +exonEnds[index],
              start: +exonStarts[index],
              isoformID: isoform.isoformID
            });
          });
        }

      });


      triangleData = [];
      //const triangleDataSet = {}
      let allJxnPos = [];
      let exonCounter = 0;
      weightScale.domain([0, 1]);

      allJxns = {};

      sampleData.measures.jxns.forEach(function (sample) {
        _.keys(sample.data).forEach(function (jxnKey) {
          const startEnd = jxnKey.split(':').map(function (d) {
            return +d;
          }); //returns start and end

          // take care of the triangle order
          triangleData.push({
            'type': positiveStrand ? 'donor' : 'receptor',
            'loc': startEnd[0],
            'xStart': 0,
            'xEnd': 0,
            'anchor': 0,
            'xStartDesired': 0,
            'xEndDesired': 0,
            'firstGroupBucket': exonCounter,
            'lastGroupBucket': exonCounter
          });

          triangleData.push({
            'type': positiveStrand ? 'receptor' : 'donor',
            'loc': startEnd[1],
            'xStart': 0,
            'xEnd': 0,
            'anchor': 0,
            'xStartDesired': 0,
            'xEndDesired': 0,
            'firstGroupBucket': 0
          });

          // create 'set' of all JXN positions
          allJxnPos.push(startEnd[0]);
          allJxnPos.push(startEnd[1]);

          // set max
          const jxnWeight = sample.data[jxnKey];
          if (weightScale.domain()[1] < jxnWeight) {
            weightScale.domain([0, jxnWeight]);
          }

          const currentPos = allJxns[jxnKey];
          if (currentPos) {
            currentPos.weights.push({weight: jxnWeight, sample: sample.sample});
          } else {
            allJxns[jxnKey] = {
              start: startEnd[0],
              end: startEnd[1],
              weights: [{weight: jxnWeight, sample: sample.sample}],
              state: 'std', // or points, groups
              directNeighbor: false, // for now -- see later code
              startTriangle: null, // later
              endTriangle: null, // later
              boxPlotData: null,
              selectedIsoform: false
            };
          }

          exonCounter++;

        });

      });

      // SORT and REMOVE DUPLICATES
      triangleData.sort(function (a, b) {
        return a.loc < b.loc ? -1 : a.loc === b.loc ? 0 : 1;
      });
      triangleData = _.uniqBy(triangleData, function (item) {
        return item.loc + item.type;
      });


      // SORT and REMOVE DUPLICATES
      allJxnPos.sort();
      allJxnPos = _.uniq(allJxnPos); //TODO no idea what: `, true);` should do

      const allSamplesCount = Object.keys(allData.samples).length;

      // add some global knowledge to each junction
      _.keys(allJxns).map(function (jxnKey) {
        const jxn = allJxns[jxnKey];//

        jxn.directNeighbor = jxn.end === allJxnPos[allJxnPos.indexOf(jxn.start) + 1]; //  is it the special case ?
        jxn.startTriangle = triangleData[allJxnPos.indexOf(jxn.start)];
        jxn.endTriangle = triangleData[allJxnPos.indexOf(jxn.end)];


        // number of zero values:
        const zerocount = allSamplesCount - jxn.weights.length;

        if (zerocount > 0) { // add zerocount times 0 at the end
          jxn.boxPlotData = helper.computeBoxPlot(
            _.map(jxn.weights, 'weight')
              .concat(Array.apply(null, Array(zerocount)).map(Number.prototype.valueOf, 0)));

        } else {
          jxn.boxPlotData = helper.computeBoxPlot(_.map(jxn.weights, 'weight'));
        }
      });

      //cleanup
      sampleOrder.valid = false;

      //console.timeEnd('dataLoading');

      //console.time('updatevis');
      updateVis();
      //console.timeEnd('updatevis');
    });


  }


  // start the whole thing:
  initView();

  return head.node();
};




