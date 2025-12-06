const svg = d3.select("svg").attr("width", window.innerWidth).attr("height", window.innerHeight);
const g = svg.append("g");

const zoom = d3.zoom().on("zoom", e => g.attr("transform", e.transform));
svg.call(zoom);

const tree = d3.tree().nodeSize([30, 180]);
const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

svg.attr("width", document.body.clientWidth)
    .attr("height", document.body.clientHeight);


let root = {id: "root", name: "configuration", children: [], loaded: false};

await fetchChildren(root);
update(root);

async function fetchChildren(node) {
    if (node.loaded) return;
    const res = await fetch(`/ytv/node/${node.id}`);
    const data = await res.json();
    node.children = data.map(d => ({
        id: d.id,
        name: d.name,
        parent_id: d.parent_id,
        yang_type: d.type,
        children: [],
        loaded: false,
    }));
    node.loaded = true;
}

function showPopup(event, message) {
    const popup = document.createElement("div");
    popup.className = "copy-popup";
    popup.textContent = message;

    document.body.appendChild(popup);

    popup.style.left = event.pageX + 5 + "px";
    popup.style.top = event.pageY - 15 + "px";

    requestAnimationFrame(() => {
        popup.style.opacity = 1;
    });

    setTimeout(() => {
        popup.style.opacity = 0;
        setTimeout(() => popup.remove(), 200);
    }, 700);
}

async function update(source) {
    await fetchChildren(source);

    const rootData = d3.hierarchy(root, d => d.children);
    tree(rootData);
    const nodes = rootData.descendants();
    const links = rootData.links();

    const nodeSel = g.selectAll(".node").data(nodes, d => d.data.id);

    const nodeEnter = nodeSel.enter()
        .append("g")
        .attr("transform", d => `translate(${d.parent?.y0 ?? d.y0 ?? 0},
                                    ${d.parent?.x0 ?? d.x0 ?? 0})`)
        .attr("class", "node");

    nodeEnter.append("circle")
        .attr("r", 6)
        .attr("class", d => `yang-node ${d.data.yang_type}`)

        .on("click", async (event, d) => {
            event.stopPropagation();
            const node = d.data;
            if (node.children && node.children.length) {
                node._children = node.children;
                node.children = [];
            } else if (node._children) {
                node.children = node._children;
                node._children = null;
            } else {
                await fetchChildren(node);
                node.children = node.children;
            }

            update(node);
        });

    nodeEnter.append("text").attr("x", 10).attr("dy", 3).text(d => d.data.name);

    nodeEnter.append("text")
        .attr("x", 10)
        .attr("dy", 3)
        .text(d => d.data.name)
        .style("cursor", "copy")
        .on("click", (event, d) => {
            event.stopPropagation();
            navigator.clipboard.writeText(d.data.name)
                .then(() => showPopup(event, "copied!"))
                .catch(() => {});
        });

    const nodeUpdate = nodeEnter.merge(nodeSel);
    nodeUpdate.transition().attr("transform", d => `translate(${d.y},${d.x})`);

    nodeSel.exit().remove();

    const linkSel = g.selectAll(".link").data(links, d => d.target.data.id);

    const linkEnter = linkSel.enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("d", d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
        });

    linkEnter.merge(linkSel)
        .transition()
        .attr("d", diagonal);

    linkSel.exit().remove();

    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });

}