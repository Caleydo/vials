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


  var margin = {top: 25, right: 10, bottom: 20, left: 0},
    width = 900 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  var currentlySelectedIsoform = null;

  var sortByMean = function(a,b){ return b.mean- a.mean; }
  var currentSortFunction=sortByMean




  IsoFormVis.prototype.build = function($parent){
    var that = this;
    that.axis = that.data.genomeAxis;
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

    var gExonRanges = svg.append("g").attr({
      class:"exonRanges",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    var gIso = svg.append("g").attr({
      class:"isoforms",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    var gHighlight = svg.append("g").attr({
      class:"highlights",
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


    var exonHeight = 15;
    var groupScale = function(x){ return x*(exonHeight+3)};

    function drawIsoforms(isoformList, minMaxValues){
        console.log("list", isoformList);

        var scatterWidth = 200;
        var extraLabel = 100;
        var axisOffset =  that.axis.getWidth() + 10;
        var noIsoforms = isoformList.length;

        width = axisOffset+ scatterWidth+extraLabel;
        height = (exonHeight+3)*noIsoforms;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);

        crosshair.attr({
          "y2":height+margin.top+margin.bottom
        })

        console.log(minMaxValues);
        var scaleXScatter = d3.scale.linear().domain([0,minMaxValues[1]]).range([axisOffset, axisOffset+scatterWidth])

        var menuOffset = -24;
        var menuHeight = 18;




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
              d3.select(this).select(".background").classed("selected", true);
            },
          "mouseout":function(){
            //console.log("mout", d3.event.target)
            d3.select(this).select(".background").classed("selected", false);
          }
        })



        /*
        * reactive background
        * */
        isoformEnter.append("rect").attr({
          width:width+margin.right-2,
          height:exonHeight,
          class:"background"
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


        isoform.select(".background").attr({
          width:width+margin.right-2
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
          "x":function(d,i){return that.axis.genePosToScreenPos(d.start)},
          "y":function(d,i){return 0},
          "width":function(d,i){return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)},
          "height":function(d,i){return height}
      })


      console.log("mergedRanges", mergedRanges);
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
        "x":function(d,i){return that.axis.genePosToScreenPos(d.start)},
        "y":function(d,i){
          return menuOffset},
        "width":function(d,i){return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)},
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
            "class":"exon",
            height:exonHeight
            //y:exonHeight
        })

        // --- changing nodes for exons
        exon.attr({
          width: function(d,i){
            return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)
          },
          x:function(d){return that.axis.genePosToScreenPos(d.start);}
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




        var sampleDot = isoform.select(".foreground").selectAll(".sampleDot").data( function(d,i){return d.weights} );
        sampleDot.exit().remove();

        // --- adding Element to class sampleDot
        var sampleDotEnter = sampleDot.enter().append("circle").attr({
            "class":function(d){return "sampleDot sample"+ cleanSelectors(d.sample);},
            r:3
        }).on({
          "mouseover":function(d){event.fire("sampleHighlight", d.sample, true)},
          "mouseout":function(d){event.fire("sampleHighlight", d.sample, false)},
          "click":function(d){

            if (d3.select(this).classed("selected")){
              //deselect
              event.fire("sampleSelect", d.sample, false)
            }else{
              //select
              event.fire("sampleSelect", d.sample, true)
            }


          }
        }).append("title").text(function(d){return d.sample;})


        // --- changing nodes for sampleDot
        sampleDot.attr({
            cx: function(d){return  scaleXScatter(d.weight)},
            cy: function(){return exonHeight/4+Math.random()*exonHeight/2}
        })

    }


    // event handling for highlights
    function highlightSample(event, sample, highlight){
      var highlightSel = svg.selectAll(".sample"+ cleanSelectors(sample));
      highlightSel.classed("highlighted", highlight).moveToFront();

      if (highlight){
        var lineCoord = [];
        highlightSel.each(function(){
          var trans = d3.transform(d3.select(this.parentNode.parentNode).attr("transform")).translate
          var me = d3.select(this)
          console.log(trans);
          lineCoord.push({
            "x":+me.attr("cx")+trans[0],
            "y":+me.attr("cy")+trans[1]
          })
        })

        var line = d3.svg.line()
          .interpolate("cardinal")
          .x(function(d){return d.x})
          .y(function(d){return d.y});

        //console.log(lineCoord, line(lineCoord));

        console.log(lineCoord.map(function(d){return d.x+" "+ d.y}));

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
      console.log("select", sample, selected, gui.current.getColorForSelection(sample));


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
          highlightG.select(".highlightBG").style({
            opacity:.5
          })


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







    function axisUpdate(){

      svg.attr("height", height+margin.top+margin.bottom)
        .attr("width", width + margin.left + margin.right);

      var exon =svg.selectAll(".exon");

      // --- changing nodes for exons
      exon.transition().attr({
        width: function(d,i){
          return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)
        },
        x:function(d){return that.axis.genePosToScreenPos(d.start);}
      })


      gExonRanges.selectAll(".rangeRect").transition().attr({
        "x":function(d,i){return that.axis.genePosToScreenPos(d.start)},
        "width":function(d,i){return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)}
      })

      gExonRanges.selectAll(".rangeMenu").transition().attr({
        "x":function(d,i){return that.axis.genePosToScreenPos(d.start)},
        "width":function(d,i){return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)}
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
        console.log(a.id, b.id, validNames.indexOf(a.id)>-1,validNames.indexOf(b.id)>-1, validNames);
        var aList = a.ranges.map(function(r){return r.id});
        var bList = b.ranges.map(function(r){return r.id});
        var aValid = false;
        var bValid = false;


        validNames.forEach(function(validName){
          if (aList.indexOf(validName)>-1) aValid=true;
          if (bList.indexOf(validName)>-1) bValid=true;
        })

        //var aValid = validNames.indexOf(a.id)>-1;
        //var bValid = validNames.indexOf(b.id)>-1;
        if ((aValid && bValid) || (!aValid && !bValid) ){
          return b.mean - a.mean;
        }else{
          return bValid?1:-1;
        }

      }
    }

    function resortIsoforms(_, sortingMethod, parameter ){

      console.log("RESORT:",sortingMethod,parameter, sortingMethod === "mean_sorting");

      if (sortingMethod === "mean_sorting"){
        currentSortFunction = sortByMean;
        console.log(currentSortFunction);

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


        var usedIsoformsList =  Object.keys(usedIsoforms).map(function(isokey){
          var res = {weights:usedIsoforms[isokey], id: isokey}
          res.ranges =
            allIsoforms[isokey].exons.map(function(exKey){
              var ex = allExons[exKey];
              return {"start": ex.start, "end": ex.end, "id": ex.id}
            });


          res.mean = d3.mean(res.weights.map(function(d){return d.weight;}))
          return res;

        })

        console.log("used iso:",usedIsoforms, minMax);


        // update the map between sample and a unique css-save selectorName
        sampleSelectorMap = {};
        usedIsoformsList[0].weights.forEach(function(d,i){
          sampleSelectorMap[d.sample] = i;
        })


        drawIsoforms(usedIsoformsList, minMax);

      })

    }






    gui.current.addUpdateEvent(updateData);


    event.on("axisChange", axisUpdate)

    return head.node();

  }





  exports.IsoFormVis = IsoFormVis;
  exports.create = create;


})
