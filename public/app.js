// App State
const state = {
    entries: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    hourlyRate: 12.82,
    exchangeRate: null,
    editingEntryId: null,
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
    modalTitle: document.getElementById('modalTitle'),
    saveBtn: document.getElementById('saveBtn'),
    typeBtns: document.querySelectorAll('.toggle-btn'),
    dailyInputGroup: document.getElementById('dailyInputGroup'),
    hourlyInputGroup: document.getElementById('hourlyInputGroup'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    // Inputs
    editEntryId: document.getElementById('editEntryId'),
    entryDate: document.getElementById('entryDate'),
    dailyAmount: document.getElementById('dailyAmount'),
    hoursInput: document.getElementById('hoursInput'),
    rateInput: document.getElementById('rateInput'),
    hourlyCalcTotal: document.getElementById('hourlyCalcTotal'),
    entryNote: document.getElementById('entryNote'),
    // Hour Mode
    hourModeBtns: document.querySelectorAll('.hour-mode-btn'),
    manualHourInput: document.getElementById('manualHourInput'),
    timeRangeInput: document.getElementById('timeRangeInput'),
    startTime: document.getElementById('startTime'),
    endTime: document.getElementById('endTime'),
    breakTime: document.getElementById('breakTime'),
    timeCalcPreview: document.getElementById('timeCalcPreview'),
    // Month Nav
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    // TRY Conversion
    tryConversion: document.getElementById('tryConversion'),
    tryAmount: document.getElementById('tryAmount'),
    tryRate: document.getElementById('tryRate'),
    // PWA Elements
    installBanner: document.getElementById('installBanner'),
    installBtn: document.getElementById('installBtn'),
    iosInstallModal: document.getElementById('iosInstallModal'),
    closeIosBtn: document.getElementById('closeIosBtn'),
};

let earningsChart;
let deferredPrompt;

// Initialization
function init() {
    loadData();
    loadHourlyRate();
    setupEventListeners();
    updateUI();
    initChart();
    fetchExchangeRate();
    checkPWAStatus();
}

// Exchange Rate
async function fetchExchangeRate() {
    // Check cache first
    const cached = localStorage.getItem('minijob_exchange_rate');
    const cacheTime = localStorage.getItem('minijob_exchange_rate_time');
    const now = Date.now();

    // Use cache if less than 1 hour old
    if (cached && cacheTime && (now - parseInt(cacheTime)) < 3600000) {
        state.exchangeRate = parseFloat(cached);
        updateTRYDisplay();
        return;
    }

    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=TRY');
        const data = await response.json();
        state.exchangeRate = data.rates.TRY;

        // Cache the result
        localStorage.setItem('minijob_exchange_rate', state.exchangeRate.toString());
        localStorage.setItem('minijob_exchange_rate_time', now.toString());

        updateTRYDisplay();
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        els.tryConversion.style.display = 'none';
    }
}

function updateTRYDisplay() {
    if (!state.exchangeRate) return;

    const eurAmount = parseFloat(els.totalAmount.innerText) || 0;
    const tryAmount = eurAmount * state.exchangeRate;

    els.tryAmount.innerText = `₺${tryAmount.toFixed(2)}`;
    els.tryRate.innerText = `(1€ = ₺${state.exchangeRate.toFixed(2)})`;
}

// Hourly Rate Persistence
function loadHourlyRate() {
    const saved = localStorage.getItem('minijob_hourly_rate');
    if (saved) {
        state.hourlyRate = parseFloat(saved);
        els.rateInput.value = state.hourlyRate;
    }
}

function saveHourlyRate(rate) {
    state.hourlyRate = rate;
    localStorage.setItem('minijob_hourly_rate', rate.toString());
}

// PWA Logic
function checkPWAStatus() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        state.canInstall = true;
        els.installBanner.classList.add('visible');
        document.body.classList.add('banner-active');
    });

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIos && !isStandAlone) {
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
        state.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    els.entryDate.valueAsDate = new Date();
}

function saveData() {
    localStorage.setItem('minijob_entries', JSON.stringify(state.entries));
    updateUI();
}

function addEntry(entry) {
    state.entries.unshift(entry);
    state.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveData();
}

function updateEntry(id, updatedEntry) {
    const index = state.entries.findIndex(e => e.id === id);
    if (index !== -1) {
        state.entries[index] = { ...state.entries[index], ...updatedEntry };
        state.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveData();
    }
}

