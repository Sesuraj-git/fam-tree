import "server-only";
import knex, { Knex } from "knex";
import knexConfig from "../../knexfile.js";

const environment = process.env.NODE_ENV === "production" ? "production" : "development";

declare global {
  // eslint-disable-next-line no-var
  var __knex__: Knex | undefined;
}

const db = global.__knex__ ?? knex(knexConfig[environment]);

if (process.env.NODE_ENV !== "production") {
  global.__knex__ = db;
}

export default db;
