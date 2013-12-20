
function GUI() {
	this.api = 'http://lahdenvuo.info/social/channel/';

	// Will be loaded later.
	this.channels = null;
	this.channel = null;
	this.graph = null;
}

GUI.prototype.loadChannels = function(cb) {
	var self = this;

	d3.json(self.api, function (channels) {
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
		.name('Channel')
		.onFinishChange(self.loadGraph.bind(self));
};

GUI.prototype.loadGraph = function() {
	var self = this

	if (this.graph) {
		deleteGraph();
	}

	d3.json(self.api + self.channel + '.json', function (data) {
		window.location.hash = self.channel;
		self.graph = initGraph(data);
	});
};

GUI.prototype.fullscreen = function() {
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

GUI.prototype.init = function() {
	var self = this;

	self.loadChannels(function () {
		self.initGUI();
		self.loadGraph();
	});
};