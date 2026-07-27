/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("account_claim_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("person_id")
      .notNullable()
      .references("id")
      .inTable("persons")
      .onDelete("CASCADE");

    table.string("token").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.timestamp("used_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index("person_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("account_claim_tokens");
};
