/**
 * Cycle prevention (a person can't be an ancestor of their own ancestor) and
 * the "max 2 biological parents" rule aren't expressible as simple SQL
 * constraints, so they're enforced in the application layer (see
 * src/lib/relationships.ts) before insert. The DB only guards the cheap,
 * unconditional invariants: no self-parenting, no duplicate links.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("relationships_parent_child", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("parent_id")
      .notNullable()
      .references("id")
      .inTable("persons")
      .onDelete("CASCADE");

    table
      .uuid("child_id")
      .notNullable()
      .references("id")
      .inTable("persons")
      .onDelete("CASCADE");

    table
      .enu("relationship_type", ["biological", "adopted", "step"], {
        useNative: true,
        enumName: "parent_child_relationship_type",
      })
      .notNullable()
      .defaultTo("biological");

    table.timestamps(true, true);

    table.unique(["parent_id", "child_id"]);
    table.index("child_id");
  });

  await knex.raw(
    'alter table "relationships_parent_child" add constraint "parent_child_not_self" check ("parent_id" != "child_id")'
  );
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("relationships_parent_child");
  await knex.raw('drop type if exists "parent_child_relationship_type"');
};