function clearAll() {
    if (confirm('Tüm kayıtları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
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
    const selectedDate = new Date(state.currentYear, state.currentMonth, 1);
    els.currentMonthDisplay.innerText = selectedDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

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
        const li = document.createElement('li');
        li.className = 'empty-state';
        li.innerHTML = '<i class="fa-regular fa-folder-open"></i>Bu ay için kayıt bulunamadı';
        els.entriesList.appendChild(li);
        return;
    }

    entries.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'entry-item-wrapper';
        li.dataset.id = entry.id;
        li.style.animationDelay = `${index * 0.05}s`;

        const dateObj = new Date(entry.date);
        const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

        li.innerHTML = `
            <div class="entry-actions">
                <button class="entry-action-btn edit-btn" onclick="editEntry(${entry.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="entry-action-btn delete-btn" onclick="deleteEntry(${entry.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="entry-content">
                <div class="entry-info">
                    <h4>${entry.note || (entry.type === 'hourly' ? 'Saatlik Çalışma' : 'Günlük Kazanç')}</h4>
                    <div class="entry-date">${dateStr} • ${entry.type === 'hourly' ? entry.hours + 's @ €' + entry.rate.toFixed(2) : 'Sabit Tutar'}</div>
                </div>
                <div class="entry-amount">+€${entry.value.toFixed(2)}</div>
            </div>
        `;

        // Swipe functionality
        const content = li.querySelector('.entry-content');
        let startX, currentX;
        const threshold = -50;

        content.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
        });

        content.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            if (diff < 0 && diff > -120) {
                content.style.transform = `translateX(${diff}px)`;
            }
        });

        content.addEventListener('touchend', () => {
            const diff = currentX - startX;
            if (diff < threshold) {
                content.style.transform = `translateX(-120px)`;
                li.classList.add('swiped');
            } else {
                content.style.transform = `translateX(0)`;
                li.classList.remove('swiped');
            }
        });

        content.addEventListener('click', () => {
            if (li.classList.contains('swiped')) {
                content.style.transform = `translateX(0)`;
                li.classList.remove('swiped');
            }
        });

        els.entriesList.appendChild(li);
    });
}

window.deleteEntry = function (id) {
    if (confirm('Bu kaydı silmek istiyor musunuz?')) {
        state.entries = state.entries.filter(e => e.id !== id);
        saveData();
    }
};

window.editEntry = function (id) {
    const entry = state.entries.find(e => e.id === id);
    if (!entry) return;

    state.editingEntryId = id;
    els.editEntryId.value = id;
    els.modalTitle.innerText = 'Kaydı Düzenle';
    els.saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Güncelle';

    // Set form values
    els.entryDate.value = entry.date;
    els.entryNote.value = entry.note || '';

    // Set type
    els.typeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === entry.type);
    });

    if (entry.type === 'hourly') {
        els.hourlyInputGroup.classList.remove('hidden');
        els.dailyInputGroup.classList.add('hidden');
        els.hoursInput.value = entry.hours;
        els.rateInput.value = entry.rate;
        updateHourlyCalc();
    } else {
        els.hourlyInputGroup.classList.add('hidden');
        els.dailyInputGroup.classList.remove('hidden');
        els.dailyAmount.value = entry.value;
    }

    els.entryModal.classList.add('open');
};

