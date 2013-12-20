
function GUI() {
	this.api = 'http://lahdenvuo.info/social/';

	// Will be loaded later.
	this.channels = null;
	this.channel = null;
	this.graph = null;
	this.current = '';
}

GUI.prototype.loadChannels = function(cb) {
	var self = this;

	d3.json(self.api + 'channel', function (channels) {
		self.channels = channels;

		var chan = window.location.hash.substr(1);

		self.channel = (channels.indexOf(chan) !== -1) ? chan : channels[0];

		cb();
	});
};

GUI.prototype.initGUI = function() {
	var self = this;

	var gui = self.gui = new dat.GUI();

	gui.close();

	gui.add(self, 'fullscreen')
		.name('Toggle Fullscreen');

	gui.add(self, 'channel', self.channels)
		.name('Select Channel')
		.onFinishChange(self.loadGraph.bind(self));

	var algos = gui.addFolder('Algorithms');
	algos.open();

	self.bfsButt = algos.add(self, 'bfs')
		.name('BFS');
};

GUI.prototype.bfs = function () {
	var self = this;

	if (self.current === 'bfs') {
		self.bfsButt.name('BFS');
		self.loadGraph();
		return;
	}

	self.bfsButt.name('Select start node');

	self.graph.elements.nodes.on('click.bfs', function (node) {
		deleteGraph();
		self.bfsButt.name('Close BFS');
		self.graph.elements.nodes.on('click.bfs', null);
		self.graph = undefined;
		self.current = 'bfs';

		d3.json(self.api + 'bfs/' + self.channel + '/' + node.label + '.json', function (data) {
			self.graph = initTree(data);
		});
	});
};

GUI.prototype.loadGraph = function () {
	var self = this

	if (this.graph) {
		deleteGraph();
	}

	d3.json(self.api + 'channel/' + self.channel + '.json', function (data) {
		window.location.hash = self.channel;
		self.graph = initGraph(data);
		self.current = 'graph';
	});
};

GUI.prototype.fullscreen = function () {
	if (!document.fullscreenElement &&    // alternative standard method
		!document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
		if (document.documentElement.requestFullscreen) {
			document.documentElement.requestFullscreen();
		} else if (document.documentElement.mozRequestFullScreen) {
			document.documentElement.mozRequestFullScreen();
		} else if (document.documentElement.webkitRequestFullscreen) {
			document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	} else {
		if (document.cancelFullScreen) {
			document.cancelFullScreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitCancelFullScreen) {
			document.webkitCancelFullScreen();
		}
	}
};

GUI.prototype.init = function () {
	var self = this;

	self.loadChannels(function () {
		self.initGUI();
		self.loadGraph();
	});
};