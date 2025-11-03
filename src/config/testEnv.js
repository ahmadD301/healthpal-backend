import dotenv from "dotenv";
dotenv.config();

console.log("Database host:", process.env.DB_HOST);
console.log("Database name:", process.env.DB_NAME);
