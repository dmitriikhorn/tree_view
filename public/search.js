const input = document.getElementById('search-input');
const button = document.getElementById('search-btn');
const container = document.getElementById('search-results');

async function search(query) {
    if (!query.trim()) {
        container.innerHTML = '';
        return;
    }
    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderResults(data);
}

function renderResults(results) {
    container.innerHTML = '';
    results.forEach(hit => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.textContent = `${hit.path}`;
        container.appendChild(div);
    });
}

button.addEventListener('click', () => search(input.value));
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') search(input.value);
});
