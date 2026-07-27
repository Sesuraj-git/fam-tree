/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("password_reset_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.string("token").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.timestamp("used_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("password_reset_tokens");
};
