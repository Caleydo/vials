/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//register all extensions in the registry following the given pattern
module.exports = function(registry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./src/extension_impl'); }, {});
  // generator-phovea:begin
  registry.push('datatype', 'caleydo-genome-data-link', function() { return System.import('./src/caleydo-genome-data-link'); }, {});

  registry.push('vis', 'vials-isoforms', function() { return System.import('./src/vials-isoforms'); }, {
  'name': 'Alternative Splicing - IsoForms',
  'size': [
   840,
   300
  ],
  'filter': 'caleydo-genome-data-link'
 });

  registry.push('vis', 'vials-junctions', function() { return System.import('./src/vials-junctions-v2'); }, {
  'name': 'Alternative Splicing - Junctions',
  'size': [
   840,
   2000
  ],
  'filter': 'caleydo-genome-data-link'
 });

  registry.push('vis', 'vials-reads', function() { return System.import('./src/vials-read-v2'); }, {
  'name': 'Alternative Splicing - Read Abundance',
  'size': [
   840,
   2000
  ],
  'filter': 'caleydo-genome-data-link'
 });

  registry.push('vis', 'vials-axis', function() { return System.import('./src/vials-genome-axis'); }, {
  'name': 'Alternative Splicing - Axis',
  'size': [
   840,
   2000
  ],
  'filter': 'caleydo-genome-data-link'
 });

  registry.push('app', 'vials', function() { return System.import('./src/'); }, {
  'name': 'Vials'
 });
  // generator-phovea:end
};

