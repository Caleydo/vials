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

    var sampleGroups;
    // var groupMargin = 10;
    var exonHeight = 30;
    var scatterWidth = 200;
    var sampleScaleY = function(x){ return x*(exonHeight+3)};

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




    function drawSamples(samples, minMaxValues, g){

      var exonHeight = 30;
      var scatterWidth = 200;
      var axisOffset =  that.axis.getWidth() + 10;
      var noSamples = samples.length;

      // crosshair update
      crosshair.attr({
        "y2":height+margin.top+margin.bottom
      })



      var scaleXScatter = d3.scale.linear().domain([0,minMaxValues[1]]).range([axisOffset, width])
      var heightScale = d3.scale.linear().domain(minMaxValues).range([exonHeight,0]);

      that.lineFunction = d3.svg.line()
                            .x(function(d,i){return that.axis.arrayPosToScreenPos(i)})
                            .y(function (d) {return heightScale(d)})


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

      // --- changing nodes for isoform
      abundance.attr({
        "transform":function(d,i) {return "translate("+0+","+sampleScaleY(i)+")";}
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
        "d":function(d){return that.lineFunction(d.weights)}
      })

      abundance.select(".background").attr({
        width:that.axis.getWidth()
      })



    }

    function expandGroups() {
      var noSamplesBefore = 0;
      var groupScaleY = function(x, noSamplesBefore){return noSamplesBefore*(exonHeight+3)+20};
      console.log(gIso.selectAll(".sampleGroup"));
      var groups = gIso.selectAll(".sampleGroup").transition().attr({
        "transform":function(d,i) {
          console.log(d, d.sampleData.length)
          groupPos = groupScaleY(i, noSamplesBefore);
          noSamplesBefore += (d.collapse ? 1 : d.sampleData.length);
          return "translate("+0+","+groupPos+")";
        }
      })
      groups.each(function(g, groupID) {
        var sampleData = g.sampleData;
        var collapse = g.collapse;
        var group = d3.select(this);
        console.log(groupID, collapse);
        group.selectAll(".abundance").transition().attr({
          "transform":function(d,i) {
            i = collapse ? 0 : i;
            return "translate("+0+","+sampleScaleY(i)+")";
          }
        })
        var linesGroup = group.selectAll(".linesGroup");
        var linesGroupHeight = sampleScaleY(collapse ? 1 : sampleData.length) + exonHeight / 2 - 5
        linesGroup.selectAll(".v").transition().attr({
           "y2": linesGroupHeight,
        });
        linesGroup.selectAll(".bottom").transition().attr({
           "y1": linesGroupHeight,
           "y2": linesGroupHeight,
        });
        var buttonHeight = collapse ? 1 : sampleData.length;
        buttonHeight = (sampleScaleY(buttonHeight)-sampleScaleY(0))/ 2 + exonHeight / 2 - 5;
        linesGroup.selectAll(".buttonGroup").transition().attr({
            "transform": "translate(" + (that.axis.getWidth() + 15) + "," + buttonHeight + ")",
        });
        linesGroup.selectAll(".collapseButton").attr({
          "fill": collapse ? "black" : "white"
        });
      })
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
          "transform": "translate(" + (scatterWidth - 10) + ",0)"
        });

        linesGroup.append("line")
        .attr({
         "class": "v",
         "x1": axisWidth + 20,
         "x2": axisWidth + 20,
         "y1": sampleScaleY(0) + exonHeight / 2 + 5,
         "y2": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
         "stroke": "black",
       });

        linesGroup.append("line")
        .attr({
         "class": "top",
         "x1": axisWidth + 10,
         "x2": axisWidth + 20,
         "y1": sampleScaleY(0) + exonHeight / 2 + 5,
         "y2": sampleScaleY(0) + exonHeight / 2 + 5,
         "stroke": "black",
       });

        linesGroup.append("line")
        .attr({
         "class": "bottom",
         "x1": axisWidth + 10,
         "x2": axisWidth + 20,
         "y1": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
         "y2": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
         "stroke": "black",
       });

        var buttonGroup = linesGroup.append("g")
        .attr({
          "class": "buttonGroup",
        });

        var collapseButton = buttonGroup.append("rect")
        .attr({
         "class": "collapseButton",
         "stroke": "black",
         "width": 10,
         "height": 10,
         "x": 0,
       })
        .on("click", function(d) {d.collapse = !d.collapse; console.log(d); expandGroups()});

        var buttonHeight = sampleGroup.collapse ? 1 : (sampleScaleY(sampleData.length)-sampleScaleY(0))/ 2 + exonHeight / 2 - 5;
        var aggregateButton = buttonGroup.append("rect")
        .attr({
          "class": "aggregateButton",
          "fill": this.aggregate ? "black" : "white",
          "stroke": "black",
          "width": 10,
          "height": 10,
          "x": 20,
        }).on("click", function() {

        })
      }

      linesGroup.selectAll(".buttonGroup").attr({
        "transform": "translate(" + (axisWidth + 15) + "," + buttonHeight + ")",
      });
      expandGroups();
    }

    function drawGroups(groupData, minMax) {
      var group = gIso.selectAll(".sampleGroup").data(groupData, function (g) {return g.sampleData.map(function(d) {return d.sample}) });
      group.exit().remove();

      var groupEnter = group.enter().append("g").attr({
        "class":"sampleGroup"
      })

      var noSamplesBefore = 0;
      var groupScaleY = function(x, noSamplesBefore){return noSamplesBefore*(exonHeight+3)+20};
      group.attr({
        "transform":function(d,i) {
          groupPos = groupScaleY(i, noSamplesBefore);
          noSamplesBefore += (d.collapse ? 1 : d.sampleData.length);
          return "translate("+0+","+groupPos+")";
        }
      })

      groupEnter.each(function(g) {
        drawLinesGroup(g, d3.select(this));
      })

      group.each(function(g) {
        drawSamples(g.sampleData, minMax, d3.select(this));
      })
    }

    function axisUpdate(){

      //that.lineFunction.x(function(d,i){return that.axis.arrayPosToScreenPos(i)});


      gIso.selectAll(".abundanceGraph").attr({
        "d":function(d){return that.lineFunction(d.weights)}
        //opacity:.1
      })

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
        //d3.nest().key(function(k){return k.key}).map(a)
        var minmaxCand = [];
        // update the map between sample and a unique css-save selectorName
        sampleSelectorMap = {};
        sampleData.measures.reads.forEach(function (read, i) {
          minmaxCand.push(read.min);
          minmaxCand.push(read.max);
          sampleSelectorMap[read.sample] = i;
        })
        var minMax = d3.extent(minmaxCand)




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
            sampleGroups.push({"sampleData": [d], "collapse": false});
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
