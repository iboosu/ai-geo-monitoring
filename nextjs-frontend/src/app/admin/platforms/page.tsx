'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Divider, Form, Input, message, Space, Tag, Typography } from 'antd';
import axios from 'axios';

const { Paragraph } = Typography;

export default function AdminPlatformsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const configEditable = items.every((item) => item.configEditable !== false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/platforms/config');
      const data = res?.data?.data || [];
      setItems(data);
      const values: any = {};
      data.forEach((item: any) => {
        values[item.platform] = {
          apiUrl: item.apiUrl,
          responsesModel: item.responsesModel
        };
      });
      form.setFieldsValue(values);
    } catch {
      message.error('获取平台配置失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await axios.post('/api/platforms/test', {
        platforms: ['doubao', 'deepseek']
      });
      const results = res?.data?.data || [];
      setTestResults(Object.fromEntries(results.map((item: any) => [item.platform, item])));
      if (results.every((item: any) => item.ok)) {
        message.success('平台连接测试全部通过');
      } else {
        message.warning('部分平台连接测试未通过，请查看具体提示');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '平台连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const platforms = ['doubao', 'deepseek'].reduce((acc: any, key) => {
        const item = values?.[key] || {};
        acc[key] = {
          apiKey: item.apiKey || '',
          apiUrl: item.apiUrl || '',
          responsesModel: item.responsesModel || ''
        };
        return acc;
      }, {});

      const res = await axios.post('/api/platforms/config', { platforms });
      if (!res?.data?.success) {
        message.error(res?.data?.message || '保存平台配置失败');
        return;
      }

      message.success('平台配置已保存');
      setItems(res.data.data || []);
      setTestResults({});
      form.setFieldsValue({
        doubao: { apiKey: '' },
        deepseek: { apiKey: '' }
      });
      await fetchConfig();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '保存平台配置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="平台配置"
      extra={
        <Space>
          <Button onClick={fetchConfig}>刷新</Button>
          <Button type="primary" loading={testing} onClick={handleTest}>
            测试连接
          </Button>
        </Space>
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        “凭证已配置”只表示密钥已经填写。请使用“测试连接”确认密钥、模型权限和接口均可正常调用。
      </Paragraph>
      {!configEditable && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="生产环境配置由部署平台管理"
          description="请在 Render 后端服务的 Environment 页面修改豆包或 DeepSeek 环境变量，然后重新部署。此页面仍可查看状态和测试连接。"
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
      ) : (
        <>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {items.map((item: any) => {
              const testResult = testResults[item.platform];
              return (
                <div
                  key={item.platform}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    backgroundColor: '#fff'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ color: '#666', fontSize: 14 }}>
                      标识：{item.platform} | 接口：{item.apiUrl}
                    </div>
                    {item.responsesModel && (
                      <div style={{ color: '#666', fontSize: 14 }}>模型：{item.responsesModel}</div>
                    )}
                  </div>
                  <Space>
                    {testResult ? (
                      <>
                        <Tag color={testResult.ok ? 'green' : 'red'}>
                          {testResult.ok ? '连接正常' : '连接失败'}
                        </Tag>
                        <span style={{ color: testResult.ok ? '#52c41a' : '#cf1322' }}>
                          {testResult.message}
                        </span>
                      </>
                    ) : (
                      <>
                        <Tag color={item.ok ? 'blue' : 'red'}>{item.ok ? '凭证已配置' : '未配置'}</Tag>
                        <span style={{ color: '#999' }}>{item.message}</span>
                      </>
                    )}
                  </Space>
                </div>
              );
            })}
          </Space>

          <Divider />

          <Form form={form} layout="vertical" onFinish={handleSave} disabled={!configEditable}>
            <Card size="small" title="豆包" style={{ marginBottom: 16 }}>
              <Form.Item name={['doubao', 'apiKey']} label="服务凭证">
                <Input.Password placeholder="粘贴豆包服务凭证；留空表示不修改已有凭证" autoComplete="off" />
              </Form.Item>
              <Form.Item name={['doubao', 'apiUrl']} label="接口地址">
                <Input placeholder="https://ark.cn-beijing.volces.com/api/v3/responses" />
              </Form.Item>
              <Form.Item
                name={['doubao', 'responsesModel']}
                label="Responses 模型或推理接入点 ID"
                extra="必须填写当前火山方舟账号已开通的模型名称，或 ep- 开头的推理接入点 ID。"
              >
                <Input placeholder="doubao-seed-1-6-250615 或 ep-xxxxxxxx" />
              </Form.Item>
            </Card>

            <Card size="small" title="DeepSeek" style={{ marginBottom: 16 }}>
              <Form.Item name={['deepseek', 'apiKey']} label="服务凭证">
                <Input.Password placeholder="粘贴 DeepSeek 服务凭证；留空表示不修改已有凭证" autoComplete="off" />
              </Form.Item>
              <Form.Item name={['deepseek', 'apiUrl']} label="接口地址">
                <Input placeholder="https://api.deepseek.com/v1/chat/completions" />
              </Form.Item>
            </Card>

            <Button type="primary" htmlType="submit" loading={saving} disabled={!configEditable}>
              保存平台配置
            </Button>
          </Form>
        </>
      )}
    </Card>
  );
}
