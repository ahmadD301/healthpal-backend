import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// import routes from "./routes/index.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/docs', (req, res) => {
  res.send('API Documentation would be here.');
});

// app.use("/api", routes);

export default app;
