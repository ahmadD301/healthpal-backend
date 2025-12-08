/**
 * Translation Service
 * Handles Arabic ↔ English medical translation for international consultations
 * Integrates with Google Translate API
 */

const axios = require('axios');

class TranslationService {
  constructor() {
    this.apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    this.baseUrl = 'https://translation.googleapis.com/language/translate/v2';
    // Cache common medical terms
    this.medicalTerms = {
      // Common symptoms
      'fever': 'حمى',
      'cough': 'سعال',
      'headache': 'صداع الرأس',
      'pain': 'ألم',
      'nausea': 'غثيان',
      'dizziness': 'دوار',
      'fatigue': 'إرهاق',
      'shortness of breath': 'ضيق في التنفس',
      
      // Common conditions
      'diabetes': 'السكري',
      'hypertension': 'ارتفاع ضغط الدم',
      'asthma': 'الربو',
      'cancer': 'السرطان',
      'depression': 'الاكتئاب',
      'anxiety': 'القلق',
      
      // Medical procedures
      'surgery': 'جراحة',
      'chemotherapy': 'العلاج الكيميائي',
      'dialysis': 'غسيل كلوي',
      'vaccination': 'تطعيم',
      'x-ray': 'أشعة سينية',
      'ultrasound': 'الموجات فوق الصوتية',
      'blood test': 'اختبار دم',
      
      // Medications
      'aspirin': 'أسبرين',
      'antibiotic': 'مضاد حيوي',
      'paracetamol': 'باراسيتامول',
      'insulin': 'الأنسولين'
    };
  }

