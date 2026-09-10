// content.js
// Every piece of user-facing text in the app lives here. Edit this file to
// change wording anywhere on the site - no other file needs to be touched
// for a simple text change.

const CONTENT = {
  pageTitle: 'CYOA ClipCatch',

  login: {
    heading: 'CYOA ClipCatch',
    passwordPlaceholder: 'Enter password',
    loginButton: 'Log In',
    errorIncorrect: 'Incorrect password.',
  },

  topbar: {
    deletedButton: 'Deleted Files',
    newAlbumButton: 'New Capture',
  },

  albumList: {
    statusCapturing: 'Capturing',
    statusScheduled: 'Scheduled',
    statusDone: 'Done',
  },

  albumForm: {
    titleNew: 'New Capture',
    titleEdit: 'Capture Settings',
    nameLabel: 'Name',
    namePlaceholder: 'eg. Reading Festival 2026',
    startLabel: 'Start',
    startPlaceholder: 'Select Start Date',
    startLockedNote: 'Already Started (locked).',
    endLabel: 'End',
    endPlaceholder: 'Select End Date',
    endLockedNote: 'Already Ended (locked).',
    saveButtonNew: 'Schedule',
    saveButtonStartNow: 'Start Capture',
    saveButtonEdit: 'Save Changes',
    startCapturingNowLink: 'Start Capturing Now',
    longCaptureWarning: (days) => `Your capture is scheduled to last over ${days} days. Are you sure?`,
    missingDatesWarning: 'Please select both a start and end time before saving.',
  },

  picker: {
    timeLabel: 'Time',
    cancelButton: 'Cancel',
    doneButton: 'Done',
  },

  videos: {
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortAlphabetical: 'Alphabetical',
    downloadStarredConfirm: (count) => `You're about to download ${count} file${count === 1 ? '' : 's'} as a .zip. Are you sure?`,
    deleteMarkedConfirm: (count) => `You're about to delete ${count} file${count === 1 ? '' : 's'}. Are you sure?`,
    deleteSingleToast: '1 file deleted.',
    deleteMultipleToast: (count) => `${count} files deleted.`,
    albumDeletedToast: 'Capture deleted.',
    undoLink: 'Undo',
  },

  deletedFiles: {
    titleSuffix: '— deleted files',
    retentionNote: 'Kept for 30 days, then permanently removed.',
    restoreButton: 'Restore',
    notBuiltYetNote: 'Deleted files listing endpoint not yet built server-side.',
  },

  preview: {
    hintRow: 'Space: Play/Pause · ←→: Scrub 5s · ↑↓: Prev/Next · S: Save · D: Delete',
  },
};
