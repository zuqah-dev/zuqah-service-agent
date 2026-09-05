---
id: backup-and-recovery
title: Backup and Data Recovery Policy
category: IT
version: "1.0"
owner: Infrastructure Services
effective: 2026-01-01
review: 2027-01-01
---

# Backup and Data Recovery Policy

## 1. Purpose

This policy explains what data Zuqah Technologies backs up, how frequently,
how long backups are retained, and how to request the recovery of lost or
accidentally deleted data.

## 2. What is backed up

### 2.1 Company systems (backed up automatically)

| System | Backup frequency | Retention |
| --- | --- | --- |
| OneDrive (all employee files) | Continuous version history | 93 days of version history |
| SharePoint team sites | Daily | 90 days |
| Microsoft Exchange (email) | Continuous | 14-day deleted item recovery; 30-day litigation hold |
| Company databases (HR system, internal tools) | Daily full + 4-hourly incremental | 30 days daily; 12 months monthly |
| Code repositories (GitHub) | Daily mirror to separate storage | 90 days |
| Server infrastructure | Daily snapshot | 30 days |

### 2.2 What is NOT backed up

| Item | Why | What to do |
| --- | --- | --- |
| Files stored only on your laptop's local drive | Local storage is not included in cloud backup | Store all working files in OneDrive |
| Files stored on USB drives or external hard disks | External storage is not in scope | Store in OneDrive instead |
| Personal email accounts (Gmail, personal Outlook) | Not company systems | Back up personally |
| Unsaved work in applications | Cannot be backed up | Save frequently; enable AutoSave in Office apps |

**The single most important habit:** Save your work to OneDrive, not to
"Desktop" or "My Documents" on the local drive. If your laptop fails,
only OneDrive files are guaranteed recoverable.

## 3. OneDrive version history

Every OneDrive file has automatic version history. You can recover a previous
version of a file without contacting IT.

**How to access version history:**

1. Right-click the file in OneDrive (browser or desktop app)
2. Select "Version history"
3. Choose the version you want to restore and click "Restore"

Versions are kept for **93 days**. Older versions are automatically deleted.

## 4. Recovering deleted files

### 4.1 Files deleted from OneDrive

Files deleted from OneDrive go to the OneDrive Recycle Bin and remain there
for **93 days** before permanent deletion.

**How to recover:**

1. Open OneDrive in a browser
2. Click "Recycle bin" in the left panel
3. Select the file or folder and click "Restore"

### 4.2 Emails deleted from Outlook

Deleted emails go to the Deleted Items folder. Items deleted from Deleted
Items go to the Recoverable Items folder, where they remain for **14 days**.

**How to recover:**

1. In Outlook, go to Deleted Items
2. Right-click and select "Recover Deleted Items from Server"
3. Select the email and click "Restore Selected Items"

### 4.3 Files permanently deleted (beyond Recycle Bin)

If a file has been permanently deleted (emptied from the Recycle Bin), IT
may be able to restore it from the backup within the retention period.

## 5. Requesting data recovery from IT

For data that cannot be self-recovered from version history or the Recycle Bin:

**Raise an IT request:**

1. Log in to the IT portal at `it.zuqahtechnologies.com`
2. Open a ticket: **Storage & Files → Data Recovery Request**
3. Provide:
   - The file name and location (e.g., the OneDrive folder path)
   - The approximate date the file last existed in the correct state
   - Why the file needs to be recovered (accidentally deleted, corrupted, etc.)

**Response times:**

| Priority | Scenario | Response time |
| --- | --- | --- |
| High | Critical business data required for live work | 4 business hours |
| Normal | Important file, work can continue without it | 1 business day |
| Low | Historical data, not immediately needed | 3 business days |

**Note:** Recovery is not guaranteed, particularly for data deleted more than
30 days ago or data that was never in a backed-up location.

## 6. Laptop failure or replacement

If your laptop fails and needs to be replaced:

- All files in OneDrive will be automatically synced to your new laptop when
  you sign in
- Locally installed applications will need to be reinstalled by IT
- Settings and browser bookmarks synced to a Microsoft or browser account
  will be restored automatically

This is why storing files in OneDrive, not the local drive, is essential.

## 7. Ransomware and accidental mass deletion

If you suspect your computer has been infected with ransomware, or if a large
number of files have been accidentally deleted or changed:

1. **Disconnect your laptop from the network immediately** (disable WiFi,
   unplug Ethernet)
2. Call the IT Security team immediately: security@zuqahtechnologies.com
3. Do not attempt to recover files yourself — IT will guide the process

OneDrive's version history means that even if ransomware encrypts your local
files, clean copies are often recoverable from the cloud version history.

## 8. Employee responsibilities

To ensure your data is protected:

- Save all work files to OneDrive, not the local drive
- Enable AutoSave in Microsoft Office applications
- Empty the OneDrive Recycle Bin infrequently — do not delete files from
  the Recycle Bin unless you are certain they are no longer needed
- Do not store sensitive data on USB drives or personal storage (see Data
  Classification Policy)

## 9. Contact

**Self-service recovery:** OneDrive version history and Recycle Bin
(no IT involvement needed)

**IT-assisted recovery:** it.zuqahtechnologies.com — raise a ticket

**Security incidents (ransomware, mass deletion):** security@zuqahtechnologies.com
