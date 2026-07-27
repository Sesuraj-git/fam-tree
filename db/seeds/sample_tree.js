const bcrypt = require("bcrypt");
const { v4: uuid } = require("uuid");

/**
 * Sample tree, 3 generations:
 *
 *   grandpa === grandma        grandpa === ex-wife (divorced, no kids together)
 *        |                              (illustrates multiple spouses over time)
 *        +----------------+
 *        |                |
 *      dad === mom       aunt (placeholder sibling, no account)
 *        |
 *        +--------+
 *        |        |
 *      kid      cousin (placeholder, no account)
 *
 * Accounts (password for all: "password123"):
 *   grandpa@example.com, dad@example.com, kid@example.com
 * Everyone else (grandma, ex-wife, mom, aunt, cousin) is a placeholder
 * person with no `users` row, added by whichever account-holder relative
 * created them — mirrors how the app actually works.
 *
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  await knex("account_claim_tokens").del();
  await knex("relationships_spouse").del();
  await knex("relationships_parent_child").del();
  await knex("persons").del();
  await knex("users").del();

  const passwordHash = await bcrypt.hash("password123", 10);

  const userGrandpa = uuid();
  const userDad = uuid();
  const userKid = uuid();

  await knex("users").insert([
    { id: userGrandpa, email: "grandpa@example.com", password_hash: passwordHash },
    { id: userDad, email: "dad@example.com", password_hash: passwordHash },
    { id: userKid, email: "kid@example.com", password_hash: passwordHash },
  ]);

  const personGrandpa = uuid();
  const personGrandma = uuid();
  const personExWife = uuid();
  const personDad = uuid();
  const personMom = uuid();
  const personAunt = uuid();
  const personKid = uuid();
  const personCousin = uuid();

  await knex("persons").insert([
    {
      id: personGrandpa,
      user_id: userGrandpa,
      first_name: "George",
      last_name: "Smith",
      gender: "male",
      date_of_birth: "1950-03-12",
      is_alive: true,
      created_by: userGrandpa,
    },
    {
      id: personGrandma,
      user_id: null,
      first_name: "Grace",
      last_name: "Smith",
      gender: "female",
      date_of_birth: "1952-07-04",
      is_alive: true,
      created_by: userGrandpa,
    },
    {
      id: personExWife,
      user_id: null,
      first_name: "Eleanor",
      last_name: "Whitfield",
      gender: "female",
      date_of_birth: "1949-11-30",
      is_alive: true,
      notes: "George's first wife; divorced before he married Grace.",
      created_by: userGrandpa,
    },
    {
      id: personDad,
      user_id: userDad,
      first_name: "David",
      last_name: "Smith",
      gender: "male",
      date_of_birth: "1978-05-20",
      is_alive: true,
      created_by: userGrandpa,
    },
    {
      id: personMom,
      user_id: null,
      first_name: "Maria",
      last_name: "Smith",
      gender: "female",
      date_of_birth: "1980-09-02",
      is_alive: true,
      created_by: userDad,
    },
    {
      id: personAunt,
      user_id: null,
      first_name: "Alice",
      last_name: "Smith",
      gender: "female",
      date_of_birth: "1981-01-15",
      is_alive: true,
      created_by: userGrandpa,
    },
    {
      id: personKid,
      user_id: userKid,
      first_name: "Kyle",
      last_name: "Smith",
      gender: "male",
      date_of_birth: "2008-02-18",
      is_alive: true,
      created_by: userDad,
    },
    {
      id: personCousin,
      user_id: null,
      first_name: "Chloe",
      last_name: "Smith",
      gender: "female",
      date_of_birth: "2010-06-25",
      is_alive: true,
      created_by: userDad,
    },
  ]);

  await knex("relationships_parent_child").insert([
    { parent_id: personGrandpa, child_id: personDad, relationship_type: "biological" },
    { parent_id: personGrandma, child_id: personDad, relationship_type: "biological" },
    { parent_id: personGrandpa, child_id: personAunt, relationship_type: "biological" },
    { parent_id: personGrandma, child_id: personAunt, relationship_type: "biological" },
    { parent_id: personDad, child_id: personKid, relationship_type: "biological" },
    { parent_id: personMom, child_id: personKid, relationship_type: "biological" },
    { parent_id: personDad, child_id: personCousin, relationship_type: "biological" },
    { parent_id: personMom, child_id: personCousin, relationship_type: "biological" },
  ]);

  // person_a_id < person_b_id convention — sort each pair before insert.
  const spousePair = (idA, idB, rest) => {
    const [person_a_id, person_b_id] = [idA, idB].sort();
    return { person_a_id, person_b_id, ...rest };
  };

  await knex("relationships_spouse").insert([
    spousePair(personGrandpa, personExWife, {
      status: "divorced",
      start_date: "1970-06-01",
      end_date: "1976-04-15",
    }),
    spousePair(personGrandpa, personGrandma, {
      status: "married",
      start_date: "1977-08-20",
    }),
    spousePair(personDad, personMom, {
      status: "married",
      start_date: "2005-10-09",
    }),
  ]);
};
