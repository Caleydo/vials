/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 2/25/15.
 */

define(['exports', 'd3', 'jquery', '../caleydo_core/event', 'selectivity', 'lodash'], function (exports, d3, $, event, selectivity, _) {

  //'../bower_components/selectivity/dist/selectivity-full.js'
  function VialsGUI() {
    var that = this;

    this.chromIDDiv = d3.select("#chromosomeInfo");

    this.startPosDiv = d3.select("#startPos");

    this.strandDiv = d3.select("#strandInfo");

    this.toggleIntrons = d3.select("#toggleIntrons");

    //this.increaseSize = d3.select('#increaseSize');


    this.baseWidthInputDiv = d3.select("#baseWidth").attr({
      type: "text",
      value: "1500"
    });

    this.allVisUpdates = [];

    var $projectSelector = $('#projectSelector');
    var $geneSelector = $('#geneSelector');


    // TODO: delete this after iso implementation
    this.isoForm = null;

    this.mappedColors = d3.map();
    //this.availableColors = d3.scale.category10().range().map(function (d) {
    //  if (d!='#d62728') return d;
    //  else return '#aabbcc'
    //}).reverse();

    //google colors (http://bl.ocks.org/aaizemberg/78bd3dade9593896a59d) witout red ( "#dc3912", "#dd4477","#b82e2e",)
    this.availableColors =
      ["#3366cc", "#ff9900", "#109618", "#990099", "#0099c6",
        "#66aa00", "#316395", "#994499", "#22aa99", "#aaaa11",
        "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6",
        "#3b3eac"].reverse();


    this.getColorForSelection = function (name) {
      if (!(that.mappedColors.has(name))) {
        var theColor = "#666666";
        if (that.availableColors.length > 0) {
          theColor = that.availableColors.pop()
        }

        that.mappedColors.set(name, theColor);
      }


      return that.mappedColors.get(name);
    };

    this.releaseColorForSelection = function (name) {
      if (that.mappedColors.has(name)) {
        var theColor = that.mappedColors.get(name);

        if (theColor != "#666666") {
          that.availableColors.push(theColor);
        }
        that.mappedColors.remove(name)

      }

    };


    this.init = function (genomeDataLink) {
      that.genomeDataLink = genomeDataLink;
      d3.select("#toggleIntrons").on({
        click: function () {
          var el = d3.select(this);
          if (el.classed("buttonSelected")) {
            // de-activate
            el.classed("buttonSelected", false);
            that.genomeDataLink.genomeAxis.shrinkIntrons(false);
            event.fire("axisChange");

          } else {
            el.classed("buttonSelected", true);
            that.genomeDataLink.genomeAxis.shrinkIntrons(true);
            event.fire("axisChange");
          }
        }
      });


      d3.select("#decreaseSize").on("click", function () {
        that.genomeDataLink.getGeneData(that.getSelectedProject(), that.getSelectedGene()).then(function (geneData) {
          that.genomeDataLink.genomeAxis.avrgExonLength = Math.max(that.genomeDataLink.genomeAxis.avrgExonLength - 10, 10);
          that.genomeDataLink.genomeAxis.calculateBreakPointsByGenePos(geneData.gene["merged_ranges"]);
          event.fire("updateVis");
        })
      });

      d3.select("#increaseSize").on("click", function () {
        that.genomeDataLink.getGeneData(that.getSelectedProject(), that.getSelectedGene()).then(function (geneData) {
          that.genomeDataLink.genomeAxis.avrgExonLength = that.genomeDataLink.genomeAxis.avrgExonLength + 10;
          that.genomeDataLink.genomeAxis.calculateBreakPointsByGenePos(geneData.gene["merged_ranges"]);
          event.fire("updateVis");
        })
      });


      function defineButtonFire(bName) {
        d3.select("#" + bName).on("click", function () {
          event.fire(bName, !d3.select(this).classed("buttonSelected"));
        });

        event.on(bName, function (e, state) {
          d3.select("#" + bName).classed("buttonSelected", state);
        })


      }

      defineButtonFire("dotsJittering");
      defineButtonFire("overlayDots");


      $projectSelector.selectivity({
        //allowClear: true,
        items: ['Amsterdam', 'Antwerp'/*, ...*/],
        placeholder: 'No project selected'
      });

      $geneSelector.selectivity({
        ajax: {},
        readOnly: true,
        templates: {
          resultItem: function (item) {
            return (
              '<div class="selectivity-result-item" data-item-id="' + item.id + '">' +
              '<b>' + item.text + '</b> (' + item.id + ')<br>' +
              item.description +
              '</div>'
            );
          },
          singleSelectedItem: function (options) {
            return (
              '<span class="selectivity-single-selected-item" ' +
              'data-item-id="' + escape(options.id) + '">' +
              (options.removable ? '<a class="selectivity-single-selected-item-remove">' +
              '<i class="fa fa-remove"></i>' +
              '</a>'
                : '') +
              options.text + ' (' + options.id +
              ')</span>'
            );
          },
        },
        placeholder: 'No gene selected'
      });


    };

    //TODO: remove this after fixing increase and decrease width
    event.on("redrawAllVis", function () {
      that.allVisUpdates.forEach(function (update) {
        update();
      })
    });


    this.populateGeneData = function (projectIDitem, geneID) {
      $('#startScreenText')
        .html(' Loading.. ') //<span class="glyphicon glyphicon-refresh glyphicon-spin" ></span>
      $('#vialsLogo').addClass('fa-spin-custom')

      $(that.chromIDDiv.node()).val('-');
      $(that.startPosDiv.node()).val('---');
      $(that.strandDiv.node()).val('?');
      history.pushState({
        project: projectIDitem.id,
        gene: geneID
      }, 'Title', location.pathname + '?projectID=' + projectIDitem.id + '&geneID=' + geneID)

      $('#vials_vis').fadeOut(function () {
        $('.startScreen').fadeIn(
          loadData
        )
      })

      function loadData() {
        that.genomeDataLink.getGeneData(projectIDitem['id'], geneID).then(function (geneData) {
          $('.startScreen').fadeOut('fast', function () {
            $('#vials_vis').fadeTo('fast', 1)
          })

          //$('#startScreen').find('img').removeClass('fa-spin-custom')


          $(that.chromIDDiv.node()).val(geneData.gene.chromID);
          $(that.startPosDiv.node()).val(geneData.gene.start + "-" + geneData.gene.end);
          $(that.strandDiv.node()).val(geneData.gene.strand);

          //that.genomeDataLink.genomeAxis.avrgExonLength = 30;
          that.genomeDataLink.genomeAxis.setGeneStartEnd(geneData.gene.start, geneData.gene.end);
          that.genomeDataLink.genomeAxis.calculateBreakPointsByGenePos(geneData.gene["merged_ranges"]);
          that.genomeDataLink.genomeAxis.shrinkIntrons(true);

          event.fire("newDataLoaded");
        })
      }


    };


    this.getAjaxConfiguration = function (projectID) {
      return {
        url: this.genomeDataLink.serveradress + '/geneselect',
        dataType: 'json',
        minimumInputLength: 1,
        quietMillis: 250,
        params: function (term, offset) {
          return {projectID: projectID, selectFilter: term}
        },
        processItem: function (item) {
          return {
            id: item.id,
            text: item.name || '---',
            description: item.desc || '---'
          }
        },
        results: function (data, offset) {

          return {
            results: data,
            more: false


          }
        }
      }


    }


    this.currentGeneSelectorCall = function () {

    };


    function updateGeneSelector(projectIDitem, selectedGene) {

      var ajax = that.getAjaxConfiguration(projectIDitem['id'])
      $geneSelector.selectivity('setOptions', {ajax: ajax})
      $geneSelector.off('change', that.currentGeneSelectorCall)


      if (selectedGene) {
        that.genomeDataLink.getAllGeneNames(projectIDitem['id'], selectedGene).then(function (selGeneInfoArray) {
          if (selGeneInfoArray.length == 1) { // if there is one result coming back from the exact matching
            var selGeneInfo = selGeneInfoArray[0];
            var geneIDitem = {
              id: selGeneInfo.id,
              text: (selGeneInfo.name ? selGeneInfo.name : '---') + " (" + selGeneInfo.id + ") "
            }
            $geneSelector.selectivity('data', geneIDitem)
            that.populateGeneData(projectIDitem, selGeneInfo.id)
          }

        })
      } else {
        $geneSelector.selectivity('data', null);
        $(that.chromIDDiv.node()).val('-');
        $(that.startPosDiv.node()).val('---');
        $(that.strandDiv.node()).val('?');
        $('#startScreenText')
          .html(' please select a gene ') //<span class="glyphicon glyphicon-refresh glyphicon-spin" ></span>
        $('#vialsLogo').removeClass('fa-spin-custom')
        $('#vials_vis').fadeOut(function () {
          $('.startScreen').fadeIn(

          )
        })

      }


      that.currentGeneSelectorCall = function (event) {
        that.populateGeneData(projectIDitem, event.value)
      }
      $geneSelector.on('change', that.currentGeneSelectorCall)


    }

    this.start = function (selectedProjectID, selectedGene, exonLength) {
      that.genomeDataLink.genomeAxis.avrgExonLength = +exonLength || 30;
      that.genomeDataLink.getAllProjects().then(function (projects) {


        var selectedProjectID = selectedProjectID || Object.keys(projects)[0];
        var selectedProjectItem = null;


        var itemList = Object.keys(projects).map(function (projectID, index) {
          var current_project = projects[projectID];
          var res = {id: current_project['project_id'], text: current_project['name']};
          if (projectID === selectedProjectID) selectedProjectItem = res;
          return res;
        });


        $projectSelector.selectivity({
          items: itemList,
          placeholder: 'No project selected'
        });


        if (selectedProjectItem) {
          $projectSelector.selectivity('data', selectedProjectItem);
          $geneSelector.selectivity('setOptions', {readOnly: false});
          updateGeneSelector(selectedProjectItem, selectedGene);
        }

        $projectSelector.on('change', function (event) {

          updateGeneSelector({id: event.value}, null);

        });


      })


    };


    this.getSelectedProject = function () {
      return $projectSelector.selectivity('value');
    };


    this.getSelectedGene = function () {
      return $geneSelector.selectivity('value');
    };

    this.getStartPos = function () {
      return parseInt($(that.startPosDiv.node()).val())
    };

    this.getBaseWidth = function () {
      return parseInt($(that.baseWidthInputDiv.node()).val())
    }


  }


  var globalGUI = new VialsGUI();

  exports.VialsGUI = VialsGUI;
  exports.current = globalGUI;


  //exports.geneSelector = globalGUI.geneSelector;
  //exports.init = globalGUI.init;
  //exports.start = globalGUI.start;
  //exports.allVisUpdates = globalGUI.allVisUpdates;


});
