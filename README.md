# caleydo-altsplice

visualization of alternative splicing events in genes

## Pre-conditions: 
Server-side:
 * Install [caleydo-web-server](https://github.com/Caleydo/caleydo-web-server). This will set up a virtual machine that you can run through Vagrant. For details see documentation of caleydo-web-server.
 * Install [genomebrowser-server](https://github.com/Caleydo/genomebrowser-server) in external directory of caleydo-web-server. This should be installed within the vagrant virtual machine, especially when you're working on a non-unix system, as the OS on the VM is a Linux and you could mess up line-endings otherwise.
 
Client-side:
 * Install [caleydo-web](https://github.com/Caleydo/caleydo-web)
 * Install this repository in the claeydo-web/external folder

## Running altspice
* Go to claeydo-web-server directory and run `vagrant up`
* SSH into vagrant using `vagrant ssh`
* Go to folder `/vagrant/` (the caleydo-web-server directory)
* To update: pull in this direcotry, pull in subdirectory `/vagrant/external/genomebrowser-server`
* Run `source /vagrant/run.sh`




