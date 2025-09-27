document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');
  const statusDiv = document.getElementById('status');

  // Load saved language and capturing state
  chrome.storage.local.get(['targetLanguage', 'isCapturing'], (data) => {
    if (data.targetLanguage) {
      languageSelect.value = data.targetLanguage;
    }
    if (data.isCapturing) {
      statusDiv.textContent = 'Translation is active. Click the extension icon to stop.';
    } else {
      statusDiv.textContent = 'Click the extension icon to start translating.';
    }
  });

  // Save language selection
  languageSelect.addEventListener('change', () => {
    const selectedLanguage = languageSelect.value;
    chrome.storage.local.set({ targetLanguage: selectedLanguage });
  });
});
