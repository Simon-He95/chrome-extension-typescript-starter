import { FormData } from './types';
import { fillFormWithData, fillFormWithLatestData } from './form-filler';

console.log("Content script loaded");

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.action === "fillForm" && message.formData) {
    const formData = message.formData as FormData;
    fillFormWithData(formData.fields);
    sendResponse({ success: true, message: "Form filled" });
    return true;
  }

  sendResponse({ success: false, message: "Unknown action" });
  return true;
});

// 添加键盘快捷键监听（备用方案，优先使用 commands API）
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.code === 'KeyF') {
    console.log("Alt+F pressed in content script");
    fillFormWithLatestData();
  }
});


