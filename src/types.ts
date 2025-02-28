// 表单字段结构
export interface FormField {
  value: string;
  type?: string;        // 'text', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'range', 'rate'
  options?: string[];   // 用于 select/multiselect
  metadata?: {          // 额外的类型特定信息
    [key: string]: any;
  };
}

// 表单数据结构
export interface FormData {
  id: string;
  formName: string;
  fields: {
    [key: string]: string | FormField;  // 可以是简单值或复杂对象
  };
  source: string;
  timestamp: number;
}

// 表单元素类型
export type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// 表单元素结构描述
export interface FormElementStructure {
  type: string;
  name: string;
  id: string;
  placeholder: string;
  label: string;
  options?: string[];
}

// AI 映射结果类型
export interface AIMappingResult {
  [elementId: string]: string;  // 元素ID到字段名的映射
}
