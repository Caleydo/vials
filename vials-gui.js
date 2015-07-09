/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 2/25/15.
 */

define(['exports','d3', '../caleydo_web/event'], function(exports, d3, event){

  function VialsGUI(){
    var that = this;

    this.projectSelector = d3.select("#projectSelect");

    this.geneSelector = d3.select("#geneSelect");

    this.chromIDDiv = d3.select("#chromosomeInfo");

    this.startPosDiv = d3.select("#startPos");

    this.strandDiv = d3.select("#strandInfo")

    this.toggleIntrons = d3.select("#toggleIntrons");

    this.isoformSort = d3.select("#isoformSort")

    this.baseWidthInputDiv = d3.select("#baseWidth").attr({
      type:"text",
      value:"1500"
    })

    this.allVisUpdates= [];


    // TODO: delete this after iso implementation
    this.isoForm = null;

    this.mappedColors = d3.map();
    this.availableColors = d3.scale.category10().range().map(function(d){return d}).reverse();


    this.getColorForSelection=function(name){
      if (!(that.mappedColors.has(name))){
        var theColor = "#666666"
        if (that.availableColors.length>0){
          theColor =that.availableColors.pop()
        }

        that.mappedColors.set(name,theColor);
      }


      return that.mappedColors.get(name);
    }

    this.releaseColorForSelection= function(name){
      if (that.mappedColors.has(name)){
          var theColor = that.mappedColors.get(name);

          if (theColor!="#666666"){
            that.availableColors.push(theColor);
          }
          that.mappedColors.remove(name)

      }

    }




    this.init = function (genomeDataLink) {
      that.genomeDataLink = genomeDataLink;
      d3.select("#toggleIntrons").on({
        click: function () {
          var el = d3.select(this);
          if (el.classed("buttonSelected")){
            // de-activate
            el.classed("buttonSelected", false);
            that.genomeDataLink.genomeAxis.shrinkIntrons(false);
            event.fire("axisChange");

          }else{
           el.classed("buttonSelected", true);
            that.genomeDataLink.genomeAxis.shrinkIntrons(true);
            event.fire("axisChange");
          }
        }
      })


      d3.select("#decreaseWidth").on("click", function () {
        that.genomeDataLink.getGeneData(that.getSelectedProject(), that.getSelectedGene()).then(function(geneData) {
          that.genomeDataLink.genomeAxis.avrgExonLength = Math.max(that.genomeDataLink.genomeAxis.avrgExonLength - 10, 10);
          that.genomeDataLink.genomeAxis.calculateBreakPointsByGenePos(geneData.gene["merged_ranges"])
          event.fire("redrawAllVis");
        })
      })

      d3.select("#increaseWidth").on("click", function () {
        that.genomeDataLink.getGeneData(that.getSelectedProject(), that.getSelectedGene()).then(function(geneData) {
        that.genomeDataLink.genomeAxis.avrgExonLength = that.genomeDataLink.genomeAxis.avrgExonLength +10;
        that.genomeDataLink.genomeAxis.calculateBreakPointsByGenePos(geneData.gene["merged_ranges"])
        event.fire("redrawAllVis");
        })
      })


      that.isoformSort.on({
        "change":function(){
          event.fire("isoformSort",$(that.isoformSort.node()).val(), null);


          //console.log($(that.isoformSort.node()).val());
        }
      })


      event.on("isoformSort", function(event, method, parameter){
        if (method=="byExon"){
          $(that.isoformSort.node()).val("byExon");
        }
      })

      function defineButtonFire(bName){
        d3.select("#"+bName).on("click", function(){
          event.fire(bName, !d3.select(this).classed("buttonSelected"));
        })

        event.on(bName, function (e,state) {
          d3.select("#"+bName).classed("buttonSelected",state);
        })


      }

      defineButtonFire("dotsJittering");
      defineButtonFire("overlayDots");

    }

    event.on("redrawAllVis", function(){
      that.allVisUpdates.forEach(function (update) {
        update();
      })
    })


    this.populateGeneData= function(project, geneName){
      that.genomeDataLink.getGeneData(project, geneName).then(function(geneData){
        $(that.chromIDDiv.node()).val(geneData.gene.chromID);
        $(that.startPosDiv.node()).val(geneData.gene.start);
        $(that.strandDiv.node()).val(geneData.gene.strand);

        that.genomeDataLink.genomeAxis.setGeneStartEnd(geneData.gene.start,geneData.gene.end)
        that.genomeDataLink.genomeAxis.calculateBreakPointsByGenePos(geneData.gene["merged_ranges"])
        that.genomeDataLink.genomeAxis.shrinkIntrons(true);

        //console.log(that.genomeDataLink.genomeAxis.arrayPosToScreenPos(2), that.genomeDataLink.genomeAxis.arrayPosToGenePos(10));
        //observer
        that.allVisUpdates.forEach(function (update) {
          update();
        })
      })

    };


    function updateGeneSelector(selectedProject, selectedGene) {
      //console.log(that.genomeDataLink.getAllGenes(selectedProject));
      that.genomeDataLink.getAllGenes(selectedProject).then(function (genes) {

        that.geneSelector.selectAll("option").remove();
        genes.forEach(function (gene) {
          that.geneSelector.append("option")
            .attr("selected", (gene==selectedGene)?true:null)
            .attr('value', gene)
            .text(gene);
        })

        that.populateGeneData($(that.projectSelector.node()).val(), $(that.geneSelector.node()).val());

        // activate GeneSelector
        that.geneSelector.on({
          "change": function () {
            that.populateGeneData($(that.projectSelector.node()).val(), $(that.geneSelector.node()).val());
          }
        })

      });
    }

    this.start = function(selectedProject, selectedGene, exonLength){
      that.genomeDataLink.genomeAxis.avrgExonLength = +exonLength || 30;
      that.genomeDataLink.getAllProjects().then(function (projects) {
        //console.log("allProjects", projects);

        selectedProject = selectedProject || Object.keys(projects)[0]

        Object.keys(projects).forEach(function (projectID, index) {

          that.projectSelector.append("option")
            .attr("selected", (projectID==selectedProject)?true:null)
            .attr("value", projectID)
            .text(projectID + " ("+projects[projectID].data[0]["data_type"]+")")

        });

        that.projectSelector.on({
          "change": function () {
            updateGeneSelector($(that.projectSelector.node()).val())
          }
        });

        updateGeneSelector(selectedProject, selectedGene);
      })

    };


    this.getSelectedProject = function(){
      return $(that.projectSelector.node()).val();
    }

    this.getSelectedGene = function(){
      return $(that.geneSelector.node()).val();
    }


    this.addUpdateEvent= function(updateFunction){
      that.allVisUpdates.push(updateFunction);
    }


    this.getStartPos = function()  {
      return parseInt($(that.startPosDiv.node()).val())
    }

    this.getBaseWidth = function()  {
      return  parseInt($(that.baseWidthInputDiv.node()).val())
    }



  }






  var globalGUI = new VialsGUI();

  exports.VialsGUI = VialsGUI;
  exports.current = globalGUI;


  //exports.geneSelector = globalGUI.geneSelector;
  //exports.init = globalGUI.init;
  //exports.start = globalGUI.start;
  //exports.allVisUpdates = globalGUI.allVisUpdates;




})
