import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Knex probes for every dialect driver (oracledb, sqlite3, tedious, ...) at
  // require-time; only `pg` is installed. Keep it external so webpack doesn't
  // try to bundle the missing optional drivers.
  serverExternalPackages: ["knex"],
};

export default nextConfig;
