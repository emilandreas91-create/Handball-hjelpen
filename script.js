function updateStat(type, btnElement) {
    const counterSpan = btnElement.querySelector('.count-value');
    let currentVal = parseInt(counterSpan.innerText);
    counterSpan.innerText = currentVal + 1;

    // Simulate score update for demo if Goal is clicked
    if (type === 'goal') {
        const homeScore = document.getElementById('homeScore');
        homeScore.innerText = parseInt(homeScore.innerText) + 1;
    }
}

// Modal Logic
function openModal() {
    document.getElementById('customModal').classList.add('active');
    document.getElementById('newStatName').focus(); // Auto focus input
}

function closeModal() {
    document.getElementById('customModal').classList.remove('active');
    document.getElementById('newStatName').value = ''; // Reset input
}

function addCustomStat() {
    const name = document.getElementById('newStatName').value;
    if (!name) return;

    const grid = document.getElementById('statsGrid');

    // Create new button
    const btn = document.createElement('button');
    btn.className = 'stat-btn btn-custom';
    btn.innerHTML = `
        <span>${name.toUpperCase()}</span>
        <span class="count-value">0</span>
    `;

    // Add click handler
    btn.onclick = function () {
        updateStat('custom', this);
    };

    grid.appendChild(btn);
    closeModal();
}

// Close modal if clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('customModal');
    if (event.target == modal) {
        closeModal();
    }
}
