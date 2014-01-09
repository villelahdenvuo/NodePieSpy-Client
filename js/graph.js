function initViewPort() {

	var svg = d3.select(document.body)
		.append("svg")
		.attr("width", window.innerWidth)
		.attr("height", window.innerHeight)
		.attr('id', 'renderer');

	svg.append('g').attr('id', 'container');

  return svg;
}

function initZooming(svg) {
	var zoom = d3.behavior.zoom()
    .scaleExtent([0.2, 10])
    .on("zoom", zoomed);

  function zoomed() {
	  svg.select('#container')
	  	.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}

	svg.call(zoom);
}

function initGraphData(data) {
	var nodeIndex = {};

	var nodes = Object.keys(data.nodes).map(function (key, i) {
		nodeIndex[key] = i;
		return data.nodes[key];
	});

	// Create links between nodes.
	var links = Object.keys(data.edges).map(function (key, i) {
		var edge = data.edges[key];
		return {
			source: nodeIndex[edge.source],
			target: nodeIndex[edge.target],
			weight: edge.weight / 100
		};
	});

	var labelAnchors = [];
	var labelAnchorLinks = [];

	// Create labels
	nodes.forEach(function (node) {
		labelAnchors.push({node: node}, {node: node});
	});

	// Create links for the labels.
	for (var i = 0; i < nodes.length; i++) {
		labelAnchorLinks.push({
			source : i * 2,
			target : i * 2 + 1,
			weight : nodes[i].weight
		});
	};

	return {
		nodes: nodes,
		links: links,
		labelAnchors: labelAnchors,
		labelAnchorLinks: labelAnchorLinks
	};
}

function initClusterData(data) {
	var nodeIndex = {};

	var nodes = Object.keys(data.nodes).map(function (key, i) {
		nodeIndex[key] = i;
		return data.nodes[key];
	});

	// Create links between nodes.
	var links = Object.keys(data.edges).filter(function (key) {
		var edge = data.edges[key];
		return true; //data.nodes[edge.source].group === data.nodes[edge.target].group;
	}).map(function (key, i) {
		var edge = data.edges[key];
		return {
			source: nodeIndex[edge.source],
			target: nodeIndex[edge.target],
			group: data.nodes[edge.source].group === data.nodes[edge.target].group,
			weight: edge.weight / 100
		};
	});

	var labelAnchors = [];
	var labelAnchorLinks = [];

	// Create labels
	nodes.forEach(function (node) {
		labelAnchors.push({node: node}, {node: node});
	});

	// Create links for the labels.
	for (var i = 0; i < nodes.length; i++) {
		labelAnchorLinks.push({
			source : i * 2,
			target : i * 2 + 1,
			weight : nodes[i].weight
		});
	};

	return {
		nodes: nodes,
		links: links,
		labelAnchors: labelAnchors,
		labelAnchorLinks: labelAnchorLinks
	};
}

function initTreeData(nodes) {

	var labels = Object.keys(nodes), root;

	var root;

	labels.forEach(function (node) {
		if (nodes[node] === null) { root = node; }
		nodes[node] = {
			nick: node,
			parent: nodes[node],
			children: []
		};
	});

	labels.forEach(function (node) {
		var label = nodes[node].parent;
		if (label) {
			nodes[label].children.push(node);
		}
	});

	function buildTree(current) {
		current.children.forEach(function (child, i) {
			current.children[i] = nodes[child];
			buildTree(nodes[child]);
		});
	}

	buildTree(nodes[root]);

	return nodes[root];
}

function initForces(svg, data, elements) {
	var force1 = window.force = d3.layout.force().size([svg.attr("width"), svg.attr("height")])
		.nodes(data.nodes)
		.links(data.links)
		.friction(0.8)
		.gravity(0.03)
		.linkDistance(50)
		.charge(-1000)
		.linkStrength(function(d) { return 0.1 + d.weight * 0.0005; });

	var force2 = d3.layout.force()
		.nodes(data.labelAnchors)
		.links(data.labelAnchorLinks)
		.gravity(0)
		.linkDistance(function (d) { return Math.sqrt(d.weight) * 1.5; })
		.linkStrength(10)
		.charge(-100);

	var boxes = [];
	// Don't cause sync layout because of read/write loop, precalc BBox.
	elements.anchorNodes.select('text')
		.each(function (d, i) { boxes[i] = this.getBBox(); });

	force1.on("tick", updateLayout.bind(elements, boxes, force2));

	force.start();
	force2.start();
}

