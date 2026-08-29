let currentDayIndex = 0;
let appData = null;

/* ============================
   Load JSON Data
============================ */

async function loadData() {
    try {
        const response = await fetch('./workoutData.json');
        if (!response.ok) {
            throw new Error('Failed to load workoutData.json');
        }
        appData = await response.json();
    } catch (err) {
        console.error('Error loading JSON:', err);
        alert("I can't read the workoutData.json file, make sure it exists!");
    }
}

/* ============================
   Local Storage Helpers
============================ */

function getDayKey(dayId) {
    return `workout_day_${dayId}`;
}

function getColumnMeta(day) {
    const lastColIndex = day.columns.length - 1;
    const isWeightColumn = day.columns[lastColIndex].includes("Max Weight");
    return { lastColIndex, isWeightColumn };
}

/**
 * Converts a raw row array — the shape used in workoutData.json and in
 * exported/imported files, e.g. ["Lat Pulldown", "3", "8-12", 50, "Both"] —
 * into the internal exercise object { cells, maxWeight, side } used by the app.
 * The side value ("Both" / "One Side") is just read as the item right after
 * the weight, exactly like any other cell.
 */
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

    return {
        cells: ex.slice(0, day.columns.length),
        maxWeight: maxWeight,
        side: side
    };
}

/**
 * Converts an internal exercise object { cells, maxWeight, side } back into
 * a raw row array matching the same shape used in workoutData.json, e.g.
 * ["Lat Pulldown", "3", "8-12", 50, "Both"]. Used for exporting data.
 */
function exerciseToArrayRow(day, ex) {
    const { lastColIndex, isWeightColumn } = getColumnMeta(day);
    const row = ex.cells.slice(0, day.columns.length);

    if (isWeightColumn) {
        const weightNum = (ex.maxWeight !== "" && !isNaN(Number(ex.maxWeight)))
            ? Number(ex.maxWeight)
            : 0;
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

        /* ---------- Migrate old format (array of arrays) ---------- */
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
            return parsed.map((ex) => {
                if (Array.isArray(ex)) {
                    return arrayRowToExercise(day, ex);
                }
                return ex;
            });
        }

        /* ---------- Migrate old format (array of objects without cells) ---------- */
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].cells) {
            return parsed.map((ex) => {
                let maxWeight = ex.maxWeight || "";
                let side = ex.side || "both";
                let cells = ex.cells || [];
                if (cells.length === 0 && Array.isArray(ex)) {
                    cells = [...ex];
                }
                return { cells, maxWeight, side };
            });
        }

        return parsed;
    }

    /* ---------- New JSON format: objects with cells, maxWeight, side ---------- */
    if (defaultExercises.length > 0 && typeof defaultExercises[0] === 'object' && defaultExercises[0].cells) {
        return defaultExercises.map((ex) => ({
            cells: [...ex.cells],
            maxWeight: ex.maxWeight || "",
            side: ex.side || "both"
        }));
    }

    /* ---------- Row format: [name, sets, reps, weight, side] ---------- */
    return defaultExercises.map((ex) => {
        if (Array.isArray(ex)) {
            return arrayRowToExercise(day, ex);
        }
        return {
            cells: [...(ex.cells || [])],
            maxWeight: ex.maxWeight || "",
            side: ex.side || "both"
        };
    });
}

function saveDayData(dayId, exercises) {
    localStorage.setItem(getDayKey(dayId), JSON.stringify(exercises));
}

/* ============================
   Modal Helpers
============================ */

function createModal() {
    const modal = document.createElement("div");
    modal.id = "edit-modal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Edit Row</h3>
            <div id="modal-fields"></div>
            <div class="modal-actions">
                <button class="save-btn" id="modal-save">Save</button>
                <button class="cancel-btn" id="modal-cancel">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById("modal-cancel").addEventListener("click", closeModal);
}

