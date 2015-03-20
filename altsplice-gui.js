/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 2/25/15.
 */

define(['exports','d3', '../caleydo/event'], function(exports, d3, event){

  function AltSpliceGUI(){
    var that = this;

    this.projectSelector = d3.select("#projectSelect");

    this.geneSelector = d3.select("#geneSelect");

    this.chromIDDiv = d3.select("#chromosomeInfo");

    this.startPosDiv = d3.select("#startPos");

    this.toggleIntrons = d3.select("#toggleIntrons")

    this.baseWidthInputDiv = d3.select("#baseWidth").attr({
      type:"text",
      value:"1500"
    })

    this.allVisUpdates= [];


    this.init = function (genomeDataLink) {
      that.genomeDataLink = genomeDataLink;
      d3.select("#toggleIntrons").on({
        click: function () {
          var el = d3.select(this);
          if (el.classed("btn-primary")){
            // de-activate
            el.classed("btn-primary", false);
          }else{
           el.classed("btn-primary", true);
          }
        }
      })
    }


    this.populateGeneData= function(project, geneName){
      that.genomeDataLink.getGeneData(project, geneName).then(function(geneData){
        $(that.chromIDDiv.node()).val(geneData.gene.chromID);
        $(that.startPosDiv.node()).val(geneData.gene.start);

        //observer
        that.allVisUpdates.forEach(function (update) {
          update();
        })
      })

    };


    function updateGeneSelector(selectedProject) {
      console.log(that.genomeDataLink.getAllGenes(selectedProject));
      that.genomeDataLink.getAllGenes(selectedProject).then(function (genes) {


        genes.forEach(function (gene) {
          that.geneSelector.selectAll("option").remove();
          that.geneSelector.append("option").attr('value', gene).text(gene);
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

    this.start = function(selectedProject){
      that.genomeDataLink.getAllProjects().then(function (projects) {
        console.log("allProjects", projects);

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

        updateGeneSelector(selectedProject);
      })

    };



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






  var globalGUI = new AltSpliceGUI();

  exports.AltSpliceGUI = AltSpliceGUI;
  exports.current = globalGUI;


  //exports.geneSelector = globalGUI.geneSelector;
  //exports.init = globalGUI.init;
  //exports.start = globalGUI.start;
  //exports.allVisUpdates = globalGUI.allVisUpdates;




})