function initClusterForces(svg, data, elements) {
	var force1 = window.force = d3.layout.force().size([svg.attr("width"), svg.attr("height")])
		.nodes(data.nodes)
		.links(data.links)
		.friction(0.8)
		.gravity(0.03)
		.linkDistance(50)
		.charge(-200)
		.linkStrength(function(d) {
			return d.group ? 0.1 + d.weight * 0.0005 : 0.005;
		});

	var force2 = d3.layout.force()
		.nodes(data.labelAnchors)
		.links(data.labelAnchorLinks)
		.gravity(0)
		.linkDistance(function (d) { return Math.sqrt(d.weight) * 1.5; })
		.linkStrength(10)
		.charge(-100);

	var boxes = [];
	// Don't cause sync layout because of read/write loop, precalc BBox.
	elements.anchorNodes.select('text')
		.each(function (d, i) { boxes[i] = this.getBBox(); });

	force1.on("tick", updateLayout.bind(elements, boxes, force2));

	force.start();
	force2.start();
}

function initElements(svg, data) {
	var c = svg.select('#container');

	var links = c.selectAll("line.link")
		.data(data.links).enter().append("line")
		.attr("class", "link");

	var nodes = c.selectAll(".node")
		.data(data.nodes).enter().append("g")
		.attr("class", "node");

	var anchorLinks = c.selectAll(".anchorLink")
		.data(data.labelAnchorLinks)

	var anchorNodes = c.selectAll(".anchorNode")
		.data(data.labelAnchors).enter()
		.append("g")
			.attr("class", "anchorNode")
			.attr("pointer-events", "none");

	anchorNodes
		.filter(function (d, i) { return i % 2 !== 0; })
		.append("text").text(function (d) { return d.node.label; });

	// Add debug circles to labels.
	/*anchorNodes.append("svg:circle")
		.attr("r", function (d) { return 2; }) //return 3 + Math.sqrt(d.weight * 4); })
		.style("fill", "red");*/

	return {
		nodes: nodes,
		links: links,
		anchorLinks: anchorLinks,
		anchorNodes: anchorNodes
	};
}

function initDragging(elements) {

	// Stop elements from movin, when hovered.
	elements.nodes.on('mouseover.force', function (d) {
		d.fixed |= 4; // set bit 3
		d.px = d.x, d.py = d.y; // set velocity to zero
	}).on('mouseout.force', function (d) {
		d.fixed &= ~4; // unset bit 3
	});

	function dragStart(d) {
  	d3.event.sourceEvent.stopPropagation();
  	d.fixed |= 2; // set bit 2
	}

	function dragMoved(d) {
		d.px = d3.event.x;
		d.py = d3.event.y;
    force.resume(); // restart force.
  }

  function dragEnd(d, i) {
		d.fixed &= ~6; // unset bits 2 and 3
  }

	elements.nodes.call(d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragStart)
    .on("drag", dragMoved)
    .on("dragend", dragEnd));
}

function initStyles(elements) {
	var color = d3.scale.category10();

	// Style links
	elements.links
		.style("stroke-opacity", function (d) { return 0.1 + d.weight * 9; })
		.style("stroke", function (d, i) { return color(i); })
		.style('stroke-width', function(d) { return 0.5 + Math.sqrt(d.weight * 20); });

	// Add a circle to nodes.
	elements.nodes.append("circle")
		.attr("r", function (d) { return 3 + Math.sqrt(d.weight * 4); })
		.style("fill", "#555")
		.style("stroke", "#FFF")
		.style("stroke-width", 2);

	// Add text with the name.
	elements.anchorNodes.select('text')
		.style("fill", "#555")
		.style("font-family", "Arial")
		.style("font-size", 16);
}

function initClusterStyles(elements) {
	var color = d3.scale.category20();

	// Style links
	elements.links
		.style("stroke-opacity", function (d) {
			return d.group ? 1 : 0.3;
		})
		.style("stroke", function (d, i) {
			return d.group ? color(d.source.group) :
				d3.interpolateRgb(color(d.source.group), color(d.target.group))(0.5);
		})
		.style('stroke-width', function(d) { 
			return 0.5 + Math.sqrt(d.weight * 20) * (d.group ? 4 : 1);
		});

	// Add a circle to nodes.
	elements.nodes.append("circle")
		.attr("r", function (d) { return 3 + Math.sqrt(d.weight * 4); })
		.style("fill", "#555")
		.style("stroke", "#FFF")
		.style("stroke-width", 2);

	// Add text with the name.
	elements.anchorNodes.select('text')
		.style("fill", "#555")
		.style("font-family", "Arial")
		.style("font-size", 16);
}

