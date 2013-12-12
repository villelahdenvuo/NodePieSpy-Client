d3.json('/social/'+window.location.hash.replace('#', '')+'.json', initGraph);

function initGraph(data) {
	var w = window.innerWidth, h = window.innerHeight;

	var zoom = d3.behavior.zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", zoomed);

	var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragend);

	var svg = d3.select("body")
		.append("svg:svg")
		.attr("width", w).attr("height", h)
		.classed('renderer', true)
  	.call(zoom);

  var container = svg.append("g");

	var nodeIndex = {};

	var nodes = Object.keys(data.nodes).filter(function (key) {
		return data.nodes[key].weight > 8; //4;
	}).map(function (key, i) {
		// Create an index of the nodes.
		// TODO: Add x and y attributes.
		nodeIndex[key] = i;
		return data.nodes[key];
	});

	var labelAnchors = [];
	var labelAnchorLinks = [];

	// Create labels
	nodes.forEach(function (node) {
		labelAnchors.push({
			node : node
		});
		labelAnchors.push({
			node : node
		});
	});

	// Link labels
	for (var i = 0; i < nodes.length; i++) {
		labelAnchorLinks.push({
			source : i * 2,
			target : i * 2 + 1,
			weight : nodes[i].weight
		});
	};

	// Create links
	var links = Object.keys(data.edges).filter(function (key) {
		var edge = data.edges[key];
		return edge.weight > 0 &&
			nodeIndex[edge.source] !== undefined &&
			nodeIndex[edge.target] !== undefined;
	}).map(function (key, i) {
		var edge = data.edges[key];
		return {
			source: nodeIndex[edge.source],
			target: nodeIndex[edge.target],
			weight: edge.weight / 100
		};
	});

	// var force = window.force = d3.layout.force().size([w, h])
	// 	.nodes(nodes)
	// 	.links(links)
	// 	.gravity(0.8)
	// 	.linkDistance(100)
	// 	.charge(-3000)
	// 	.linkStrength(function(x) { return x.weight; });

	var force = window.force = d3.layout.force().size([w, h])
		.nodes(nodes)
		.links(links)
		.friction(0.5)
		.gravity(0.2)
		.linkDistance(100)
		.charge(-2000)
		.linkStrength(function(x) { return x.weight; });

	force.start();

	var force2 = d3.layout.force()
		.nodes(labelAnchors)
		.links(labelAnchorLinks)
		.gravity(0)
		.linkDistance(0)
		.linkStrength(10)
		.charge(function (d) { return -20 - (d.weight); }).size([w, h]);

	force2.start();

	var color = d3.scale.category10();

	var link = container.selectAll("line.link")
		.data(links).enter().append("svg:line")
		.attr("class", "link")
		.style("stroke-opacity", function (d) { return d.weight * 9; })
		.style("stroke", function (d, i) { return color(i); })
		.style('stroke-width', function(d) { return 0.5 + Math.sqrt(d.weight * 20); });

	var node = container.selectAll("g.node")
		.data(force.nodes()).enter().append("svg:g")
		.attr("class", "node");

	node.append("svg:circle")
		.attr("r", function (d) { return 3 + Math.sqrt(d.weight * 4); })
		.style("fill", "#555")
		.style("stroke", "#FFF")
		.style("stroke-width", 3)

		.on('mouseover.force', function (d) {
			d.fixed |= 4; // set bit 3
			d.px = d.x, d.py = d.y; // set velocity to zero
		})
		.on('mouseout.force', function (d) {
			d.fixed &= ~4; // unset bit 3
		})

		.on('mouseover', addHilt)
		.on('mouseout', resetHilt)
		// Reset hiliting when dragging.
		.on('mousedown', function () {
			node.selectAll("circle")
				.on('mouseover', null)
				.on('mouseout', null);
		})
		.on('mouseup', function () {
			node.selectAll("circle")
				.on('mouseover', addHilt)
				.on('mouseout', resetHilt);
		});

	function addHilt(el) {
		//el.fixed = true;
		// Make the circle stroke red.
		d3.select(this).style('stroke', 'red');
		var sel = container.selectAll("line.link")
			// Bring hilighted on top.
			.sort(function (a, b) {
				return a.source.label === el.label ||
					     a.target.label == el.label ? 1 : -1; })
			// Make all grey.
			.transition()
			.duration(50)
			.style("stroke", '#DDD');

			// Filter out the non-hilighted.
		sel.filter(function (d, i) {
				return d.source.label === el.label ||
				       d.target.label === el.label; })
			// Make the rest red (the hilighted ones).
			.transition()
			.delay(100).duration(300)
			.style('stroke', 'red');
	}

	function resetHilt(el) {
		//el.fixed = false;
		// Reset circle stroke to white.
		d3.select(this)
			.transition()
			.duration(400)
			.style('stroke', '#FFF');

		container.selectAll("line.link")
			.transition()
			.duration(400)
		// Reset link colors.
			.style("stroke", function (d, i) { return color(i); });
	}

	//node.call(force.drag);
	node.call(drag);

	var anchorLink = container.selectAll("line.anchorLink").data(labelAnchorLinks)

	var anchorNode = container.selectAll("g.anchorNode")
	.data(force2.nodes()).enter()
	.append("svg:g")
	.attr("class", "anchorNode")
	.attr("pointer-events", "none");

	anchorNode.append("svg:circle")
		.attr("r", function (d) { return 3 + Math.sqrt(d.weight * 4); })
		.style("fill", "none");

	anchorNode.append("svg:text").text(function (d, i) {
		return i % 2 == 0 ? "" : d.node.label;
	}).style("fill", "#555")
		.style("font-family", "Arial")
		.style("font-size", 16);


	var updateLink = function() {
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

	var updateNode = function() {
		this.attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		});
	}

	function dragstarted(d) {
		//force.stop()
		// force.start();
    // d3.select(this).classed("dragging", true);
  	d3.event.sourceEvent.stopPropagation();
  	d.fixed |= 2; // set bit 2
	}

	function dragged(d) {
		// force.tick();
		// d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
		d.px = d3.event.x;
		d.py = d3.event.y;
    force.resume(); // restart annealing
  }

  function dragend(d, i) {
		//d3.select(this).classed("dragging", false);
		d.fixed &= ~6; // unset bits 2 and 3
  }

	function zoomed() {
	  container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}

	var boxes = [];
	// Don't cause sync layout because of read/write loop, precalc BBox.
	anchorNode.each(function (d, i) {
		boxes[i] = this.childNodes[1].getBBox();
	});

	force.on("tick", function() {

		force2.start();

		node.call(updateNode);

		anchorNode.each(function eachNode(d, i) {
			if (i % 2 == 0) {
				d.x = d.node.x;
				d.y = d.node.y;
			} else {

				var diffX = d.x - d.node.x;
				
				if (Math.abs(diffX) > 1) {
					var b = boxes[i].width;
					var diffY = d.y - d.node.y;

					var dist = Math.sqrt(diffX * diffX + diffY * diffY);

					var shiftX = b * (diffX - dist) / (dist * 2);
					shiftX = Math.max(-b, Math.min(0, shiftX));
					this.childNodes[1].setAttribute("transform", "translate(" + shiftX + ",0)");	
				}
			}
		});


		anchorNode.call(updateNode);

		link.call(updateLink);
		anchorLink.call(updateLink);

	});
}