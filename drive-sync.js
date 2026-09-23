/* ============================
   Google Drive Backup
============================ */

const DRIVE_CLIENT_ID = '62916963871-8oain5dbus14mmbej6clctk0pdkrnoeh.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILE_NAME = 'workout-backup.json';
const DRIVE_FILE_ID_KEY = 'drive_backup_file_id';
const FETCH_TIMEOUT_MS = 20000;

let tokenClient = null;
let driveAccessToken = null;
let driveTokenExpiry = 0;
let driveUploading = false;
let pendingTokenRequest = null;
let pendingBackupRequest = null; // guards against concurrent backupToDrive() calls

/* ============================
   Auth
============================ */

function initDriveTokenClient() {
    if (tokenClient || typeof google === 'undefined') return;
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: () => {},
    });
}

function requestDriveToken(promptMode, timeoutMs = 60000) {
    if (pendingTokenRequest) return pendingTokenRequest;

    pendingTokenRequest = new Promise((resolve, reject) => {
        if (!tokenClient) initDriveTokenClient();
        if (!tokenClient) { pendingTokenRequest = null; reject(new Error('GOOGLE_NOT_LOADED')); return; }

        const timer = setTimeout(() => {
            pendingTokenRequest = null;
            reject(new Error('TOKEN_TIMEOUT'));
        }, timeoutMs);

        tokenClient.callback = (response) => {
            clearTimeout(timer);
            pendingTokenRequest = null;
            if (response.error) { reject(response); return; }
            driveAccessToken = response.access_token;
            driveTokenExpiry = Date.now() + (response.expires_in * 1000);
            resolve(driveAccessToken);
        };

        tokenClient.error_callback = (err) => {
            clearTimeout(timer);
            pendingTokenRequest = null;
            reject(err);
        };

        try { tokenClient.requestAccessToken({ prompt: promptMode }); }
        catch (e) { clearTimeout(timer); pendingTokenRequest = null; reject(e); }
    });

    return pendingTokenRequest;
}

async function ensureDriveToken() {
    if (driveAccessToken && Date.now() < driveTokenExpiry - 60_000) return driveAccessToken;
    try { return await requestDriveToken('', 60000); }
    catch (err) { throw new Error('DRIVE_REAUTH_NEEDED'); }
}

