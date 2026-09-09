// content.js
// Every piece of user-facing text in the app lives here. Edit this file to
// change wording anywhere on the site - no other file needs to be touched
// for a simple text change.

const CONTENT = {
  pageTitle: 'Tag Capture',

  login: {
    heading: 'Tag Capture',
    passwordPlaceholder: 'Team password',
    loginButton: 'Log in',
    errorIncorrect: 'Incorrect password.',
  },

  topbar: {
    deletedButton: 'Deleted',
    newAlbumButton: 'New album',
  },

  albumList: {
    statusCapturing: 'Capturing',
    statusScheduled: 'Scheduled',
    statusDone: 'Done',
  },

  albumForm: {
    titleNew: 'New album',
    titleEdit: 'Album settings',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Governors Ball',
    startLabel: 'Start',
    startPlaceholder: 'Select start',
    startLockedNote: 'Already started — locked.',
    endLabel: 'End',
    endPlaceholder: 'Select end',
    endLockedNote: 'Already ended — locked.',
    saveButtonNew: 'Schedule capture',
    saveButtonStartNow: 'Start capture',
    saveButtonEdit: 'Save changes',
    startCapturingNowLink: 'Start Capturing Now',
    longCaptureWarning: (days) => `Your capture is scheduled to last over ${days} days. Are you sure?`,
  },

  picker: {
    timeLabel: 'Time',
    cancelButton: 'Cancel',
    doneButton: 'Done',
  },

  videos: {
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortAlphabetical: 'Alphabetical',
    downloadStarredConfirm: (count) => `You're about to download ${count} file${count === 1 ? '' : 's'} as a .zip. Are you sure?`,
    deleteMarkedConfirm: (count) => `You're about to delete ${count} file${count === 1 ? '' : 's'}. Are you sure?`,
    deleteSingleToast: '1 file deleted.',
    deleteMultipleToast: (count) => `${count} files deleted.`,
    albumDeletedToast: 'Album deleted.',
    undoLink: 'Undo',
  },

  deletedFiles: {
    titleSuffix: '— deleted files',
    retentionNote: 'Kept 30 days, then permanently removed',
    restoreButton: 'Restore',
    notBuiltYetNote: 'Deleted files listing endpoint not yet built server-side.',
  },

  preview: {
    hintRow: 'Space play/pause · ←→ scrub 5s · ↑↓ prev/next · S save · D delete',
  },
};
