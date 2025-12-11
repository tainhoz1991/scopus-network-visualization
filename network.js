function simulate(data, svg) {
    const width = parseInt(svg.attr("viewBox").split(' ')[2]);
    const height = parseInt(svg.attr("viewBox").split(' ')[3]);
    const main_group = svg.append("g")
        .attr("transform", "translate(0, 0)");

    // Color scale for top 10 countries
    const colorScale = d3.scaleOrdinal()
        .domain(data.top_countries)
        .range(d3.schemeCategory10);

    // Node size scale based on degree
    const degrees = data.nodes.map(d => d.degree);
    const scale_radius = d3.scaleSqrt()
        .domain(d3.extent(degrees))
        .range([3, 12]);

    // Link stroke width scale
    const scale_link_stroke_width = d3.scaleLinear()
        .domain(d3.extent(data.links, d => d.weight))
        .range([1, 3]);

    // Create links
    const link_elements = main_group.append("g")
        .attr('class', 'links-group')
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".line")
        .data(data.links)
        .enter()
        .append("line")
        .attr("class", "link")
        .style("stroke-width", d => scale_link_stroke_width(d.weight));

    // Create nodes
    const node_elements = main_group.append("g")
        .attr('class', 'nodes-group')
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".node-group")
        .data(data.nodes)
        .enter()
        .append('g')
        .attr("class", d => "node-group country_" + d.country.replace(/\s+/g, '_'))
        .on("mouseenter", function(event, d) {
            // Highlight nodes with same country
            node_elements.classed("inactive", true);
            d3.selectAll(".country_" + d.country.replace(/\s+/g, '_')).classed("inactive", false);
        })
        .on("mouseleave", function() {
            d3.selectAll(".inactive").classed("inactive", false);
        })
        .on("click", function(event, d) {
            event.stopPropagation();
            showTooltip(event, d);
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add circles to nodes
    node_elements.append("circle")
        .attr("r", d => scale_radius(d.degree))
        .attr("fill", d => d.isTopCountry ? colorScale(d.country) : "#A9A9A9")
        .attr("class", "node");

    // Add labels to nodes
    node_elements.append("text")
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .attr("dy", d => scale_radius(d.degree) + 12)
        .text(d => d.id);

    // Tooltip functionality
    const tooltip = d3.select("#tooltip");

    function showTooltip(event, d) {
        const papers = d.papers.map(p => `<li>${p}</li>`).join('');
        tooltip.html(`
            <h5>${d.id}</h5>
            <p><strong>Country:</strong> ${d.country}</p>
            <p><strong>Degree:</strong> ${d.degree}</p>
            <p><strong>Affiliation:</strong> ${d.affiliation}</p>
            <div class="papers-list">
                <strong>Publications:</strong>
                <ul>${papers}</ul>
            </div>
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .classed("visible", true);
    }

    // Close tooltip on click outside
    d3.select("body").on("click", function(event) {
        if (!event.target.closest(".node-group")) {
            tooltip.classed("visible", false);
        }
    });

    // Force simulation
    let ForceSimulation = d3.forceSimulation(data.nodes)
        .force("collide", d3.forceCollide().radius(d => scale_radius(d.degree) + 20))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("charge", d3.forceManyBody().strength(-150))
        .force("link", d3.forceLink(data.links)
            .id(d => d.id)
            .distance(50)
            .strength(0.1)
        )
        .on("tick", ticked);

    function ticked() {
        node_elements
            .attr('transform', d => `translate(${d.x},${d.y})`);

        link_elements
            .attr("x1", d => d.source.x)
            .attr("x2", d => d.target.x)
            .attr("y1", d => d.source.y)
            .attr("y2", d => d.target.y);
    }

    // Drag functions
    function dragstarted(event) {
        if (!event.active) ForceSimulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) ForceSimulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    // Zoom functionality
    svg.call(d3.zoom()
        .extent([
            [0, 0],
            [width, height]
        ])
        .scaleExtent([0, 8])
        .on("zoom", zoomed));

    function zoomed({ transform }) {
        main_group.attr("transform", transform);
    }

    // Control sliders
    d3.select("#chargeSlider").on("input", function() {
        const value = +this.value;
        d3.select("#chargeValue").text(value);
        ForceSimulation.force("charge").strength(value);
        ForceSimulation.alpha(0.3).restart();
    });

    d3.select("#collideSlider").on("input", function() {
        const value = +this.value;
        d3.select("#collideValue").text(value);
        ForceSimulation.force("collide").radius(d => scale_radius(d.degree) + value);
        ForceSimulation.alpha(0.3).restart();
    });

    d3.select("#linkSlider").on("input", function() {
        const value = +this.value;
        d3.select("#linkValue").text(value.toFixed(2));
        ForceSimulation.force("link").strength(value);
        ForceSimulation.alpha(0.3).restart();
    });

    d3.select("#resetBtn").on("click", function() {
        d3.select("#chargeSlider").property("value", -150);
        d3.select("#collideSlider").property("value", 20);
        d3.select("#linkSlider").property("value", 0.1);
        d3.select("#chargeValue").text(-150);
        d3.select("#collideValue").text(20);
        d3.select("#linkValue").text("0.10");

        ForceSimulation.force("charge").strength(-150);
        ForceSimulation.force("collide").radius(d => scale_radius(d.degree) + 20);
        ForceSimulation.force("link").strength(0.1);
        ForceSimulation.alpha(1).restart();
    });

    // Create legend
    const legendContent = d3.select("#legendContent");
    data.top_countries.forEach(country => {
        legendContent.append("div")
            .attr("class", "legend-item")
            .html(`
                <div class="legend-color" style="background-color: ${colorScale(country)};"></div>
                <span>${country}</span>
            `);
    });
}