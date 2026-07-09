// LOGIC JS FILE

let currentProgramIndex = 0;

/* ============================
   Local Storage Helpers
============================ */

function getRowKey(programId, dayIndex, exerciseIndex) {
    return `workout_row_${programId}_${dayIndex}_${exerciseIndex}`;
}

function getRowData(programId, dayIndex, exerciseIndex, defaultExercise) {
    const key = getRowKey(programId, dayIndex, exerciseIndex);
    const saved = localStorage.getItem(key);

    if (saved) {
        return JSON.parse(saved);
    }

    return {
        exercise: defaultExercise,
        maxWeight: "",
        side: "one"
    };
}

function saveRowData(programId, dayIndex, exerciseIndex, data) {
    localStorage.setItem(
        getRowKey(programId, dayIndex, exerciseIndex),
        JSON.stringify(data)
    );
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

        btn.className =
            "tab-btn" + (index === currentProgramIndex ? " active" : "");

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

        const headerHTML = `
            <div class="day-header">
                <div class="day-icon">${day.icon}</div>
                <div>
                    <div class="day-title">${day.day}: ${day.title}</div>
                    <div class="day-subtitle">${day.exercises.length} exercises</div>
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
        const isWeightColumn =
            day.columns[lastColIndex].includes("Max Weight");

        day.exercises.forEach((ex, exerciseIndex) => {

            const row = getRowData(
                program.id,
                dayIndex,
                exerciseIndex,
                ex[0]
            );

            tableHTML += "<tr>";

            tableHTML += `
                <td data-label="#">
                    <span class="exercise-number">
                        ${exerciseIndex + 1}
                    </span>
                </td>
            `;

            ex.forEach((cell, columnIndex) => {

                let className = "";
                let cellContent = cell;

                /* ========= Exercise Name ========= */

                if (columnIndex === 0) {

                    className = "exercise-name";

                    cellContent = `
                        <div class="exercise-wrapper">

                            <span class="exercise-text">
                                ${row.exercise}
                            </span>

                            <button
                                class="edit-btn"
                                data-program="${program.id}"
                                data-day="${dayIndex}"
                                data-exercise="${exerciseIndex}">
                                ✏️
                            </button>

                        </div>
                    `;
                }

                /* ========= Sets ========= */

                else if (columnIndex === 1 && day.columns.length >= 3) {

                    className = "sets-cell";

                    cellContent = `
                        <span class="sets-badge">
                            ${cell}
                        </span>
                    `;
                }

                /* ========= Reps ========= */

                else if (
                    columnIndex === 2 &&
                    day.columns.length === 4
                ) {

                    className = "reps-cell";

                    cellContent = `
                        <span class="reps-badge">
                            ${cell}
                        </span>
                    `;
                }

                /* ========= Weight ========= */

                else if (
                    columnIndex === lastColIndex &&
                    isWeightColumn
                ) {

                    cellContent = `
                        <div class="side-toggle-wrapper">

                            <input
                                type="number"
                                class="weight-input"

                                data-program="${program.id}"
                                data-day="${dayIndex}"
                                data-exercise="${exerciseIndex}"

                                value="${row.maxWeight}"

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
                    <td
                        data-label="${day.columns[columnIndex]}"
                        class="${className}">
                        ${cellContent}
                    </td>
                `;

            });

            tableHTML += "</tr>";

        });

        tableHTML += `
                </tbody>
            </table>
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

    const row = getRowData(
        input.dataset.program,
        input.dataset.day,
        input.dataset.exercise,
        ""
    );

    row.maxWeight = input.value;

    saveRowData(
        input.dataset.program,
        input.dataset.day,
        input.dataset.exercise,
        row
    );

});

/* ============================
   Buttons
============================ */

document.addEventListener("click", e => {

    /* ---------- Edit Exercise ---------- */

    const editBtn = e.target.closest(".edit-btn");

    if (editBtn) {

        const row = getRowData(
            editBtn.dataset.program,
            editBtn.dataset.day,
            editBtn.dataset.exercise,
            ""
        );

        const newName = prompt(
            "Exercise name",
            row.exercise
        );

        if (
            newName &&
            newName.trim() !== ""
        ) {

            row.exercise = newName.trim();

            saveRowData(
                editBtn.dataset.program,
                editBtn.dataset.day,
                editBtn.dataset.exercise,
                row
            );

            render();
        }

        return;
    }

    /* ---------- Side Toggle ---------- */

    const sideBtn = e.target.closest(".side-btn");

    if (!sideBtn) return;

    const row = getRowData(
        sideBtn.dataset.program,
        sideBtn.dataset.day,
        sideBtn.dataset.exercise,
        ""
    );

    row.side =
        row.side === "both"
            ? "one"
            : "both";

    saveRowData(
        sideBtn.dataset.program,
        sideBtn.dataset.day,
        sideBtn.dataset.exercise,
        row
    );

    render();

});

/* ============================
   Start
============================ */

render();