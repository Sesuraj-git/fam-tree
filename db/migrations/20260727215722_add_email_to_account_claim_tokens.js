/**
 * The invite endpoint targets a specific email; storing it on the token
 * means claim only needs the token + a new password, not the email again.
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable("account_claim_tokens", (table) => {
    table.string("email").notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable("account_claim_tokens", (table) => {
    table.dropColumn("email");
  });
};