function openModal(dayId, exerciseIndex, columns, defaultCells) {
    let modal = document.getElementById("edit-modal");
    if (!modal) {
        createModal();
        modal = document.getElementById("edit-modal");
    }

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

    const saveBtn = document.getElementById("modal-save");
    saveBtn.onclick = () => {
        const inputs = fieldsContainer.querySelectorAll(".modal-input");

        inputs.forEach(inp => {
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

    document.getElementById("startDate").textContent =
        `📅 Started: ${appData.START_DATE}`;

    /* ---------- Tabs ---------- */
    const tabsContainer = document.getElementById("tabs");
    tabsContainer.innerHTML = "";

    appData.days.forEach((day, index) => {
        const btn = document.createElement("button");
        btn.className = "tab-btn" + (index === currentDayIndex ? " active" : "");
        btn.className += ['pull', 'push', 'legs'].includes(day.id) ? " core-day " : ''
        btn.textContent = day.day;
        btn.onclick = () => {
            currentDayIndex = index;
            render();
        };
        tabsContainer.appendChild(btn);
    });

    /* ---------- Content ---------- */
    const content = document.getElementById("content");
    content.innerHTML = "";

    const day = appData.days[currentDayIndex];
    const exercises = getDayData(day);

    const card = document.createElement("div");
    card.className = "day-card";

    const headerHTML = `
        <div class="day-header">
            <div class="day-icon">${day.icon}</div>
            <div>
                <div class="day-title">${day.day}: ${day.title}</div>
                <div class="day-subtitle">${exercises.length} exercises</div>
            </div>
        </div>
    `;

    let tableHTML = `
        <table class="exercise-table">
            <thead>
                <tr>
                    <th>#</th>
    `;

    day.columns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });

    tableHTML += `
                </tr>
            </thead>
            <tbody>
    `;

    const lastColIndex = day.columns.length - 1;
    const isWeightColumn = day.columns[lastColIndex].includes("Max Weight");

    exercises.forEach((ex, exerciseIndex) => {
        const row = ex;
        const cells = row.cells;

        tableHTML += "<tr>";

        tableHTML += `
            <td data-label="#">
                <span class="exercise-number">${exerciseIndex + 1}</span>
            </td>
        `;

        cells.forEach((cell, columnIndex) => {
            let className = "";
            let cellContent = cell;

            /* ========= Exercise Name ========= */
            if (columnIndex === 0) {
                className = "exercise-name";
                cellContent = `
                    <div class="exercise-wrapper">
                        <span class="exercise-text">${cell}</span>
                        <div class="row-actions">
                            <button
                                class="edit-btn"
                                data-day="${day.id}"
                                data-exercise="${exerciseIndex}">
                                ✏️
                            </button>
                            <button
                                class="delete-btn"
                                data-day="${day.id}"
                                data-exercise="${exerciseIndex}">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            }
            /* ========= Sets ========= */
            else if (columnIndex === 1 && day.columns.length >= 3) {
                className = "sets-cell";
                cellContent = `<span class="sets-badge">${cell}</span>`;
            }
            /* ========= Reps ========= */
            else if (columnIndex === 2 && day.columns.length === 4) {
                className = "reps-cell";
                cellContent = `<span class="reps-badge">${cell}</span>`;
            }
            /* ========= Weight ========= */
            else if (columnIndex === lastColIndex && isWeightColumn) {
                cellContent = `
                    <div class="side-toggle-wrapper">
                        <input
                            type="number"
                            class="weight-input"
                            data-day="${day.id}"
                            data-exercise="${exerciseIndex}"
                            value="${row.maxWeight || ""}"
                            placeholder="0"
                            step="0.5"
                            min="0">
                        <button
                            class="side-btn ${row.side === "both" ? "both" : "one"}"
                            data-day="${day.id}"
                            data-exercise="${exerciseIndex}">
                            ${row.side === "both" ? "Both" : "1 Side"}
                        </button>
                    </div>
                `;
            }

            tableHTML += `
                <td data-label="${day.columns[columnIndex]}" class="${className}">
                    ${cellContent}
                </td>
            `;
        });

        tableHTML += "</tr>";
    });

    tableHTML += `
            </tbody>
        </table>
        <button class="add-exercise-btn" data-day="${day.id}">
            + Add Exercise
        </button>
    `;

    card.innerHTML = headerHTML + tableHTML;
    content.appendChild(card);
}

/* ============================
   Weight Input
============================ */

document.addEventListener("input", e => {
    if (!e.target.classList.contains("weight-input")) return;

    const input = e.target;
    const dayId = input.dataset.day;
    const day = appData.days.find(d => d.id === dayId);
    const exercises = getDayData(day);

    const row = exercises[parseInt(input.dataset.exercise)];
    row.maxWeight = input.value;

    saveDayData(dayId, exercises);
});

/* ============================
   Buttons
============================ */

document.addEventListener("click", e => {

    /* ---------- Edit Row ---------- */
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

    /* ---------- Delete Row ---------- */
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
        const dayId = deleteBtn.dataset.day;
        const exerciseIndex = parseInt(deleteBtn.dataset.exercise);

        if (!confirm("Are you sure you want to delete this exercise?")) return;

        const day = appData.days.find(d => d.id === dayId);
        const exercises = getDayData(day);

        exercises.splice(exerciseIndex, 1);
        saveDayData(dayId, exercises);

        render();
        return;
    }

    /* ---------- Add Exercise ---------- */
    const addBtn = e.target.closest(".add-exercise-btn");
    if (addBtn) {
        const dayId = addBtn.dataset.day;

        const day = appData.days.find(d => d.id === dayId);
        const exercises = getDayData(day);

        const emptyRow = {
            cells: new Array(day.columns.length).fill(""),
            maxWeight: "",
            side: "both"
        };
        exercises.push(emptyRow);

        saveDayData(dayId, exercises);
        render();
        return;
    }

    /* ---------- Side Toggle ---------- */
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

/* ============================
   Start
============================ */
loadData().then(() => {
    render();
});