function updateDashboard(entries) {
    const total = entries.reduce((sum, e) => sum + e.value, 0);
    animateValue(els.totalAmount, parseFloat(els.totalAmount.innerText) || 0, total, 600);

    // Update TRY after animation
    setTimeout(() => updateTRYDisplay(), 650);
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        obj.innerHTML = (easeProgress * (end - start) + start).toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Chart
function initChart() {
    const ctx = document.getElementById('earningsChart');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.4)');
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
                pointBackgroundColor: '#00e676',
                pointBorderColor: '#0a0a0f',
                pointBorderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(18, 18, 26, 0.95)',
                    titleColor: '#a0a0a0',
                    bodyColor: '#00e676',
                    bodyFont: { weight: 'bold', size: 14 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: (items) => `${items[0].label}. gün`,
                        label: (item) => `€${item.raw.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    display: false,
                    grid: { display: false },
                    beginAtZero: true
                }
            }
        }
    });
}

function updateChart(entries) {
    if (!earningsChart) return;

    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const labels = [];
    const dailyTotals = new Array(daysInMonth).fill(0);

    entries.forEach(e => {
        const d = new Date(e.date);
        dailyTotals[d.getDate() - 1] += e.value;
    });

    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i);
    }

    earningsChart.data.labels = labels;
    earningsChart.data.datasets[0].data = dailyTotals;
    earningsChart.update('none');
}

// Time Calculations
function calculateTimeRange() {
    const start = els.startTime.value;
    const end = els.endTime.value;
    const breakMinutes = parseInt(els.breakTime.value) || 0;

    if (!start || !end) return 0;

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - breakMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts

    return totalMinutes / 60;
}

function updateTimeCalcPreview() {
    const hours = calculateTimeRange();
    els.timeCalcPreview.innerHTML = `Hesaplanan: <strong>${hours.toFixed(2)} saat</strong>`;
    updateHourlyCalc();
}

function updateHourlyCalc() {
    let hours = 0;
    const manualMode = document.querySelector('.hour-mode-btn.active')?.dataset.mode === 'manual';

    if (manualMode) {
        hours = parseFloat(els.hoursInput.value) || 0;
    } else {
        hours = calculateTimeRange();
    }

    const rate = parseFloat(els.rateInput.value) || 0;
    els.hourlyCalcTotal.innerText = (hours * rate).toFixed(2);
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    els.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    els.nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // Modal Controls
    els.addEntryBtn.addEventListener('click', () => {
        resetForm();
        els.modalTitle.innerText = 'Yeni Kayıt';
        els.saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Kaydet';
        els.entryModal.classList.add('open');
    });

    els.closeModalBtn.addEventListener('click', () => {
        els.entryModal.classList.remove('open');
        resetForm();
    });

    // Close modal on backdrop click
    els.entryModal.addEventListener('click', (e) => {
        if (e.target === els.entryModal) {
            els.entryModal.classList.remove('open');
            resetForm();
        }
    });

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

    // Hour Mode Toggle
    els.hourModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.hourModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.mode === 'manual') {
                els.manualHourInput.classList.remove('hidden');
                els.timeRangeInput.classList.add('hidden');
            } else {
                els.manualHourInput.classList.add('hidden');
                els.timeRangeInput.classList.remove('hidden');
                updateTimeCalcPreview();
            }
        });
    });

    // Time Range Inputs
    els.startTime.addEventListener('input', updateTimeCalcPreview);
    els.endTime.addEventListener('input', updateTimeCalcPreview);
    els.breakTime.addEventListener('input', updateTimeCalcPreview);

    // Hourly Calc
    els.hoursInput.addEventListener('input', updateHourlyCalc);
    els.rateInput.addEventListener('input', () => {
        updateHourlyCalc();
        saveHourlyRate(parseFloat(els.rateInput.value) || 12.82);
    });

    // Form Submit
    els.entryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.querySelector('.toggle-btn.active').dataset.type;
        const date = els.entryDate.value;
        const note = els.entryNote.value.trim();
        let value = 0;
        let hours = 0;
        let rate = 0;

        if (type === 'daily') {
            value = parseFloat(els.dailyAmount.value);
        } else {
            const manualMode = document.querySelector('.hour-mode-btn.active')?.dataset.mode === 'manual';
            if (manualMode) {
                hours = parseFloat(els.hoursInput.value);
            } else {
                hours = calculateTimeRange();
            }
            rate = parseFloat(els.rateInput.value);
            value = hours * rate;
        }

        if (!value || value <= 0) {
            alert('Lütfen geçerli bir tutar girin');
            return;
        }

        if (!date) {
            alert('Lütfen bir tarih seçin');
            return;
        }

        const entryData = {
            date,
            type,
            value,
            hours: type === 'hourly' ? hours : 0,
            rate: type === 'hourly' ? rate : 0,
            note
        };

        if (state.editingEntryId) {
            updateEntry(state.editingEntryId, entryData);
        } else {
            addEntry({
                id: Date.now(),
                ...entryData
            });
        }

        els.entryModal.classList.remove('open');
        resetForm();
    });

    els.clearAllBtn.addEventListener('click', clearAll);

    // PWA Install
    if (els.installBtn) {
        els.installBtn.addEventListener('click', installApp);
    }
    if (els.closeIosBtn) {
        els.closeIosBtn.addEventListener('click', () => {
            els.iosInstallModal.classList.remove('open');
        });
    }
}

function resetForm() {
    state.editingEntryId = null;
    els.editEntryId.value = '';
    els.entryForm.reset();
    els.entryDate.valueAsDate = new Date();
    els.rateInput.value = state.hourlyRate;

    // Reset toggles
    els.typeBtns.forEach(b => b.classList.remove('active'));
    els.typeBtns[0].classList.add('active');
    els.hourlyInputGroup.classList.add('hidden');
    els.dailyInputGroup.classList.remove('hidden');

    els.hourModeBtns.forEach(b => b.classList.remove('active'));
    els.hourModeBtns[0].classList.add('active');
    els.manualHourInput.classList.remove('hidden');
    els.timeRangeInput.classList.add('hidden');

    els.hourlyCalcTotal.innerText = '0.00';
}

// Run
document.addEventListener('DOMContentLoaded', init);
