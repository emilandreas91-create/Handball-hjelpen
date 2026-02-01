
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let currentPeriod = 1;
let activeTeam = 'home';
let matchState = {
    home: { score: 0, stats: {} },
    away: { score: 0, stats: {} }
};

// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("Logged in as:", user.email);
        initApp(); // Start app logic
    } else {
        console.log("Not logged in");
        window.location.href = 'login.html';
    }
});

function initApp() {
    if (document.getElementById('homeTeamSelect')) {
        loadTeams();
        selectTeam('home');
    }
    if (document.getElementById('teamsList')) {
        loadTeamsPage();
    }
    setupLogout();
}

function setupLogout() {
    const nav = document.querySelector('nav .nav-links');
    if (nav && !document.getElementById('btnLogout')) {
        const btn = document.createElement('a');
        btn.href = "#";
        btn.id = "btnLogout";
        btn.innerText = "Logg ut";
        btn.style.color = "#ff4444";
        btn.onclick = async () => {
            await signOut(auth);
            window.location.href = 'login.html';
        };
        nav.appendChild(btn);
    }
}

/* --- Teams Page Logic --- */

async function loadTeamsPage() {
    const container = document.getElementById('teamsList');
    container.innerHTML = '<p>Laster lag...</p>';

    try {
        // Fetch Teams
        const teamsColl = collection(db, "users", currentUser.uid, "teams");
        const teamSnapshot = await getDocs(teamsColl);
        const teams = teamSnapshot.docs.map(doc => doc.data().name);

        // Fetch Matches
        const matchesColl = collection(db, "users", currentUser.uid, "matches");
        const matchSnapshot = await getDocs(matchesColl);
        const matches = matchSnapshot.docs.map(doc => doc.data());

        container.innerHTML = ''; // Clear loading msg

        if (teams.length === 0) {
            container.innerHTML = '<p style="color: #888;">Ingen lag funnet. Gå til Statistikk for å registrere lag.</p>';
            return;
        }

        teams.forEach(team => {
            // Calculate stats
            const teamMatches = matches.filter(m => m.homeTeam === team || m.awayTeam === team);
            const matchCount = teamMatches.length;
            let goals = 0;
            let wins = 0;

            teamMatches.forEach(m => {
                if (m.homeTeam === team) {
                    goals += parseInt(m.homeScore);
                    if (parseInt(m.homeScore) > parseInt(m.awayScore)) wins++;
                } else {
                    goals += parseInt(m.awayScore);
                    if (parseInt(m.awayScore) > parseInt(m.homeScore)) wins++;
                }
            });

            // Create Card
            const card = document.createElement('div');
            card.className = 'team-card';
            card.onclick = () => openTeamDetail(team, matchCount, goals, wins);
            card.innerHTML = `
                <div class="team-name">${team}</div>
                <div class="team-stats-summary">${matchCount} Kamper</div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading data", e);
        container.innerHTML = '<p style="color: red;">Feil under lasting av data.</p>';
    }
}

// Make globally available
window.openTeamDetail = function (teamName, matches, goals, wins) {
    document.getElementById('modalTeamName').innerText = teamName;

    const statsDiv = document.getElementById('modalTeamStats');
    statsDiv.innerHTML = `
        <div class="stat-row"><span>Kamper Spilt:</span> <span>${matches}</span></div>
        <div class="stat-row"><span>Seiere:</span> <span>${wins}</span></div>
        <div class="stat-row"><span>Mål Scoret:</span> <span>${goals}</span></div>
        <div class="stat-row"><span>Snitt Mål:</span> <span>${matches ? (goals / matches).toFixed(1) : 0}</span></div>
    `;

    document.getElementById('teamDetailModal').classList.add('active');
}


/* --- Match State & Stats Logic --- */

window.selectTeam = function (teamSide) {
    activeTeam = teamSide; // 'home' or 'away'

    // Update Visuals
    document.getElementById('scoreTeamHome').classList.toggle('active', teamSide === 'home');
    document.getElementById('scoreTeamAway').classList.toggle('active', teamSide === 'away');

    // Update Counters
    refreshButtonCounters();
}

// Helper to refresh UI
function refreshButtonCounters() {
    const stats = matchState[activeTeam].stats;

    // Default buttons
    ['goal', 'miss', 'save', 'tech'].forEach(type => {
        const btn = document.querySelector(`button[data-type="${type}"]`);
        if (btn) {
            const val = stats[type] || 0;
            btn.querySelector('.count-value').innerText = val;
        }
    });

    // Custom buttons
    const customBtns = document.querySelectorAll('button.stat-btn.btn-custom');
    customBtns.forEach(btn => {
        const type = btn.getAttribute('data-type');
        const val = stats[type] || 0;
        btn.querySelector('.count-value').innerText = val;
    });
}

window.updateStat = function (type, btnElement) {
    // Initialize stat if not exists
    if (!matchState[activeTeam].stats[type]) {
        matchState[activeTeam].stats[type] = 0;
    }

    // Increment
    matchState[activeTeam].stats[type]++;

    // Update UI Wrapper
    refreshButtonCounters();

    // Special logic for goals
    if (type === 'goal') {
        const scoreEl = document.getElementById(`${activeTeam}Score`);
        matchState[activeTeam].score++;
        scoreEl.innerText = matchState[activeTeam].score;
    }
}

window.updateTeamSelection = function () {
    // Just a placeholder if we need logic when dropdown changes
}

/* --- Team Management --- */

async function loadTeams() {
    const homeSelect = document.getElementById('homeTeamSelect');
    const awaySelect = document.getElementById('awayTeamSelect');

    // Clear current options (except first default)
    homeSelect.innerHTML = '<option value="Hjemme">HJEMME</option>';
    awaySelect.innerHTML = '<option value="Borte">BORTE</option>';

    try {
        const teamsColl = collection(db, "users", currentUser.uid, "teams");
        const snapshot = await getDocs(teamsColl);

        snapshot.forEach(doc => {
            const team = doc.data().name;
            const option1 = document.createElement('option');
            option1.value = team;
            option1.innerText = team;
            homeSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = team;
            option2.innerText = team;
            awaySelect.appendChild(option2);
        });
    } catch (e) {
        console.error("Error loading teams", e);
    }
}

window.registerTeam = async function () {
    const nameInput = document.getElementById('newTeamName');
    const name = nameInput.value.trim();
    if (!name) return;

    try {
        // Check duplication (client side check for UX, DB check strictly better but heavier)
        // For now just add
        await addDoc(collection(db, "users", currentUser.uid, "teams"), {
            name: name,
            createdAt: new Date().toISOString()
        });

        await loadTeams();
        nameInput.value = '';
        closeModal('teamModal');
    } catch (e) {
        console.error("Error adding team", e);
        alert("Kunne ikke lagre laget: " + e.message);
    }
}

/* --- Period Management --- */

window.changePeriod = function () {
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
    } else {
        currentPeriod = 1; // Reset
        periodEl.innerText = '1. OMG';
    }
}


/* --- Modal Logic --- */

window.openModal = function () {
    document.getElementById('customModal').classList.add('active');
    document.getElementById('newStatName').focus();
}

window.openTeamModal = function () {
    document.getElementById('teamModal').classList.add('active');
    document.getElementById('newTeamName').focus();
}

window.openSaveModal = function () {
    document.getElementById('saveMatchModal').classList.add('active');
}

window.closeModal = function (modalId) {
    if (!modalId) modalId = 'customModal'; // Fallback
    document.getElementById(modalId).classList.remove('active');
}

/* --- Custom Stat Button --- */

window.addCustomStat = function () {
    const name = document.getElementById('newStatName').value;
    if (!name) return;

    const typeId = name.toLowerCase().replace(/\s+/g, '_');

    // Check if button already exists
    if (document.querySelector(`button[data-type="${typeId}"]`)) {
        alert('Denne knappen finnes allerede!');
        return;
    }

    const grid = document.getElementById('statsGrid');
    const btn = document.createElement('button');
    btn.className = 'stat-btn btn-custom';
    btn.setAttribute('data-type', typeId);
    btn.innerHTML = `<span>${name.toUpperCase()}</span><span class="count-value">0</span>`;
    // Note: onclick handling via window.updateStat is tricky with 'this' in modules.
    // HTML onclick="updateStat('id', this)" still works if updateStat is global.

    // However, when creating elements dynamically in a module, we should prefer addEventListener OR ensure global scope.
    // Since we are setting onclick string attribute, it *expects* a global function.
    btn.setAttribute('onclick', `updateStat('${typeId}', this)`);

    grid.appendChild(btn);
    closeModal('customModal');
}

/* --- Save Match --- */

window.saveMatch = async function () {
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
        homeScore: matchState.home.score,
        awayScore: matchState.away.score,
        period: document.getElementById('matchPeriod').innerText,
        detailedStats: {
            home: matchState.home.stats,
            away: matchState.away.stats
        }
    };

    try {
        await addDoc(collection(db, "users", currentUser.uid, "matches"), matchData);
        alert('Kamp lagret!');
        closeModal('saveMatchModal');
    } catch (e) {
        console.error("Error saving match", e);
        alert("Feil ved lagring: " + e.message);
    }
}

// Close modals on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
