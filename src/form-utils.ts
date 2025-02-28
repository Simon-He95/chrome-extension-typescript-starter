import { FormElement } from './types';

/**
 * 查找表单元素关联的标签文本
 */
export function findLabelForElement(element: FormElement): string | null {
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

/**
 * 为表单元素填充值
 */
export function fillInputWithValue(
  input: FormElement,
  value: string
) {
  try {
    if (input.tagName === 'SELECT') {
      fillSelectInput(input as HTMLSelectElement, value);
    } else if (input.type === 'checkbox' || input.type === 'radio') {
      fillCheckableInput(input as HTMLInputElement, value);
    } else if (input.type === 'range') {
      fillRangeInput(input as HTMLInputElement, value);
    } else if (input.type === 'date' || input.type === 'datetime-local') {
      fillDateInput(input as HTMLInputElement, value);
    } else if (isRateInput(input)) {
      fillRateInput(input as HTMLInputElement, value);
    } else {
      fillTextInput(input, value);
    }

    // 高亮显示填充的字段
    highlightFilledField(input);
  } catch (error) {
    console.error(`Error filling input:`, error, input);
  }
}

/**
 * 填充选择框
 */
function fillSelectInput(selectInput: HTMLSelectElement, value: string) {
  // 处理多选 select (multiple)
  if (selectInput.multiple && value.includes(',')) {
    const valuesToSelect = value.split(',').map(v => v.trim().toLowerCase());

    // 清除当前选择
    for (let i = 0; i < selectInput.options.length; i++) {
      selectInput.options[i].selected = false;
    }

    // 选中匹配的选项
    Array.from(selectInput.options).forEach(option => {
      if (valuesToSelect.some(v =>
        option.text.toLowerCase().includes(v) ||
        option.value.toLowerCase().includes(v))) {
        option.selected = true;
      }
    });
  } else {
    // 单选 select
    const options = Array.from(selectInput.options);
    const matchingOption = options.find(option =>
      option.text.toLowerCase().includes(value.toLowerCase()) ||
      option.value.toLowerCase().includes(value.toLowerCase())
    );

    if (matchingOption) {
      selectInput.value = matchingOption.value;
    }
  }

  // 触发变更事件
  selectInput.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 填充复选框或单选按钮
 */
function fillCheckableInput(checkableInput: HTMLInputElement, value: string) {
  if (checkableInput.type === 'radio') {
    // 精确匹配值或值的一部分
    const valueMatches =
      checkableInput.value.toLowerCase() === value.toLowerCase() ||
      checkableInput.value.toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(checkableInput.value.toLowerCase());

    checkableInput.checked = valueMatches;
  } else {
    // 复选框 - 判断是否应该被选中
    const shouldBeChecked = ['yes', 'true', '1', 'on', 'y'].includes(value.toLowerCase());
    checkableInput.checked = shouldBeChecked;
  }

  checkableInput.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 填充范围滑块
 */
function fillRangeInput(rangeInput: HTMLInputElement, value: string) {
  const numericValue = parseFloat(value);
  
  if (!isNaN(numericValue)) {
    const min = parseFloat(rangeInput.min) || 0;
    const max = parseFloat(rangeInput.max) || 100;
    const clampedValue = Math.min(Math.max(numericValue, min), max);

    rangeInput.value = clampedValue.toString();
    rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
    rangeInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * 填充日期输入
 */
function fillDateInput(dateInput: HTMLInputElement, value: string) {
  try {
    const dateObj = new Date(value);

    if (!isNaN(dateObj.getTime())) {
      if (dateInput.type === 'date') {
        const formatted = dateObj.toISOString().split('T')[0];
        dateInput.value = formatted;
      } else {
        const formatted = dateObj.toISOString().slice(0, 16);
        dateInput.value = formatted;
      }
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch (dateError) {
    console.error("Failed to parse date:", dateError);
  }
}

/**
 * 检查是否为评分输入
 */
function isRateInput(input: FormElement): boolean {
  return (input.getAttribute('role') === 'rate' || 
         input.classList.contains('rate') ||
         input.classList.contains('stars')) && 
         input.tagName === 'INPUT';
}

/**
 * 填充评分组件
 */
function fillRateInput(rateInput: HTMLInputElement, value: string) {
  const rateValue = parseInt(value);
  if (!isNaN(rateValue)) {
    rateInput.value = rateValue.toString();
    rateInput.dispatchEvent(new Event('input', { bubbles: true }));
    rateInput.dispatchEvent(new Event('change', { bubbles: true }));

    const parentContainer = rateInput.parentElement;
    if (parentContainer) {
      const stars = parentContainer.querySelectorAll('.star,.ant-rate-star');
      if (stars.length > 0) {
        for (let i = 0; i < stars.length; i++) {
          const star = stars[i] as HTMLElement;
          if (i < rateValue) {
            star.classList.add('selected', 'active', 'ant-rate-star-full');
            star.classList.remove('ant-rate-star-zero');
          } else {
            star.classList.remove('selected', 'active', 'ant-rate-star-full');
            star.classList.add('ant-rate-star-zero');
          }
        }
      }
    }
  }
}

/**
 * 填充文本输入
 */
function fillTextInput(input: FormElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 高亮显示已填充的字段
 */
function highlightFilledField(input: FormElement) {
  const originalBg = input.style.backgroundColor;
  input.style.backgroundColor = '#e6f7ff';
  setTimeout(() => {
    input.style.backgroundColor = originalBg;
  }, 2000);
}

/**
 * 显示通知消息
 */
export function showNotification(message: string) {
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
