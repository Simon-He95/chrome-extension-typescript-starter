import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Upload, Button, Typography, List, message, Space, Card, Spin, Modal, Input, Tag } from "antd";
import { UploadOutlined, FilePdfOutlined, FileTextOutlined, KeyOutlined } from "@ant-design/icons";
import { OpenAI } from "openai";
import './preload'
// import "antd/dist/reset.css";

const { Title, Text, Paragraph } = Typography;

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

const Popup = () => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [formDataList, setFormDataList] = useState<FormData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Load saved form data and API key
    chrome.storage.local.get(['formDataList', 'apiKey'], (result) => {
      if (result.formDataList) {
        setFormDataList(result.formDataList);
      }
      if (result.apiKey) {
        setApiKey(result.apiKey);
      }
    });

    // Update badge with number of saved forms
    updateBadge(formDataList.length);
  }, [formDataList.length]);

  const updateBadge = (count: number) => {
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : "" });
  };

  const handleUpload = (info: any) => {
    const { status } = info.file;
    
    if (status === 'done') {
      message.success(`${info.file.name} file uploaded successfully.`);
      setFileList([...fileList, info.file]);
      
      // Process the file with OpenAI
      processFileWithOpenAI(info.file);
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  };

  const processFileWithOpenAI = async (file: any) => {
    if (!apiKey) {
      message.error("OpenAI API key not set. Please add it in settings.");
      setIsSettingsVisible(true);
      return;
    }

    setLoading(true);

    try {
      // Read file content
      const content = await readFileContent(file);
      
      // Process with OpenAI
      const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Extract form fields from the following content. Return JSON with field names and values in this format: {\"formName\":\"[Descriptive name for the form]\", \"fields\":{\"fieldName1\": \"value1\", \"fieldName2\": \"value2\", ...}}"
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.1
      });

      const responseText = response.choices[0]?.message?.content || "";
      let parsedContent;
      
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON found in response");
        }
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        message.error("Failed to parse form fields from the document");
        setLoading(false);
        return;
      }

      // Create new form data entry
      const newFormData: FormData = {
        id: Date.now().toString(),
        formName: parsedContent.formName || file.name,
        fields: parsedContent.fields || {},
        source: file.name,
        timestamp: Date.now()
      };

      // Update state and save to storage
      const updatedFormDataList = [...formDataList, newFormData];
      setFormDataList(updatedFormDataList);
      chrome.storage.local.set({ formDataList: updatedFormDataList });
      
      message.success(`Form fields extracted from ${file.name}`);
    } catch (error) {
      console.error("OpenAI processing error:", error);
      message.error(`Failed to process file: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  const readFileContent = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'd need PDF.js integration
        // This is simplified and would need to be enhanced
        reader.readAsArrayBuffer(file);
        reader.onload = async () => {
          message.info("PDF parsing would require PDF.js integration");
          resolve(`Content of PDF file: ${file.name} (placeholder)`);
        };
      } else {
        // For text files
        reader.readAsText(file.originFileObj || file);
        reader.onload = () => resolve(reader.result as string);
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const getIconForFileType = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return <FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />;
    } else if (fileName.toLowerCase().endsWith('.txt')) {
      return <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />;
    }
    return null;
  };
  
  const props = {
    name: 'file',
    customRequest: ({ file, onSuccess }: any) => {
      // Custom request to handle file upload locally
      setTimeout(() => {
        onSuccess("ok");
      }, 0);
    },
    accept: '.pdf,.txt',
    onChange: handleUpload,
    showUploadList: false,
  };

  const fillForm = (formData: FormData) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "fillForm",
            formData: formData
          },
          (msg) => {
            console.log("Form fill result:", msg);
            message.info(`Attempted to fill form with "${formData.formName}" data`);
          }
        );
      }
    });
  };

  const deleteFormData = (id: string) => {
    const updatedList = formDataList.filter(item => item.id !== id);
    setFormDataList(updatedList);
    chrome.storage.local.set({ formDataList: updatedList });
    message.success("Form data deleted");
  };

  const saveApiKey = () => {
    chrome.storage.local.set({ apiKey });
    message.success("API Key saved");
    setIsSettingsVisible(false);
  };

  return (
    <Card style={{ width: 500, maxHeight: 600, overflow: "auto", padding: 10 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>AI Form Assistant</Title>
          <Button 
            icon={<KeyOutlined />} 
            onClick={() => setIsSettingsVisible(true)}
            size="small"
          >
            API Key
          </Button>
        </div>
        
        <Paragraph>
          Upload documents containing form data. Use <Tag color="blue">Alt+F</Tag> to auto-fill forms on websites.
        </Paragraph>
        
        <Upload {...props}>
          <Button icon={<UploadOutlined />} type="primary" loading={loading}>
            Upload PDF or TXT Files
          </Button>
        </Upload>
        
        {loading && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Spin tip="Processing with OpenAI..." />
          </div>
        )}
        
        {formDataList.length > 0 && (
          <>
            <Title level={5}>Saved Form Data</Title>
            <List
              itemLayout="horizontal"
              dataSource={formDataList}
              renderItem={(item) => (
                <List.Item 
                  actions={[
                    <Button 
                      type="primary"
                      size="small" 
                      onClick={() => fillForm(item)}
                    >
                      Fill Form
                    </Button>,
                    <Button 
                      danger
                      size="small" 
                      onClick={() => deleteFormData(item.id)}
                    >
                      Delete
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getIconForFileType(item.source)}
                    title={item.formName}
                    description={
                      <>
                        <div>Source: {item.source}</div>
                        <div>Fields: {Object.keys(item.fields).length}</div>
                        <div>Created: {new Date(item.timestamp).toLocaleString()}</div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Space>

      <Modal
        title="OpenAI API Settings"
        open={isSettingsVisible}
        onCancel={() => setIsSettingsVisible(false)}
        onOk={saveApiKey}
        okText="Save"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>OpenAI API Key</Text>
          <Input 
            placeholder="sk-..." 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
          />
          <Text type="secondary">
            Your API key is stored locally in your browser and is only used for processing form data.
          </Text>
        </Space>
      </Modal>
    </Card>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
