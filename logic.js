let currentDayIndex = 0;
let appData = null;

/* ============================
   SVG Icons
============================ */

const ICONS = {
    dumbbell: `<line x1="9" y1="12" x2="15" y2="12" stroke-width="2.5"/><rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><rect x="6" y="7" width="3" height="10" rx="1"/><rect x="15" y="7" width="3" height="10" rx="1"/>`,
    rocket: `<path d="M12 2c-2 3-3 6-3 9 0 2 1 4 3 6 2-2 3-4 3-6 0-3-1-6-3-9z"/><circle cx="12" cy="9" r="1.5"/><path d="M9 17c-1 1-2 3-2 5 2 0 4-1 5-2"/><path d="M15 17c1 1 2 3 2 5-2 0-4-1-5-2"/>`,
    legs: `<circle cx="8" cy="4" r="2"/><path d="M8 6v7l3 4 1 5"/><path d="M8 11l-3 3-2 5"/><path d="M8 13l4-2 4 1 3 4"/>`,
    'full-body': `<circle cx="12" cy="4" r="2"/><path d="M12 6v6M8 9h8M12 12l-3 8M12 12l3 8"/>`,
    home: `<path d="M3 10l9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>`,
    stretch: `<circle cx="12" cy="4" r="2"/><path d="M12 6v8M6 10l6-2 6 2M9 20l3-6 3 6"/>`,
    calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>`,
    upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    device: `<rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/>`,
    cloud: `<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>`,
    sync: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
    edit: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
    trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>`,
    close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
    check: `<polyline points="20 6 9 17 4 12"/>`,
    warning: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
    info: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`
};

function icon(name, size = 20) {
    const path = ICONS[name];
    if (!path) return name; // fallback
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/* ============================
   Popup System
============================ */

function showPopup({ title = '', message = '', type = 'info', buttons = [] } = {}) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.className = 'modal popup-modal';

        const iconName = type === 'warning' ? 'warning' : type === 'success' ? 'check' : 'info';
        const iconClass = type === 'warning' ? 'popup-icon-warning' : type === 'success' ? 'popup-icon-success' : 'popup-icon-info';

        const buttonsHtml = buttons.map((btn, i) => {
            let cls = btn.primary ? 'popup-btn-primary' : 'popup-btn-secondary';
            if (btn.danger) cls += ' popup-btn-danger';
            return `<button class="popup-btn ${cls}" data-value="${i}">${btn.text}</button>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content popup-content">
                <div class="popup-icon ${iconClass}">${icon(iconName, 28)}</div>
                ${title ? `<h3 class="popup-title">${title}</h3>` : ''}
                ${message ? `<p class="popup-message">${message}</p>` : ''}
                <div class="popup-actions">${buttonsHtml}</div>
            </div>
        `;

        document.body.appendChild(modal);

        function close(value) {
            modal.remove();
            resolve(value);
        }

        modal.querySelectorAll('.popup-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                close(buttons[parseInt(btn.dataset.value)].value);
            });
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                const cancelBtn = buttons.find(b => !b.primary);
                close(cancelBtn ? cancelBtn.value : buttons[0]?.value);
            }
        });

        modal.style.display = 'flex';
    });
}

function showAlert(message, title = 'Notice') {
    return showPopup({
        title, message, type: 'info',
        buttons: [{ text: 'OK', value: true, primary: true }]
    });
}

function showSuccess(message, title = 'Success') {
    return showPopup({
        title, message, type: 'success',
        buttons: [{ text: 'OK', value: true, primary: true }]
    });
}

function showConfirm(message, title = 'Confirm', danger = false) {
    return showPopup({
        title, message, type: 'warning',
        buttons: [
            { text: 'Cancel', value: false },
            { text: 'Confirm', value: true, primary: true, danger }
        ]
    });
}

/* ============================
   Date Format Helpers
============================ */

function saveStartDate(date) { localStorage.setItem('workout_start_date', date); }
function loadStartDate() { return localStorage.getItem('workout_start_date'); }

function ddmmyyyyToISO(str) {
    if (!str) return '';
    const parts = str.split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    if (!/^\d+$/.test(dd) || !/^\d+$/.test(mm) || !/^\d{4}$/.test(yyyy)) return '';
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function isoToDDMMYYYY(iso) {
    const parts = iso.split('-');
    if (parts.length !== 3) return '';
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
}

/* ============================
   Load JSON Data
============================ */

async function loadData() {
    try {
        const response = await fetch('./workoutData.json');
        if (!response.ok) throw new Error('Failed to load workoutData.json');
        appData = await response.json();
        const savedStartDate = loadStartDate();
        if (savedStartDate) appData.START_DATE = savedStartDate;
        else saveStartDate(appData.START_DATE);
    } catch (err) {
        console.error('Error loading JSON:', err);
        showAlert("I can't read the workoutData.json file, make sure it exists!", "Loading Error");
    }
}

/* ============================
   Local Storage Helpers
============================ */

function getDayKey(dayId) { return `workout_day_${dayId}`; }

function getColumnMeta(day) {
    const lastColIndex = day.columns.length - 1;
    const isWeightColumn = day.columns[lastColIndex].includes("Max Weight");
    return { lastColIndex, isWeightColumn };
}

function arrayRowToExercise(day, ex) {
    const { lastColIndex, isWeightColumn } = getColumnMeta(day);
    let maxWeight = "";
    if (isWeightColumn && typeof ex[lastColIndex] === 'number' && ex[lastColIndex] > 0) {
        maxWeight = String(ex[lastColIndex]);
    }
    let side = "both";
    if (isWeightColumn && typeof ex[lastColIndex + 1] === 'string') {
        side = ex[lastColIndex + 1].toLowerCase().includes("one") ? "one" : "both";
    }
    return { cells: ex.slice(0, day.columns.length), maxWeight, side };
}

function exerciseToArrayRow(day, ex) {
    const { lastColIndex, isWeightColumn } = getColumnMeta(day);
    const row = ex.cells.slice(0, day.columns.length);
    if (isWeightColumn) {
        const weightNum = (ex.maxWeight !== "" && !isNaN(Number(ex.maxWeight))) ? Number(ex.maxWeight) : 0;
        row[lastColIndex] = weightNum;
        row.push(ex.side === "one" ? "One Side" : "Both");
    }
    return row;
}

function getDayData(day) {
    const key = getDayKey(day.id);
    const saved = localStorage.getItem(key);
    const defaultExercises = day.exercises;

    if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
            return parsed.map(ex => Array.isArray(ex) ? arrayRowToExercise(day, ex) : ex);
        }
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].cells) {
            return parsed.map(ex => {
                let maxWeight = ex.maxWeight || "";
                let side = ex.side || "both";
                let cells = ex.cells || [];
                if (cells.length === 0 && Array.isArray(ex)) cells = [...ex];
                return { cells, maxWeight, side };
            });
        }
        return parsed;
    }

    if (defaultExercises.length > 0 && typeof defaultExercises[0] === 'object' && defaultExercises[0].cells) {
        return defaultExercises.map(ex => ({
            cells: [...ex.cells], maxWeight: ex.maxWeight || "", side: ex.side || "both"
        }));
    }

    return defaultExercises.map(ex => {
        if (Array.isArray(ex)) return arrayRowToExercise(day, ex);
        return { cells: [...(ex.cells || [])], maxWeight: ex.maxWeight || "", side: ex.side || "both" };
    });
}

function saveDayData(dayId, exercises) {
    localStorage.setItem(getDayKey(dayId), JSON.stringify(exercises));
}

/* ============================
   Modal Helpers (Edit Row)
============================ */

function createModal() {
    const modal = document.createElement("div");
    modal.id = "edit-modal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">${icon('edit', 18)} Edit Row</h3>
            <div id="modal-fields"></div>
            <div class="modal-actions">
                <button class="save-btn" id="modal-save">Save</button>
                <button class="cancel-btn" id="modal-cancel">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.getElementById("modal-cancel").addEventListener("click", closeModal);
}

function openModal(dayId, exerciseIndex, columns, defaultCells) {
    let modal = document.getElementById("edit-modal");
    if (!modal) { createModal(); modal = document.getElementById("edit-modal"); }

    const day = appData.days.find(d => d.id === dayId);
    const exercises = getDayData(day);
    const row = exercises[exerciseIndex];

    const fieldsContainer = document.getElementById("modal-fields");
    fieldsContainer.innerHTML = "";

    const lastColIndex = columns.length - 1;
    const isWeightColumn = columns[lastColIndex].includes("Max Weight");

    columns.forEach((col, index) => {
        if (isWeightColumn && index === lastColIndex) return;
        const label = document.createElement("label");
        label.textContent = col;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "modal-input";
        input.dataset.index = index;
        input.value = row.cells[index] ?? "";
        fieldsContainer.appendChild(label);
        fieldsContainer.appendChild(input);
    });

    document.getElementById("modal-save").onclick = () => {
        fieldsContainer.querySelectorAll(".modal-input").forEach(inp => {
            row.cells[parseInt(inp.dataset.index)] = inp.value;
        });
        saveDayData(dayId, exercises);
        closeModal();
        render();
    };

    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) modal.style.display = "none";
}

/* ============================
   Render
============================ */

function render() {
    if (!appData) return;

    const isoStartDate = ddmmyyyyToISO(appData.START_DATE);
    document.getElementById("startDate").innerHTML = `
        ${icon('calendar', 16)} Started:
        <input type="date" id="start-date-input" class="start-date-input" value="${isoStartDate}">
    `;

    const tabsContainer = document.getElementById("tabs");
    tabsContainer.innerHTML = "";
    appData.days.forEach((day, index) => {
        const btn = document.createElement("button");
        btn.className = "tab-btn" + (index === currentDayIndex ? " active" : "");
        btn.className += ['pull', 'push', 'legs'].includes(day.id) ? " core-day " : '';
        btn.textContent = day.day;
        btn.onclick = () => { currentDayIndex = index; render(); };
        tabsContainer.appendChild(btn);
    });

    const content = document.getElementById("content");
    content.innerHTML = "";

    const day = appData.days[currentDayIndex];
    const exercises = getDayData(day);

    const card = document.createElement("div");
    card.className = "day-card";

    const headerHTML = `
        <div class="day-header">
            <div class="day-icon">${icon(day.icon, 30)}</div>
            <div>
                <div class="day-title">${day.day}: ${day.title}</div>
                <div class="day-subtitle">${exercises.length} exercises</div>
            </div>
        </div>
    `;

    let tableHTML = `
        <table class="exercise-table">
            <thead><tr><th>#</th>
    `;
    day.columns.forEach(col => { tableHTML += `<th>${col}</th>`; });
    tableHTML += `</tr></thead><tbody>`;

    const lastColIndex = day.columns.length - 1;
    const isWeightColumn = day.columns[lastColIndex].includes("Max Weight");

    exercises.forEach((ex, exerciseIndex) => {
        const row = ex;
        const cells = row.cells;
        tableHTML += "<tr>";
        tableHTML += `<td data-label="#"><span class="exercise-number">${exerciseIndex + 1}</span></td>`;

        cells.forEach((cell, columnIndex) => {
            let className = "";
            let cellContent = cell;

            if (columnIndex === 0) {
                className = "exercise-name";
                cellContent = `
                    <div class="exercise-wrapper">
                        <span class="exercise-text">${cell}</span>
                        <div class="row-actions">
                            <button class="edit-btn" data-day="${day.id}" data-exercise="${exerciseIndex}" title="Edit">${icon('edit', 15)}</button>
                            <button class="delete-btn" data-day="${day.id}" data-exercise="${exerciseIndex}" title="Delete">${icon('trash', 15)}</button>
                        </div>
                    </div>
                `;
            } else if (columnIndex === 1 && day.columns.length >= 3) {
                className = "sets-cell";
                cellContent = `<span class="sets-badge">${cell}</span>`;
            } else if (columnIndex === 2 && day.columns.length === 4) {
                className = "reps-cell";
                cellContent = `<span class="reps-badge">${cell}</span>`;
            } else if (columnIndex === lastColIndex && isWeightColumn) {
                cellContent = `
                    <div class="side-toggle-wrapper">
                        <input type="number" class="weight-input" data-day="${day.id}" data-exercise="${exerciseIndex}" value="${row.maxWeight || ""}" placeholder="0" step="0.5" min="0">
                        <button class="side-btn ${row.side === "both" ? "both" : "one"}" data-day="${day.id}" data-exercise="${exerciseIndex}">
                            ${row.side === "both" ? "Both" : "1 Side"}
                        </button>
                    </div>
                `;
            }

            tableHTML += `<td data-label="${day.columns[columnIndex]}" class="${className}">${cellContent}</td>`;
        });

        tableHTML += "</tr>";
    });

    tableHTML += `</tbody></table>
        <button class="add-exercise-btn" data-day="${day.id}">+ Add Exercise</button>
    `;

    card.innerHTML = headerHTML + tableHTML;
    content.appendChild(card);
}

/* ============================
   Event Listeners
============================ */

document.addEventListener("change", e => {
    if (e.target && e.target.id === "start-date-input") {
        const iso = e.target.value;
        if (!iso) return;
        appData.START_DATE = isoToDDMMYYYY(iso);
        saveStartDate(appData.START_DATE);
        render();
    }
});

document.addEventListener("change", e => {
    if (!e.target.classList.contains("weight-input")) return;
    const input = e.target;
    const dayId = input.dataset.day;
    const day = appData.days.find(d => d.id === dayId);
    const exercises = getDayData(day);
    const row = exercises[parseInt(input.dataset.exercise)];
    row.maxWeight = input.value;
    saveDayData(dayId, exercises);
});

document.addEventListener("click", async e => {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
        const dayId = editBtn.dataset.day;
        const exerciseIndex = parseInt(editBtn.dataset.exercise);
        const day = appData.days.find(d => d.id === dayId);
        const exercises = getDayData(day);
        const defaultCells = exercises[exerciseIndex].cells;
        openModal(dayId, exerciseIndex, day.columns, defaultCells);
        return;
    }

    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
        const dayId = deleteBtn.dataset.day;
        const exerciseIndex = parseInt(deleteBtn.dataset.exercise);

        const ok = await showConfirm("Are you sure you want to delete this exercise?", "Delete Exercise", true);        if (!ok) return;

        const day = appData.days.find(d => d.id === dayId);
        const exercises = getDayData(day);
        exercises.splice(exerciseIndex, 1);
        saveDayData(dayId, exercises);
        render();
        return;
    }

    const addBtn = e.target.closest(".add-exercise-btn");
    if (addBtn) {
        const dayId = addBtn.dataset.day;
        const day = appData.days.find(d => d.id === dayId);
        const exercises = getDayData(day);
        exercises.push({ cells: new Array(day.columns.length).fill(""), maxWeight: "", side: "both" });
        saveDayData(dayId, exercises);
        render();
        return;
    }

    const sideBtn = e.target.closest(".side-btn");
    if (!sideBtn) return;

    const dayId = sideBtn.dataset.day;
    const day = appData.days.find(d => d.id === dayId);
    const exercises = getDayData(day);
    const row = exercises[parseInt(sideBtn.dataset.exercise)];
    row.side = row.side === "both" ? "one" : "both";
    saveDayData(dayId, exercises);
    render();
});

loadData().then(() => { render(); });