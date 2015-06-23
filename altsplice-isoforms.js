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
  function IsoFormVis(data, parent) {
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
    return new IsoFormVis(data, parent);
  }


  var margin = {top: 35, right: 10, bottom: 20, left: 0},
    width = 900 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  var currentlySelectedIsoform = null;

  var sortByMean = function(a,b){ return b.mean- a.mean; }
  var currentSortFunction=sortByMean





  IsoFormVis.prototype.build = function($parent){
    var that = this;
    that.axis = that.data.genomeAxis;
    that.dotsJittered = true;



    var head = $parent.append("div").attr({
      "class":"gv"
    })





    var mergedRanges = [];

    var svg = head.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style({
        //"top":"10px",
        "left":"20px",
        "top":"10px",
        "position":"relative"

      })


    //TODO: externalize into a function maybe a html version ?
    /*
     *
     * Label for View starts here..
     * */
    var svgLabel = svg.append("g");
    var svgLabelBg = svgLabel.append("rect").attr({
      "class": "viewLabelBg",
      "width": height + margin.top,
      "rx": 10,
      "ry": 10
    });
    var svgLabelText = svgLabel.append("text").text("isoforms").attr({
      "class": "viewLabelText",
    });
    bb = svgLabelText.node().getBBox();
    svgLabelBg.attr({
      "height": bb.height+4
    })
    function drawViewLabel(height) {
      svgLabelBg.attr({
        "width": height + margin.top
      });
      svgLabelText.attr("transform", "translate(" + (height+margin.top-bb.width)/2 + "," + (bb.height-3) + ")")
      svgLabel.attr("transform", "translate(0," + (height+margin.top) + ")" +
        "rotate(-90)");
    }
    drawViewLabel(height);

    var viewLabelMargin = 40;
    var svgMain = svg.append("g").attr({
      "class": "isoMain",
      "transform": "translate(" + viewLabelMargin + ",0)"
    });

    var gExonRanges = svgMain.append("g").attr({
      class:"exonRanges",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    var gIso = svgMain.append("g").attr({
      class:"isoforms",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    var gHighlight = svgMain.append("g").attr({
      class:"highlights",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    // create crosshair
    var crosshair = svgMain.append("line").attr({
      "class":"crosshair",
      "x1":0,
      "y1":0,
      "x2":0,
      "y2":height
    }).style({
      "stroke-width":"1",
      "stroke":"black",
      "pointer-events":"none"
    });

    var currentX = 0;
    svg.on("mousemove", function () {
      currentX = d3.mouse(this)[0];
      event.fire("crosshair", currentX - viewLabelMargin);

    })

    function updateCrosshair(event, x){
      crosshair.attr({
        "x1":x,
        "x2":x
      }).style({
        opacity:function(){
         return 1 //return x>that.axis.getWidth()?0:1
        }
      })


    }

    event.on("crosshair", updateCrosshair);


    var sampleSelectorMap = {} // will be updated at updateData()..

    function cleanSelectors(sel){return sampleSelectorMap[sel]}


    var exonHeight = 15;
    var groupScale = function(x){ return x*(exonHeight+3)};

    function drawIsoforms(isoformList, minMaxValues){
        console.log("list", isoformList);

        var scatterWidth = 200;
        var extraLabel = 100;
        var axisOffset =  that.axis.getWidth() + 10;
        var noIsoforms = isoformList.length;
        var scaleYSpace = 25;



        width = axisOffset+ 2* scatterWidth+extraLabel;
        height = groupScale(noIsoforms)+scaleYSpace;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);

        drawViewLabel(height);

        console.log(minMaxValues);
        var scaleXScatter = d3.scale.linear().domain([0,minMaxValues[1]]).range([axisOffset, axisOffset+scatterWidth])

        var menuOffset = -34;
        var menuHeight = 18;


        var menuDivideLine = gIso.selectAll(".menuDivideLine").data([1]);
        menuDivideLine.exit().remove();

        // --- adding Element to class menuDivideLine
        var menuDivideLineEnter = menuDivideLine.enter().append("line").attr({
            "class":"menuDivideLine"
        })

        // --- changing nodes for menuDivideLine
        menuDivideLine.attr({
          x1:0,
          x2:width,
          y1:(menuOffset+menuHeight+8),
          y2:(menuOffset+menuHeight+8)
        })



        /*
        * ========================
        * Manage .isoform - Groups
        * =========================
        * */
        var isoform = gIso.selectAll(".isoform")
          .data(isoformList, function (d) {return d.id })
        isoform.exit().remove();

        // --- adding Element to class isoform
        var isoformEnter = isoform.enter().append("g").attr({
            "class":"isoform"
        })

        // --- changing nodes for isoform
        isoform.sort(currentSortFunction).attr({
            "transform":function(d,i) {return "translate("+0+","+groupScale(i)+")";}
        }).on({
          "mouseover":function(){
            //console.log("min", d3.event.target
              d3.select(this).select(".background rect").classed("selected", true);
            },
          "mouseout":function(){
            //console.log("mout", d3.event.target)
            d3.select(this).select(".background rect").classed("selected", false);
          }
        })



        /*
        * reactive background
        * */
        var bg = isoformEnter.append("g").attr("class","background");
        bg.append("rect").attr({
          width:width,
          height:exonHeight
        }).on({
          //"mouseover": function(){d3.select(this).classed("selected", true);},
          //"mouseout": function(){d3.select(this).classed("selected", false);},
          "click":function(d, i){
            console.log(d,i);
            var el = d3.select(this);
            if (el.classed("fixed")){
              el.classed("fixed", false);
              currentlySelectedIsoform = null;
              event.fire("isoFormSelect", {isoform: d.id, index:-1});
            } else{
              el.classed("fixed", true);
              if (currentlySelectedIsoform) currentlySelectedIsoform.classed("fixed", false);
              currentlySelectedIsoform = el;
              event.fire("isoFormSelect", {isoform: d.id, index:i})
            }

          }
        })


        isoform.select(".background rect").attr({
          width:axisOffset+scatterWidth//width+margin.right-2
        })

      /*
       * ========================
       * Draw boxplots
       * =========================
       * */

      var boxPlotGroup = bg.append("g").attr("class","boxPlot");
      boxPlotGroup.selectAll(".vticks").data(function (d) {
        return [
          d.boxPlot.whiskerDown,
          d.boxPlot.Q[1],
          d.boxPlot.Q[2],
          d.boxPlot.Q[3],
          d.boxPlot.whiskerTop]
      }).enter().append("line").attr({
        class:"vticks",
        x1:function(d){return scaleXScatter(d);},
        x2:scaleXScatter,
        y1:1,
        y2:exonHeight-2
      })

      boxPlotGroup.selectAll(".hticks").data(function (d) {
        return [
          [1, d.boxPlot.Q[1], d.boxPlot.Q[3]],
          [exonHeight-2, d.boxPlot.Q[1], d.boxPlot.Q[3]]
        ];
      }).enter().append("line").attr({
        class:"hticks",
        x1:function(d){return scaleXScatter(d[1]);},
        x2:function(d){return scaleXScatter(d[2]);},
        y1:function(d){return d[0];},
        y2:function(d){return d[0];}
      })

      boxPlotGroup.selectAll(".wticks").data(function (d) {
        return [
          [d.boxPlot.whiskerDown, d.boxPlot.Q[1]],
          [d.boxPlot.Q[3], d.boxPlot.whiskerTop]
        ];
      }).enter().append("line").attr({
        class:"wticks",
        x1:function(d){return scaleXScatter(d[0]);},
        x2:function(d){return scaleXScatter(d[1]);},
        y1:exonHeight/2,
        y2:exonHeight/2
      })















        isoformEnter.append("g").attr("class","foreground");
        var highlight = isoformEnter.append("g").attr("class","highlight");
        highlight.append("rect").attr({
          class:"highlightBG",
          x:axisOffset,
          y:0,
          width:scatterWidth,
          height:exonHeight
        }).style({
          fill: "white",
          opacity:0
        })



      /*
       * ========================
       * Draw exon merging
       * =========================
       * */


      //isoformEnter.append("g").attr({
      //  "class":"mergedRanges"
      //})

      var mRanges = gExonRanges.selectAll(".rangeRect").data(mergedRanges);
      mRanges.exit().remove();

      mRanges.enter().append("rect").attr({
          "class":"rangeRect"})
        .style({
          "pointer-event":"none"
          //opacity:.2
        })
      ;

      mRanges.attr({
          "x":function(d,i){return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end)},
          "y":function(d,i){return 0},
          "width":function(d,i){return Math.abs(that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start))},
          "height":function(d,i){return height-scaleYSpace} // TODO: make this cleaner
      })


      //console.log("mergedRanges", mergedRanges);
      var mRangeSorter = gExonRanges.selectAll(".rangeMenu").data(mergedRanges);
      mRangeSorter.exit().remove();

      mRangeSorter.enter().append("rect").attr({
        "class":"isoMenu rangeMenu",
        "rx":3,
        "ry":3
      }).style({
          "pointer-event":"none"
          //opacity:.2
        }).on({
        "click":function(d){

          //TODO: maybe change this to the whole range as parameter
          if (d.names.length>0){
            var me = this;
            svg.selectAll(".isoMenu").classed("selected", function () {
              return me == this;
            })
            event.fire("isoformSort","byExon", d.names[0]);
          }


        }
      })
      ;

      mRangeSorter.attr({
        "x":function(d,i){return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end)},
        "y":function(d,i){
          return menuOffset},
        "width":function(d,i){return Math.abs(that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start))},
        "height":function(d,i){return menuHeight}
      })




      /*
       * ========================
       * Draw exon abstractions
       * =========================
       * */

        var exon = isoform.select(".foreground").selectAll(".exon").data(function(d){return d.ranges});
        exon.exit().remove();

        // --- adding Element to class exons
        var exonEnter = exon.enter().append("rect").attr({
            "class": "exon",
            height:exonHeight
            //y:exonHeight
        })

        // --- changing nodes for exons
        exon.attr({
          width: function(d,i){
            return Math.abs(that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start))
          },
          x:function(d){return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);}
        })


      /*
       * ===============
       * Draw samples
       * ===============
       * */

      //console.log(that.axis);


      // menu first

      var dotMenu = gIso.selectAll(".dotMenu").data([1]);

      // --- adding Element to class dotMenu
      var dotMenuEnter = dotMenu.enter().append("g").attr({
          "class":"dotMenu"
      })

      dotMenuEnter.append("rect").attr({
          "class":"isoMenu dotmenuRect selected",
          "width":function(){return scaleXScatter.range()[1]- scaleXScatter.range()[0]},
          "height":menuHeight,
        "rx":3,
        "ry":3
      }).on({
        "click":function(){
          var me = this;
          svg.selectAll(".isoMenu").classed("selected", function () {
            return me == this;
          })

          event.fire("isoformSort","mean_sorting")
        }
      })

      dotMenuEnter.append("text").attr({
        "class":"dotmenuText",
        "x":function(){return (scaleXScatter.range()[1]- scaleXScatter.range()[0])/2},
        "y":menuHeight-3
      }).style({
        "text-anchor":"middle",
        "pointer-events":"none"
      }).text("sort by mean")

      dotMenuEnter.append("text").attr({
        "class":"searchLabel infoSticker",
        "x":(scaleXScatter.range()[1]- scaleXScatter.range()[0])+3,
        "y": menuHeight-4
      }).text(" ] sort column")




      // --- changing nodes for dotMenu
      dotMenu.attr({
          "transform":"translate("+scaleXScatter.range()[0]+", "+menuOffset+")"

      })



      var drawSampleDots = function()
      {
        var sampleDot = isoform.select(".foreground").selectAll(".sampleDot").data(function (d, i) {
          return d.weights
        });
        sampleDot.exit().remove();

        // --- adding Element to class sampleDot
        var sampleDotEnter = sampleDot.enter().append("circle").attr({
          "class": function (d) {
            return "sampleDot sample" + cleanSelectors(d.sample);
          },
          r: 3
        }).on({
          "mouseover": function (d) {
            event.fire("sampleHighlight", d.sample, true)
          },
          "mouseout": function (d) {
            event.fire("sampleHighlight", d.sample, false)
          },
          "click": function (d) {

            if (d3.select(this).classed("selected")) {
              //deselect
              event.fire("sampleSelect", d.sample, false)
            } else {
              //select
              event.fire("sampleSelect", d.sample, true)
            }


          }
        }).append("title").text(function (d) {
          return d.sample;
        })


        // --- changing nodes for sampleDot
        sampleDot.attr({
          cx: function (d) {
            return scaleXScatter(d.weight)
          },
          cy: function () {
            if (that.dotsJittered) return exonHeight / 4 + Math.random() * exonHeight / 2;
            else return exonHeight / 2;
          } // TODO: remove scatter
        })
      }

      drawSampleDots();

      event.on("dotsJittering", function(e,dotsJittered){
          //console.log("dotsJittered", dotsJittered);
          that.dotsJittered = dotsJittered;
        var sampleDot = isoform.selectAll(".sampleDot")

        sampleDot.transition().attr({
          cy: function () {
            if (that.dotsJittered) return exonHeight / 4 + Math.random() * exonHeight / 2;
            else return exonHeight / 2;
          } // TODO: remove scatter
        })

      })







      var dotAxisDef = d3.svg.axis()
        .scale(scaleXScatter)
        .orient("bottom");

      var dotAxis = gIso.selectAll(".dotAxis").data([scaleXScatter]);
      dotAxis.exit().remove();

      // --- adding Element to class dotAxis
      var dotAxisEnter = dotAxis.enter().append("g").attr({
          "class":"axis dotAxis"
      })

      // --- changing nodes for dotAxis
      dotAxis
        .call(dotAxisDef)
        .attr({
          "transform":"translate("+0+","+groupScale(noIsoforms)+")"
        })
      dotAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d) {
          return "rotate(-65)"
        });







      function showGroupSplits(data,index,parent, show){
        // console.log(data,index, parent);

        var allDots = d3.select(parent).selectAll(".isoform .sampleDot")

        var colors = []
        var allDInfos = []

        allDots.each(function(d,i){
          var f = d3.select(this).style("fill")
          var cx = d3.select(this).attr("cx")
          allDInfos.push({cx: cx, color:f, d:d})
          if (colors.indexOf(f)<0){
            colors.push(f)
          }
        })

        // console.log(colors);

        if (show){

          var splitG = gIso.selectAll(".groupSplitView").data([1])
          var splitGenter = splitG.enter().append("g").attr("class","groupSplitView");
          //splitGenter.append("circle").attr({
          //    "class":"tickleftCircle",
          //    "cx":-15,
          //    "cy":-5,
          //    "r":5
          //})

          // console.log("index:",index);
          splitG.attr({
            "transform":"translate("+(scaleXScatter.range()[1]+25)+","+groupScale(index)+")"
          })

          var bg = splitG.selectAll(".background").data([1])
          bg.enter().append("rect")
          bg.attr({
              "class":"background",
              "height":groupScale(colors.length),
              "width":scatterWidth+10
          })



          var groupDots = splitG.selectAll(".groupDots").data(allDInfos);
          groupDots.exit().remove();

          // --- adding Element to class groupDots
          var groupDotsEnter = groupDots.enter().append("circle").attr({
            r:3
          })

          // --- changing nodes for groupDots
          groupDots.attr({
            "class":function(d,i){return "groupDots sampleDot sample"+cleanSelectors(d.d.sample)},
            "cx":function(d,i){return d.cx-scaleXScatter.range()[0]},
            "cy":function(d,i){return groupScale(colors.indexOf(d.color))+Math.random()*exonHeight/2},
            "fill":function(d,i){return d.color}
          })



            // console.log(allDots);
            allDots.each(function(d,i){

              //console.log(d, d3.select(this).style("fill"));
            })



        }else{

          gIso.selectAll(".groupSplitView").remove();
          gIso.selectAll(".groupDots").remove();
        }



      }



      var showGroups = isoform.selectAll(".showGroups").data(function (d) {
          return [d];
      });
      showGroups.exit().remove();

      // --- adding Element to class showGroups
      var showGroupsEnter = showGroups.enter().append("text").attr({
          "class":"showGroups",
          "x":scaleXScatter.range()[1]+10,
          "y":exonHeight-4
      }).text("+").style({
          "font-weight":"bold",
          "cursor":"pointer"
      }).on({
        "click":function(d,i){

          var parent = d3.select(this).node().parentNode;
          if (d3.select(this).classed("selected")){

            d3.selectAll(".showGroups").classed("selected", false);
            showGroupSplits(d,i, parent, false);


            // unselect
          }else{
            var me= this;
            d3.selectAll(".showGroups").classed("selected", function(){return this==me})
              showGroupSplits(d,i, parent, true);



          }
        }


      })

      //// --- changing nodes for showGroups
      //showGroups.attr({
      //
      //})




    }


    // event handling for highlights
    function highlightSample(event, sample, highlight){
      var highlightSel = svg.selectAll(".isoform .sample"+ cleanSelectors(sample));
      highlightSel.classed("highlighted", highlight).moveToFront();

      // highlight group dots
      svg.selectAll(".groupSplitView .sample"+ cleanSelectors(sample)).classed("highlighted", highlight);


      if (highlight){
        var lineCoord = [];
        highlightSel.each(function(){
          var trans = d3.transform(d3.select(this.parentNode.parentNode).attr("transform")).translate
          var me = d3.select(this)
          //console.log(trans);
          // console.log("me", me.attr("cx"),me);
          lineCoord.push({
            "x":+me.attr("cx")+trans[0],
            "y":+me.attr("cy")+trans[1]
          })
        })

        var line = d3.svg.line()
          .interpolate("linear")
          .x(function(d){return d.x})
          .y(function(d){return d.y});

        //console.log(lineCoord, line(lineCoord));

        //console.log(lineCoord.map(function(d){return d.x+" "+ d.y}));

        var selectionParco = gHighlight.selectAll(".selectionParco").data([lineCoord]);
        selectionParco.exit().remove();

        // --- adding Element to class selectionParco
        var selectionParcoEnter = selectionParco.enter().append("path").attr({
          "class":"selectionParco"
        })

        // --- changing nodes for selectionParco
        selectionParco.transition().duration(50).attr({
          "d":line,
          "opacity":1
        }).style({
          "pointer-events":"none"
        })
      }else{
        gHighlight.selectAll(".selectionParco").transition().attr({
          opacity:0
        })



      }










    }

    event.on("sampleHighlight", highlightSample)



    // event handling for highlights
    function selectSample(event, sample, selected){
      //console.log("select", sample, selected, gui.current.getColorForSelection(sample));


      if (selected){
        var allX = gIso.selectAll(".foreground .sample"+ cleanSelectors(sample))

        allX.classed("selected", true);

        allX.each(function(){
          var highlightG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
            .select(".highlight")

          d3.select(this).style({
            fill:gui.current.getColorForSelection(sample),
            "fill-opacity":1,
            stroke:1
          })

          // add to highlight
          highlightG.node().appendChild(this);

          // make BG white to cover other dots
          // disabled on reviewers request -- #71
          //highlightG.select(".highlightBG").style({
          //  opacity:.5
          //})


        })

      }else{
        gui.current.releaseColorForSelection(sample);

        var allX = gIso.selectAll(".highlight .sample"+ cleanSelectors(sample))
        allX.classed("selected", null);


        allX.each(function() {
          var fgG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
            .select(".foreground")

          // save the old parent
          var highlightG = d3.select(d3.select(this).node().parentNode);

          d3.select(this).style({
            fill:null,
            "fill-opacity":null,
            stroke:null
          })

          // add to highlight
          fgG.node().appendChild(this);

          // if only bgrect left..
          if (highlightG.node().childNodes.length==1){

            // make BG white to cover other dots
            highlightG.select(".highlightBG").style({
              opacity:0
            })

          }



        })

      }

    }

    event.on("sampleSelect", selectSample)


    event.on("groupHighlight", function(e, groupID, isHighlighted){
      var sall = groupID.samples.map(function(d,i){return ".sample"+cleanSelectors(d)}).join(", ");
      var highlightSel = svg.selectAll(sall);
      var hl = highlightSel.classed("highlighted", isHighlighted)
      if (isHighlighted)  hl.moveToFront();
    });




    event.on("groupSelect", function(e, groupID, isSelected) {

      console.log(groupID, isSelected);

      var sall = groupID.samples.map(function (d, i) {
        return ".sample" + cleanSelectors(d)
      }).join(", ");

      if (isSelected) {

        var allX = gIso.selectAll(".foreground " + sall)

        allX.classed("selected", true);

        allX.each(function () {
          var highlightG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
            .select(".highlight")

          d3.select(this).style({
            fill: gui.current.getColorForSelection(JSON.stringify(groupID)),
            "fill-opacity":.4,
            stroke: 1
          })

          // add to highlight
          highlightG.node().appendChild(this);

          // make BG white to cover other dots
          highlightG.select(".highlightBG").style({
            opacity: .5
          })


        })

      } else {
        gui.current.releaseColorForSelection(JSON.stringify(groupID));

        var allX = gIso.selectAll(".highlight " + sall)
        allX.classed("selected", null);


        allX.each(function () {
          var fgG = d3.select(d3.select(this).node().parentNode.parentNode) // grandpa
            .select(".foreground")

          // save the old parent
          var highlightG = d3.select(d3.select(this).node().parentNode);

          d3.select(this).style({
            fill: null,
            "fill-opacity": null,
            stroke: null
          })

          // add to highlight
          fgG.node().appendChild(this);

          // if only bgrect left..
          if (highlightG.node().childNodes.length == 1) {

            // make BG white to cover other dots
            highlightG.select(".highlightBG").style({
              opacity: 0
            })

          }


        })

      }
    })






    function axisUpdate(){

      svg.attr("height", height+margin.top+margin.bottom)
        .attr("width", width + margin.left + margin.right);

      var exon =svg.selectAll(".exon");

      // --- changing nodes for exons
      exon.transition().attr({
        width: function(d,i){
          return Math.abs(that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start))
        },
        x:function(d){return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end);}
      })


      gExonRanges.selectAll(".rangeRect").transition().attr({
        "x":function(d,i){return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end)},
        "width":function(d,i){return Math.abs(that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start))}
      })

      gExonRanges.selectAll(".rangeMenu").transition().attr({
        "x":function(d,i){return that.axis.genePosToScreenPos(that.axis.ascending ? d.start : d.end)},
        "width":function(d,i){return Math.abs(that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start))}
      })

      // ==> move end design -->


    }


    var createSortByExon = function(exonID){

      var validNames = []
      mergedRanges.forEach(function(mR){
        if (mR.names.indexOf(exonID)>-1){
          validNames = mR.names;
        }
      })

      return function(a,b){
        //console.log("compare",a,b,validNames);
        //console.log(a.id, b.id, validNames.indexOf(a.id)>-1,validNames.indexOf(b.id)>-1, validNames);
        var aMap = d3.nest().key(function(d,i){return d.id}).map(a.ranges, d3.map)
        var bMap = d3.nest().key(function(d,i){return d.id}).map(b.ranges, d3.map)
        var aValid = null;
        var bValid = null;


        validNames.forEach(function(validName){
          if (aMap.has(validName)) aValid=aMap.get(validName);
          if (bMap.has(validName)) bValid=bMap.get(validName);
        })

        //var aValid = validNames.indexOf(a.id)>-1;
        //var bValid = validNames.indexOf(b.id)>-1;
        if (aValid && bValid){
          var aStart = +aValid[0].start
          var bStart = +bValid[0].start
          if (aStart==bStart){
            var aWidth = +aValid[0].end - aStart
            var bWidth = +bValid[0].end - bStart

            return bWidth-aWidth;

          }else{
            return aStart-bStart;
          }
          //console.log("VALID:",aValid[0].start, bValid[0].start, a, b);


        } else if  (!aValid && !bValid){
          //console.log("INVALID:",aValid, bValid);
          return b.mean - a.mean;
        }else{
          return bValid?1:-1;
        }

      }
    }

    function resortIsoforms(_, sortingMethod, parameter ){

      //console.log("RESORT:",sortingMethod,parameter, sortingMethod === "mean_sorting");

      if (sortingMethod === "mean_sorting"){
        currentSortFunction = sortByMean;
        //console.log(currentSortFunction);

      }else if (sortingMethod === "byExon"){
        currentSortFunction = createSortByExon(parameter)


      }

      svg.selectAll(".isoform").sort(currentSortFunction).transition().attr({
        "transform":function(d,i) {return "translate("+0+","+groupScale(i)+")";}
      })


      // d3 sort function
    }

    event.on("isoformSort", resortIsoforms)


    function updateData(){


      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth(),
        curProject = gui.current.getSelectedProject();

      that.data.getGeneData(curProject, curGene).then(function(sampleData) {
        //d3.nest().key(function(k){return k.key}).map(a)

        mergedRanges = sampleData.gene['merged_ranges'];

        var minMax = d3.extent(sampleData.measures.isoforms, function (d) {
          return +d.weight;
        })

        var usedIsoforms = d3.nest()
          .key(function(measure){return measure.id})
          .map(sampleData.measures.isoforms);

        var allIsoforms = sampleData.gene.isoforms;
        var allExons = sampleData.gene.exons;


        var usedIsoformsList =  []
        Object.keys(usedIsoforms).map(function(isokey){

          if (isokey in allIsoforms){
            var res = {weights:usedIsoforms[isokey], id: isokey}
            res.ranges =
              allIsoforms[isokey].exons.map(function(exKey){
                var ex = allExons[exKey];
                return {"start": ex.start, "end": ex.end, "id": ex.id}
              });


            var allWeights = res.weights.map(function(d){return d.weight;})
            res.mean = d3.mean(allWeights)
            res.boxPlot = computeBoxPlot(allWeights)
            usedIsoformsList.push(res)
          }else{
            console.log("isoform measured but no meta: ", isokey);
          }



        })

        //console.log("used iso:",usedIsoforms, minMax);


        // update the map between sample and a unique css-save selectorName
        sampleSelectorMap = {};
        usedIsoformsList[0].weights.forEach(function(d,i){
          sampleSelectorMap[d.sample] = i;
        })


        drawIsoforms(usedIsoformsList, minMax);

      })

    }


    //*** HELPER (copied from junction view) *****
    //TODO: better object orientation (no duplicates)

    function computeBoxPlot(values) {
      var sortedJxns = values.sort(d3.ascending);
      var Q = new Array(5);
      Q[0] = d3.min(sortedJxns);
      Q[4] = d3.max(sortedJxns);
      Q[1] = d3.quantile(sortedJxns, 0.25);
      Q[2] = d3.quantile(sortedJxns, 0.5);
      Q[3] = d3.quantile(sortedJxns, 0.75);
      var iqr = 1.5 * (Q[3] - Q[1]);
      var whiskerTop, whiskerDown;
      {
        var i = -1;
        var j = sortedJxns.length;
        while ((sortedJxns[++i] < Q[1] - iqr));
        while (sortedJxns[--j] > Q[3] + iqr);
        whiskerTop = j == sortedJxns.length - 1 ? sortedJxns[j] : Q[3] + iqr;
        whiskerDown = i == 0 ? sortedJxns[i] : Q[1] - iqr;
      }
      return {"whiskerTop": whiskerTop, "whiskerDown": whiskerDown, "Q": Q};
    }




    event.on("groupingChanged", function(e,a,b,c){
      console.log("gc",a,b,c);
    })


    gui.current.addUpdateEvent(updateData);


    event.on("axisChange", axisUpdate)


    return head.node();

  }





  exports.IsoFormVis = IsoFormVis;
  exports.create = create;


})
