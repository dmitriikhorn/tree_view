const divider = document.getElementById("divider");
const left = document.getElementById("left");
const overlay = document.getElementById("drag-overlay");

let isDragging = false;

divider.addEventListener("mousedown", () => {
    isDragging = true;
    overlay.style.display = "block";
    document.body.style.userSelect = "none";
});

overlay.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const min = 200;
    const max = window.innerWidth - 200;
    const x = e.clientX;

    if (x < min || x > max) return;

    left.style.flexBasis = `${x}px`;
});

overlay.addEventListener("mouseup", () => {
    isDragging = false;
    overlay.style.display = "none";
    document.body.style.userSelect = "";
});