/* ============================
   fetch with timeout helper
============================ */

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (e) {
        if (e.name === 'AbortError') {
            const err = new Error('FETCH_TIMEOUT');
            err.status = 0;
            throw err;
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

/* ============================
   Drive REST calls
============================ */

async function uploadToDrive(token, fileId, jsonData) {
    const boundary = 'workout_backup_boundary';
    const metadata = fileId ? {} : { name: DRIVE_FILE_NAME, mimeType: 'application/json' };
    const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(jsonData, null, 4) +
        `\r\n--${boundary}--`;

    const fields = 'fields=id,name,trashed';
    const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&${fields}`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&${fields}`;

    const res = await fetchWithTimeout(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
    });

    if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        console.error('Drive upload failed:', res.status, errorBody);
        const err = new Error(`Drive upload failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }

    const file = await res.json();
    console.log('Drive upload response:', file);

    if (file.trashed) {
        const err = new Error('FILE_TRASHED');
        err.status = 404;
        throw err;
    }

    localStorage.setItem(DRIVE_FILE_ID_KEY, file.id);
    return file;
}

/**
 * Searches Drive for existing backup files with our name.
 *
 * Return contract:
 *   - Returns a file object  → search succeeded, found a match (newest one).
 *   - Returns null           → search succeeded, no matching file exists.
 *   - Throws                 → search itself failed (network, auth, 5xx, timeout).
 *                              Callers should NOT interpret this as "no file exists".
 *
 * If multiple files match, keeps the newest and trashes the rest in the
 * background (fire-and-forget) so duplicates don't keep accumulating.
 */
async function findExistingBackupFile(token) {
    const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files` +
                `?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)` +
                `&orderBy=modifiedTime desc`;

    const res = await fetchWithTimeout(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = new Error(`Drive search failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }

    const data = await res.json();
    const files = data.files || [];

    if (files.length > 1) {
        // More than one match (e.g. leftovers from before this de-dup logic existed).
        // Keep the most recently modified one and trash the rest so they don't
        // keep accumulating silently.
        console.warn(`Found ${files.length} backup files with the same name; keeping the newest and trashing the rest.`);
        const [newest, ...stale] = files;
        stale.forEach(f => {
            trashDriveFile(token, f.id).catch(err =>
                console.warn('Could not trash stale backup file', f.id, err)
            );
        });
        return newest;
    }

    return files.length ? files[0] : null;
}

async function trashDriveFile(token, fileId) {
    const res = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
    });
    if (!res.ok) {
        const err = new Error(`Trash failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }
}

async function downloadFromDrive(token, fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetchWithTimeout(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = new Error(`Drive download failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return await res.text();
}

/* ============================
   Public actions
============================ */

function backupToDrive() {
    // If a backup is already in flight, return the same promise instead of
    // starting a second concurrent upload (prevents duplicate-file races
    // from double clicks or multiple tabs).
    if (pendingBackupRequest) return pendingBackupRequest;

    pendingBackupRequest = runBackupToDrive().finally(() => {
        pendingBackupRequest = null;
    });

    return pendingBackupRequest;
}

async function runBackupToDrive() {
    if (!appData) return false;

    driveUploading = true;
    setDriveButtonsDisabled(true);
    updateDriveStatus('Backing up to Drive...');
    window.addEventListener('beforeunload', blockUnloadIfUploading);

    try {
        const token = await ensureDriveToken();

        // ── Resolve the target file ─────────────────────────────────────────
        // Always search first, regardless of whether we have a local fileId.
        // The local fileId is only a fallback for when the search itself
        // fails (e.g. transient network issue) — it is never treated as
        // authoritative, because it may point to a stale or duplicate file
        // on another device/browser.
        //
        // This is what prevents the "two devices each have their own fileId"
        // scenario from producing duplicate backup files.
        let fileId = null;

        try {
            const existing = await findExistingBackupFile(token);
            if (existing) {
                fileId = existing.id;
                localStorage.setItem(DRIVE_FILE_ID_KEY, fileId);
                console.log('Using existing Drive file:', fileId);
            } else {
                // Search succeeded and confirmed there's no backup file yet.
                // Clear any stale local ID so we start fresh.
                localStorage.removeItem(DRIVE_FILE_ID_KEY);
                console.log('No existing backup on Drive; creating a new file.');
            }
        } catch (searchErr) {
            // Search failed (network/timeout/5xx). Fall back to whatever ID we
            // have locally. If the file is gone, the 404 retry below will
            // handle it. If we have no local ID either, we'll create a new file
            // (unavoidable — we have no way to find an existing one right now).
            console.warn('Drive search failed, falling back to local fileId:', searchErr.message);
            fileId = localStorage.getItem(DRIVE_FILE_ID_KEY);
        }

        const exportObj = buildExportData();

        try {
            await uploadToDrive(token, fileId, exportObj);
        } catch (err) {
            if (err.status === 404 || err.status === 403) {
                console.warn('Stale fileId detected, searching for an existing backup...');
                localStorage.removeItem(DRIVE_FILE_ID_KEY);

                // Search again before creating a new file — there may be a
                // valid backup on another device we should reuse instead.
                let retryId = null;
                try {
                    const existing = await findExistingBackupFile(token);
                    retryId = existing ? existing.id : null;
                } catch (searchErr) {
                    console.warn('Search failed during stale-ID retry:', searchErr.message);
                }

                if (retryId) {
                    localStorage.setItem(DRIVE_FILE_ID_KEY, retryId);
                    console.log('Reusing existing Drive file after stale ID:', retryId);
                }

                await uploadToDrive(token, retryId, exportObj);
            } else {
                throw err;
            }
        }

        updateDriveStatus(`${icon('check', 14)} Backed up to Drive`, true);
        return true;
    } catch (err) {
        console.error('Drive backup failed:', err);
        if (err.message === 'DRIVE_REAUTH_NEEDED') {
            updateDriveStatus('Drive sign-in cancelled or denied.', true, true);
        } else if (err.message === 'FETCH_TIMEOUT') {
            updateDriveStatus(`${icon('warning', 14)} Backup timed out, check your connection`, true, true);
        } else {
            updateDriveStatus(`${icon('warning', 14)} Backup to Drive failed`, true, true);
        }
        return false;
    } finally {
        driveUploading = false;
        setDriveButtonsDisabled(false);
        window.removeEventListener('beforeunload', blockUnloadIfUploading);
    }
}

function blockUnloadIfUploading(e) {
    if (driveUploading) { e.preventDefault(); e.returnValue = ''; }
}

function setDriveButtonsDisabled(disabled) {
    document.querySelectorAll('.export-option-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.classList.toggle('disabled', disabled);
    });
}

let driveStatusTimeoutId = null;

function updateDriveStatus(text, autoHide = false, isError = false) {
    const el = document.getElementById('drive-status');
    if (!el) return;

    if (driveStatusTimeoutId) { clearTimeout(driveStatusTimeoutId); driveStatusTimeoutId = null; }

    if (!text) {
        el.innerHTML = '';
        el.classList.remove('has-text', 'error');
        return;
    }

    el.innerHTML = text;
    el.classList.add('has-text');
    el.classList.toggle('error', isError);

    if (autoHide) {
        driveStatusTimeoutId = setTimeout(() => {
            el.innerHTML = '';
            el.classList.remove('has-text', 'error');
            driveStatusTimeoutId = null;
        }, 4000);
    }
}

/* ============================
   Export Menu
============================ */

function showExportMenu() {
    let modal = document.getElementById('export-menu-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'export-menu-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content export-menu-content">
                <h3>${icon('upload', 18)} Export Options</h3>
                <button class="export-option-btn" data-action="device">${icon('device', 18)} Export to Device</button>
                <button class="export-option-btn" data-action="drive">${icon('cloud', 18)} Export to Drive</button>
                <button class="export-option-btn" data-action="both">${icon('sync', 18)} Export to Both</button>
                <button class="cancel-btn" id="export-menu-cancel">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', e => { if (e.target === modal) closeExportMenu(); });
        document.getElementById('export-menu-cancel').addEventListener('click', closeExportMenu);

        modal.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (btn.disabled) return;
                const action = btn.dataset.action;
                closeExportMenu();

                if (action === 'device') {
                    await downloadExportFile();
                } else if (action === 'drive') {
                    await backupToDrive();
                } else if (action === 'both') {
                    await downloadExportFile();
                    await backupToDrive();
                }
            });
        });
    }
    modal.style.display = 'flex';
}

function closeExportMenu() {
    const modal = document.getElementById('export-menu-modal');
    if (modal) modal.style.display = 'none';
}

/* ============================
   Status element
============================ */

function createDriveUI() {
    if (document.getElementById('drive-status')) return;
    const statusEl = document.createElement('span');
    statusEl.id = 'drive-status';
    statusEl.className = 'drive-status';

    const dataActions = document.getElementById('data-actions');
    if (dataActions) dataActions.insertAdjacentElement('afterend', statusEl);
    else document.body.appendChild(statusEl);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDriveUI);
} else {
    createDriveUI();
}