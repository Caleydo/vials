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




    function drawIsoForms(geneInfo, samples, geneInformation){

        var exonHeight = 15;
        var scatterWidth = 200;
        var axisOffset =  that.axis.getWidth() + 10;
        var noIsoforms = geneInformation.mRNAs.length;

        width = axisOffset+ scatterWidth;
        height = exonHeight*noIsoforms;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);

        var scaleY = function(x){ return x*(exonHeight+3)};
        var scaleXScatter = d3.scale.linear().domain([0,1]).range([axisOffset, width])




        /*
        * ========================
        * Manage .isoform - Groups
        * =========================
        * */
        var isoform = gIso.selectAll(".isoform").data(geneInformation.mRNAs);
        isoform.exit().remove();

        // --- adding Element to class isoform
        var isoformEnter = isoform.enter().append("g").attr({
            "class":"isoform"
        })

        // --- changing nodes for isoform
        isoform.attr({
            "transform":function(d,i) {return "translate("+10+","+scaleY(i)+")";}
        })


        /*
        * reactive background
        * */
        isoformEnter.append("rect").attr({
          width:width,
          height:exonHeight,
          class:"background"
        }).on({
          "mouseover": function(d){d3.select(this).classed("selected", true);},
          "mouseout": function(d){d3.select(this).classed("selected", false);},
          "click":function(d, i){
            console.log(d,i);
            var el = d3.select(this);
            if (el.classed("fixed")){
              el.classed("fixed", false);
              currentlySelectedIsoform = null;
              event.fire("isoFormSelect", {isoform:d, index:-1});
            } else{
              el.classed("fixed", true);
              if (currentlySelectedIsoform) currentlySelectedIsoform.classed("fixed", false);
              currentlySelectedIsoform = el;
              event.fire("isoFormSelect", {isoform:d, index:i})
            }

          }
        })




      /*
       * ========================
       * Draw exon abstractions
       * =========================
       * */
        var exonInfo = geneInformation.exons;
        var exon = isoform.selectAll(".exon").data(function(d){
          //console.log(d);
          return d.map(function(index){return exonInfo[index]})});
        exons.exit().remove();

        // --- adding Element to class exons
        var exonEnter = exon.enter().append("rect").attr({
            "class":"exon",
            height:exonHeight
            //y:exonHeight
        })

        // --- changing nodes for exons
        exon.attr({
          width: function(d,i){
            //console.log(d,i);
            //return (d[1]- d[0]) * that.axis.rangeBand();
            return that.axis.getXPos(d[1])- that.axis.getXPos(d[0]);
          },
          x:function(d){return that.axis.getXPos(d[0]);}
        })


      /*
       * ===============
       * Draw samples
       * ===============
       * */

      //console.log(that.axis);


        var sampleDot = isoform.selectAll(".sampleDot").data(
          function(d,i){return samples.map(
            function(sample){
              //console.log( "sample",sample);
              return sample.psis[i]
            })
          });
        sampleDot.exit().remove();

        // --- adding Element to class sampleDot
        var sampleDotEnter = sampleDot.enter().append("circle").attr({
            "class":"sampleDot",
            r:5

        })

        // --- changing nodes for sampleDot
        sampleDot.attr({
            cx: function(d){return  scaleXScatter(d)},
            cy: exonHeight/2
        })

    }




    function updateData(){
      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth();

      that.data.getSamples(curGene,startPos,baseWidth).then(function(sampleData) {
        that.data.getAllGenes().then(function(allGenes){
          console.log("allGenes", allGenes[curGene]);
          //console.log(sampleData);
          // TODO: generated fake data here for PSIs
          var noIsoforms = allGenes[curGene].mRNAs.length;
          Object.keys(sampleData.samples).forEach(function(sampleKey){
            //console.log(sampleData.samples[sampleKey]);

            var sumPsi = 0;
            var psis = d3.range(0,noIsoforms).map(function(){
              var psi = Math.random();
              sumPsi += psi;
              return psi;
            })
            if (sumPsi>0){
              psis.map(function(d){return d/sumPsi;});
              sampleData.samples[sampleKey].psis = psis;
            }

          })
          // -- end of fake ---

          drawIsoForms(
            sampleData.geneInfo,
            Object.keys(sampleData.samples).map(function(sampleKey){return sampleData.samples[sampleKey]}),
            allGenes[curGene]
          );
        })


      })

    }


    gui.current.addUpdateEvent(updateData);

    return head.node();

  }





  exports.IsoFormVis = IsoFormVis;
  exports.create = create;


})
