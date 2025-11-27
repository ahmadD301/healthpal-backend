const axios = require('axios');

const externalApis = {
  // Get disease outbreak data (COVID-19)
  getDiseaseOutbreaks: async (country = 'palestine') => {
    try {
      const response = await axios.get(
        `https://disease.sh/v3/covid-19/countries/${country}`,
        { timeout: 5000 }
      );
      
      return {
        country: response.data.country,
        cases: response.data.cases,
        todayCases: response.data.todayCases,
        deaths: response.data.deaths,
        recovered: response.data.recovered,
        active: response.data.active,
        critical: response.data.critical,
        casesPerMillion: response.data.casesPerOneMillion,
        updated: new Date(response.data.updated)
      };
    } catch (error) {
      console.error('Disease API Error:', error.message);
      return null;
    }
  },

  // Get medicine information from OpenFDA
  getMedicineInfo: async (medicineName) => {
    try {
      const response = await axios.get(
        `https://api.fda.gov/drug/label.json`,
        {
          params: {
            search: `openfda.brand_name:"${medicineName}"`,
            limit: 1
          },
          timeout: 5000
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
  },

  // Get WHO health data
  getWHOHealthData: async (indicator = 'WHOSIS_000001') => {
    try {
      const response = await axios.get(
        `https://ghoapi.azureedge.net/api/${indicator}`,
        { timeout: 10000 }
      );
      
      return response.data.value;
    } catch (error) {
      console.error('WHO API Error:', error.message);
      return null;
    }
  }
};

module.exports = externalApis;
