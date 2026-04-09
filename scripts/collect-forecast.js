const https = require('https');
const fs = require('fs');
const path = require('path');

const LAT = 41.7151;
const LON = 44.8271;
const MODELS = [
  "ecmwf_ifs", "gfs_global", "icon_global", "icon_eu",
  "meteofrance_arpege_world", "jma_gsm", "gem_global",
];

const today = new Date().toISOString().slice(0, 10);
const dailyParams = "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum";

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'forecast-bot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const result = {
    collected_at: new Date().toISOString(),
    location: { lat: LAT, lon: LON },
    forecasts: {},
  };

  for (const model of MODELS) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=${dailyParams}&models=${model}&timezone=auto`;
    try {
      const json = await fetchJSON(url);
      result.forecasts[model] = {
        dates: json.daily?.time || [],
        temperature_2m_mean: json.daily?.temperature_2m_mean || [],
        temperature_2m_max: json.daily?.temperature_2m_max || [],
        temperature_2m_min: json.daily?.temperature_2m_min || [],
        precipitation_sum: json.daily?.precipitation_sum || [],
      };
      console.log(`OK: ${model}`);
    } catch (e) {
      console.error(`FAIL: ${model}: ${e.message}`);
      result.forecasts[model] = { dates: [], temperature_2m_mean: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [] };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  const dir = path.join(__dirname, '..', 'data', 'snapshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${today}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`Saved: ${filePath}`);
}

main().catch(e => { console.error(e); process.exit(1); });