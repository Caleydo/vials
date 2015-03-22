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


  var margin = {top: 10, right: 10, bottom: 20, left: 0},
    width = 900 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  var currentlySelectedIsoform = null;


  IsoFormVis.prototype.build = function($parent){
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
      class:"isoforms",
      "transform":"translate("+margin.left+","+margin.top+")"
    })




    function drawIsoforms(isoformList, minMaxValues){
        console.log("list", isoformList);

        var exonHeight = 15;
        var scatterWidth = 200;
        var axisOffset =  that.axis.getWidth() + 10;
        var noIsoforms = isoformList.length;

        width = axisOffset+ scatterWidth;
        height = (exonHeight+3)*noIsoforms;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);

        var scaleY = function(x){ return x*(exonHeight+3)};
        var scaleXScatter = d3.scale.linear().domain([0,minMaxValues[1]]).range([axisOffset, width])




        /*
        * ========================
        * Manage .isoform - Groups
        * =========================
        * */
        var isoform = gIso.selectAll(".isoform").data(isoformList, function (d) {return d.id });
        isoform.exit().remove();

        // --- adding Element to class isoform
        var isoformEnter = isoform.enter().append("g").attr({
            "class":"isoform"
        })

        // --- changing nodes for isoform
        isoform.attr({
            "transform":function(d,i) {return "translate("+0+","+scaleY(i)+")";}
        })


        /*
        * reactive background
        * */
        isoformEnter.append("rect").attr({
          width:width+margin.right-2,
          height:exonHeight,
          class:"background"
        }).on({
          "mouseover": function(){d3.select(this).classed("selected", true);},
          "mouseout": function(){d3.select(this).classed("selected", false);},
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




      /*
       * ========================
       * Draw exon abstractions
       * =========================
       * */

        var exon = isoform.selectAll(".exon").data(function(d){return d.ranges});
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



        var sampleSelectorMap = {};
        isoformList[0].weights.forEach(function(d,i){
          sampleSelectorMap[d.sample] = i;
        })

        function cleanSelectors(sel){return sampleSelectorMap[sel]}

        var sampleDot = isoform.selectAll(".sampleDot").data( function(d,i){return d.weights} );
        sampleDot.exit().remove();

        // --- adding Element to class sampleDot
        var sampleDotEnter = sampleDot.enter().append("circle").attr({
            "class":function(d){return "sampleDot sample"+ cleanSelectors(d.sample);},
            r:3

        }).on({
          "mouseover":function(d){svg.selectAll(".sample"+ cleanSelectors(d.sample)).classed("highlighted", true);},
          "mouseout":function(d){svg.selectAll(".sample"+ cleanSelectors(d.sample)).classed("highlighted", false);}
        })

        // --- changing nodes for sampleDot
        sampleDot.attr({
            cx: function(d){return  scaleXScatter(d.weight)},
            cy: function(){return exonHeight/4+Math.random()*exonHeight/2}
        })

    }



    function axisUpdate(){

      var exon =svg.selectAll(".exon");

      // --- changing nodes for exons
      exon.transition().attr({
        width: function(d,i){
          return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)
        },
        x:function(d){return that.axis.genePosToScreenPos(d.start);}
      })
    }



    function updateData(){
      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth(),
        curProject = gui.current.getSelectedProject();

      that.data.getGeneData(curProject, curGene).then(function(sampleData) {
        //d3.nest().key(function(k){return k.key}).map(a)

        var minMax = d3.extent(sampleData.measures.isoforms, function (d) {
          return d.weight;
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
              return {"start": ex.start, "end": ex.end}
            });

          return res;

        })

        console.log("used iso:",usedIsoforms, minMax);

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
