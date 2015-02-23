/**
 * Created by Bilal Alsallakh 02/01/14
 * Based on work by Joseph Botros
 */

/**
 * Isoform + Frequency Visualization
 */

define(['exports', 'd3'], function (exports, d3) {
  /**
   * a simple template class of a visualization. Up to now there is no additional logic required.
   * @param data
   * @param parent
   * @constructor
   */
  function GenomeVis(data, parent) {
    this.data = data;
    this.parent = parent;
    this.node = this.build(d3.select(parent));
  }

  /**
   * factory method of this module
   * @param data the data to show
   * @param parent the parent dom element to append
   * @returns {GenomeVis} the visualization
   */
  function create(data, parent) {
    return new GenomeVis(data, parent);
  }

  var margin = {top: 40, right: 10, bottom: 20, left: 10},
    width = 800 - margin.left - margin.right,
    height = 2000 - margin.top - margin.bottom;
  var dotRadius = 4;
  var defaultDotColor = "rgba(0,0,0,0.6)";
  var dehighlightedDotColor = "rgba(0,0,0,0.2)";
  var highlightedDotColor = "red";
  var weightAxisCaptionWidth = 25;

  var jxnWrapperPadding = 15;
  var jxnWrapperHeight = 300;
  var miniExonSpacing = 5;
  var miniExonHeight = 7;
  var jxnCircleRadius = 5;

  var curGene;
  var curRNAs;
  var curExons;

  var serverOffset;
  var geneData;

  var startPosDiv;
  var chromIDDiv;
  var baseWidthInputDiv;

  var show_introns = false;
  var jxnArea;
  var cellRadius = 14;
  var cellMargin = 2;
  var cellWidth = cellRadius*2 + cellMargin;


  GenomeVis.prototype.build = function ($parent) {
    serverOffset = this.data.serveradress;

    var that = this;
      var head = $parent.append("div").attr({
          "class":"gv"
      })

    // SETUP THE GUI Controls
    createGenDefControls(head);

    // SETUP THE VIS

      var svg = head.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style({
              "top":"50px",
              "left":"20px",
              "position":"absolute"
          })
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var exploreArea = svg.append("g").attr("transform", "translate(20, 80)");
      jxnArea = exploreArea.append("g").attr("id", "jxnArea");



  var getAxisRanges = function(curExons, startPosVal, baseWidth) {
    if (show_introns) {
      var ranges = [];
      var prevExon;
      curExons.forEach(function(exon, i) {
        if (prevExon) {
          ranges.push([prevExon[1], exon[0]])
        }
        else if (!prevExon && exon[0] > startPosVal) {
          ranges.push([startPosVal, exon[0]])
        }
        ranges.push(exon);
        prevExon = exon;
      })
      if (prevExon[1] < startPosVal+baseWidth) {
        ranges.push([prevExon[1], startPosVal+baseWidth])
      }
      return ranges;
    }
    return curExons;
  }

  function getStartPos()  {return parseInt($(startPosDiv.node()).val())}
  function getCromID ()  {return $(chromIDDiv.node()).val()}
  function getBaseWidth ()  {return  parseInt($(baseWidthInputDiv.node()).val())}

  var updateVisualization = function() {
    startPos = getStartPos()
    chromID =getCromID ()
    baseWidth =getBaseWidth ()
    //geneName     = $(geneSelector.node()).val()


    curGene = getCurGene(startPos, baseWidth);
    curRNAs = getCurRNAs(curGene, startPos, baseWidth);
    curExons = getCurExons(curRNAs);

    // var xScale = d3.scale.ordinal().domain(d3.range(startPos, startPos + baseWidth)).rangeBands([0,width]);
    // var xScaleCont = d3.scale.linear().domain([startPos, startPos + baseWidth]).range([0,width]);

    var xScaleList = [];
    var axisPadding = 0;
    if (!show_introns) {
      axisPadding = 60;
    }

    var axisRanges = getAxisRanges(curExons, startPos, baseWidth);
    var axesLength = axisRanges.reduce(function(a, b) {return a + b[1] - b[0] + 1}, 0);

    getXPos = function(pos, scaleList) {
      var scales;
      if (scaleList) {
        scales = scaleList;
      }
      else {
        scales = xScaleList;
      }
      var xPos;
      scales.forEach(function(axis, i) {
        if (axis(pos)) {
          xPos = axis(pos);
        }
      })
      return xPos;
    }

    // ==========================
    // BIND DATA TO VISUALIZATION
    // ==========================

    that.data.getSamples(curGene,startPos,baseWidth).then(function(sampleData) {
      samples = d3.keys(sampleData);
      console.log("SAMPLE:", sampleData);

      var totalAxisWidth = width - axisPadding*(axisRanges.length - 1);

      var axisPos = 0;
      axisRanges.forEach(function(axisRange, i) {
        var axisLength = (axisRange[1] - axisRange[0] + 1)/axesLength * totalAxisWidth;
        var xScale = d3.scale.ordinal().domain(d3.range(axisRange[0]-1, axisRange[1]+1)).rangeBands([axisPos,axisPos+axisLength-1]);
        xScaleList.push(xScale);
        axisPos = axisPos + axisLength + axisPadding;
      })


     var RNAHeight = 30;
      var RNAMargin = 30;
      var RNAArea = jxnArea.selectAll("#RNAArea").data(["foo"])
      RNAArea.exit().remove();
      RNAArea.enter().append("g").attr({
        "id": "RNAArea",
        "transform": "translate(0," + (jxnWrapperHeight+RNAMargin) + ")"
      });
      sad = curRNAs;
      drawRNA(curRNAs.reduce(function(memo, num) {
          if (memo.length > num.length) {return memo}
          else {return num}
        }),
        RNAArea, xScaleList, RNAHeight, RNAMargin);

      drawJxns(sampleData);

    });
    //// should trigger a cache hit
    //that.data.getSamples(chromID,startPos,baseWidth);

}



  function drawRNA(RNA, area, scaleList, RNAHeight, RNAMargin) {

    var RNAArea = area.append("g").attr({
      "class": "RNA"
    })

    RNAArea.append("line").attr({
      "x1": getXPos(RNA.RNASpan[0], scaleList),
      "x2": getXPos(RNA.RNASpan[1], scaleList),
      "y1": RNAHeight/2,
      "y2": RNAHeight/2,
      "class": "RNALine",
      "stroke": "#666"
    });

    exons = RNAArea.selectAll(".exon")
      .data(RNA.exons)
    exons.exit().remove();
    exons.enter().append("rect").attr({
      "class": "exon",
      "fill": "black",
      "x": function(d) {return getXPos(d[0], scaleList);},
      "y": 0,
      "width": function(d) {return (d[1] - d[0]) * scaleList[0].rangeBand();},
      "height": RNAHeight
    })

    exons.enter().append("polygon").attr({
      "points" : function(d, i) {
        var x1 = getXPos(d[0], scaleList);
        var x2 = getXPos(d[1], scaleList);
        var x3 = getWrapperStartX(i) + getWrapperOriginPoint(i) + miniExonWidth() / 2;
        var x4 = getWrapperStartX(i) + getWrapperOriginPoint(i) - miniExonWidth() / 2;
        return [
          x1, 0,
          x2, 0,
          x3, -RNAMargin,
          x4, -RNAMargin
        ]},
      "class": "JXNConnector",
      "stroke": "#ccc",
      "fill":"#ccc"
    })


  }

  function jxnWrapperWidth() {
    return (width - (curExons.length - 1) * jxnWrapperPadding) / curExons.length
  }
  function miniExonWidth() {
    return (jxnWrapperWidth(curExons) - (curExons.length + 1) * miniExonSpacing) / curExons.length;
  }

  function getWrapperOriginPoint(exonIndex) {
    return jxnWrapperWidth()*(exonIndex + 0.5)/curExons.length
  }

  function getWrapperStartX(i) {
    return i*(jxnWrapperWidth()+jxnWrapperPadding) + jxnWrapperPadding + weightAxisCaptionWidth;
  }


  function drawJxns(data) {

    var maxJxnReads = 0;
    for (sample in data.samples) {
      maxJxnReads = Math.max(data.samples[sample]["jxns"].reduce(function(a, b) {return Math.max(a, b[1])}, 0), maxJxnReads);
    }

    var exonWeightsAreaHeight = jxnWrapperHeight - 4 * miniExonHeight;

    var yScaleContJxn = d3.scale.linear().domain([0, maxJxnReads]).range([exonWeightsAreaHeight-jxnCircleRadius, jxnCircleRadius]);
    var yAxisJxn = d3.svg.axis()
      .orient("left")
      .scale(yScaleContJxn);
    var jxnWrappers = jxnArea.selectAll(".jxnWrapper").data(curExons);
    jxnWrappers.exit().remove();
    var jxnWrappersEnter = jxnWrappers.enter().append("g").attr({
      "class": "jxnWrapper",
      "transform": function(exon, i) {return "translate("+ getWrapperStartX(i)+",0)"}
    });

    function getExonIdx(exon) {
      var idx;
      curExons.forEach(function(curExon, i) {if (curExon[0] == exon[0] && curExon[1] == exon[1]) {idx = i}});
      return idx;
    }

    jxnWrappersEnter.append("rect").attr({
      "class": "jxnWrapperBox prev",
      "fill": "#aaa",
      "width": function(exon) {return jxnWrapperWidth()*(getExonIdx(exon)+ 0.5)/curExons.length},
      "height": jxnWrapperHeight
    })

    jxnWrappersEnter.append("rect").attr({
      "class": "jxnWrapperBox next",
      "fill": "#ccc",
      "height": jxnWrapperHeight,
      "width": function(exon) {return jxnWrapperWidth()*(curExons.length - getExonIdx(exon)- 0.5)/curExons.length},
      "transform": function(exon) {return "translate("+ getWrapperOriginPoint(getExonIdx(exon))+",0)"}
    })
    var edgeAxisGroup = jxnArea.append("g")
      .attr("class", "axis")
      .call(yAxisJxn)
      .attr("transform", "translate(" + weightAxisCaptionWidth + " 0)");
    edgeAxisGroup.append("text")      // text label for the x axis
      .attr("x", -20)
      .attr("y", exonWeightsAreaHeight / 2)
      .attr("font-size", 12)
      .style("text-anchor", "middle")
      .text("Edge Weight")
      .attr("transform", "rotate(-90, " + (-weightAxisCaptionWidth) + " " + exonWeightsAreaHeight / 2 + ")");


    jxnWrappers.each(function(curExon, curExonIdx) {
      var jxnWrapper = d3.select(this);
      var exonJxnGroups = jxnWrapper.selectAll(".exonJxnGroup").data(curExons, function(exon) {return exon});

      var definingExonX = (curExonIdx + 0.5) * (miniExonSpacing+miniExonWidth());

      exonJxnGroups.exit().remove();
      var exonJxnGroupsEnter = exonJxnGroups.enter().append("g").attr({
        "class": function(exon, i) {return "exonJxnGroup" + (i == curExonIdx ? " curExon" : "")},
        "transform": function(exon, i) {
          var xShift = i*(miniExonSpacing+miniExonWidth())+miniExonSpacing;
          var yShift = 0;
          return "translate("+ xShift + ","+ yShift +")"
        }
      })

     exonJxnGroupsEnter.append("line").attr({
        "class": "exonRefLine",
        "stroke": "black",
        "stroke-dasharray":  "5,5",
        "x1": miniExonWidth()/2,
        "x2": miniExonWidth()/2,
        "y1": 0,
        "y2":function(exon, i) {return i == curExonIdx ? "0" : exonWeightsAreaHeight}
      })

      exonJxnGroupsEnter.append("rect").attr({
        "class": "miniExonBox",
        "width": miniExonWidth(),
        "height": miniExonHeight,
        "stroke": "black",
        "fill": "black", // function(exon, i) {return i == curExonIdx ? "white" : "black"},
        "transform": function(exon, i) {
          var shiftY = jxnWrapperHeight - miniExonHeight;
          if (i != curExonIdx)
            shiftY -= 3 * miniExonHeight;
          return "translate(0,"+ shiftY +")"
        }
      })

      exonJxnGroupsEnter.append("line").attr({
        "class": "miniExonEdge",
        "stroke": "black",
        "x1": function(exon, i) {
          if (i == curExonIdx) return 0;
          var origin = i * (miniExonSpacing + miniExonWidth()) + miniExonSpacing;
          return definingExonX - origin;
        },
        "x2": function(exon, i) {return (i == curExonIdx) ? 0 : miniExonWidth()/2},
        "y1":function(exon, i) {return (i == curExonIdx) ? 0 : jxnWrapperHeight - miniExonHeight},
        "y2": function(exon, i) {return (i == curExonIdx) ? 0 : exonWeightsAreaHeight + miniExonHeight}
      })

      exonJxnGroups.attr({
        "transform": function(exon, i) {return "translate("+(i*(miniExonSpacing+miniExonWidth())+miniExonSpacing)+","+miniExonSpacing+")"}
      })


      exonJxnGroups.selectAll(".miniExonBox").attr({
        "width": miniExonWidth(),
      })

      function getJxnsFromSpan(curExon, otherExon) {
        var jxns = [];
        for (var sample in data.samples) {
          data.samples[sample]["jxns"].forEach(function(jxn, i) {
            if ((curExon[1] == jxn[0][0] && otherExon[0] == jxn[0][1]) ||
              (otherExon[1] == jxn[0][0] && curExon[0] == jxn[0][1])) {
              jxns.push(jxn[1]);
            }
          });
        }
        return jxns
      }

      jxnWrapper.selectAll(".exonJxnGroup:not(.curExon)")
        .each(function(exon, i) {
          var exonJxnGroup = d3.select(this);
          var exonGroupJxns = getJxnsFromSpan(curExon, exon);
          var exonGroupJxnsMax = Math.max.apply(Math, exonGroupJxns),
            exonGroupJxnsMin = Math.min.apply(Math, exonGroupJxns);
          var jxnBBoxWidth = jxnCircleRadius * 3;
          var jxnBBoxes = exonJxnGroup.selectAll(".jxnBBox").data(["foo"]);
          jxnBBoxes.enter().append("rect").attr({
            "class": "jxnBBox",
            "fill": "white",
            "height": Math.abs(yScaleContJxn(exonGroupJxnsMax) - yScaleContJxn(exonGroupJxnsMin)) + 2*jxnCircleRadius,
            "width": jxnBBoxWidth,
            "transform": "translate("+(miniExonWidth() - jxnBBoxWidth)/2+","
            +(yScaleContJxn(exonGroupJxnsMax)-jxnCircleRadius)+")"
          });

          var jxnCircles = d3.select(this)
            .selectAll(".jxnCircle")
            .data(exonGroupJxns)
          jxnCircles.exit().remove();
          jxnCircles.enter().append("circle").attr({
            "class": "jxnCircle",
            "data-sample": function(d, i) {return samples[i]},
            "r": jxnCircleRadius,
            "cx": miniExonWidth()/2,
            "cy": function(d) {return yScaleContJxn(d)},
            "fill": function(d, i) {return defaultDotColor}
          }).on('mouseover', function(val, nodeInd) {
            d3.selectAll('.jxnCircle')
              .style('fill', dehighlightedDotColor);

            d3.select(this).transition()
              .duration(100)
              .style('fill', highlightedDotColor);
            }).on('mouseout', function(val, dotInd, plotInd) {
              d3.selectAll('.jxnCircle')
                .transition()
                .duration(100)
                .style('fill', defaultDotColor);

            })

          ;
        })
    });
  }

    //globalCallCount = 1;
  function getCurRNAs(geneName, pos, baseWidth) {
    if (!geneData) return [];
    //console.log(globalCallCount, geneName, geneData)
    //globalCallCount++;
    var gene = geneData[geneName];
    //console.log(gene);
    var curRNAs = [];
    var curExons = [];
    for (var j in gene.exons) {
      var exon = gene.exons[j];
      // will return empty list if exon not present in view
      var exonMin = Math.max(exon[0], pos);
      var exonMax = Math.min(exon[1], pos+baseWidth);
      if (exonMax > exonMin) {
        curExons.push([exonMin, exonMax]);
      }
    }
    for (var j in gene.mRNAs) {
      var curRNA = [];
      var RNA = gene.mRNAs[j];
      for (var k in RNA) {
        exonID = RNA[k]
        if (curExons[exonID]) {
          curRNA.push(curExons[exonID]);
        }
      }
      curRNAs.push({'exons': curRNA, 'RNASpan': [Math.max(gene.tx_start, pos), Math.min(gene.tx_end, pos+baseWidth-1)]});
    }
    return curRNAs;
  }

  function getCurExons(curRNAs) {
    return curRNAs.map(function(RNA) {return RNA.exons})
      .reduce(function(a, b) {
        if (a.length > b.length) {return a;}
        else {return b;}
      }, 0)
  }

  function getCurGene(pos, baseWidth) {
    for (var geneName in geneData) {
      geneInfo = geneData[geneName]
      if ((geneInfo.tx_start >= pos && geneInfo.tx_start <= pos + baseWidth) ||
        (geneInfo.tx_end >= pos && geneInfo.tx_end <= pos + baseWidth)) {
        return geneName;
      }
    }
  }

  function createGenDefControls(container) {

    var $inputOuterDiv = container.append("div").style({
      "top":"10px",
      "left":"20px",
      "width":"600px",
      "position":"absolute"
    })

    var $queryDiv = $inputOuterDiv.append("div").text("Chromosome ID:");

    var $geneDiv = $inputOuterDiv.append("div");

    var geneSelector = $inputOuterDiv.append("select");

    chromIDDiv = $queryDiv.append("input").attr({
      type: "text",
      value: "chr17"
    })

    var $queryDiv = $inputOuterDiv.append("div").text("startpos:");

    startPosDiv = $queryDiv.append("input").attr({
      type:"text",
      value:"1"
    })


    var requestButton = $queryDiv.append("button").attr({
      type:"button",
      class:"btn"
    }).text("request")


    var backwardButton =  $queryDiv.append("button").attr({
      type:"button",
      class:"btn"
    }).text("-375")

    var forwardButton =  $queryDiv.append("button").attr({
      type:"button",
      class:"btn"
    }).text("+375")

    $baseWidthDiv = $inputOuterDiv.append("div").text("zoom:");

    baseWidthInputDiv = $baseWidthDiv.append("input").attr({
      type:"text",
      value:"1500"
    }).attr("style", "display: none");

    var zoomInButton = $baseWidthDiv.append("button").attr({
      type:"button",
      class:"btn"
    }).text("+")

    var zoomOutButton = $baseWidthDiv.append("button").attr({
      type:"button",
      class:"btn"
    }).text("-")

    that.data.getAllGenes().then( function(genes) {
      geneData = genes;
      for (var gene in genes) {
        geneSelector.append("option").attr('value', gene).text(gene);
      }
      populateGeneData($(geneSelector.node()).val());
    });

    geneSelector.on({
      "change": function(gene){populateGeneData(gene)}
    })

    function populateGeneData(gene) {
      $(chromIDDiv.node()).val(geneData[gene].chromID);
      $(startPosDiv.node()).val(geneData[gene].tx_start);
      updateVisualization();
    }

    // connect the buttons with action !!
    requestButton.on({
      "click":function(d){updateVisualization(); }
    })
    forwardButton.on({
      "click":function(d){
        var v = +$(startPos.node()).val();
        var w = +$(baseWidthInput.node()).val();
        $(startPos.node()).val(v+Math.round(w/4));

        updateVisualization();
      }
    })
    backwardButton.on({
      "click":function(d){
        var v = +$(startPos.node()).val();
        var w = +$(baseWidthInput.node()).val();
        $(startPos.node()).val(Math.max(v-Math.round(w/4), 1));

        updateVisualization();
      }
    })

    zoomOutButton.on({
      "click":function(d){
        var newWidth = +Math.round($(baseWidthInput.node()).val() * 2);
        $(baseWidthInput.node()).val(newWidth);
        backwardButton.text("-" + Math.round(newWidth/4))
        forwardButton.text("+" + Math.round(newWidth/4))

        updateVisualization();
      }
    })

    zoomInButton.on({
      "click":function(d){
        var newWidth = +Math.round($(baseWidthInput.node()).val() / 2);
        if (newWidth > 0) {
          $(baseWidthInput.node()).val(newWidth);
          backwardButton.text("-" + Math.round(newWidth/4))
          forwardButton.text("+" + Math.round(newWidth/4))

          updateVisualization();
        }
      }
    })


  }


    updateVisualization();
    return head.node();
  };

  exports.GenomeVis = GenomeVis;
  exports.create = create;
});
