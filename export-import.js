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

/**
 * Applies an imported backup object to the app's data.
 *
 * Each day is applied independently: if one day's data is malformed, it is
 * skipped (and reported) rather than throwing and leaving the import
 * half-applied with no indication of what happened. START_DATE is applied
 * last and separately, so a bad day never blocks it.
 *
 * Returns { appliedDays, failedDays, startDateApplied } so the caller can
 * tell the user exactly what happened.
 */
function applyImportedData(importedObj) {
    const appliedDays = [];
    const failedDays = [];

    importedObj.days.forEach(importedDay => {
        try {
            const day = appData.days.find(d => d.id === importedDay.id);
            if (!day) {
                failedDays.push(importedDay.id ?? '(unknown)');
                return;
            }
            if (!Array.isArray(importedDay.exercises)) {
                failedDays.push(day.id);
                return;
            }

            const exercises = importedDay.exercises.map(row => arrayRowToExercise(day, row));
            saveDayData(day.id, exercises);
            appliedDays.push(day.id);
        } catch (err) {
            console.error(`Failed to import day "${importedDay && importedDay.id}":`, err);
            failedDays.push((importedDay && importedDay.id) ?? '(unknown)');
        }
    });

    let startDateApplied = false;
    try {
        if (importedObj.START_DATE) {
            appData.START_DATE = importedObj.START_DATE;
            saveStartDate(appData.START_DATE);
            startDateApplied = true;
        }
    } catch (err) {
        console.error('Failed to import START_DATE:', err);
    }

    render();

    return { appliedDays, failedDays, startDateApplied };
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
            "Replace Data",
            true
        );
        if (!ok) return;

        const result = applyImportedData(importedObj);

        if (result.failedDays.length > 0) {
            await showAlert(
                `Import finished, but ${result.failedDays.length} day(s) couldn't be applied: ${result.failedDays.join(', ')}. The rest of your data was imported successfully.`,
                "Partial Import"
            );
        } else {
            await showSuccess("Your data has been imported successfully.", "Import Complete");
        }
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
        if (typeof showImportMenu === 'function') showImportMenu();
        else document.getElementById("import-file-input").click();
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