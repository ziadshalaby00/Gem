/* ============================
   Google Drive Backup
============================ */

const DRIVE_CLIENT_ID = '62916963871-8oain5dbus14mmbej6clctk0pdkrnoeh.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILE_NAME = 'workout-backup.json';
const DRIVE_FILE_ID_KEY = 'drive_backup_file_id';

let tokenClient = null;
let driveAccessToken = null;
let driveTokenExpiry = 0;
let driveUploading = false;
let pendingTokenRequest = null;

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

    const res = await fetch(url, {
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

/* ============================
   Public actions
============================ */

async function backupToDrive() {
    if (!appData) return false;

    driveUploading = true;
    updateDriveStatus('Backing up to Drive...');
    window.addEventListener('beforeunload', blockUnloadIfUploading);

    try {
        const token = await ensureDriveToken();
        let fileId = localStorage.getItem(DRIVE_FILE_ID_KEY);
        const exportObj = buildExportData();

        try {
            await uploadToDrive(token, fileId, exportObj);
        } catch (err) {
            if (err.status === 404 || err.status === 403) {
                console.warn('Stale fileId detected, uploading as new file...');
                localStorage.removeItem(DRIVE_FILE_ID_KEY);
                await uploadToDrive(token, null, exportObj);
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
        } else {
            updateDriveStatus(`${icon('warning', 14)} Backup to Drive failed`, true, true);
        }
        return false;
    } finally {
        driveUploading = false;
        window.removeEventListener('beforeunload', blockUnloadIfUploading);
    }
}

function blockUnloadIfUploading(e) {
    if (driveUploading) { e.preventDefault(); e.returnValue = ''; }
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