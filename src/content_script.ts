console.log("Content script loaded");

interface FormField {
  [key: string]: string;
}

interface FormData {
  id: string;
  formName: string;
  fields: FormField;
  source: string;
  timestamp: number;
}

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

// 填充表单函数
function fillFormWithData(fields: FormField) {
  console.log("Filling form with data:", fields);
  
  // 获取所有表单元素
  const formElements = document.querySelectorAll('input, select, textarea');
  let filledCount = 0;
  
  formElements.forEach(element => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const inputName = (input.name || '').toLowerCase();
    const inputId = (input.id || '').toLowerCase();
    const inputPlaceholder = (input.getAttribute('placeholder') || '').toLowerCase();
    const inputLabel = findLabelForElement(input)?.toLowerCase() || '';
    
    // 尝试匹配字段
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      const fieldNameLower = fieldName.toLowerCase();
      
      if (
        inputName.includes(fieldNameLower) ||
        inputId.includes(fieldNameLower) ||
        inputLabel.includes(fieldNameLower) ||
        inputPlaceholder.includes(fieldNameLower)
      ) {
        fillInputWithValue(input, fieldValue);
        filledCount++;
        break;
      }
    }
  });
  
  showNotification(`Filled ${filledCount} form fields`);
}

function findLabelForElement(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
): string | null {
  // 查找显式标签
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label && label.textContent) {
      return label.textContent.trim();
    }
  }
  
  // 查找包装标签
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL' && parent.textContent) {
      return parent.textContent.trim();
    }
    parent = parent.parentElement;
  }
  
  return null;
}

function fillInputWithValue(
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string
) {
  try {
    if (input.tagName === 'SELECT') {
      // 下拉选择框
      const selectInput = input as HTMLSelectElement;
      const options = Array.from(selectInput.options);
      
      const matchingOption = options.find(option => 
        option.text.toLowerCase().includes(value.toLowerCase()) || 
        option.value.toLowerCase().includes(value.toLowerCase())
      );
      
      if (matchingOption) {
        selectInput.value = matchingOption.value;
        selectInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (input.type === 'checkbox' || input.type === 'radio') {
      // 复选框或单选按钮
      const checkableInput = input as HTMLInputElement;
      const shouldBeChecked = ['yes', 'true', '1', 'on', 'y'].includes(value.toLowerCase());
      
      checkableInput.checked = shouldBeChecked;
      checkableInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // 文本输入或文本区域
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // 高亮显示填充的字段
    const originalBg = input.style.backgroundColor;
    input.style.backgroundColor = '#e6f7ff';
    setTimeout(() => {
      input.style.backgroundColor = originalBg;
    }, 2000);
  } catch (error) {
    console.error(`Error filling input:`, error, input);
  }
}

function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '12px 20px';
  notification.style.backgroundColor = '#1890ff';
  notification.style.color = 'white';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
  notification.style.fontSize = '14px';
  
  document.body.appendChild(notification);
  
  // 3秒后淡出
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// 添加键盘快捷键监听（备用方案，优先使用 commands API）
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.code === 'KeyF') {
    console.log("Alt+F pressed in content script");
    fillFormWithLatestData()
  }
});

// 封装获取最新表单数据并填充的函数
function fillFormWithLatestData() {
  chrome.storage.local.get(['formDataList'], (result) => {
    const formDataList = result.formDataList || [];
    
    if (formDataList.length > 0) {
      const recentFormData = formDataList[formDataList.length - 1];
      fillFormWithData(recentFormData.fields);
    } else {
      showNotification("No form data available");
    }
  });
}
