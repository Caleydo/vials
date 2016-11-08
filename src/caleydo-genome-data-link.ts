'use strict';

import * as C from 'phovea_core/src/index';
import * as datatypes from 'phovea_core/src/datatype';
import * as LRUCache from 'lru-fast';
import * as $ from 'jquery';
import * as brokenAxis from './caleydo-broken-axis';
import * as _ from 'lodash';
import * as d3 from 'd3';

//noinspection Annotator

export const GenomeDataLink = datatypes.defineDataType('caleydo-genome-data-link', {
  init: function (desc) {
    this.serveradress = desc.serveradress;
    this.sampleCache = new LRUCache(5); // create a cache of size 5
    this.geneCache = new LRUCache(5); // create a cache of size 5
    this.allGenes = null;
    this.bamHeader = null;
    this.allProjects = null;
    this.options = {"showIntrons": true};
    this.genomeAxis = brokenAxis.create(600, this.options);
    this.localFileName = null;
    this.localFileData = null;
    this.groups = {}
    this.groupRetainCount = {}
  },

  useFile: function (fileName) {
    this.localFileName = fileName;
    this.localFileData = $.getJSON(fileName);
  },


  getGeneData: function (projectID, geneName) {
    var cacheID = projectID + "==>" + geneName;

    var res = this.geneCache.get(cacheID);

    if (!res) {

      if (this.localFileName) {
        // -- localFile handling
        var that = this;

        res = new Promise(function (resolve, reject) {
          that.localFileData.then(function (localData) {

            var res = {
              "gene": localData.gene,
              "measures": localData.measures,
              "samples": localData.samples
            }

            resolve(res)

          })
        })

      } else {
        // regular server handling
        var parameters = [];
        parameters.push("geneID=" + encodeURIComponent(geneName));
        parameters.push("projectID=" + encodeURIComponent(projectID));
        // if (startPos) parameters.push("pos="+encodeURIComponent(startPos));
        // if (baseWidth) parameters.push("baseWidth="+encodeURIComponent(baseWidth))

        res = $.getJSON(this.serveradress + "/geneinfo?" + parameters.join("&"));
      }

      this.geneCache.put(cacheID, res);

    }

    return res;
  },


  /**
   * current format:
   * {
        *  "hen01": {
        *    "dir": ".//_data/vials_projects/hen01.vials_project",
        *    "info": {
        *      "bam_root_dir": "/vagrant_external/bodyMap_broad_igv/indexed",
        *      "gene_name_mapped": "event_names_enriched",
        *      "id_type_guessed": "ensembl",
        *      "project_type": "miso",
        *      "ref_genome": "hg19"
        *    },
        *    "name": "hen01",
        *    "project_id": "hen01"
        *  }
        *}
   * @returns {null|*}
   */
  getAllProjects: function () {

    if (this.localFileName) {
      // -- localFile handling

      var projects = {};
      projects[this.localFileName] = {"data": [{"data_type": "file"}]}

      if (this.allProjects === null)
        this.allProjects = Promise.resolve(projects);
    } else {
      // -- server handling
      if (this.allProjects === null)
        this.allProjects = $.getJSON(this.serveradress + "/projects");
    }

    return this.allProjects;
  },

  getAllGeneNames: function (projectID, geneDescriptor) {
    return $.getJSON(this.serveradress + "/geneselect?projectID=" + projectID + "&selectFilter=" + geneDescriptor + "&exactMatch=True")
  },

  /*
   *
   * Status Variables
   *
   * */


  setGroup: function (idList) {

    var grpID = idList.map(function (d) {
      return _.slice(d, 0, 2).join('')
    }).join('_')
    var groupName = _.uniqueId('grp_' + grpID + '-')
    this.groups[groupName] = idList;
    this.groupRetainCount[groupName] = 0;
    return groupName;
  },
  retainGroup: function (groupName) {
    this.groupRetainCount[groupName]++;
  },
  releaseGroup: function (groupName) {
    if (groupName in this.groupRetainCount && this.groupRetainCount[groupName] > 1) {
      this.groupRetainCount[groupName]--;
    }
    else {
      if (groupName in this.groups) {
        delete this.groups[groupName]
        return true;
      }
    }

  },
  getGroup: function (groupName) {
    if (groupName in this.groups) {
      return {
        name: groupName,
        samples: this.groups[groupName]
      }
    } else {
      return null;
    }
  },
  //removeGroup: function(groupName){
  //    if (groupName in this.groupings){
  //        delete this.groupings[groupName]
  //        return true;
  //    }
  //    return false;
  //},
  clearAllGroups: function () {
    this.groups = {}
    this.groupRetainCount = {}
  },
  getGroups: function () {
    return _.map(this.groups, function (v, k) {
      return {
        name: k,
        samples: v
      }
    })
  }


});

export function create(desc) {
  return new GenomeDataLink(desc);
}

/*
 !! this file makes use of the js-lru implementation from https://github.com/rsms/js-lru

 License:
 Copyright (c) 2010 Rasmus Andersson http://hunch.se/

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

