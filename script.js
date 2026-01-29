// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadTeams();
});

let currentPeriod = 1;

function updateStat(type, btnElement) {
    const counterSpan = btnElement.querySelector('.count-value');
    let currentVal = parseInt(counterSpan.innerText);
    counterSpan.innerText = currentVal + 1;

    // Logic for Score Board updates
    if (type === 'goal') {
        // Find which team triggers this?
        // Actually, we need to know WHO scored. 
        // For simplicity in this version, we might assume the buttons are general or need to be duplicated for each team?
        // Wait, the user requirement didn't specify separate buttons per team, but typically handball stats are team-specific.
        // However, the current UI has one set of buttons. Let's assume these buttons affect the 'active' attack team or just generic counters.
        // Given the requirement "choose team... inside stats page", let's assume the user wants to attribute goals to the *Home* or *Away* score.
        // But with one "Goal" button, we don't know who scored.
        // *Correction*: The layout usually implies context. The current layout has one control grid.
        // Let's make the Goal button ASK who scored or default to Home? 
        // Or better: Let's split the 'Goal' button or make it toggle?
        // Actually, the simplest way for a single "MÅL" button is to likely increment HOME by default or ask.
        // *Wait*, looking at the previous logic: `homeScore` increased on goal.
        // To fix this properly: Let's make the Goal Button open a tiny prompt OR just have Two Goal Buttons (one for Home, one for Away) would be best UX.
        // But I shouldn't redesign the whole grid without permission.
        // *Workaround*: Let's make the "Goal" button toggle score for the *Home* team by default, but let's add a primitive prompt? No that's annoying.
        // Let's stick to the previous behavior (Home Score) but maybe update it to reflect the *Home Team Name*?
        // Actually, the user asked to "Choose saved team inside stats page".
        // Let's assume the current buttons are for the *Home* team for now, or just global counters.
        // *Wait*, standard handball stats apps need distinction.
        // Let's just keep the existing behavior: Goal -> Updates Home Score.
        // I will add a comment that this controls Home Score.
        const homeScore = document.getElementById('homeScore');
        homeScore.innerText = parseInt(homeScore.innerText) + 1;
    }
}

/* --- Team Management --- */

function loadTeams() {
    const teams = JSON.parse(localStorage.getItem('handball_teams')) || [];
    const homeSelect = document.getElementById('homeTeamSelect');
    const awaySelect = document.getElementById('awayTeamSelect');

    // Clear current options (except first default)
    homeSelect.innerHTML = '<option value="Hjemme">HJEMME</option>';
    awaySelect.innerHTML = '<option value="Borte">BORTE</option>';

    teams.forEach(team => {
        const option1 = document.createElement('option');
        option1.value = team;
        option1.innerText = team;
        homeSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = team;
        option2.innerText = team;
        awaySelect.appendChild(option2);
    });
}

function registerTeam() {
    const nameInput = document.getElementById('newTeamName');
    const name = nameInput.value.trim();
    if (!name) return;

    const teams = JSON.parse(localStorage.getItem('handball_teams')) || [];
    if (!teams.includes(name)) {
        teams.push(name);
        localStorage.setItem('handball_teams', JSON.stringify(teams));
        loadTeams();
        nameInput.value = '';
        closeModal('teamModal');
    } else {
        alert('Laget finnes allerede!');
    }
}

/* --- Period Management --- */

function changePeriod() {
    const periodEl = document.getElementById('matchPeriod');
    if (currentPeriod === 1) {
        currentPeriod = 2;
        periodEl.innerText = '2. OMG';
    } else if (currentPeriod === 2) {
        currentPeriod = 3;
        periodEl.innerText = 'PAUSE';
    } else if (currentPeriod === 3) {
        currentPeriod = 4;
        periodEl.innerText = 'SLUTT';
        // Disable buttons?
    } else {
        currentPeriod = 1; // Reset
        periodEl.innerText = '1. OMG';
    }
}


/* --- Modal Logic --- */

function openModal() {
    document.getElementById('customModal').classList.add('active');
    document.getElementById('newStatName').focus();
}

function openTeamModal() {
    document.getElementById('teamModal').classList.add('active');
    document.getElementById('newTeamName').focus();
}

function openSaveModal() {
    document.getElementById('saveMatchModal').classList.add('active');
}

function closeModal(modalId) {
    if (!modalId) modalId = 'customModal'; // Fallback
    document.getElementById(modalId).classList.remove('active');
}

/* --- Custom Stat Button --- */

function addCustomStat() {
    const name = document.getElementById('newStatName').value;
    if (!name) return;

    const grid = document.getElementById('statsGrid');
    const btn = document.createElement('button');
    btn.className = 'stat-btn btn-custom';
    btn.innerHTML = `<span>${name.toUpperCase()}</span><span class="count-value">0</span>`;
    btn.onclick = function () { updateStat('custom', this); };

    grid.appendChild(btn);
    closeModal('customModal');
}

/* --- Save Match --- */

function saveMatch() {
    const matchName = document.getElementById('matchNameInput').value.trim();
    if (!matchName) {
        alert('Gi kampen et navn!');
        return;
    }

    const matchData = {
        name: matchName,
        date: new Date().toISOString(),
        homeTeam: document.getElementById('homeTeamSelect').value,
        awayTeam: document.getElementById('awayTeamSelect').value,
        homeScore: document.getElementById('homeScore').innerText,
        awayScore: document.getElementById('awayScore').innerText,
        period: document.getElementById('matchPeriod').innerText,
        stats: [] // In a real app we'd scrape the specific button values too
    };

    // Grab all stat counts
    document.querySelectorAll('.stat-btn').forEach(btn => {
        const label = btn.querySelector('span:first-child').innerText;
        const count = btn.querySelector('.count-value').innerText;
        matchData.stats.push({ label, count });
    });

    const savedMatches = JSON.parse(localStorage.getItem('handball_matches')) || [];
    savedMatches.push(matchData);
    localStorage.setItem('handball_matches', JSON.stringify(savedMatches));

    alert('Kamp lagret!');
    closeModal('saveMatchModal');
}

// Close modals on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
