/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 3/2/15.
 */


define(['exports', 'd3', 'altsplice-gui', '../caleydo/event'], function (exports, d3, gui, event) {
  /**
   * a simple template class of a visualization. Up to now there is no additional logic required.
   * @param data
   * @param parent
   * @constructor
   */
  function SimpleReadsVis(data, parent) {
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
    return new SimpleReadsVis(data, parent);
  }


  var margin = {top: 10, right: 10, bottom: 100, left: 0},
    width = 900 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  var currentlySelectedIsoform = null;


  SimpleReadsVis.prototype.build = function($parent){
    var that = this;
    that.axis = that.data.genomeAxis;
    var head = $parent.append("div").attr({
      "class":"gv"
    })


    var svg = head.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style({
        //"top":"10px",
        "left":"20px",
        "top":"10px",
        "position":"relative"

      })



    var gIso = svg.append("g").attr({
      class:"abundances",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    // create crosshair
    var crosshair = svg.append("line").attr({
      "class":"crosshair",
      "x1":0,
      "y1":0,
      "x2":50,
      "y2":height
    }).style({
      "stroke-width":"1",
      "stroke":"black",
      "pointer-events":"none"
    });

    var currentX = 0;
    svg.on("mousemove", function () {
      currentX = d3.mouse(this)[0];
      event.fire("crosshair", currentX);

    })

    function updateCrosshair(event, x){
      crosshair.attr({
        "x1":x,
        "x2":x
      }).style({
        opacity:function(){
          return x>that.axis.getWidth()?0:1
        }
      })

    }

    event.on("crosshair", updateCrosshair);

    var sampleSelectorMap = {} // will be updated at updateData()..

    function cleanSelectors(sel){return sampleSelectorMap[sel]}

    function std(values){
      var avg = d3.mean(values);
      var squareDiffs = values.map(function(value){
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
      });
      var avgSquareDiff = d3.mean(squareDiffs);
      var stdDev = Math.sqrt(avgSquareDiff);
      return stdDev;
    }

    var dataType;
    var sampleGroups;
    var exonHeight = 30;
    var scatterWidth = 200;
    var sampleScaleY = function(x){ return x*(exonHeight+3)};
    var scaleXScatter;
    var heightScale;

    function zipData(sampleData) {
      return sampleData[0].weights.map(function(s0, i) {
        return sampleData.map(function(s) {return s.weights[i]});
      })
    }

    dataFuncs = {
      "BodyMap": {
        "mean": function(zipped) {
          var mean = d3.svg.line()
            .x(function(d, i) {
              return that.axis.arrayPosToScreenPos(i);
            })
            .y(function(d, i) {
              return heightScale(d);
            })
            .interpolate('step');
          return mean(zipped);
        },
        "stdDev": function(zipped) {
          var stdDev = d3.svg.area()
            .x(function(d, i) {
              return that.axis.arrayPosToScreenPos(i);
            })
            .y0(function(d) {
              return heightScale(d3.mean(d)-std(d));
            })
            .y1(function(d) {
              return heightScale(d3.mean(d)+std(d));
            });
          return stdDev(zipped);
        },
        "line": function(sampleData) {
          var lineFunc = d3.svg.line()
              .x(function(d,i){return that.axis.arrayPosToScreenPos(i)})
              .y(function (d) {return heightScale(d)})
          return lineFunc(sampleData.weights);
        },
        "minMax": function(readData) {
          //d3.nest().key(function(k){return k.key}).map(a)
          var minmaxCand = [];
          // update the map between sample and a unique css-save selectorName
          sampleSelectorMap = {};
          readData.forEach(function (read, i) {
            minmaxCand.push(read.min);
            minmaxCand.push(read.max);
            sampleSelectorMap[read.sample] = i;
          })
          return d3.extent(minmaxCand)          
        }
      },
      "TCGA": {
        "mean": function(zipped) {
          function meanData(exonWeights) {
            return d3.mean(exonWeights, function(d){return d.weight});
          }
          var mappedReads = this.mapReads(this.mapExons(zipped, meanData));
          var mean = d3.svg.line()
            .x(function(d, i) {
              return that.axis.genePosToScreenPos(d.pos);
            })
            .y(function(d, i) {
              return heightScale(d.weight);
            })
            .interpolate('step');
          return mean(mappedReads);
        },
        "stdDev": function(zipped) {
          function stdData(exonWeights) {
            return exonWeights.map(function(e) {return e.weight});
          }
          var stdDev = d3.svg.area()
            .x(function(d, i) {
              return that.axis.genePosToScreenPos(d.pos);
            })
            .y0(function(d) {
              return heightScale(d3.mean(d.weight)-std(d.weight));
            })
            .y1(function(d) {
              return heightScale(d3.mean(d.weight)+std(d.weight));
            })
            .interpolate('step');
          var mappedReads = this.mapReads(this.mapExons(zipped, stdData));
          return stdDev(mappedReads);
        },
        "line": function(sampleData) {
          var lineFunc = d3.svg.line()
              .x(function(d,i){return that.axis.genePosToScreenPos(d.pos)})
              .y(function (d) {return heightScale(d.weight)})
              .interpolate('step')
          var mappedReads = this.mapReads(sampleData.weights);
          return lineFunc(mappedReads);
        },
        "mapExons": function(zipped, f) {
          var exons = zipped.map(function(exon_weights, i) {
            // TODO: don't assume sorted from server side (though it is right now)
            return {
              "start": exon_weights[0].start,
              "end": exon_weights[0].end,
              "weight": f(exon_weights)
            }
          })
          return exons
        },
        "mapReads": function(exons) {
          var reads = []
          exons.forEach(function(e) {
            reads = reads.concat(d3.range(e.start, e.end).map(function(d) {return {"pos": d, "weight": e.weight}}))
          })
          return reads          
        },
        "minMax": function(readData) {
          var minmaxCand = [];
          // update the map between sample and a unique css-save selectorName
          sampleSelectorMap = {};
          readData.forEach(function (read, i) {
            read.weights.map(function(exon) {
              minmaxCand.push(exon.weight);
            })
            sampleSelectorMap[read.sample] = i;
          })
          return d3.extent(minmaxCand)
        }
      }
    }


    function drawSamples(samples, minMaxValues, g){

      var exonHeight = 30;
      var scatterWidth = 200;
      var axisOffset =  that.axis.getWidth() + 10;
      var noSamples = samples.length;

      // crosshair update
      crosshair.attr({
        "y2":height+margin.top+margin.bottom
      })


      /*
       * ========================
       * Manage .isoform - Groups
       * =========================
       * */
      var abundance = g.selectAll(".abundance").data(samples, function (d) {return d.sample });
      abundance.exit().remove();

      // --- adding Element to class isoform
      var abundanceEnter = abundance.enter().append("g").attr({
        "class":"abundance"
      })

      /*
       * reactive background
       * */
      abundanceEnter.append("rect").attr({
        height:exonHeight,
        class:"background"
      }).on({
        "mouseover": function(d){
          d3.select(this).classed("selected", true);
          event.fire("sampleHighlight", d.sample, true);
        },
        "mouseout": function(d){
          d3.select(this).classed("selected", false);
          event.fire("sampleHighlight", d.sample, false);
        },
        "click":function(d, i){
          var el = d3.select(this);
          if (el.classed("fixed")){
            el.classed("fixed", false);
            //currentlySelectedIsoform = null;
            //event.fire("isoFormSelect", {isoform: d.id, index:-1});
          } else{
            el.classed("fixed", true);
            //if (currentlySelectedIsoform) currentlySelectedIsoform.classed("fixed", false);
            //currentlySelectedIsoform = el;
            //event.fire("isoFormSelect", {isoform: d.id, index:i})
          }

        }
      })

      abundanceEnter.append("path").attr({
            "class":"abundanceGraph"
      })

      abundanceEnter.append("text").attr({
          "class": "sampleLabel",
          "transform": "translate(" + (that.axis.getWidth() + 10) + "," + exonHeight + ")"
      }).text(function(d) {return d.sample})


      // update !!!

      abundance.select(".abundanceGraph").attr({
        "class": function(d){return "abundanceGraph sample" +  cleanSelectors(d.sample)},
        "d":function(d){return dataFuncs[dataType].line(d)}
      })

      abundance.select(".background").attr({
        width:that.axis.getWidth()
      })



    }

    function expandGroups() {
      repositionGroups();
      var groups = gIso.selectAll(".sampleGroup");
      groups.each(function(g, groupID) {
        var group = d3.select(this);
        redrawLineGroups(g, group);
        if (g.collapse) {
          summarizeData(g, groupID, group);
        }
        toggleOpacities(g, group);
      })
    }

    function repositionGroups() {
      var noSamplesBefore = 0;
      var groupScaleY = function(x, noSamplesBefore){return noSamplesBefore*(exonHeight+3)+20};
      var groups = gIso.selectAll(".sampleGroup").transition().attr({
        "transform":function(d,i) {
          groupPos = groupScaleY(i, noSamplesBefore);
          noSamplesBefore += (d.collapse ? 1 : d.sampleData.length);
          return "translate("+0+","+groupPos+")";
        }
      })
      groups.each(function(g, groupID) {
        var sampleData = g.sampleData;
        var group = d3.select(this);
        group.selectAll(".abundance").transition().attr({
          "transform":function(d,i) {
            i = g.collapse ? 0 : i;
            return "translate("+0+","+sampleScaleY(i)+")";
          }
        })
      })
    }

    function redrawLineGroups(g, group) {
      var sampleData = g.sampleData;
      var linesGroup = group.selectAll(".linesGroup");
      var linesGroupHeight = sampleScaleY(g.collapse ? 1 : sampleData.length) + exonHeight / 2 - 5
      linesGroup.selectAll(".v").transition().attr({
        "y2": linesGroupHeight,
      });
      linesGroup.selectAll(".bottom").transition().attr({
        "y1": linesGroupHeight,
        "y2": linesGroupHeight,
      });
      var buttonHeight = g.collapse ? 1 : sampleData.length;
      buttonHeight = (sampleScaleY(buttonHeight)-sampleScaleY(0))/ 2 + exonHeight / 2 - 5;
      linesGroup.selectAll(".buttonGroup").transition().attr({
        "transform": "translate(" + (that.axis.getWidth() + 15) + "," + buttonHeight + ")",
      });
      linesGroup.selectAll(".collapseButton").attr({
        "fill": g.collapse ? "black" : "white"
      });
    }

    function summarizeData(g, groupID, group) {
      var summary = group.selectAll(".summary").data([g.sampleData]);
      summary.exit().remove();
      var summaryEnter = summary.enter().append("g").attr({
        "class": "summary",
        "transform": "translate(0, 0)"
      });
      summaryEnter.append("text").attr({
          "class": "summaryLabel",
          "transform": "translate(" + (that.axis.getWidth() + 10) + "," + exonHeight + ")"
      }).text("Group " + groupID)
      summaryEnter.append("svg:path").attr({
        fill: "none",
        stroke: "red",
        class: "mean",
      })
      // TODO: zipping inside the dataFuncs object
      var zipped = zipData(g.sampleData);
      summary.selectAll(".mean").attr("d", dataFuncs[dataType].mean(zipped));
      summaryEnter.append("svg:path").attr({
        fill: "red",
        class: "stdDev",
      })
      summary.selectAll(".stdDev").attr("d", dataFuncs[dataType].stdDev(zipped));
    }

    function toggleOpacities(g, group) {
        group.selectAll(".abundanceGraph, .abundance .background").transition().attr({
          "opacity": g.collapse ? 0 : 1
        });
        group.selectAll(".sampleLabel").transition().attr("opacity", g.collapse ? 0 : 1);
        group.selectAll(".summary").transition().attr({
          "opacity": g.collapse ? 1 : 0
        });
    }

    function drawLinesGroup(sampleGroup, g) {
      var sampleData = sampleGroup.sampleData;
      if (sampleData.length <= 1) {
        g.selectAll(".linesGroup").remove();
        return;
      }

      var axisWidth = that.axis.getWidth();

      var linesGroup = g.selectAll(".linesGroup");
      if (linesGroup.empty()) {
        linesGroup = g.append("g").attr({
          "class": "linesGroup",
          "transform": "translate(" + (scatterWidth - 40) + ",0)"
        });

        linesGroup.append("line").attr({
          "class": "v",
          "x1": axisWidth + 20,
          "x2": axisWidth + 20,
          "y1": sampleScaleY(0) + exonHeight / 2 + 5,
          "y2": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
          "stroke": "black",
        });

        linesGroup.append("line").attr({
          "class": "top",
          "x1": axisWidth + 10,
          "x2": axisWidth + 20,
          "y1": sampleScaleY(0) + exonHeight / 2 + 5,
          "y2": sampleScaleY(0) + exonHeight / 2 + 5,
          "stroke": "black",
        });

        linesGroup.append("line").attr({
          "class": "bottom",
          "x1": axisWidth + 10,
          "x2": axisWidth + 20,
          "y1": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
          "y2": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
          "stroke": "black",
        });

        var buttonGroup = linesGroup.append("g").attr({
          "class": "buttonGroup",
        });

        var collapseButton = buttonGroup.append("rect").attr({
          "class": "collapseButton",
          "stroke": "black",
          "width": 10,
          "height": 10,
          "x": 0,
        }).on("click", function(d) {d.collapse = !d.collapse; expandGroups()});

        var buttonHeight = sampleGroup.collapse ? 1 : (sampleScaleY(sampleData.length)-sampleScaleY(0))/ 2 + exonHeight / 2 - 5;
      }

      linesGroup.selectAll(".buttonGroup").attr({
        "transform": "translate(" + (axisWidth + 15) + "," + buttonHeight + ")",
      });
    }

    function drawGroups(groupData, minMax) {
      var group = gIso.selectAll(".sampleGroup").data(groupData, function (g) {return g.sampleData.map(function(d) {return d.sample}) });
      group.exit().remove();

      var groupEnter = group.enter().append("g").attr({
        "class":"sampleGroup"
      })

      groupEnter.each(function(g) {
        drawLinesGroup(g, d3.select(this));
      })

      group.each(function(g) {
        drawSamples(g.sampleData, minMax, d3.select(this));
      })

      expandGroups();
    }

    function axisUpdate(){

      //that.lineFunction.x(function(d,i){return that.axis.arrayPosToScreenPos(i)});


      gIso.selectAll(".abundanceGraph").attr({
        "d":function(d){return that.lineFunction(d.weights)}
        //opacity:.1
      })

      expandGroups();
    }

    function getGroup(sample) {
      var groupID;
      sampleGroups.forEach(function(g, i) {
        var samples = g.sampleData.map(function(d) {return d.sample})
        if (samples.indexOf(sample) >= 0) {
          groupID = i;
        }
      })
      return groupID;
    }

    function groupData(readData) {
      var grouped = sampleGroups.map(function() {return {"collapse": false, "sampleData": []}});
      readData.forEach(function(d, i) {
        var groupID = getGroup(d.sample);
        grouped[groupID].sampleData.push(d)
      })
      return grouped;
    }

    function joinGroups(groupIDs) {
      var combinedSamples = groupIDs.reduce(function(sampleData, groupID) {
                                              return sampleData.concat(sampleGroups[groupID].sampleData)
                                            }, []);

      var newGroup = {"sampleData": combinedSamples, "collapse": false};
      sampleGroups = [newGroup].concat(sampleGroups.filter(function(g, i) {return groupIDs.indexOf(i) < 0}));
    }

    function updateData(){
      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth(),
        curProject = gui.current.getSelectedProject();

      that.data.getGeneData(curProject, curGene).then(function(sampleData) {
        dataType = sampleData.measures.data_type;

        var minMax = dataFuncs[dataType].minMax(sampleData.measures.reads);

        scaleXScatter = d3.scale.linear().domain([0,minMax[1]]).range([axisOffset, width])
        heightScale = d3.scale.linear().domain(minMax).range([exonHeight,0]);


        var noSamples = sampleData.measures.reads.length;

        var axisOffset =  that.axis.getWidth() + 10;
        width = axisOffset + scatterWidth;
        height = (exonHeight+3)*noSamples;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);

        var readData = sampleData.measures.reads;
        if (sampleGroups === undefined) {
          sampleGroups = []
          readData.forEach(function(d, i) {
            sampleGroups.push({"collapse": false, "sampleData": [d]});
          })
        }
        joinGroups([0, 1, 2]);
        joinGroups([4, 5, 6, 7]);

        sampleGroups = groupData(readData)
        drawGroups(sampleGroups, minMax)
      })

    }


    gui.current.addUpdateEvent(updateData);


    event.on("axisChange", axisUpdate)


    // event handling for highlights
    function highlightSample(event, sample, highlight){

      svg.selectAll(".sample"+ cleanSelectors(sample)).classed("highlighted", highlight);
    }

    event.on("sampleHighlight", highlightSample)


    return head.node();

  }





  exports.IsoFormVis = SimpleReadsVis;
  exports.create = create;


})
