/* ============================
   Import Menu — Choose Source
============================ */

function showImportMenu() {
    let modal = document.getElementById('import-menu-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'import-menu-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content export-menu-content">
                <h3>${icon('download', 18)} Import Options</h3>
                <button class="export-option-btn" data-action="device">${icon('device', 18)} Import from Device</button>
                <button class="export-option-btn" data-action="drive">${icon('cloud', 18)} Import from Drive</button>
                <button class="cancel-btn" id="import-menu-cancel">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', e => { if (e.target === modal) closeImportMenu(); });
        document.getElementById('import-menu-cancel').addEventListener('click', closeImportMenu);

        modal.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (btn.disabled) return;
                const action = btn.dataset.action;
                closeImportMenu();

                if (action === 'device') {
                    // Reuse the file picker in export-import.js
                    const fileInput = document.getElementById('import-file-input');
                    if (fileInput) fileInput.click();
                } else if (action === 'drive') {
                    await importFromDrive();
                }
            });
        });
    }
    modal.style.display = 'flex';
}

function closeImportMenu() {
    const modal = document.getElementById('import-menu-modal');
    if (modal) modal.style.display = 'none';
}

/* ============================
   Import from Drive
============================ */

let pendingImportRequest = null; // guards against concurrent importFromDrive() calls

function importFromDrive() {
    // If an import is already in flight, return the same promise instead of
    // letting a double click / double tap open two confirmation dialogs or
    // kick off two downloads at once.
    if (pendingImportRequest) return pendingImportRequest;

    pendingImportRequest = runImportFromDrive().finally(() => {
        pendingImportRequest = null;
    });

    return pendingImportRequest;
}

async function runImportFromDrive() {
    if (!appData) {
        await showAlert("Data hasn't finished loading yet, please try again in a moment.", "Please wait");
        return;
    }

    setDriveButtonsDisabled(true);

    try {
        // 1) Auth
        let token;
        try {
            token = await ensureDriveToken();
        } catch (err) {
            await showAlert("Drive sign-in was cancelled or denied.", "Drive Sign-In");
            return;
        }

        // 2) Search — don't ask for confirmation if there's nothing to import
        let existing;
        try {
            existing = await findExistingBackupFile(token);
        } catch (err) {
            console.error('Drive search failed during import:', err);
            const msg = err.message === 'FETCH_TIMEOUT'
                ? "Timed out while searching your Drive. Check your connection and try again."
                : "Couldn't search your Drive. Please try again.";
            await showAlert(msg, "Drive Error");
            return;
        }

        if (!existing) {
            await showAlert("No backup file found in your Google Drive.", "Nothing to Import");
            return;
        }

        // 3) Confirm replacement
        const ok = await showConfirm(
            "This will completely replace your current data with the Drive backup. Continue?",
            "Replace Data",
            true
        );
        if (!ok) return;

        // 4) Download
        let content;
        try {
            content = await downloadFromDrive(token, existing.id);
        } catch (err) {
            console.error('Drive download failed:', err);
            let msg = "Couldn't download the backup from Drive. Please try again.";
            if (err.message === 'FETCH_TIMEOUT') {
                msg = "Timed out while downloading the backup. Check your connection and try again.";
            } else if (err.status === 401 || err.status === 403) {
                msg = "Your Drive session expired. Please try again.";
            } else if (err.status === 404) {
                msg = "The backup file was deleted from your Drive.";
            }
            await showAlert(msg, "Download Failed");
            return;
        }

        // 5) Parse & validate
        let importedObj;
        try {
            importedObj = JSON.parse(content);
        } catch (err) {
            await showAlert("The Drive backup file isn't valid JSON.", "Invalid File");
            return;
        }

        if (!importedObj || !Array.isArray(importedObj.days)) {
            await showAlert("The Drive backup file's format doesn't match the app's data.", "Invalid Format");
            return;
        }

        // 6) Apply — same function used by local import
        const result = applyImportedData(importedObj);

        if (result && result.failedDays.length > 0) {
            await showAlert(
                `Import finished, but ${result.failedDays.length} day(s) couldn't be applied: ${result.failedDays.join(', ')}. The rest of your data was imported successfully.`,
                "Partial Import"
            );
        } else {
            await showSuccess("Your data has been imported from Drive successfully.", "Import Complete");
        }
    } finally {
        setDriveButtonsDisabled(false);
    }
}

/* ============================
   Status element (optional)
============================ */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {});
}