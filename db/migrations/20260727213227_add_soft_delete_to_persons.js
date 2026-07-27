/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable("persons", (table) => {
    table.timestamp("deleted_at").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable("persons", (table) => {
    table.dropColumn("deleted_at");
  });
};
