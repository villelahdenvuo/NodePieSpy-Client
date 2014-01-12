
function GUI(api) {
	this.api = api;

	// Will be loaded later.
	this.channels = null;
	this.channel = null;
	this.graph = null;
	this.current = '';
	this.inflation = 10;
	this.currentReq = null;
}

GUI.prototype.loadChannels = function(cb) {
	var self = this;

	d3.json(self.api + 'graph', function (channels) {
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

	self.clusterButt = algos.add(self, 'cluster')
		.name('Markov Clusters');
	algos.add(self, 'inflation', 2, 50).step(2)
		.name('Inflation').onFinishChange(function () {
			self.current = '';
			self.cluster();
		});
};

GUI.prototype.bfs = function () {
	var self = this;

	if (self.current === 'bfs') {
		self.bfsButt.name('BFS');
		self.loadGraph();
		return;
	}

	self.clusterButt.name('Markov Clusters');
	self.bfsButt.name('Select start node');

	self.graph.elements.nodes.on('click.bfs', function (node) {
		deleteGraph();
		self.bfsButt.name('Close BFS');
		self.graph.elements.nodes.on('click.bfs', null);
		self.graph = undefined;
		self.current = 'bfs';

		d3.json(self.api + 'bfs/' + self.channel + '/' + escape(node.label) + '.json', function (data) {
			self.graph = initTree(data);
		});
	});
};

GUI.prototype.cluster = function () {
	var self = this;

	if (self.current === 'cluster') {
		self.clusterButt.name('Markov Clusters');
		self.loadGraph();
		return;
	}

	self.current = 'cluster';
	self.bfsButt.name('BFS');
	self.clusterButt.name('Loading Clusters...');

	self.currentReq = d3.json(self.api + 'clusters/' + self.channel + '/' + self.inflation + '.json', function (data) {
		deleteGraph();
		self.clusterButt.name('Close Clusters');
		self.graph = initClusters(data);
	});
};

GUI.prototype.loadGraph = function () {
	var self = this

	self.clusterButt.name('Markov Clusters');
	self.bfsButt.name('BFS');

	if (self.currentReq) {
		self.currentReq.abort();
		delete self.currentReq;
	}

	if (this.graph) {
		deleteGraph();
	}

	d3.json(self.api + 'graph/' + self.channel + '.json', function (data) {
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