import { OpenAI } from "openai";
import { FormElement, FormElementStructure, AIMappingResult, FormField } from './types';
import { findLabelForElement } from './form-utils';

/**
 * 获取表单元素结构
 */
export function getFormElementsStructure(formElements: NodeListOf<FormElement>): FormElementStructure[] {
  return Array.from(formElements).map(element => {
    return {
      type: element.type || element.tagName.toLowerCase(),
      name: element.name || "",
      id: element.id || "",
      placeholder: element.getAttribute("placeholder") || "",
      label: findLabelForElement(element) || "",
      options: element.tagName === "SELECT" ? 
        Array.from((element as HTMLSelectElement).options).map(opt => opt.text) : 
        undefined
    };
  });
}

/**
 * 使用 OpenAI 智能匹配表单字段和值
 */
export async function matchFormFieldsWithAI(
  formElements: NodeListOf<FormElement>,
  formData: { [key: string]: string | FormField }
): Promise<AIMappingResult | null> {
  // 获取表单结构信息
  const formStructure = getFormElementsStructure(formElements);
  
  // 获取 API key
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;
  
  if (!apiKey) {
    console.error("OpenAI API key not found");
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a form-filling assistant. Match form data fields to form elements based on semantic meaning, not just exact matches. For each form element, find the most appropriate field from the provided form data. Return a mapping of element IDs to field names."
        },
        {
          role: "user",
          content: JSON.stringify({
            formElements: formStructure,
            formData: formData
          })
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const mappingResult = JSON.parse(response.choices[0]?.message?.content || "{}");
    return mappingResult.fieldMappings || null;
  } catch (error) {
    console.error("OpenAI field matching error:", error);
    return null;
  }
}
