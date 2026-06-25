const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const AIPlatformService = require('../services/AIPlatformService');
const PlatformSelectionService = require('../services/PlatformSelectionService');
const { authRequired, adminRequired } = require('../middleware/auth');

const ENV_PATH = path.resolve(__dirname, '..', '.env');
const PLATFORM_ENV_KEYS = {
  doubao: {
    apiKey: 'DOUBAO_API_KEY',
    apiUrl: 'DOUBAO_API_URL',
    responsesModel: 'DOUBAO_RESPONSES_MODEL'
  },
  deepseek: {
    apiKey: 'DEEPSEEK_API_KEY',
    apiUrl: 'DEEPSEEK_API_URL'
  }
};

function readEnvFile() {
  try {
    return fs.readFileSync(ENV_PATH, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function setEnvValue(content, key, value) {
  const safeValue = String(value || '').replace(/\r?\n/g, '').trim();
  const line = `${key}=${safeValue}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${suffix}${line}\n`;
}

function persistPlatformConfig(configs) {
  let content = readEnvFile();
  for (const [platform, updates] of Object.entries(configs)) {
    const envKeys = PLATFORM_ENV_KEYS[platform];
    if (!envKeys || !updates || typeof updates !== 'object') continue;

    for (const [field, envKey] of Object.entries(envKeys)) {
      const value = typeof updates[field] === 'string' ? updates[field].trim() : '';
      if (value) {
        content = setEnvValue(content, envKey, value);
        process.env[envKey] = value;
      }
    }
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

function buildConfigResponse() {
  const configEditable = process.env.NODE_ENV !== 'production';
  return PlatformSelectionService.buildSupportedStatus(AIPlatformService.platforms || {})
    .map((item) => ({
      ...item,
      keyConfigured: item.ok,
      configEditable,
      responsesModel: item.platform === 'doubao'
        ? AIPlatformService.getDoubaoResponsesModel()
        : undefined
    }));
}

// 平台连通性自检（轻量：仅检查是否配置密钥）- 需要登录
router.get('/ping', authRequired, async (req, res) => {
  try {
    const result = PlatformSelectionService.buildSupportedStatus(AIPlatformService.platforms || {});

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('平台自检失败:', error);
    res.status(500).json({ success: false, message: '平台自检失败' });
  }
});

router.get('/config', adminRequired, async (req, res) => {
  try {
    res.json({ success: true, data: buildConfigResponse() });
  } catch (error) {
    console.error('读取平台配置失败:', error);
    res.status(500).json({ success: false, message: '读取平台配置失败' });
  }
});

router.post('/test', adminRequired, async (req, res) => {
  try {
    const requested = Array.isArray(req.body?.platforms)
      ? req.body.platforms
      : Object.keys(PLATFORM_ENV_KEYS);
    const platforms = requested.filter((platform) => PLATFORM_ENV_KEYS[platform]);
    const results = await Promise.all(platforms.map((platform) => AIPlatformService.testPlatform(platform)));
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('平台连接测试失败:', error);
    res.status(500).json({ success: false, message: '平台连接测试失败' });
  }
});

router.post('/config', adminRequired, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(409).json({
        success: false,
        message: '生产环境的平台凭证由云平台环境变量管理，请在部署平台中修改后重新部署'
      });
    }

    const configs = req.body?.platforms || {};
    persistPlatformConfig(configs);

    for (const [platform, updates] of Object.entries(configs)) {
      if (!PLATFORM_ENV_KEYS[platform]) continue;
      AIPlatformService.updatePlatformConfig(platform, updates);
    }

    res.json({
      success: true,
      message: '平台配置已保存',
      data: buildConfigResponse()
    });
  } catch (error) {
    console.error('保存平台配置失败:', error);
    res.status(500).json({ success: false, message: '保存平台配置失败' });
  }
});

module.exports = router;
