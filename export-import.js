/* ============================
   Export / Import Data
   (relies on appData, getDayData, saveDayData, render,
   arrayRowToExercise and exerciseToArrayRow from logic.js —
   make sure this file is loaded AFTER logic.js)
============================ */

function buildExportData() {
    return {
        START_DATE: appData.START_DATE,
        days: appData.days.map(day => {
            const exercises = getDayData(day);
            return {
                id: day.id,
                day: day.day,
                title: day.title,
                icon: day.icon,
                columns: day.columns,
                exercises: exercises.map(ex => exerciseToArrayRow(day, ex))
            };
        })
    };
}

function exportData() {
    if (!appData) {
        alert("Data hasn't finished loading yet, please try again in a moment.");
        return;
    }

    const exportObj = buildExportData();
    const blob = new Blob([JSON.stringify(exportObj, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `workout-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof isDriveBackupEnabled === "function" && isDriveBackupEnabled()) {
        backupToDrive();
    }
}

function applyImportedData(importedObj) {
    importedObj.days.forEach(importedDay => {
        const day = appData.days.find(d => d.id === importedDay.id);
        if (!day || !Array.isArray(importedDay.exercises)) return;

        const exercises = importedDay.exercises.map(row => arrayRowToExercise(day, row));
        saveDayData(day.id, exercises);
    });

    if (importedObj.START_DATE) {
        appData.START_DATE = importedObj.START_DATE;
        saveStartDate(appData.START_DATE);
    }

    render();
}

function importData(file) {
    if (!appData) {
        alert("Data hasn't finished loading yet, please try again in a moment.");
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        let importedObj;
        try {
            importedObj = JSON.parse(e.target.result);
        } catch (err) {
            alert("This file isn't a valid JSON file.");
            return;
        }

        if (!importedObj || !Array.isArray(importedObj.days)) {
            alert("This file's format doesn't match the app's data.");
            return;
        }

        if (!confirm("This will completely replace your current data with the contents of this file. Continue?")) {
            return;
        }

        applyImportedData(importedObj);
    };

    reader.onerror = () => {
        alert("Something went wrong while reading the file.");
    };

    reader.readAsText(file);
}

/* ============================
   Build UI (Export / Import Buttons)
============================ */

function createDataActionsUI() {
    if (document.getElementById("data-actions")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "data-actions";
    wrapper.id = "data-actions";

    wrapper.innerHTML = `
        <button class="data-btn export-btn" id="export-btn">
            📤 Export
        </button>
        <button class="data-btn import-btn" id="import-btn">
            📥 Import
        </button>
        <input type="file" accept="application/json" class="import-input" id="import-file-input">
    `;

    const content = document.getElementById("content");
    if (content && content.parentElement) {
        content.insertAdjacentElement("afterend", wrapper);
    } else {
        document.body.appendChild(wrapper);
    }

    document.getElementById("export-btn").addEventListener("click", exportData);

    document.getElementById("import-btn").addEventListener("click", () => {
        document.getElementById("import-file-input").click();
    });

    document.getElementById("import-file-input").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        importData(file);
        e.target.value = "";
    });
}

/* ============================
   Start
============================ */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createDataActionsUI);
} else {
    createDataActionsUI();
}