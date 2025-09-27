// The unique name of our native messaging host.
const hostName = 'com.your_company.live_translation';

// A reference to the port, which will be established when needed.
let port = null;

// Function to send a message to the native host.
function sendMessageToNativeHost(message) {
  if (port) {
    port.postMessage(message);
    console.log('Sent message to native host:', message);
  } else {
    console.error('Connection to native host is not established.');
  }
}

// Function to establish the connection.
function connectToNativeHost() {
  console.log(`Connecting to native host: ${hostName}`);
  port = chrome.runtime.connectNative(hostName);

  // Listener for messages received from the native host.
  port.onMessage.addListener((message) => {
    console.log('Received message from native host:', message);
    // TODO: Process the response from the Python script.
    // For example, forward it to a content script or popup.
  });

  // Listener for when the connection is disconnected.
  port.onDisconnect.addListener(() => {
    // The chrome.runtime.lastError property may contain details about the error.
    if (chrome.runtime.lastError) {
      console.error('Disconnected due to an error:', chrome.runtime.lastError.message);
    } else {
      console.log('Disconnected from native host.');
    }
    port = null; // Clear the port reference.
    // Optional: Implement reconnection logic here.
  });
}

// Example: Connect when the extension is first installed or starts up.
chrome.runtime.onStartup.addListener(connectToNativeHost);
chrome.runtime.onInstalled.addListener(connectTo-NativeHost);


// Example of how another part of the extension (e.g., a popup) would
// trigger sending a message. This listener would receive messages from
// other extension scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startDubbing') {
    if (!port) {
      connectToNativeHost();
    }
    // Wait a moment to ensure connection is likely established before sending.
    // A more robust solution would use callbacks or promises to confirm connection.
    setTimeout(() => {
      sendMessageToNativeHost({ text: request.data });
    }, 500);
  }
  return true; // Indicates an asynchronous response may be sent.
});
