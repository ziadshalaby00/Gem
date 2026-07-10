let currentProgramIndex = 0;

/* ============================
   Local Storage Helpers (مصدر واحد)
============================ */

function getDayKey(programId, dayIndex) {
    return `workout_day_${programId}_${dayIndex}`;
}

function getDayData(programId, dayIndex, defaultExercises) {
    const key = getDayKey(programId, dayIndex);
    const saved = localStorage.getItem(key);

    if (saved) {
        const parsed = JSON.parse(saved);

        /* ---------- Migrate old format ---------- */
        // لو لسه بنفس الفورمات القديم (array of arrays)
        if (Array.isArray(parsed)) {
            return parsed.map((ex) => {
                // لو العنصر array قديم → حوّله لـ object
                if (Array.isArray(ex)) {
                    return {
                        cells: [...ex],
                        maxWeight: "",
                        side: "both"
                    };
                }
                return ex;
            });
        }

        return parsed;
    }

    // Deep copy من الـ default + تحويل لـ object format
    return defaultExercises.map((ex) => {
        if (Array.isArray(ex)) {
            return {
                cells: [...ex],
                maxWeight: "",
                side: "both"
            };
        }
        return { cells: [...ex.cells], maxWeight: ex.maxWeight || "", side: ex.side || "both" };
    });
}

function saveDayData(programId, dayIndex, exercises) {
    localStorage.setItem(getDayKey(programId, dayIndex), JSON.stringify(exercises));
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

function openModal(programId, dayIndex, exerciseIndex, columns, defaultCells) {
    let modal = document.getElementById("edit-modal");
    if (!modal) {
        createModal();
        modal = document.getElementById("edit-modal");
    }

    const program = workoutData.programs.find(p => p.id === programId);
    const day = program.days[parseInt(dayIndex)];
    const exercises = getDayData(programId, parseInt(dayIndex), day.exercises);
    const row = exercises[exerciseIndex];

    const fieldsContainer = document.getElementById("modal-fields");
    fieldsContainer.innerHTML = "";

    const lastColIndex = columns.length - 1;
    const isWeightColumn = columns[lastColIndex].includes("Max Weight");

    columns.forEach((col, index) => {
        // تخطى عمود الوزن
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

        // ✅ حفظ في مصدر واحد
        saveDayData(programId, dayIndex, exercises);
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
    document.getElementById("startDate").textContent =
        `📅 Started: ${START_DATE}`;

    /* ---------- Tabs ---------- */
    const tabsContainer = document.getElementById("tabs");
    tabsContainer.innerHTML = "";

    workoutData.programs.forEach((program, index) => {
        const btn = document.createElement("button");
        btn.className = "tab-btn" + (index === currentProgramIndex ? " active" : "");
        btn.textContent = program.tabName;
        btn.onclick = () => {
            currentProgramIndex = index;
            render();
        };
        tabsContainer.appendChild(btn);
    });

    /* ---------- Content ---------- */
    const content = document.getElementById("content");
    content.innerHTML = "";

    const program = workoutData.programs[currentProgramIndex];

    program.days.forEach((day, dayIndex) => {
        const card = document.createElement("div");
        card.className = "day-card";

        // نجيب التمارين من LocalStorage أو الـ Default
        const exercises = getDayData(program.id, dayIndex, day.exercises);

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
            const row = ex; // ex is now { cells, maxWeight, side }
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
                                    data-program="${program.id}"
                                    data-day="${dayIndex}"
                                    data-exercise="${exerciseIndex}">
                                    ✏️
                                </button>
                                <button
                                    class="delete-btn"
                                    data-program="${program.id}"
                                    data-day="${dayIndex}"
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
                                data-program="${program.id}"
                                data-day="${dayIndex}"
                                data-exercise="${exerciseIndex}"
                                value="${row.maxWeight || ""}"
                                placeholder="0"
                                step="0.5"
                                min="0">
                            <button
                                class="side-btn ${row.side === "both" ? "both" : "one"}"
                                data-program="${program.id}"
                                data-day="${dayIndex}"
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
            <button class="add-exercise-btn" data-program="${program.id}" data-day="${dayIndex}">
                + Add Exercise
            </button>
        `;

        card.innerHTML = headerHTML + tableHTML;
        content.appendChild(card);
    });
}

/* ============================
   Weight Input
============================ */

document.addEventListener("input", e => {
    if (!e.target.classList.contains("weight-input")) return;

    const input = e.target;
    const program = workoutData.programs.find(p => p.id === input.dataset.program);
    const day = program.days[parseInt(input.dataset.day)];
    const exercises = getDayData(program.id, parseInt(input.dataset.day), day.exercises);

    const row = exercises[parseInt(input.dataset.exercise)];
    row.maxWeight = input.value;

    // ✅ حفظ في مصدر واحد
    saveDayData(program.id, parseInt(input.dataset.day), exercises);
});

/* ============================
   Buttons
============================ */

document.addEventListener("click", e => {

    /* ---------- Edit Row ---------- */
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
        const programId = editBtn.dataset.program;
        const dayIndex = parseInt(editBtn.dataset.day);
        const exerciseIndex = parseInt(editBtn.dataset.exercise);

        const program = workoutData.programs.find(p => p.id === programId);
        const day = program.days[dayIndex];
        const exercises = getDayData(programId, dayIndex, day.exercises);
        const defaultCells = exercises[exerciseIndex].cells;

        openModal(programId, dayIndex, exerciseIndex, day.columns, defaultCells);
        return;
    }

    /* ---------- Delete Row ---------- */
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
        const programId = deleteBtn.dataset.program;
        const dayIndex = parseInt(deleteBtn.dataset.day);
        const exerciseIndex = parseInt(deleteBtn.dataset.exercise);

        if (!confirm("Are you sure you want to delete this exercise?")) return;

        const program = workoutData.programs.find(p => p.id === programId);
        const day = program.days[dayIndex];
        const exercises = getDayData(programId, dayIndex, day.exercises);

        exercises.splice(exerciseIndex, 1);
        saveDayData(programId, dayIndex, exercises);

        render();
        return;
    }

    /* ---------- Add Exercise ---------- */
    const addBtn = e.target.closest(".add-exercise-btn");
    if (addBtn) {
        const programId = addBtn.dataset.program;
        const dayIndex = parseInt(addBtn.dataset.day);

        const program = workoutData.programs.find(p => p.id === programId);
        const day = program.days[dayIndex];
        const exercises = getDayData(programId, dayIndex, day.exercises);

        // صف فاضى بعدد الأعمدة (object format)
        const emptyRow = {
            cells: new Array(day.columns.length).fill(""),
            maxWeight: "",
            side: "both"
        };
        exercises.push(emptyRow);

        saveDayData(programId, dayIndex, exercises);
        render();
        return;
    }

    /* ---------- Side Toggle ---------- */
    const sideBtn = e.target.closest(".side-btn");
    if (!sideBtn) return;

    const program = workoutData.programs.find(p => p.id === sideBtn.dataset.program);
    const day = program.days[parseInt(sideBtn.dataset.day)];
    const exercises = getDayData(program.id, parseInt(sideBtn.dataset.day), day.exercises);

    const row = exercises[parseInt(sideBtn.dataset.exercise)];
    row.side = row.side === "both" ? "one" : "both";

    // ✅ حفظ في مصدر واحد
    saveDayData(
        sideBtn.dataset.program,
        parseInt(sideBtn.dataset.day),
        exercises
    );

    render();
});

/* ============================
   Start
============================ */

render();