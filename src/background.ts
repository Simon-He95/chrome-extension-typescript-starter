const extensions = 'https://developer.chrome.com/docs/extensions';
const webstore = 'https://developer.chrome.com/docs/webstore';



console.log("Background service worker initialized");

// 注册命令监听器
chrome.commands.onCommand.addListener((command) => {
  console.log(`Command received: ${command}`);
  
  if (command === "fill-form") {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs:any) => {
      if (tabs[0]?.id) {
        // 获取存储的表单数据
        chrome.storage.local.get(['formDataList'], (result) => {
          const formDataList = result.formDataList || [];
          
          if (formDataList.length > 0) {
            // 使用最近添加的表单数据
            const recentFormData = formDataList[formDataList.length - 1];
            
            // 发送消息到内容脚本
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "fillForm", formData: recentFormData },
              (response) => {
                console.log("Fill form response:", response);
              }
            );
          }
        });
      }
    });
  }
});

// 当扩展安装或更新时执行
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated");
  
  // 初始化徽章计数
  chrome.storage.local.get(['formDataList'], (result) => {
    const formDataList = result.formDataList || [];
    if (formDataList.length > 0) {
      chrome.action.setBadgeText({ text: formDataList.length.toString() });
    }
  });
});

// 监听来自其他部分的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  
  if (message.action === "updateBadge") {
    chrome.action.setBadgeText({ text: message.count.toString() });
    sendResponse({ success: true });
  }
  
  return true;
});
