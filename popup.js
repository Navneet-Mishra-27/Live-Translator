document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');

  // Load saved language
  chrome.storage.local.get('targetLanguage', (data) => {
    if (data.targetLanguage) {
      languageSelect.value = data.targetLanguage;
    }
  });

  languageSelect.addEventListener('change', () => {
    const selectedLanguage = languageSelect.value;
    // Save selected language
    chrome.storage.local.set({ 'targetLanguage': selectedLanguage });
    // Send to background script
    chrome.runtime.sendMessage({ type: 'setLanguage', language: selectedLanguage }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        } else {
            console.log(response);
        }
    });
  });
});
