import { FormElement, FormField } from './types';
import { fillInputWithValue, showNotification, findLabelForElement } from './form-utils';
import { matchFormFieldsWithAI } from './ai-service';

/**
 * 使用 AI 填充表单
 */
export async function fillFormWithAI(
  formElements: NodeListOf<FormElement>, 
  fields: { [key: string]: string | FormField }
): Promise<number | null> {
  try {
    const aiMappings = await matchFormFieldsWithAI(formElements, fields);
    
    if (!aiMappings) {
      return null; // AI 匹配失败
    }
    
    console.log("Using AI field mappings:", aiMappings);
    
    let filledCount = 0;
    // 使用 AI 提供的映射填充表单
    Object.entries(aiMappings).forEach(([elementId, fieldName]) => {
      const element = document.getElementById(elementId) as FormElement;
      if (element && fields[fieldName as string]) {
        const fieldValue = fields[fieldName as string];
        const value = typeof fieldValue === 'string' ? fieldValue : fieldValue.value;
        fillInputWithValue(element, value);
        filledCount++;
      }
    });
    
    return filledCount;
  } catch (error) {
    console.error("AI filling error:", error);
    return null;
  }
}

/**
 * 使用规则匹配填充表单
 */
export function fillFormWithRuleBasedMatching(
  formElements: NodeListOf<FormElement>,
  fields: { [key: string]: string | FormField }
): number {
  let filledCount = 0;
  
  formElements.forEach(input => {
    const inputName = (input.name || '').toLowerCase();
    const inputId = (input.id || '').toLowerCase();
    const inputPlaceholder = (input.getAttribute('placeholder') || '').toLowerCase();
    const inputLabel = findLabelForElement(input)?.toLowerCase() || '';

    // 尝试匹配字段
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      const fieldNameLower = fieldName.toLowerCase();
      const value = typeof fieldValue === 'string' ? fieldValue : fieldValue.value;

      if (
        inputName.includes(fieldNameLower) ||
        inputId.includes(fieldNameLower) ||
        inputLabel.includes(fieldNameLower) ||
        inputPlaceholder.includes(fieldNameLower)
      ) {
        fillInputWithValue(input, value);
        filledCount++;
        break;
      }
    }
  });
  
  return filledCount;
}

/**
 * 主填充函数，结合 AI 和规则匹配
 */
export async function fillFormWithData(fields: { [key: string]: string | FormField }) {
  console.log("Filling form with data:", fields);

  // 获取所有表单元素
  const formElements = document.querySelectorAll<FormElement>('input, select, textarea');
  
  // 检查是否有 API key
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;
  
  // 如果有 API key，尝试使用 AI 匹配
  if (apiKey) {
    try {
      const filledCount = await fillFormWithAI(formElements, fields);
      
      if (filledCount !== null && filledCount > 0) {
        showNotification(`AI 助手已填充 ${filledCount} 个表单字段`);
        return;
      }
    } catch (error) {
      console.error("AI matching failed, falling back to rule-based matching:", error);
    }
  }
  
  // AI 不可用或匹配失败时，使用基于规则的匹配
  console.log("Using rule-based field matching");
  const filledCount = fillFormWithRuleBasedMatching(formElements, fields);
  
  showNotification(`已填充 ${filledCount} 个表单字段`);
}

/**
 * 获取最新表单数据并填充
 */
export function fillFormWithLatestData() {
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
