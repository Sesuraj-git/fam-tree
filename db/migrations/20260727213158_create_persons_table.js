/**
 * Every tree node is a `persons` row, account-holder or not. `user_id` is
 * null for placeholders added by a relative; it gets backfilled in place
 * when that person later claims an account, so their `id` (and every
 * relationship row pointing at it) never changes.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("persons", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .nullable()
      .unique()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.string("first_name").notNullable();
    table.string("last_name").notNullable();

    table
      .enu("gender", ["male", "female", "other", "unknown"], {
        useNative: true,
        enumName: "person_gender",
      })
      .notNullable()
      .defaultTo("unknown");

    table.date("date_of_birth").nullable();
    table.date("date_of_death").nullable();
    table.boolean("is_alive").notNullable().defaultTo(true);
    table.string("avatar_url").nullable();
    table.text("notes").nullable();

    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");

    table.timestamps(true, true);

    table.index("created_by");
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("persons");
  await knex.raw('drop type if exists "person_gender"');
};
