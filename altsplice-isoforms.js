/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 3/2/15.
 */


define(['exports', 'd3', 'altsplice-gui'], function (exports, d3, gui) {
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


  var margin = {top: 40, right: 10, bottom: 20, left: 10},
    width = 640 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;


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
        "position":"relative"

      })


    svg.append("rect").attr({
      x:10,
      y:10,
      width:100,
      height:50
    })





    function updateData(){
      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth();

      that.data.getSamples(curGene,startPos,baseWidth).then(function(sampleData) {
        console.log(sampleData);

      })

    }



    gui.current.addUpdateEvent(updateData);


    return head.node();

  }





  exports.IsoFormVis = IsoFormVis;
  exports.create = create;


})