function initHover(elements) {

	function addHilt(el) {
		// Make the circle stroke red.
		d3.select(this).select('circle').style('stroke', 'red');

		var nicks = {};
		nicks[el.label] = true;

		elements.links
			// Make all transparent.
			.transition().duration(50)
			.style("stroke-opacity", 0.1)
			// Filter out the non-hilighted.
		  .filter(function (d) {
		  		if (d.source.label === el.label ||
				    d.target.label === el.label) {

	  				nicks[d.source.label] = true;
	  				nicks[d.target.label] = true;
		  			return true;
		  		}
				return false; })
			// Make them opaque.
			.transition().delay(100).duration(300)
			.style("stroke-opacity", 1);

		elements.nodes
		  .filter(function (d) { return !(d.label in nicks); })
		  .select('circle').style('fill', '#DDD');

		elements.anchorNodes
			.attr('opacity', 0.1)
			// Filter out the hilighted.
		  .filter(function (d) { return d.node.label in nicks; })
		  .attr('opacity', 1);
	}

	function resetHilt(el) {
		// Reset circle stroke to white.
		d3.select(this).select('circle')
			.transition()
			.duration(400)
			.style('stroke', '#FFF');

		elements.links
			.transition()
			.duration(400)
			.style("stroke-opacity", function (d) { return 0.1 + d.weight * 9; });

		elements.nodes.select('circle').style('fill', '#555');
		elements.anchorNodes.attr('opacity', 1);
	}

	elements.nodes
		.on('mouseover.hilight', addHilt)
		.on('mouseout.hilight', resetHilt)
		// Reset hiliting handlers when dragging.
		// Otherwise mouseout will break hilighting when moving nodes around.
		.on('mousedown.hilight', function () {
			elements.nodes
				.on('mouseover.hilight', null)
				.on('mouseout.hilight', null);
		})
		.on('mouseup.hilight', function () {
			elements.nodes
				.on('mouseover.hilight', addHilt)
				.on('mouseout.hilight', resetHilt);
		});
}

function initGraph(json) {
	var svg      = initViewPort(),
		data     = initGraphData(json),
		elements = initElements(svg, data);

	initForces(svg, data, elements);
	initStyles(elements);
	initHover(elements);
	initDragging(elements);
	initZooming(svg);

	return {
		'svg': svg,
		'data': data,
		'elements': elements
	};
}

function initClusters(json) {
	var svg      = initViewPort(),
		data     = initClusterData(json),
		elements = initElements(svg, data);

	initClusterForces(svg, data, elements);
	initClusterStyles(elements);
	initDragging(elements);
	initZooming(svg);

	return {
		'svg': svg,
		'data': data,
		'elements': elements
	};
}

function initTree(json) {
	var svg  = initViewPort(),
		root = initTreeData(json);

	initZooming(svg);

	var tree = d3.layout.tree()
	    .size([svg.attr('height'), svg.attr('width') - 200]);

	var diagonal = d3.svg.diagonal()
	    .projection(function(d) { return [d.y, d.x]; });

	 svg = svg.select('#container').append("g")
		.attr("transform", "translate(100,0)");

  var nodes = tree.nodes(root),
      links = tree.links(nodes);

  var link = svg.selectAll("path.link")
      .data(links)
    .enter().append("path")
      .attr("class", "link")
      .attr("d", diagonal);

  var node = svg.selectAll("g.node")
      .data(nodes)
    .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

  node.append("circle")
      .attr("r", 4.5);

  node.append("text")
      .attr("dx", function(d) { return d.children ? -8 : 8; })
      .attr("dy", 3)
      .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
      .text(function(d) { return d.nick; });

	return {
		'svg': svg,
		'data': root
	};
}

function deleteGraph() {
	d3.select('svg').remove();
}

function updateLayout(labelBoxes, labelForce) {
	labelForce.start();

	this.nodes.call(updateNode);

	this.anchorNodes.each(function eachNode(d, i) {
		if (i % 2 === 0) {
			d.x = d.node.x;
			d.y = d.node.y;
		} else {
			var diffX = d.x - d.node.x;
			var diffY = d.y - d.node.y;

			var dist = Math.sqrt(diffX * diffX + diffY * diffY);

			var b = labelBoxes[i];
			var shiftX = b.width * (diffX - dist) / (dist * 2);
			var shiftY = b.height * (diffY + dist) / (dist * 2);

			this.childNodes[0].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
		}
	});
	this.anchorNodes.call(updateNode);

	this.links.call(updateLink);
	this.anchorLinks.call(updateLink);
}

function updateNode() {
	this.attr("transform", function (d) {
		return "translate(" + d.x + "," + d.y + ")";
	});
}

function updateLink() {
	this.attr("x1", function (d) {
		return d.source.x;
	}).attr("y1", function (d) {
		return d.source.y;
	}).attr("x2", function (d) {
		return d.target.x;
	}).attr("y2", function (d) {
		return d.target.y;
	});
}