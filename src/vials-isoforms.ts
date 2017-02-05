/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 3/2/15.
 */

import * as event from 'phovea_core/src/event';
import * as d3 from 'd3';
import * as gui from './vials-gui';
import * as _ from 'lodash';

/**
 * a simple template class of a visualization. Up to now there is no additional logic required.
 * @param data
 * @param parent
 * @constructor
 */
export function IsoFormVis(data, parent) {
  this.data = data;
  this.parent = parent;
  this.node = this.build(d3.select(parent));

}


/**
 * factory method of this module
 * @param data the data to show
 * @param parent the parent dom element to append
 * @returns {IsoFormVis} the visualization
 */
export function create(data, parent) {
  return new IsoFormVis(data, parent);
}


const margin = {top: 35, right: 10, bottom: 20, left: 0};
let width = 900 - margin.left - margin.right,
  height = 450 - margin.top - margin.bottom;

let currentlySelectedIsoform = null;


const isoformPlot = {
  scatterWidth: 200,
  extraLabel: 100
};


const sortByMean = function (a, b) {
  return b.mean - a.mean;
};
let currentSortFunction = sortByMean;


IsoFormVis.prototype.build = function ($parent) {
  const that = this;
  that.axis = that.data.genomeAxis;
  that.dotsJittered = true;

  // sytem wide consts

  let isoformList = [];
  let minMaxValues = [];
  let metaInfo: any = {};


  const head = $parent.append('div').attr({
    'class': 'gv'
  });


  let mergedRanges = [];

  const svg = head.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style({
      //'top':'10px',
      'left': '20px',
      //'top': '10px',
      'position': 'relative'

    });


  //TODO: externalize into a function maybe a html version ?
  /*
   *
   * Label for View starts here..
   * */
  const svgLabel = svg.append('g');
  const svgLabelBg = svgLabel.append('rect').attr({
    'class': 'viewLabelBg',
    'width': height + margin.top,
    'rx': 10,
    'ry': 10
  });
  const svgLabelText = svgLabel.append('text').text('isoforms').attr({
    'class': 'viewLabelText',
  });
  const bbMainLabel = {height: 15, width: svgLabelText.node().getBBox().width}; //svgLabelText.node().getBBox();
  svgLabelBg.attr({
    'height': bbMainLabel.height + 4
  });
  function drawViewLabel(height) {
    svgLabelBg.attr({
      'width': height + margin.top
    });
    svgLabelText.attr('transform', 'translate(' +
      (height + margin.top - bbMainLabel.width) / 2
      + ',' + (bbMainLabel.height - 3) + ')');
    svgLabel.attr('transform', 'translate(0,' + (height + margin.top) + ')' +
      'rotate(-90)');
  }

  drawViewLabel(height);

  const viewLabelMargin = 40;
  const svgMain = svg.append('g').attr({
    'class': 'isoMain',
    'transform': 'translate(' + viewLabelMargin + ',0)'
  });

  const gExonRanges = svgMain.append('g').attr({
    'class': 'exonRanges',
    'transform': 'translate(' + margin.left + ',' + margin.top + ')'
  });

  const gIso = svgMain.append('g').attr({
    'class': 'isoforms',
    'transform': 'translate(' + margin.left + ',' + margin.top + ')'
  });

  const gHighlight = svgMain.append('g').attr({
    'class': 'highlights',
    'transform': 'translate(' + margin.left + ',' + margin.top + ')'
  });

  // create crosshair
  const crosshair = svgMain.append('line').attr({
    'class': 'crosshair',
    'x1': 0,
    'y1': 0,
    'x2': 0,
    'y2': height
  }).style({
    'stroke-width': '1',
    'stroke': 'black',
    'pointer-events': 'none'
  });

  let currentX = 0;
  svg.on('mousemove', function () {
    currentX = d3.mouse(this)[0];
    event.fire('crosshair', currentX - viewLabelMargin);

  });

  function updateCrosshair(event, x) {
    crosshair.attr({
      'x1': x,
      'x2': x
    }).style({
      opacity() {
        return (x < 0 || x > that.axis.getWidth()) ? 0 : 1;
      }
    });


  }

  event.on('crosshair', updateCrosshair);


  let sampleSelectorMap: any = {}; // will be updated at updateData()..

  function cleanSelectors(sel) {
    return sampleSelectorMap[sel];
  }


  const exonHeight = 15;
  const groupScale = function (x) {
    return x * (exonHeight + 3);
  };

  function drawIsoforms() {
    if (isoformList.length < 1) {
      return;
    }

    //{'isoform_unit': sampleData.measures['isoform_unit']}
    const scatterWidth = isoformPlot.scatterWidth;
    const extraLabel = isoformPlot.extraLabel;
    const axisOffset = that.axis.getWidth() + 10;
    const noIsoforms = isoformList.length;
    const scaleYSpace = 25;
    const menuOffset = -34;
    const menuHeight = 18;


    width = axisOffset + 2 * scatterWidth + extraLabel;
    height = groupScale(noIsoforms) + scaleYSpace;
    svg.attr('height', height + margin.top + margin.bottom)
      .attr('width', width + margin.left + margin.right);

    drawViewLabel(height);

    const scaleXScatter = d3.scale.linear().domain([0, minMaxValues[1]]).range([axisOffset, axisOffset + scatterWidth]);


    const menuDivideLine = gIso.selectAll('.menuDivideLine').data([1]);
    menuDivideLine.exit().remove();

    // --- adding Element to class menuDivideLine
    const menuDivideLineEnter = menuDivideLine.enter().append('line').attr({
      'class': 'menuDivideLine'
    });

    // --- changing nodes for menuDivideLine
    menuDivideLine.attr({
      x1: 0,
      x2: width,
      y1: (menuOffset + menuHeight + 8),
      y2: (menuOffset + menuHeight + 8)
    });


    /*
     * ========================
     * Manage .isoform - Groups
     * =========================
     * */
    const isoform = gIso.selectAll('.isoform')
      .data(isoformList, function (d) {
        return d.id;
      });
    isoform.exit().remove();

    // --- adding Element to class isoform
    const isoformEnter = isoform.enter().append('g').attr({
      'class': 'isoform'
    });

    // --- changing nodes for isoform
    isoform.sort(currentSortFunction).attr({
      transform(d, i) {
        return 'translate(' + 0 + ',' + groupScale(i) + ')';
      }
    }).on({
      'mouseover'() {

        d3.select(this).select('.background rect').classed('selected', true);
      },
      'mouseout'() {

        d3.select(this).select('.background rect').classed('selected', false);
      }
    }).append('title').text(function (d) {
      return d.id;
    });


    /*
     * reactive background
     * */
    const bg = isoformEnter.append('g').attr('class', 'background');
    bg.append('rect').attr({
      width,
      height: exonHeight
    }).on({
      //'mouseover': function(){d3.select(this).classed('selected', true);},
      //'mouseout': function(){d3.select(this).classed('selected', false);},
      'click'(d, i) {

        const el = d3.select(this);
        if (el.classed('fixed')) {
          el.classed('fixed', false);
          currentlySelectedIsoform = null;
          event.fire('isoFormSelect', {isoform: d.id, index: -1});
        } else {
          el.classed('fixed', true);
          if (currentlySelectedIsoform) {
            currentlySelectedIsoform.classed('fixed', false);
          }
          currentlySelectedIsoform = el;
          event.fire('isoFormSelect', {isoform: d.id, index: i});
        }

      }
    });


    isoform.select('.background rect').attr({
      width: axisOffset + scatterWidth//width+margin.right-2
    });

    /*
     * ========================
     * Draw boxplots
     * =========================
     * */

    //const boxPlotGroup = bg.append('g').attr('class', 'boxplot');


    const boxPlotGroup = isoform.select('.background').selectAll('.boxplot').data(function (d) {
      return [d];
    });
    boxPlotGroup.exit().remove();

    // --- adding Element to class boxplot
    const boxplotEnter = boxPlotGroup.enter().append('g').attr({
      'class': 'boxplot'
    });


    const bpVTicks = boxPlotGroup.selectAll('.vticks').data(function (d) {
      return [
        d.boxPlot.whiskerDown,
        d.boxPlot.Q[1],
        d.boxPlot.Q[2],
        d.boxPlot.Q[3],
        d.boxPlot.whiskerTop];
    });
    bpVTicks.enter().append('line').attr({
      'class': 'vticks'
    });
    bpVTicks.attr({
      x1(d) {
        return scaleXScatter(d);
      },
      x2: scaleXScatter,
      y1: 1,
      y2: exonHeight - 2
    });


    const bpHTicks = boxPlotGroup.selectAll('.hticks').data(function (d) {
      return [
        [1, d.boxPlot.Q[1], d.boxPlot.Q[3]],
        [exonHeight - 2, d.boxPlot.Q[1], d.boxPlot.Q[3]]
      ];
    });
    bpHTicks.enter().append('line').attr({
      'class': 'hticks'
    });
    bpHTicks.attr({
      x1(d) {
        return scaleXScatter(d[1]);
      },
      x2(d) {
        return scaleXScatter(d[2]);
      },
      y1(d) {
        return d[0];
      },
      y2(d) {
        return d[0];
      }
    });


    const bpWTicks = boxPlotGroup.selectAll('.wticks').data(function (d) {
      return [
        [d.boxPlot.whiskerDown, d.boxPlot.Q[1]],
        [d.boxPlot.Q[3], d.boxPlot.whiskerTop]
      ];
    });
    bpWTicks.enter().append('line').attr({
      'class': 'wticks'
    });
    bpWTicks.attr({
      x1(d) {

        return scaleXScatter(d[0]);
      },
      x2(d) {
        return scaleXScatter(d[1]);
      },
      y1: exonHeight / 2,
      y2: exonHeight / 2
    });


    isoformEnter.append('g').attr('class', 'foreground');
    const highlight = isoformEnter.append('g').attr('class', 'highlight');
    //highlight.append('rect').attr({
    //  'class':'highlightBG',
    //  x:axisOffset,
    //  y:0,
    //  width:scatterWidth,
    //  height:exonHeight
    //}).style({
    //  fill: 'white',
    //  opacity:0
    //})


    /*
     * ========================
     * Draw exon merging
     * =========================
     * */


    //isoformEnter.append('g').attr({
    //  'class':'mergedRanges'
    //})

    const mRanges = gExonRanges.selectAll('.rangeRect').data(mergedRanges);
    mRanges.exit().remove();

    mRanges.enter().append('rect').attr({
      'class': 'rangeRect'
    })
      .style({
        'pointer-event': 'none'
        //opacity:.2
      })
    ;

    mRanges.attr({
      'x'(d, i) {
        return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
      },
      'y'(d, i) {
        return 0;
      },
      'width'(d, i) {
        return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
      },
      'height'(d, i) {
        return height - scaleYSpace;
      } // TODO: make this cleaner
    });


    const mRangeSorter = gExonRanges.selectAll('.rangeMenu').data(mergedRanges);
    mRangeSorter.exit().remove();

    mRangeSorter.enter().append('rect').attr({
      'class': 'isoMenu rangeMenu',
      'rx': 3,
      'ry': 3
    }).style({
      'pointer-event': 'none'
      //opacity:.2
    }).on({
      'click'(d) {

        //TODO: maybe change this to the whole range as parameter
        if (d.names.length > 0) {
          const me = this;
          svg.selectAll('.isoMenu').classed('selected', function () {
            return me === this;
          });
          event.fire('isoformSort', 'byExon', d.names[0]);
        }


      }
    })
    ;

    mRangeSorter.attr({
      'x'(d, i) {
        return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
      },
      'y'(d, i) {
        return menuOffset;
      },
      'width'(d, i) {
        return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
      },
      'height'(d, i) {
        return menuHeight;
      }
    });


    /*
     * ========================
     * Draw exon abstractions
     * =========================
     * */

    const exon = isoform.select('.foreground').selectAll('.exon').data(function (d) {
      return d.ranges;
    });
    exon.exit().remove();

    // --- adding Element to class exons
    const exonEnter = exon.enter().append('rect').attr({
      'class': 'exon',
      height: exonHeight
      //y:exonHeight
    });

    // --- changing nodes for exons
    exon.attr({
      width(d, i) {
        return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
      },
      x(d) {
        return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
      }
    });


    /*
     * ========================
     * Draw junction highlight
     * =========================
     * */
    let collectedJunctions = [];

    function updateJxn() {

      const l = collectedJunctions.length;
      const allJxnStarts = _.map(collectedJunctions, 'start');
      const allJxnEnds = _.map(collectedJunctions, 'end');
      let startIndex = -1;

      const jxn = isoform.select('.highlight').selectAll('.jxn').data(function (d) {

        const ranges: any[] = _.sortBy(d.ranges, 'start');
        const rangesLength = ranges.length;

        let relevantJunction = null;
        let i = -1;
        while (!relevantJunction && ++i < rangesLength) {
          startIndex = null;
          while ((startIndex == null || startIndex > -1) && !relevantJunction) {
            startIndex = allJxnEnds.indexOf(ranges[i].start, (startIndex == null) ? 0 : startIndex + 1); // find the exon start == jxn end
            if (startIndex > -1 && i > 0) { // excludes all exons without predecessor !!
              if (allJxnStarts[startIndex] === ranges[i - 1].end) { // if previous exon end matches jxn start...
                relevantJunction = collectedJunctions[startIndex]; // .. SUCESS !!!
              }
            }
          }
        }
        if (relevantJunction) {
          return [relevantJunction];
        }
        return [];
      });
      jxn.exit().remove();
      jxn.enter().append('rect').attr('class', 'jxn');
      jxn.attr({
        x(d) {
          return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
        },
        y(d, i) {
          if (l > 1) {
            return (exonHeight - (exonHeight / l + 1)) / 2;
          }
          return .05 * exonHeight;
        },
        width(d, i) {
          return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
        },
        height() {
          if (l > 1) {
            return exonHeight / (l + 1);
          }
          return exonHeight * .9;
        },
      });


      const menuJxn = gHighlight.selectAll('.jxn').data(collectedJunctions);
      menuJxn.exit().remove();
      menuJxn.enter().append('rect').attr('class', 'jxn');

      menuJxn.attr({
        'x'(d) {
          return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
        },
        'y'(d, i) {
          return menuOffset + i * exonHeight / l;
        },
        'width'(d) {
          return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
        },
        'height'() {
          if (l > 1) {
            return exonHeight / (l + 1);
          }
          return exonHeight * .9;
        }
      });


    }

    // TODO: there is a better place for EVENT handling when update done.
    event.on('highlightJxn', function (e, key, highlight) {

      if (highlight) {
        const positions = key.split(':');
        collectedJunctions.push({key, start: +positions[0], end: +positions[1]});
        collectedJunctions = _.sortBy(collectedJunctions, function (d) {
          return d.end - d.start;
        });
        updateJxn();
      } else {
        collectedJunctions = _.reject(collectedJunctions, function (d) {
          return d.key === key;
        });
        updateJxn();
      }


    });


    /*
     * ===============
     * Draw samples
     * ===============
     * */


    // menu first

    const dotMenu = gIso.selectAll('.dotMenu').data([1]);

    // --- adding Element to class dotMenu
    const dotMenuEnter = dotMenu.enter().append('g').attr({
      'class': 'dotMenu'
    });

    dotMenuEnter.append('rect').attr({
      'class': 'isoMenu dotmenuRect selected',
      'width'() {
        return scaleXScatter.range()[1] - scaleXScatter.range()[0];
      },
      'height': menuHeight,
      'rx': 3,
      'ry': 3
    }).on({
      'click'() {
        const me = this;
        svg.selectAll('.isoMenu').classed('selected', function () {
          return me === this;
        });

        event.fire('isoformSort', 'mean_sorting');
      }
    });

    dotMenuEnter.append('text').attr({
      'class': 'dotmenuText',
      'x'() {
        return (scaleXScatter.range()[1] - scaleXScatter.range()[0]) / 2;
      },
      'y': menuHeight - 3
    }).style({
      'text-anchor': 'middle',
      'pointer-events': 'none'
    }).text('sort by mean');

    dotMenuEnter.append('text').attr({
      'class': 'searchLabel infoSticker',
      'x': (scaleXScatter.range()[1] - scaleXScatter.range()[0]) + 3,
      'y': menuHeight - 4
    }).text(' ] sort column');


    // --- changing nodes for dotMenu
    dotMenu.attr({
      'transform': 'translate(' + scaleXScatter.range()[0] + ', ' + menuOffset + ')'

    });


    const drawSampleDots = function () {
      const sampleDot = isoform.select('.foreground').selectAll('.sampleDot').data(function (d, i) {
        return d.weights;
      });
      sampleDot.exit().remove();

      // --- adding Element to class sampleDot
      const sampleDotEnter = sampleDot.enter().append('circle').attr({

        r: 3
      }).on({
        'mouseover'(d) {
          event.fire('sampleHighlight', d.sample, true);
        },
        'mouseout'(d) {
          event.fire('sampleHighlight', d.sample, false);
        },
        'click'(d) {

          if (d3.select(this).classed('selected')) {
            //deselect
            event.fire('sampleSelect', d.sample, false);
          } else {
            //select
            event.fire('sampleSelect', d.sample, true);
          }


        }
      }).append('title').text(function (d) {
        return d.sample + '\n' + d.weight;
      });


      // --- changing nodes for sampleDot
      sampleDot.attr({
        'class'(d) {
          return 'sampleDot sample' + cleanSelectors(d.sample);
        },
        cx(d) {
          return scaleXScatter(d.weight);
        },
        cy() {
          if (that.dotsJittered) {
            return exonHeight / 4 + Math.random() * exonHeight / 2;
          }
          return exonHeight / 2;
        } // TODO: remove scatter
      });


      isoform.select('.highlight').selectAll('.sampleDot').attr({
        'class' (d) {
          return 'sampleDot sample' + cleanSelectors(d.sample);
        },
        cx(d) {
          return scaleXScatter(d.weight);
        },
        cy() {
          if (that.dotsJittered) {
            return exonHeight / 4 + Math.random() * exonHeight / 2;
          }
          return exonHeight / 2;
        } // TODO: remove scatter
      });


    };

    drawSampleDots();

    event.on('dotsJittering', function (e, dotsJittered) {

      that.dotsJittered = dotsJittered;
      const sampleDot = isoform.selectAll('.sampleDot');

      sampleDot.transition().attr({
        cy() {
          if (that.dotsJittered) {
            return exonHeight / 4 + Math.random() * exonHeight / 2;
          }
          return exonHeight / 2;
        } // TODO: remove scatter
      });

    });


    // -----------------
    // axis & unit labels for sample dots
    // -----------------

    const drawSampleDotsAxis = function () {
      const dotAxisDef = d3.svg.axis()
        .scale(scaleXScatter)
        .orient('bottom');

      const dotAxis = gIso.selectAll('.dotAxis').data([scaleXScatter]);
      dotAxis.exit().remove();

      // --- adding Element to class dotAxis
      const dotAxisEnter = dotAxis.enter().append('g').attr({
        'class': 'axis dotAxis'
      });

      // --- changing nodes for dotAxis
      dotAxis
        .call(dotAxisDef)
        .attr({
          'transform': 'translate(' + 0 + ',' + groupScale(noIsoforms) + ')'
        });
      dotAxis.selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', function (d) {
          return 'rotate(-65)';
        });


      // -----------------
      // labels for isoform abundance unit
      // -----------------

      const dotUnitLabel = gIso.selectAll('.dotUnitLabel').data([metaInfo.isoform_unit]);
      dotUnitLabel.exit().remove();

      // --- adding Element to class dotUnitLabel
      const dotUnitLabelEnter = dotUnitLabel.enter().append('text').attr({
        'class': 'dotUnitLabel axisLabel'
      });

      // --- changing nodes for dotUnitLabel
      dotUnitLabel.attr({
        x: scaleXScatter.range()[1],
        y: (groupScale(noIsoforms) + 20) //todo: magic number
      }).text(function (d) {
        return d;
      });


    };

    drawSampleDotsAxis();


    function showGroupSplits(data, index, parent, show) {


      const allDots = d3.select(parent).selectAll('.isoform .sampleDot');

      const colors = [];
      const allDInfos = [];

      allDots.each(function (d, i) {
        const f = d3.select(this).style('fill');
        const cx = d3.select(this).attr('cx');
        allDInfos.push({cx, color: f, d});
        if (colors.indexOf(f) < 0) {
          colors.push(f);
        }
      });


      if (show) {

        const splitG = gIso.selectAll('.groupSplitView').data([1]);
        const splitGenter = splitG.enter().append('g').attr('class', 'groupSplitView');
        //splitGenter.append('circle').attr({
        //    'class':'tickleftCircle',
        //    'cx':-15,
        //    'cy':-5,
        //    'r':5
        //})


        splitG.attr({
          'transform': 'translate(' + (scaleXScatter.range()[1] + 25) + ',' + groupScale(index) + ')'
        });

        const bg = splitG.selectAll('.background').data([1]);
        bg.enter().append('rect');
        bg.attr({
          'class': 'background',
          'height': groupScale(colors.length),
          'width': scatterWidth + 10
        });


        const groupDots = splitG.selectAll('.groupDots').data(allDInfos);
        groupDots.exit().remove();

        // --- adding Element to class groupDots
        const groupDotsEnter = groupDots.enter().append('circle').attr({
          r: 3
        });

        // --- changing nodes for groupDots
        groupDots.attr({
          'class'(d, i) {
            return 'groupDots sampleDot sample' + cleanSelectors(d.d.sample);
          },
          'cx'(d, i) {
            return d.cx - scaleXScatter.range()[0];
          },
          'cy'(d, i) {
            return groupScale(colors.indexOf(d.color)) + Math.random() * exonHeight / 2;
          },
          'fill'(d, i) {
            return d.color;
          }
        });


      } else {

        gIso.selectAll('.groupSplitView').remove();
        gIso.selectAll('.groupDots').remove();
      }


    }


    const showGroups = isoform.selectAll('.showGroups').data(function (d) {
      return [d];
    });
    showGroups.exit().remove();

    // --- adding Element to class showGroups
    const showGroupsEnter = showGroups.enter().append('text').attr({
      'class': 'showGroups',
      'x': scaleXScatter.range()[1] + 10,
      'y': exonHeight - 4
    }).text('+').style({
      'font-weight': 'bold',
      'cursor': 'pointer'
    }).on({
      'click'(d, i) {

        const parent = d3.select(this).node().parentNode;
        if (d3.select(this).classed('selected')) {

          d3.selectAll('.showGroups').classed('selected', false);
          showGroupSplits(d, i, parent, false);


          // unselect
        } else {
          const me = this;
          d3.selectAll('.showGroups').classed('selected', function () {
            return this === me;
          });
          showGroupSplits(d, i, parent, true);


        }
      }


    });

    // --- changing nodes for showGroups
    showGroups.attr({
      'x': scaleXScatter.range()[1] + 10,
      'y': exonHeight - 4
    });


  }


  // event handling for highlights
  function highlightSample(event, sample, highlight) {
    const highlightSel = svg.selectAll('.isoform .sample' + cleanSelectors(sample));
    highlightSel.classed('highlighted', highlight).moveToFront();

    // highlight group dots
    svg.selectAll('.groupSplitView .sample' + cleanSelectors(sample)).classed('highlighted', highlight);


    if (highlight) {
      const lineCoord = [];
      highlightSel.each(function () {
        const trans = d3.transform(d3.select(this.parentNode.parentNode).attr('transform')).translate;
        const me = d3.select(this);

        lineCoord.push({
          'x': +me.attr('cx') + trans[0],
          'y': +me.attr('cy') + trans[1]
        });
      });

      const line = d3.svg.line<any>()
        .interpolate('linear')
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        });


      const selectionParco = gHighlight.selectAll('.selectionParco').data([lineCoord]);
      selectionParco.exit().remove();

      // --- adding Element to class selectionParco
      const selectionParcoEnter = selectionParco.enter().append('path').attr({
        'class': 'selectionParco'
      });

      // --- changing nodes for selectionParco
      selectionParco.transition().duration(50).attr({
        'd': line,
        'opacity': 1
      }).style({
        'pointer-events': 'none'
      });
    } else {
      gHighlight.selectAll('.selectionParco').transition().attr({
        opacity: 0
      });


    }


  }

  event.on('sampleHighlight', highlightSample);


  // event handling for highlights
  function selectSample(event, sample, selected) {

    if (selected) {
      const allX = gIso.selectAll('.foreground .sample' + cleanSelectors(sample));

      allX.classed('selected', true);

      allX.each(function () {
        const highlightG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
          .select('.highlight');

        d3.select(this).style({
          fill: gui.current.getColorForSelection(sample),
          'fill-opacity': 1,
          stroke: 1
        });

        // add to highlight
        highlightG.node().appendChild(this);

        // make BG white to cover other dots
        // disabled on reviewers request -- #71
        //highlightG.select('.highlightBG').style({
        //  opacity:.5
        //})


      });

    } else {
      gui.current.releaseColorForSelection(sample);

      const allX = gIso.selectAll('.highlight .sample' + cleanSelectors(sample));
      allX.classed('selected', null);


      allX.each(function () {
        const fgG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
          .select('.foreground');

        // save the old parent
        const highlightG = d3.select(d3.select(this).node().parentNode);

        d3.select(this).style({
          fill: null,
          'fill-opacity': null,
          stroke: null
        });

        // add to highlight
        fgG.node().appendChild(this);

        // if only bgrect left..
        if (highlightG.node().childNodes.length === 1) {

          // make BG white to cover other dots
          highlightG.select('.highlightBG').style({
            opacity: 0
          });

        }


      });

    }

  }

  event.on('sampleSelect', selectSample);


  event.on('groupHighlight', function (e, groupID, isHighlighted) {
    const groupInfo = that.data.getGroup(groupID);

    if (groupInfo) {
      const hl = svg.selectAll('.sampleDot').filter(function (d) {
        return _.includes(groupInfo.samples, d.sample);
      }).classed('highlighted', isHighlighted);
      if (isHighlighted) {
        hl.moveToFront();
      }

    }
  });


  const groupSelect = function (e, groupID, isSelected) {
    const groupInfo = that.data.getGroup(groupID);
    if (groupInfo) {
      if (isSelected) {

        const allX = gIso.selectAll('.foreground').selectAll('.sampleDot').filter(function (d) {
          return _.includes(groupInfo.samples, d.sample);
        });

        allX.classed('selected', true);

        allX.each(function () {
          const highlightG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
            .select('.highlight');

          d3.select(this).style({
            fill: gui.current.getColorForSelection(groupID),
            'fill-opacity': .4,
            stroke: 1
          });

          // add to highlight
          highlightG.node().appendChild(this);

          //// make BG white to cover other dots
          //highlightG.select('.highlightBG').style({
          //  opacity: .5
          //})


        });

      } else {
        gui.current.releaseColorForSelection(groupID);

        const allX = gIso.selectAll('.highlight').selectAll('.sampleDot').filter(function (d) {
          return _.includes(groupInfo.samples, d.sample);
        });
        allX.classed('selected', null);


        allX.each(function () {
          const fgG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
            .select('.foreground');

          // save the old parent
          const highlightG = d3.select(d3.select(this).node().parentNode);

          d3.select(this).style({
            fill: null,
            'fill-opacity': null,
            stroke: null
          });

          // add to highlight
          fgG.node().appendChild(this);

          // if only bgrect left..
          if (highlightG.node().childNodes.length === 1) {

            // make BG white to cover other dots
            highlightG.select('.highlightBG').style({
              opacity: 0
            });

          }


        });

      }
    }
  };
  event.on('groupSelect', groupSelect);


  function axisUpdate() {

    width = that.axis.getWidth() + 2 * isoformPlot.scatterWidth + isoformPlot.extraLabel;
    svg.attr('height', height + margin.top + margin.bottom)
      .attr('width', width + margin.left + margin.right);

    const exon = svg.selectAll('.exon');

    // --- changing nodes for exons
    exon.transition().attr({
      width(d, i) {
        return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
      },
      x(d) {
        return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
      }
    });


    gExonRanges.selectAll('.rangeRect').transition().attr({
      'x'(d, i) {
        return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
      },
      'width'(d, i) {
        return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
      }
    });

    gExonRanges.selectAll('.rangeMenu').transition().attr({
      'x'(d, i) {
        return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);
      },
      'width'(d, i) {
        return Math.abs(that.axis.genePosToScreenPos(d.end) - that.axis.genePosToScreenPos(d.start));
      }
    });

    // ==> move end design -->


  }


  const createSortByExon = function (exonID) {

    let validNames = [];
    mergedRanges.forEach(function (mR) {
      if (mR.names.indexOf(exonID) > -1) {
        validNames = mR.names;
      }
    });

    return function (a, b) {
      const aMap = d3.nest().key(function (d: any) {
        return String(d.id);
      }).map(a.ranges, d3.map);
      const bMap = d3.nest().key(function (d: any) {
        return String(d.id);
      }).map(b.ranges, d3.map);
      let aValid = null;
      let bValid = null;


      validNames.forEach(function (validName) {
        if (aMap.has(validName)) {
          aValid = aMap.get(validName);
        }
        if (bMap.has(validName)) {
          bValid = bMap.get(validName);
        }
      });

      //const aValid = validNames.indexOf(a.id)>-1;
      //const bValid = validNames.indexOf(b.id)>-1;
      if (aValid && bValid) {
        const aStart = +aValid[0].start;
        const bStart = +bValid[0].start;
        if (aStart === bStart) {
          const aWidth = +aValid[0].end - aStart;
          const bWidth = +bValid[0].end - bStart;

          return bWidth - aWidth;

        } else {
          return aStart - bStart;
        }


      } else if (!aValid && !bValid) {
        return b.mean - a.mean;
      } else {
        return bValid ? 1 : -1;
      }

    };
  };

  function resortIsoforms(_, sortingMethod, parameter) {


    if (sortingMethod === 'mean_sorting') {
      currentSortFunction = sortByMean;

    } else if (sortingMethod === 'byExon') {
      currentSortFunction = createSortByExon(parameter);


    }

    svg.selectAll('.isoform').sort(currentSortFunction).transition().attr({
      'transform'(d, i) {
        return 'translate(' + 0 + ',' + groupScale(i) + ')';
      }
    });


    // d3 sort function
  }

  event.on('isoformSort', resortIsoforms);


  function updateData() {


    const
      curGene = gui.current.getSelectedGene(),
      curProject = gui.current.getSelectedProject();

    that.data.getGeneData(curProject, curGene).then(function (sampleData) {
      //d3.nest().key(function(k){return k.key}).map(a)

      mergedRanges = sampleData.gene.merged_ranges;

      minMaxValues = d3.extent(sampleData.measures.isoforms, function (d: any) {
        return +d.weight;
      });

      const usedIsoforms = d3.nest()
        .key(function (measure: any) {
          return measure.id;
        })
        .map(sampleData.measures.isoforms);


      const allIsoforms = sampleData.gene.isoforms;
      //const allExons = sampleData.gene.exons;


      isoformList = [];
      Object.keys(usedIsoforms).map(function (isokey) {

        if (isokey in allIsoforms) {
          const res: any = {weights: usedIsoforms[isokey], id: isokey};

          const isoform = allIsoforms[isokey];
          const exonNames = isoform.exonNames.split('_');
          const exonEnds = isoform.exonEnds.split('_');
          const exonStarts = isoform.exonStarts.split('_');

          const exons = [];
          if ((exonNames.length === exonEnds.length) && (exonNames.length === exonStarts.length)) {

            exonNames.forEach(function (exon, index) {
              exons.push({
                id: exon,
                end: +exonEnds[index],
                start: +exonStarts[index],
                isoformID: isoform.isoformID
              });
            });
          }


          res.ranges = exons;
          //allIsoforms[isokey].exons.map(function(exKey){
          //  const ex = allExons[exKey];
          //  return {'start': ex.start, 'end': ex.end, 'id': ex.id}
          //});


          const allWeights = res.weights.map(function (d) {
            return +d.weight;
          });
          res.mean = d3.mean(allWeights);
          res.boxPlot = computeBoxPlot(allWeights);
          isoformList.push(res);
        } else {
          console.log('isoform measured but no meta: ', isokey);
        }


      });


      // update the map between sample and a unique css-save selectorName
      sampleSelectorMap = {};
      isoformList[0].weights.forEach(function (d, i) {
        sampleSelectorMap[d.sample] = i;
      });

      metaInfo = {'isoform_unit': sampleData.measures.isoform_unit};

      drawIsoforms();

    });

  }


  //*** HELPER (copied from junction view) *****
  //TODO: better object orientation (no duplicates)

  function computeBoxPlot(values) {
    const sortedJxns = values.sort(d3.ascending);
    const Q = new Array(5);
    Q[0] = d3.min(sortedJxns);
    Q[4] = d3.max(sortedJxns);
    Q[1] = d3.quantile(sortedJxns, 0.25);
    Q[2] = d3.quantile(sortedJxns, 0.5);
    Q[3] = d3.quantile(sortedJxns, 0.75);
    const iqr = 1.5 * (Q[3] - Q[1]);
    let whiskerTop, whiskerDown;
    {
      let i = -1;
      let j = sortedJxns.length;
      while ((sortedJxns[++i] < Q[1] - iqr)) {
        // dummy
      }
      while (sortedJxns[--j] > Q[3] + iqr) {
        // dummy
      }
      whiskerTop = j === sortedJxns.length - 1 ? sortedJxns[j] : Q[3] + iqr;
      whiskerDown = i === 0 ? sortedJxns[i] : Q[1] - iqr;
    }
    return {whiskerTop, whiskerDown, Q};
  }


  event.on('groupingChanged', function (e, groupName, ids) {
    if (ids && ids.length > 0) {
      that.data.retainGroup(groupName);
    } else {
      groupSelect(null, groupName, false);
      that.data.releaseGroup(groupName);
    }
  });

  event.on('newDataLoaded', updateData);

  event.on('axisChange', axisUpdate);

  event.on('updateVis', drawIsoforms);


  return head.node();

};

