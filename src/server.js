
import express from "express"
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));

connectDB(); // Test MySQL connection before starting server

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🏥 HealthPal API Server Started`);
  console.log(`========================================`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🧪 Disease data: http://localhost:${PORT}/api/external/disease-outbreaks`);
  console.log(`========================================`);
});
