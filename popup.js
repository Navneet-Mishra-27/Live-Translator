document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');
  const startButton = document.getElementById('start-button');
  const statusDiv = document.getElementById('status');

  // Load saved language
  chrome.storage.local.get(['targetLanguage', 'isCapturing'], (data) => {
    if (data.targetLanguage) {
      languageSelect.value = data.targetLanguage;
    }
    if (data.isCapturing) {
      startButton.textContent = 'Stop Translation';
      statusDiv.textContent = 'Translation is active.';
    }
  });

  languageSelect.addEventListener('change', () => {
    const selectedLanguage = languageSelect.value;
    chrome.storage.local.set({ targetLanguage: selectedLanguage });
    chrome.runtime.sendMessage({ type: 'setLanguage', language: selectedLanguage });
  });

  startButton.addEventListener('click', () => {
    chrome.storage.local.get('isCapturing', (data) => {
      if (data.isCapturing) {
        chrome.runtime.sendMessage({ type: 'stopCapture' });
        startButton.textContent = 'Start Translation';
        statusDiv.textContent = '';
        chrome.storage.local.set({ isCapturing: false });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.runtime.sendMessage({ type: 'startCapture', tabId: tabs[0].id });
          startButton.textContent = 'Stop Translation';
          statusDiv.textContent = 'Translation is active.';
          chrome.storage.local.set({ isCapturing: true });
        });
      }
    });
  });
});
