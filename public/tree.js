const svg = d3.select("svg").attr("width", window.innerWidth).attr("height", window.innerHeight);
const g = svg.append("g").attr("transform", "translate(100,500)");

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
    const res = await fetch(`/node/${node.id}`);
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

    if (node.id === "root") {
        node._children = node.children;
        node.children = [];
    }

}

async function update(source) {
    await fetchChildren(source);

    const rootData = d3.hierarchy(root, d => d.children);
    tree(rootData);
    const nodes = rootData.descendants();
    const links = tree(rootData).links();

    const nodeSel = g.selectAll(".node").data(nodes, d => d.data.id);

    const nodeEnter = nodeSel.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0 || 0},${source.x0 || 0})`)
        .on("click", async (event, d) => {
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

    nodeEnter.append("circle")
        .attr("r", 6)
        .attr("class", d => `yang-node ${d.data.yang_type}`);

    nodeEnter.append("text").attr("x", 10).attr("dy", 3).text(d => d.data.name);

    const nodeUpdate = nodeEnter.merge(nodeSel);
    nodeUpdate.transition().attr("transform", d => `translate(${d.y},${d.x})`);

    nodeSel.exit().remove();

    const linkSel = g.selectAll(".link").data(links, d => d.target.data.id);
    const linkEnter = linkSel.enter().insert("path", "g").attr("class", "link").attr("d", diagonal);
    linkSel.exit().remove();
}