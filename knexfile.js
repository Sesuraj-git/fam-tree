require("dotenv").config();

const useSsl = /sslmode=require|amazonaws|neon\.tech|supabase\.co/.test(
  process.env.DATABASE_URL || ""
);

const baseConfig = {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  },
  migrations: {
    directory: "./db/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./db/seeds",
  },
};

module.exports = {
  development: baseConfig,
  production: baseConfig,
};
