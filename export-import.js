/* ============================
   Export / Import Data
============================ */

function buildExportData() {
    return {
        START_DATE: appData.START_DATE,
        days: appData.days.map(day => {
            const exercises = getDayData(day);
            return {
                id: day.id, day: day.day, title: day.title, icon: day.icon,
                columns: day.columns,
                exercises: exercises.map(ex => exerciseToArrayRow(day, ex))
            };
        })
    };
}

async function downloadExportFile() {
    if (!appData) {
        await showAlert("Data hasn't finished loading yet, please try again in a moment.", "Please wait");
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

async function importData(file) {
    if (!appData) {
        await showAlert("Data hasn't finished loading yet, please try again in a moment.", "Please wait");
        return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
        let importedObj;
        try {
            importedObj = JSON.parse(e.target.result);
        } catch (err) {
            await showAlert("This file isn't a valid JSON file.", "Invalid File");
            return;
        }

        if (!importedObj || !Array.isArray(importedObj.days)) {
            await showAlert("This file's format doesn't match the app's data.", "Invalid Format");
            return;
        }

        const ok = await showConfirm(
            "This will completely replace your current data with the contents of this file. Continue?",
            "Replace Data"
        );
        if (!ok) return;

        applyImportedData(importedObj);
        await showSuccess("Your data has been imported successfully.", "Import Complete");
    };

    reader.onerror = async () => {
        await showAlert("Something went wrong while reading the file.", "Read Error");
    };

    reader.readAsText(file);
}

/* ============================
   Build UI
============================ */

function createDataActionsUI() {
    if (document.getElementById("data-actions")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "data-actions";
    wrapper.id = "data-actions";

    wrapper.innerHTML = `
        <button class="data-btn export-btn" id="export-btn">${icon('upload', 18)} Export</button>
        <button class="data-btn import-btn" id="import-btn">${icon('download', 18)} Import</button>
        <input type="file" accept="application/json" class="import-input" id="import-file-input">
    `;

    const content = document.getElementById("content");
    if (content && content.parentElement) content.insertAdjacentElement("afterend", wrapper);
    else document.body.appendChild(wrapper);

    document.getElementById("export-btn").addEventListener("click", () => {
        if (typeof showExportMenu === 'function') showExportMenu();
        else downloadExportFile();
    });

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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createDataActionsUI);
} else {
    createDataActionsUI();
}