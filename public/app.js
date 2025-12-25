// App State
const state = {
    entries: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
};

// DOM Elements
const els = {
    totalAmount: document.getElementById('totalAmount'),
    currentMonthDisplay: document.getElementById('currentMonthDisplay'),
    entriesList: document.getElementById('entriesList'),
    addEntryBtn: document.getElementById('addEntryBtn'),
    entryModal: document.getElementById('entryModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    entryForm: document.getElementById('entryForm'),
    typeBtns: document.querySelectorAll('.toggle-btn'),
    dailyInputGroup: document.getElementById('dailyInputGroup'),
    hourlyInputGroup: document.getElementById('hourlyInputGroup'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    // Inputs
    entryDate: document.getElementById('entryDate'),
    dailyAmount: document.getElementById('dailyAmount'),
    hoursInput: document.getElementById('hoursInput'),
    rateInput: document.getElementById('rateInput'),
    hourlyCalcTotal: document.getElementById('hourlyCalcTotal'),
    entryNote: document.getElementById('entryNote'),
    // Month Nav
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    // PWA Elements
    installBanner: document.getElementById('installBanner'),
    installBtn: document.getElementById('installBtn'),
    iosInstallModal: document.getElementById('iosInstallModal'),
    closeIosBtn: document.getElementById('closeIosBtn'),
};

let earningsChart;
let deferredPrompt; // For Chrome/Android install prompt

// Initialization
function init() {
    loadData();
    setupEventListeners();
    updateUI();
    initChart();
    checkPWAStatus();
}

// PWA Logic
function checkPWAStatus() {
    // 1. Android/Chrome Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        state.canInstall = true;
        els.installBanner.classList.add('visible');
        document.body.classList.add('banner-active');
    });

    // 2. iOS Detection (Show instructions if on iOS safari)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIos && !isStandAlone) {
        // Show iOS install instructions after a small delay
        setTimeout(() => {
            els.iosInstallModal.classList.add('open');
        }, 2000);
    }
}

async function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        els.installBanner.classList.remove('visible');
        document.body.classList.remove('banner-active');
    }
}

// Data Handling
function loadData() {
    const saved = localStorage.getItem('minijob_entries');
    if (saved) {
        state.entries = JSON.parse(saved);
        // Convert date strings back to objects if needed, ensuring correct sorting
        state.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Set default date to today
    els.entryDate.valueAsDate = new Date();
}

function saveData() {
    localStorage.setItem('minijob_entries', JSON.stringify(state.entries));
    updateUI();
}

function addEntry(entry) {
    state.entries.unshift(entry); // Add to top
    saveData();
    // After adding, ensure we stay on the added month? Or just update.
    // Let's not switch months, just load data.
    updateUI();
}

function clearAll() {
    if (confirm('Tüm kayıtları silmek istediğinize emin misiniz?')) {
        state.entries = [];
        saveData();
    }
}

// Navigation
function changeMonth(offset) {
    let newMonth = state.currentMonth + offset;
    let newYear = state.currentYear;

    if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    }

    state.currentMonth = newMonth;
    state.currentYear = newYear;

    updateUI();
}

// UI Updates
function updateUI() {
    // Current Selected Month Date Object
    const selectedDate = new Date(state.currentYear, state.currentMonth, 1);

    // Update Header
    els.currentMonthDisplay.innerText = selectedDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

    // Filter Entries for selected month
    const filteredEntries = state.entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === state.currentMonth && d.getFullYear() === state.currentYear;
    });

    renderList(filteredEntries);
    updateDashboard(filteredEntries);
    updateChart(filteredEntries);
}

