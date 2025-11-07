import sequelize from "./db.js";
import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = {};
const modelsDir = path.join(__dirname, "../models");

for (const file of readdirSync(modelsDir)) {
  if (file.endsWith(".js")) {
    const modelPath = path.join(modelsDir, file);
    const model = (await import(pathToFileURL(modelPath).href)).default;
    const modelInstance = model(sequelize, sequelize.Sequelize.DataTypes);
    models[modelInstance.name] = modelInstance;
  }
}

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

try {
  await sequelize.authenticate();
  console.log("✅ All models loaded successfully!");
} catch (err) {
  console.error("❌ Error loading models:", err);
}
