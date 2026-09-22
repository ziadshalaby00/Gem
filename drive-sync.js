/* ============================
   Google Drive Backup (optional)
   Requires export-import.js (buildExportData)
   and logic.js (appData).
============================ */

const DRIVE_CLIENT_ID = '62916963871-8oain5dbus14mmbej6clctk0pdkrnoeh.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILE_NAME = 'workout-backup.json';
const DRIVE_CONSENT_KEY = 'drive_backup_enabled';
const DRIVE_FILE_ID_KEY = 'drive_backup_file_id';

let tokenClient = null;
let driveAccessToken = null;
let driveTokenExpiry = 0;
let driveUploading = false;

function isDriveBackupEnabled() {
    return localStorage.getItem(DRIVE_CONSENT_KEY) === 'true';
}

function setDriveBackupEnabled(enabled) {
    localStorage.setItem(DRIVE_CONSENT_KEY, enabled ? 'true' : 'false');
}

function initDriveTokenClient() {
    if (tokenClient || typeof google === 'undefined') return;
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: () => {},
    });
}

let pendingTokenRequest = null;

function requestDriveToken(promptMode, timeoutMs = 10000) {
    if (pendingTokenRequest) return pendingTokenRequest;

    pendingTokenRequest = new Promise((resolve, reject) => {
        if (!tokenClient) initDriveTokenClient();

        if (!tokenClient) {
            pendingTokenRequest = null;
            reject(new Error('GOOGLE_NOT_LOADED'));
            return;
        }

        const timer = setTimeout(() => {
            pendingTokenRequest = null;
            reject(new Error('TOKEN_TIMEOUT'));
        }, timeoutMs);

        tokenClient.callback = (response) => {
            clearTimeout(timer);
            pendingTokenRequest = null;

            if (response.error) {
                reject(response);
                return;
            }
            driveAccessToken = response.access_token;
            driveTokenExpiry = Date.now() + (response.expires_in * 1000);
            resolve(driveAccessToken);
        };

        tokenClient.error_callback = (err) => {
            clearTimeout(timer);
            pendingTokenRequest = null;
            reject(err);
        };

        try {
            tokenClient.requestAccessToken({ prompt: promptMode });
        } catch (e) {
            clearTimeout(timer);
            pendingTokenRequest = null;
            reject(e);
        }
    });

    return pendingTokenRequest;
}

async function ensureDriveToken() {
    if (driveAccessToken && Date.now() < driveTokenExpiry - 60_000) {
        return driveAccessToken;
    }

    // 1) Silent
    try {
        return await requestDriveToken('none', 5000);
    } catch (silentErr) {
        console.warn('Silent token failed:', silentErr);

        // 2) Interactive
        try {
            return await requestDriveToken('', 60000);
        } catch (err) {
            throw new Error('DRIVE_REAUTH_NEEDED');
        }
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

    const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const res = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
    });

    if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
    const file = await res.json();
    localStorage.setItem(DRIVE_FILE_ID_KEY, file.id);
    return file;
}

/* ============================
   Public actions
============================ */

async function backupToDrive() {
    if (!appData) return;

    driveUploading = true;
    updateDriveStatus('Backing up to Drive...');
    window.addEventListener('beforeunload', blockUnloadIfUploading);

    try {
        const token = await ensureDriveToken();
        const fileId = localStorage.getItem(DRIVE_FILE_ID_KEY);

        const exportObj = buildExportData();
        await uploadToDrive(token, fileId, exportObj);

        updateDriveStatus('Backed up to Drive ✅', true);
    } catch (err) {
        console.error('Drive backup failed:', err);
        if (err.message === 'DRIVE_REAUTH_NEEDED') {
            updateDriveStatus('Drive connection expired — untick then re-tick the checkbox.', true, true);
        } else {
            updateDriveStatus('Backup to Drive failed ⚠️', true, true);
        }
    } finally {
        driveUploading = false;
        window.removeEventListener('beforeunload', blockUnloadIfUploading);
    }
}

function blockUnloadIfUploading(e) {
    if (driveUploading) {
        e.preventDefault();
        e.returnValue = '';
    }
}

function updateDriveStatus(text, autoHide = false, isError = false) {
    const el = document.getElementById('drive-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('error', isError);
    el.style.display = text ? 'inline-block' : 'none';
    if (autoHide && text) {
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}

/* ============================
   UI
============================ */

function createDriveUI() {
    if (document.getElementById('drive-actions')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'drive-actions';
    wrapper.id = 'drive-actions';

    wrapper.innerHTML = `
        <label class="drive-checkbox-label">
            <input type="checkbox" id="drive-backup-checkbox">
            Also back up to Google Drive after each Export (sign in with Google once)
        </label>
        <span id="drive-status" class="drive-status"></span>
    `;

    const dataActions = document.getElementById('data-actions');
    dataActions.insertAdjacentElement('afterend', wrapper);

    const checkbox = document.getElementById('drive-backup-checkbox');
    checkbox.checked = isDriveBackupEnabled();

    checkbox.addEventListener('change', async (e) => {
        if (e.target.checked) {
            try {
                await requestDriveToken('');
                setDriveBackupEnabled(true);
            } catch (err) {
                console.error('Drive auth failed:', err);
                e.target.checked = false;
                setDriveBackupEnabled(false);
                alert("Drive access wasn't granted.");
            }
        } else {
            setDriveBackupEnabled(false);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDriveUI);
} else {
    createDriveUI();
}