function renderList(entries) {
    els.entriesList.innerHTML = '';

    if (entries.length === 0) {
        els.entriesList.innerHTML = '<li style="text-align:center; color:#555; padding:20px;">Bu ay için kayıt yok.</li>';
        return;
    }

    entries.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'entry-item';

        const dateObj = new Date(entry.date);
        const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

        li.innerHTML = `
            <div class="entry-info">
                <h4>${entry.note || (entry.type === 'hourly' ? 'Saatlik Vardiya' : 'İş')}</h4>
                <div class="entry-date">${dateStr} • ${entry.type === 'hourly' ? entry.hours + 's @ €' + entry.rate : 'Sabit'}</div>
            </div>
            <div class="entry-amount">+€${entry.value.toFixed(2)}</div>
        `;
        els.entriesList.appendChild(li);
    });
}

function updateDashboard(entries) {
    const total = entries.reduce((sum, e) => sum + e.value, 0);

    // Counter Animation
    animateValue(els.totalAmount, parseFloat(els.totalAmount.innerText), total, 800);
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Chart
function initChart() {
    const ctx = document.getElementById('earningsChart').getContext('2d');

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 230, 118, 0.0)');

    earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Kazanç',
                data: [],
                borderColor: '#00e676',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: false },
                y: { display: false } // Minimalist look
            }
        }
    });
}

function updateChart(entries) {
    if (!earningsChart) return;

    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const labels = [];
    const data = [];

    // Initialize array with 0s
    const dailyTotals = new Array(daysInMonth).fill(0);

    entries.forEach(e => {
        const d = new Date(e.date);
        // Date is 1-indexed (1st is 1), array is 0-indexed
        dailyTotals[d.getDate() - 1] += e.value;
    });

    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i);
        data.push(dailyTotals[i - 1]);
    }

    earningsChart.data.labels = labels;
    earningsChart.data.datasets[0].data = data;
    earningsChart.update();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    els.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    els.nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // Modal Controls
    els.addEntryBtn.addEventListener('click', () => {
        els.entryModal.classList.add('open');
        els.entryDate.valueAsDate = new Date(); // Reset to today
    });
    els.closeModalBtn.addEventListener('click', () => els.entryModal.classList.remove('open'));

    // Toggle Type
    els.typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.type === 'hourly') {
                els.hourlyInputGroup.classList.remove('hidden');
                els.dailyInputGroup.classList.add('hidden');
            } else {
                els.hourlyInputGroup.classList.add('hidden');
                els.dailyInputGroup.classList.remove('hidden');
            }
        });
    });

    // Calc Preview
    const updateCalc = () => {
        const h = parseFloat(els.hoursInput.value) || 0;
        const r = parseFloat(els.rateInput.value) || 0;
        els.hourlyCalcTotal.innerText = (h * r).toFixed(2);
    };
    els.hoursInput.addEventListener('input', updateCalc);
    els.rateInput.addEventListener('input', updateCalc);

    // Form Submit
    els.entryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.querySelector('.toggle-btn.active').dataset.type;
        const date = els.entryDate.value;
        const note = els.entryNote.value;
        let value = 0;
        let hours = 0;
        let rate = 0;

        if (type === 'daily') {
            value = parseFloat(els.dailyAmount.value);
        } else {
            hours = parseFloat(els.hoursInput.value);
            rate = parseFloat(els.rateInput.value);
            value = hours * rate;
        }

        if (!value || value <= 0) {
            alert('Lütfen geçerli bir tutar girin');
            return;
        }

        addEntry({
            id: Date.now(),
            date,
            type,
            value,
            hours,
            rate,
            note
        });

        // Close and Reset
        els.entryModal.classList.remove('open');
        e.target.reset();
        // Keep the rate default
        els.rateInput.value = 12.82;
    });

    els.clearAllBtn.addEventListener('click', clearAll);

    // PWA Install Click
    if (els.installBtn) {
        els.installBtn.addEventListener('click', installApp);
    }
    if (els.closeIosBtn) {
        els.closeIosBtn.addEventListener('click', () => {
            els.iosInstallModal.classList.remove('open');
        });
    }
}

// Run
document.addEventListener('DOMContentLoaded', init);
