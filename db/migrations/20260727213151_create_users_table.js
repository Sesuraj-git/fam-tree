/**
 * A `users` row only ever exists alongside real login credentials (signup, or
 * claiming a placeholder person) so email/password_hash are required here —
 * placeholders-without-accounts live only in `persons` with `user_id = null`.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email").notNullable().unique();
    table.string("password_hash").notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("users");
};
