/**
 * person_a_id/person_b_id follow the a < b convention so a pair is never
 * stored twice in reversed order — the app layer sorts ids before insert
 * and the CHECK constraint below guards it at the DB level too.
 *
 * "Only one active `married` status at a time" is enforced in the
 * application layer (src/lib/relationships.ts): a person can appear as
 * either person_a or person_b across multiple rows, which a simple partial
 * unique index can't cover, so it's a plain pre-insert query instead.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("relationships_spouse", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("person_a_id")
      .notNullable()
      .references("id")
      .inTable("persons")
      .onDelete("CASCADE");

    table
      .uuid("person_b_id")
      .notNullable()
      .references("id")
      .inTable("persons")
      .onDelete("CASCADE");

    table
      .enu("status", ["married", "divorced", "widowed", "partnered"], {
        useNative: true,
        enumName: "spouse_status",
      })
      .notNullable();

    table.date("start_date").nullable();
    table.date("end_date").nullable();

    table.timestamps(true, true);

    table.unique(["person_a_id", "person_b_id"]);
    table.index("person_b_id");
  });

  await knex.raw(
    'alter table "relationships_spouse" add constraint "spouse_not_self" check ("person_a_id" != "person_b_id")'
  );
  await knex.raw(
    'alter table "relationships_spouse" add constraint "spouse_ordered_pair" check ("person_a_id" < "person_b_id")'
  );
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("relationships_spouse");
  await knex.raw('drop type if exists "spouse_status"');
};