  /**
   * Translate text from Arabic to English or English to Arabic
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - 'ar' for Arabic, 'en' for English
   * @returns {Promise<Object>} - Translation result
   */
  async translate(text, targetLanguage = 'ar') {
    try {
      // Check cache for common medical terms
      const lowerText = text.toLowerCase();
      if (this.medicalTerms[lowerText]) {
        return {
          success: true,
          original: text,
          translated: this.medicalTerms[lowerText],
          language: targetLanguage,
          source: 'cache'
        };
      }

      // If no API key, use basic translation
      if (!this.apiKey) {
        console.warn('⚠️ Google Translate API key not configured. Using fallback translation.');
        return this.getFallbackTranslation(text, targetLanguage);
      }

      // Call Google Translate API
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          q: text,
          target: targetLanguage,
          format: 'text'
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data && response.data.data.translations) {
        return {
          success: true,
          original: text,
          translated: response.data.data.translations[0].translatedText,
          language: targetLanguage,
          source: 'google_translate'
        };
      }

      return this.getFallbackTranslation(text, targetLanguage);
    } catch (error) {
      console.error('Translation error:', error.message);
      return this.getFallbackTranslation(text, targetLanguage);
    }
  }

  /**
   * Translate consultation message
   * @param {Object} message - Message object with text and sender info
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} - Translated message
   */
  async translateConsultationMessage(message, targetLanguage = 'ar') {
    try {
      const translation = await this.translate(message.message_text, targetLanguage);
      
      return {
        ...message,
        original_language: message.language || 'en',
        translated_text: translation.translated,
        target_language: targetLanguage,
        translation_source: translation.source,
        is_translated: true
      };
    } catch (error) {
      console.error('Error translating consultation message:', error);
      throw error;
    }
  }

  /**
   * Translate multiple messages (for consultation history)
   * @param {Array} messages - Array of message objects
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Array>} - Array of translated messages
   */
  async translateConsultationHistory(messages, targetLanguage = 'ar') {
    try {
      const translatedMessages = await Promise.all(
        messages.map(msg => this.translateConsultationMessage(msg, targetLanguage))
      );
      return translatedMessages;
    } catch (error) {
      console.error('Error translating consultation history:', error);
      throw error;
    }
  }

  /**
   * Detect language of text
   * @param {string} text - Text to detect language
   * @returns {Promise<string>} - Language code ('ar', 'en', etc.)
   */
  async detectLanguage(text) {
    try {
      if (!text || text.trim().length === 0) {
        return 'unknown';
      }

      // If no API key, use local detection with improved heuristics
      if (!this.apiKey) {
        // Check for Arabic characters (Unicode range: 0600–06FF)
        const arabicRegex = /[\u0600-\u06FF]/g;
        const arabicCount = (text.match(arabicRegex) || []).length;
        
        // Check for English characters
        const englishRegex = /[a-zA-Z]/g;
        const englishCount = (text.match(englishRegex) || []).length;
        
        // Determine language based on character counts
        if (arabicCount > englishCount && arabicCount > 0) {
          return 'ar'; // Arabic detected
        } else if (englishCount > 0) {
          return 'en'; // English detected
        } else if (arabicCount > 0) {
          return 'ar'; // Only Arabic characters
        } else {
          return 'unknown'; // Unable to determine
        }
      }

      // Use Google Translate API if available
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          q: text
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data && response.data.data.detections) {
        return response.data.data.detections[0][0].language;
      }

      return 'unknown';
    } catch (error) {
      console.error('Language detection error:', error.message);
      
      // Final fallback: use simple heuristic
      const arabicRegex = /[\u0600-\u06FF]/g;
      const arabicCount = (text.match(arabicRegex) || []).length;
      return arabicCount > 0 ? 'ar' : 'en';
    }
  }

  /**
   * Auto-translate if needed (detects language and translates if necessary)
   * @param {string} text - Text to potentially translate
   * @param {string} requiredLanguage - Required language code
   * @returns {Promise<Object>} - Translation result
   */
  async autoTranslate(text, requiredLanguage = 'ar') {
    try {
      const detectedLanguage = await this.detectLanguage(text);
      
      if (detectedLanguage === requiredLanguage) {
        return {
          original: text,
          translated: text,
          language: requiredLanguage,
          translated_needed: false
        };
      }

      const translation = await this.translate(text, requiredLanguage);
      return {
        ...translation,
        translated_needed: true,
        detected_language: detectedLanguage
      };
    } catch (error) {
      console.error('Auto-translation error:', error);
      throw error;
    }
  }

  /**
   * Fallback translation (when API unavailable)
   * Translates by replacing known medical terms and common words
   * @private
   */
  getFallbackTranslation(text, targetLanguage) {
    // Common English to Arabic translations for medical context
    const enToAr = {
      'you have': 'أنت لديك',
      'you have a': 'أنت لديك',
      'bad case': 'حالة سيئة',
      'good case': 'حالة جيدة',
      'serious case': 'حالة خطيرة',
      'mild case': 'حالة خفيفة',
      'is': 'هو',
      'are': 'هم',
      'have': 'لديك',
      'has': 'لديه',
      'need': 'تحتاج',
      'needs': 'يحتاج',
      'take': 'خذ',
      'taking': 'تناول',
      'doctor': 'طبيب',
      'patient': 'مريض',
      'hospital': 'مستشفى',
      'medicine': 'دواء',
      'treatment': 'العلاج',
      'help': 'ساعدة',
      'emergency': 'حالة طوارئ',
      'call': 'اتصل',
      'please': 'من فضلك',
      'thank you': 'شكرا لك',
      'yes': 'نعم',
      'no': 'لا',
      'ok': 'حسنا',
      'okay': 'حسنا',
      'how': 'كيف',
      'what': 'ماذا',
      'where': 'أين',
      'when': 'متى',
      'why': 'لماذا',
      'who': 'من',
      'very': 'جدا',
      'the': 'ال',
      'a': 'ا',
      'an': 'ا'
    };

    const arToEn = {
      'أنت لديك': 'you have',
      'حالة سيئة': 'bad case',
      'حالة جيدة': 'good case',
      'حالة خطيرة': 'serious case',
      'حالة خفيفة': 'mild case',
      'هو': 'is',
      'هم': 'are',
      'لديك': 'have',
      'لديه': 'has',
      'تحتاج': 'need',
      'يحتاج': 'needs',
      'خذ': 'take',
      'تناول': 'taking',
      'طبيب': 'doctor',
      'مريض': 'patient',
      'مستشفى': 'hospital',
      'دواء': 'medicine',
      'العلاج': 'treatment',
      'ساعدة': 'help',
      'حالة طوارئ': 'emergency',
      'اتصل': 'call',
      'من فضلك': 'please',
      'شكرا لك': 'thank you',
      'نعم': 'yes',
      'لا': 'no',
      'حسنا': 'ok',
      'كيف': 'how',
      'ماذا': 'what',
      'أين': 'where',
      'متى': 'when',
      'لماذا': 'why',
      'من': 'who',
      'جدا': 'very'
    };

    let translatedText = text;
    const dictionary = targetLanguage === 'ar' ? enToAr : arToEn;
    const medicalTerms = targetLanguage === 'ar' 
      ? this.medicalTerms 
      : Object.entries(this.medicalTerms).reduce((acc, [en, ar]) => {
          acc[ar] = en;
          return acc;
        }, {});

    // Replace known medical terms first
    Object.entries(medicalTerms).forEach(([source, target]) => {
      const regex = new RegExp(`\\b${source}\\b`, 'gi');
      translatedText = translatedText.replace(regex, target);
    });

    // Replace common words and phrases
    Object.entries(dictionary).forEach(([source, target]) => {
      const regex = new RegExp(`\\b${source}\\b`, 'gi');
      translatedText = translatedText.replace(regex, target);
    });

    return {
      success: true,
      original: text,
      translated: translatedText,
      language: targetLanguage,
      source: 'fallback_with_dictionary',
      warning: 'Translation uses local dictionary. For better accuracy, configure Google Translate API key.'
    };
  }

  /**
   * Get translation health check
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return {
          status: 'configured',
          service: 'google_translate',
          api_key_present: false,
          fallback_available: true
        };
      }

      // Test with simple phrase
      const result = await this.translate('hello', 'ar');
      return {
        status: result.success ? 'healthy' : 'degraded',
        service: 'google_translate',
        api_key_present: true,
        last_test: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'google_translate',
        error: error.message
      };
    }
  }
}

module.exports = new TranslationService();
