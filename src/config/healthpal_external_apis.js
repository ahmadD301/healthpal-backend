const axios = require('axios');
require('dotenv').config();

// ==================== WEATHER API (OpenWeatherMap) ====================
// For air quality and health alerts
const getAirQuality = async (city) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const response = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution`,
      {
        params: {
          lat: 31.9522, // Example: Ramallah coordinates
          lon: 35.2332,
          appid: apiKey
        }
      }
    );
    
    return {
      aqi: response.data.list[0].main.aqi,
      components: response.data.list[0].components,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Weather API Error:', error.message);
    return null;
  }
};

// ==================== TRANSLATION API (Google Translate) ====================
// For Arabic <-> English medical translation
const translateText = async (text, targetLang = 'en') => {
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2`,
      {},
      {
        params: {
          q: text,
          target: targetLang,
          key: apiKey
        }
      }
    );
    
    return {
      translatedText: response.data.data.translations[0].translatedText,
      detectedSourceLanguage: response.data.data.translations[0].detectedSourceLanguage
    };
  } catch (error) {
    console.error('Translation API Error:', error.message);
    return { translatedText: text, error: true };
  }
};

// ==================== SMS API (Twilio) ====================
// For appointment reminders and alerts
const sendSMS = async (phoneNumber, message) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: message
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );
    
    return {
      success: true,
      messageSid: response.data.sid
    };
  } catch (error) {
    console.error('SMS API Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ==================== DRUG DATABASE API (OpenFDA) ====================
// For medicine information and interactions
const getMedicineInfo = async (medicineName) => {
  try {
    const response = await axios.get(
      `https://api.fda.gov/drug/label.json`,
      {
        params: {
          search: `openfda.brand_name:"${medicineName}"`,
          limit: 1
        }
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const drug = response.data.results[0];
      return {
        brandName: drug.openfda?.brand_name?.[0],
        genericName: drug.openfda?.generic_name?.[0],
        manufacturer: drug.openfda?.manufacturer_name?.[0],
        warnings: drug.warnings?.[0],
        indications: drug.indications_and_usage?.[0],
        dosage: drug.dosage_and_administration?.[0]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Drug Database API Error:', error.message);
    return null;
  }
};

// ==================== DISEASE DATABASE API (Disease.sh) ====================
// For COVID-19 and disease outbreak data
const getDiseaseOutbreaks = async (country = 'palestine') => {
  try {
    const response = await axios.get(
      `https://disease.sh/v3/covid-19/countries/${country}`
    );
    
    return {
      country: response.data.country,
      cases: response.data.cases,
      todayCases: response.data.todayCases,
      deaths: response.data.deaths,
      recovered: response.data.recovered,
      active: response.data.active,
      updated: new Date(response.data.updated)
    };
  } catch (error) {
    console.error('Disease API Error:', error.message);
    return null;
  }
};

// ==================== MEDICAL NEWS API ====================
// For health education and latest medical research
const getHealthNews = async (topic = 'health', language = 'en') => {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    const response = await axios.get(
      `https://newsapi.org/v2/everything`,
      {
        params: {
          q: topic,
          language: language,
          sortBy: 'publishedAt',
          pageSize: 10,
          apiKey: apiKey
        }
      }
    );
    
    return response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.publishedAt,
      source: article.source.name
    }));
  } catch (error) {
    console.error('News API Error:', error.message);
    return [];
  }
};

// ==================== PAYMENT GATEWAY API (Stripe) ====================
// For processing donations
const processPayment = async (amount, currency = 'usd', paymentMethodId) => {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const response = await axios.post(
      'https://api.stripe.com/v1/payment_intents',
      new URLSearchParams({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        payment_method: paymentMethodId,
        confirm: true
      }),
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return {
      success: true,
      paymentId: response.data.id,
      status: response.data.status,
      amount: response.data.amount / 100
    };
  } catch (error) {
    console.error('Payment API Error:', error.message);
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    };
  }
};

// ==================== GEOCODING API (OpenCage) ====================
// For location services
const geocodeLocation = async (address) => {
  try {
    const apiKey = process.env.OPENCAGE_API_KEY;
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json`,
      {
        params: {
          q: address,
          key: apiKey,
          language: 'en',
          limit: 1
        }
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        formatted: result.formatted,
        city: result.components.city,
        country: result.components.country
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding API Error:', error.message);
    return null;
  }
};

// ==================== WHO HEALTH DATA API ====================
// For global health statistics and guidelines
const getWHOHealthData = async (indicator = 'WHOSIS_000001') => {
  try {
    const response = await axios.get(
      `https://ghoapi.azureedge.net/api/${indicator}`
    );
    
    return response.data.value;
  } catch (error) {
    console.error('WHO API Error:', error.message);
    return null;
  }
};

// ==================== PRESCRIPTION VALIDATION (Mock) ====================
// Validate prescription format and codes
const validatePrescription = async (prescriptionData) => {
  try {
    // This is a mock - in production, integrate with pharmacy networks
    const { medicine, dosage, duration, doctor_license } = prescriptionData;
    
    // Basic validation
    const isValid = medicine && dosage && duration && doctor_license;
    
    return {
      valid: isValid,
      prescriptionId: `RX-${Date.now()}`,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      message: isValid ? 'Prescription validated' : 'Invalid prescription data'
    };
  } catch (error) {
    console.error('Prescription Validation Error:', error.message);
    return { valid: false, error: error.message };
  }
};

// ==================== EMAIL SERVICE (SendGrid) ====================
// For sending notifications
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [
          {
            to: [{ email: to }]
          }
        ],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@healthpal.example',
          name: 'HealthPal'
        },
        subject: subject,
        content: [
          {
            type: 'text/html',
            value: htmlContent
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return { success: true, messageId: response.headers['x-message-id'] };
  } catch (error) {
    console.error('Email API Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ==================== EMERGENCY ALERT SYSTEM ====================
// Broadcast urgent health alerts via multiple channels
const broadcastEmergencyAlert = async (message, region, channels = ['sms', 'email']) => {
  const results = {
    sms: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 }
  };
  
  try {
    // Get affected users from database (implement based on region)
    // This is a simplified example
    const affectedUsers = []; // Query from database
    
    for (const user of affectedUsers) {
      if (channels.includes('sms') && user.phone) {
        const smsResult = await sendSMS(user.phone, message);
        if (smsResult.success) results.sms.sent++;
        else results.sms.failed++;
      }
      
      if (channels.includes('email') && user.email) {
        const emailResult = await sendEmail(
          user.email,
          'HealthPal Emergency Alert',
          `<h2>Emergency Health Alert</h2><p>${message}</p>`
        );
        if (emailResult.success) results.email.sent++;
        else results.email.failed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Emergency Alert Error:', error.message);
    return results;
  }
};

module.exports = {
  getAirQuality,
  translateText,
  sendSMS,
  getMedicineInfo,
  getDiseaseOutbreaks,
  getHealthNews,
  processPayment,
  geocodeLocation,
  getWHOHealthData,
  validatePrescription,
  sendEmail,
  broadcastEmergencyAlert
};