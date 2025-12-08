/**
 * Translation API Controller
 * Handles translation requests for consultations and messages
 */

const translationService = require('../utils/translationService');

/**
 * POST /api/translate/text
 * Translate any text
 */
exports.translateText = async (req, res) => {
  try {
    const { text, target_language = 'ar' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await translationService.translate(text, target_language);

    res.json({
      original: result.original,
      translated: result.translated,
      target_language: result.language,
      source: result.source,
      success: result.success
    });
  } catch (error) {
    res.status(500).json({
      error: 'Translation failed',
      details: error.message
    });
  }
};

/**
 * POST /api/translate/message
 * Translate consultation message with metadata
 */
exports.translateMessage = async (req, res) => {
  try {
    const { message_text, target_language = 'ar', consultation_id } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const message = {
      message_text,
      consultation_id,
      language: 'en'
    };

    const translatedMessage = await translationService.translateConsultationMessage(
      message,
      target_language
    );

    res.json(translatedMessage);
  } catch (error) {
    res.status(500).json({
      error: 'Message translation failed',
      details: error.message
    });
  }
};

/**
 * POST /api/translate/detect-language
 * Detect language of provided text
 */
exports.detectLanguage = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const language = await translationService.detectLanguage(text);

    res.json({
      detected_language: language,
      text: text.substring(0, 100) // Return only first 100 chars
    });
  } catch (error) {
    res.status(500).json({
      error: 'Language detection failed',
      details: error.message
    });
  }
};

/**
 * POST /api/translate/auto
 * Auto-detect and translate if needed
 */
exports.autoTranslate = async (req, res) => {
  try {
    const { text, required_language = 'ar' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await translationService.autoTranslate(text, required_language);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Auto-translation failed',
      details: error.message
    });
  }
};

/**
 * GET /api/translate/health
 * Check translation service health
 */
exports.healthCheck = async (req, res) => {
  try {
    const health = await translationService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      details: error.message
    });
  }
};

/**
 * GET /api/translate/supported-languages
 * Get list of supported languages
 */
exports.getSupportedLanguages = (req, res) => {
  const languages = {
    ar: { name: 'Arabic', nativeName: 'العربية' },
    en: { name: 'English', nativeName: 'English' },
    fr: { name: 'French', nativeName: 'Français' },
    es: { name: 'Spanish', nativeName: 'Español' },
    de: { name: 'German', nativeName: 'Deutsch' },
    it: { name: 'Italian', nativeName: 'Italiano' },
    tr: { name: 'Turkish', nativeName: 'Türkçe' },
    ur: { name: 'Urdu', nativeName: 'اردو' }
  };

  res.json({
    supported_languages: languages,
    total: Object.keys(languages).length
  });
};
