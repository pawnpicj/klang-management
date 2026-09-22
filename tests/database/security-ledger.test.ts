import { randomUUID } from "node:crypto";
import pg, { type Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startFixtureDatabase } from "./fixture-db.mjs";

let database: Awaited<ReturnType<typeof startFixtureDatabase>>;
let admin: Client;
let alice: string,
  bob: string,
  member: string,
  depositor: string,
  approver: string;
let clanA: string,
  clanB: string,
  mainA: string,
  mainB: string,
  secondA: string,
  assetA: string,
  assetB: string;

async function asUser<T>(
  user: string | null,
  operation: (client: Client) => Promise<T>,
  role = "authenticated",
): Promise<T> {
  const client = new pg.Client({ connectionString: database.connectionString });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("set local role " + role);
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user ?? "",
    ]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
async function sql(
  user: string | null,
  query: string,
  values: unknown[] = [],
  role = "authenticated",
) {
  return asUser(user, (client) => client.query(query, values), role);
}
async function newUser() {
  const id = randomUUID();
  const username = "u" + id.replaceAll("-", "").slice(0, 20);
  await admin.query(
    "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,jsonb_build_object('username',$3::text,'display_name','Test User'))",
    [id, id + "@example.test", username],
  );
  return id;
}
async function addMember(clan: string, user: string, role: string) {
  await admin.query(
    `insert into public.clan_members(clan_id,user_id,role_id,character_name,status,joined_at)
    select $1,$2,id,'Character','ACTIVE',now() from public.clan_roles where clan_id=$1 and name=$3`,
    [clan, user, role],
  );
}
async function draft(
  user: string,
  type: string,
  lines: { quantity: string; from?: string; to?: string; asset?: string }[],
  clan = clanA,
  request = randomUUID(),
) {
  return asUser(user, async (c) => {
    const result = await c.query(
      `insert into public.transactions(clan_id,transaction_type,client_request_id,created_by)
      values($1,$2,$3,$4) returning id`,
      [clan, type, request, user],
    );
    const id = result.rows[0].id as string;
    for (const line of lines) {
      await c.query(
        `insert into public.transaction_items(clan_id,transaction_id,asset_id,quantity,from_warehouse_id,to_warehouse_id)
        values($1,$2,$3,$4,$5,$6)`,
        [
          clan,
          id,
          line.asset ?? assetA,
          line.quantity,
          line.from ?? null,
          line.to ?? null,
        ],
      );
    }
    return id;
  });
}
const post = (user: string, id: string) =>
  sql(user, "select public.post_transaction($1)", [id]);
async function deposit(quantity = "100") {
  const id = await draft(alice, "DEPOSIT", [{ quantity, to: mainA }]);
  await post(alice, id);
  return id;
}
async function balance(warehouse: string) {
  return (
    (
      await sql(
        alice,
        "select balance::text from public.warehouse_asset_balances where clan_id=$1 and warehouse_id=$2 and asset_id=$3",
        [clanA, warehouse, assetA],
      )
    ).rows[0]?.balance ?? "0"
  );
}

beforeAll(async () => {
  database = await startFixtureDatabase();
  admin = new pg.Client({ connectionString: database.connectionString });
  await admin.connect();
}, 60000);
afterAll(async () => {
  if (admin) await admin.end();
  if (database) await database.stop();
});
beforeEach(async () => {
  alice = await newUser();
  bob = await newUser();
  member = await newUser();
  depositor = await newUser();
  approver = await newUser();
  clanA = (
    await sql(
      alice,
      "select public.create_clan('Clan A',$1,'CLAN','Alice') as id",
      ["a-" + randomUUID()],
    )
  ).rows[0].id;
  clanB = (
    await sql(
      bob,
      "select public.create_clan('Clan B',$1,'GANG','Bob') as id",
      ["b-" + randomUUID()],
    )
  ).rows[0].id;
  await addMember(clanA, member, "Member");
  await addMember(clanA, depositor, "Depositor");
  await addMember(clanA, approver, "Approver");
  await addMember(clanB, alice, "Member");
  mainA = (
    await admin.query(
      "select id from public.warehouses where clan_id=$1 and is_default",
      [clanA],
    )
  ).rows[0].id;
  mainB = (
    await admin.query(
      "select id from public.warehouses where clan_id=$1 and is_default",
      [clanB],
    )
  ).rows[0].id;
  secondA = (
    await sql(
      alice,
      "insert into public.warehouses(clan_id,name,created_by) values($1,'Reserve',$2) returning id",
      [clanA, alice],
    )
  ).rows[0].id;
  assetA = (
    await sql(
      alice,
      "insert into public.assets(clan_id,code,name,asset_type,unit,decimal_places,created_by) values($1,'GOLD','Gold','CURRENCY','coin',2,$2) returning id",
      [clanA, alice],
    )
  ).rows[0].id;
  assetB = (
    await sql(
      bob,
      "insert into public.assets(clan_id,code,name,asset_type,unit,created_by) values($1,'GOLD','Gold','CURRENCY','coin',$2) returning id",
      [clanB, bob],
    )
  ).rows[0].id;
});

describe("schema, migrations and clan creation", () => {
  it("creates six roles, makes the creator Manager, and creates one active default atomically", async () => {
    expect(
      (
        await sql(alice, "select * from public.clan_roles where clan_id=$1", [
          clanA,
        ])
      ).rowCount,
    ).toBe(6);
    expect(
      (
        await sql(
          alice,
          "select * from public.warehouses where clan_id=$1 and is_default and is_active",
          [clanA],
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await sql(
          alice,
          `select r.name::text as role
           from public.clan_members m
           join public.clan_roles r on r.id=m.role_id and r.clan_id=m.clan_id
           where m.clan_id=$1 and m.user_id=$2`,
          [clanA, alice],
        )
      ).rows[0].role,
    ).toBe("Manager");
    expect(
      (
        await sql(
          alice,
          "select public.has_clan_permission($1,'clan.manage') as yes",
          [clanA],
        )
      ).rows[0].yes,
    ).toBe(true);
    expect(
      (await sql(alice, "select * from public.permissions")).rowCount,
    ).toBe(18);
    expect(
      (
        await sql(alice, "select * from public.audit_logs where clan_id=$1", [
          clanA,
        ])
      ).rowCount,
    ).toBeGreaterThan(5);
  });
  it("rolls back the whole clan when validation fails", async () => {
    const slug = "bad-" + randomUUID();
    await expect(
      sql(alice, "select public.create_clan('Bad',$1,'CLAN','')", [slug]),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (await admin.query("select * from public.clans where slug=$1", [slug]))
        .rowCount,
    ).toBe(0);
  });
  it("rejects duplicate usernames and slugs case-insensitively", async () => {
    const username = (
      await admin.query(
        "select username::text from public.profiles where id=$1",
        [alice],
      )
    ).rows[0].username;
    await expect(
      admin.query("update public.profiles set username=$1 where id=$2", [
        username.toUpperCase(),
        bob,
      ]),
    ).rejects.toMatchObject({ code: "23505" });
    const slug = (
      await admin.query("select slug::text from public.clans where id=$1", [
        clanA,
      ])
    ).rows[0].slug;
    await expect(
      sql(bob, "select public.create_clan('Duplicate',$1,'CLAN','Bob')", [
        slug,
      ]),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("enforces exactly one default and retains the last Manager", async () => {
    await expect(
      admin.query("update public.warehouses set is_default=true where id=$1", [
        secondA,
      ]),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      admin.query("update public.warehouses set is_default=false where id=$1", [
        mainA,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      sql(
        alice,
        "update public.clan_members set status='REMOVED' where clan_id=$1 and user_id=$2",
        [clanA, alice],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("rejects cross-clan role assignments and invite roles", async () => {
    const role = (
      await admin.query(
        "select id from public.clan_roles where clan_id=$1 and name='Member'",
        [clanB],
      )
    ).rows[0].id;
    await expect(
      sql(
        alice,
        "update public.clan_members set role_id=$1 where clan_id=$2 and user_id=$3",
        [role, clanA, member],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      admin.query(
        "insert into public.clan_invites(clan_id,default_role_id,created_by) values($1,$2,$3)",
        [clanA, role, alice],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("prevents deleting an assigned custom role and changing system-role permissions", async () => {
    const role = (
      await sql(
        alice,
        "insert into public.clan_roles(clan_id,name) values($1,'Custom') returning id",
        [clanA],
      )
    ).rows[0].id;
    await sql(
      alice,
      "update public.clan_members set role_id=$1 where clan_id=$2 and user_id=$3",
      [role, clanA, member],
    );
    await expect(
      sql(alice, "delete from public.clan_roles where id=$1", [role]),
    ).rejects.toMatchObject({ code: "23503" });
    const system = (
      await admin.query(
        "select id from public.clan_roles where clan_id=$1 and name='Member'",
        [clanA],
      )
    ).rows[0].id;
    await expect(
      sql(
        alice,
        "insert into public.role_permissions(clan_id,role_id,permission_code) values($1,$2,'transaction.deposit')",
        [clanA, system],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("lets managers add audited roster members without accounts", async () => {
    const offlineId = (
      await sql(
        alice,
        "select public.add_clan_member($1,'Offline Player') as id",
        [clanA],
      )
    ).rows[0].id;
    const offline = (
      await admin.query(
        `select m.user_id,m.character_name,m.status,r.name::text as role
         from public.clan_members m
         join public.clan_roles r on r.clan_id=m.clan_id and r.id=m.role_id
         where m.id=$1`,
        [offlineId],
      )
    ).rows[0];
    expect(offline).toEqual({
      user_id: null,
      character_name: "Offline Player",
      status: "ACTIVE",
      role: "Member",
    });
    expect(
      (
        await admin.query(
          "select * from public.audit_logs where clan_id=$1 and entity_type='clan_members' and entity_id=$2 and user_id=$3",
          [clanA, offlineId, alice],
        )
      ).rowCount,
    ).toBe(1);

    await expect(
      sql(alice, "select public.add_clan_member($1,'offline player')", [clanA]),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      sql(member, "select public.add_clan_member($1,'No Permission')", [clanA]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(alice, "select public.add_clan_member($1,'Other Clan')", [clanB]),
    ).rejects.toMatchObject({ code: "42501" });

    await sql(
      alice,
      "select public.update_clan_member_name($1,$2,'Renamed Player')",
      [clanA, offlineId],
    );
    expect(
      (
        await sql(
          alice,
          "select character_name from public.clan_members where id=$1",
          [offlineId],
        )
      ).rows[0].character_name,
    ).toBe("Renamed Player");
    await sql(alice, "select public.remove_clan_member($1,$2)", [
      clanA,
      offlineId,
    ]);
    expect(
      (
        await admin.query(
          "select status from public.clan_members where id=$1",
          [offlineId],
        )
      ).rows[0].status,
    ).toBe("REMOVED");
  });
  it("lets managers change roles while retaining an active Manager", async () => {
    const roles = (
      await admin.query(
        "select id,clan_id,name::text as name from public.clan_roles where clan_id=$1 or clan_id=$2",
        [clanA, clanB],
      )
    ).rows;
    const roleId = (clan: string, name: string) =>
      roles.find((role) => role.clan_id === clan && role.name === name)
        ?.id as string;
    const roleInClan = async (user: string) =>
      (
        await admin.query(
          `select r.name::text as role
           from public.clan_members m
           join public.clan_roles r on r.id=m.role_id and r.clan_id=m.clan_id
           where m.clan_id=$1 and m.user_id=$2 and m.status='ACTIVE'`,
          [clanA, user],
        )
      ).rows[0].role;
    const memberId = (
      await admin.query(
        "select id from public.clan_members where clan_id=$1 and user_id=$2",
        [clanA, member],
      )
    ).rows[0].id;
    const aliceId = (
      await admin.query(
        "select id from public.clan_members where clan_id=$1 and user_id=$2",
        [clanA, alice],
      )
    ).rows[0].id;
    const clanARoles = Object.fromEntries(
      (
        await admin.query(
          "select name::text,id from public.clan_roles where clan_id=$1",
          [clanA],
        )
      ).rows.map((role) => [role.name, role.id]),
    );

    await sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
      clanA,
      memberId,
      clanARoles.Treasurer,
    ]);
    expect(await roleInClan(member)).toBe("Treasurer");

    await expect(
      sql(member, "select public.update_clan_member_role($1,$2,$3)", [
        clanA,
        aliceId,
        clanARoles.Member,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
        clanA,
        memberId,
        roleId(clanB, "Manager"),
      ]),
    ).rejects.toMatchObject({ code: "P0002" });
    await expect(
      sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
        clanA,
        aliceId,
        clanARoles.Member,
      ]),
    ).rejects.toMatchObject({ code: "23514" });

    await sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
      clanA,
      memberId,
      clanARoles.Manager,
    ]);
    await sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
      clanA,
      aliceId,
      clanARoles.Member,
    ]);
    expect(await roleInClan(alice)).toBe("Member");
  });
  it("manages custom roles and permissions atomically", async () => {
    const customRole = (
      await sql(
        alice,
        "select public.create_custom_role($1,'Collector',array['asset.view','transaction.deposit']) as id",
        [clanA],
      )
    ).rows[0].id;
    expect(
      (
        await admin.query(
          "select permission_code from public.role_permissions where clan_id=$1 and role_id=$2 order by permission_code",
          [clanA, customRole],
        )
      ).rows.map((row) => row.permission_code),
    ).toEqual(["asset.view", "transaction.deposit"]);

    await sql(
      alice,
      "select public.update_custom_role($1,$2,'Senior Collector',array['asset.view','warehouse.view'])",
      [clanA, customRole],
    );
    expect(
      (
        await admin.query(
          "select name::text as name from public.clan_roles where id=$1",
          [customRole],
        )
      ).rows[0].name,
    ).toBe("Senior Collector");
    await expect(
      sql(
        member,
        "select public.create_custom_role($1,'Unauthorized',array[]::text[])",
        [clanA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(
        alice,
        "select public.create_custom_role($1,'Invalid',array['missing.permission'])",
        [clanA],
      ),
    ).rejects.toMatchObject({ code: "22023" });

    const systemRole = (
      await admin.query(
        "select id from public.clan_roles where clan_id=$1 and name='Member'",
        [clanA],
      )
    ).rows[0].id;
    await expect(
      sql(
        alice,
        "select public.update_custom_role($1,$2,'Changed',array[]::text[])",
        [clanA, systemRole],
      ),
    ).rejects.toMatchObject({ code: "P0002" });

    const memberId = (
      await admin.query(
        "select id from public.clan_members where clan_id=$1 and user_id=$2",
        [clanA, member],
      )
    ).rows[0].id;
    await sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
      clanA,
      memberId,
      customRole,
    ]);
    await expect(
      sql(alice, "select public.delete_custom_role($1,$2)", [
        clanA,
        customRole,
      ]),
    ).rejects.toMatchObject({ code: "23503" });
    await sql(alice, "select public.update_clan_member_role($1,$2,$3)", [
      clanA,
      memberId,
      systemRole,
    ]);
    await sql(alice, "select public.delete_custom_role($1,$2)", [
      clanA,
      customRole,
    ]);
    expect(
      (
        await admin.query("select id from public.clan_roles where id=$1", [
          customRole,
        ])
      ).rowCount,
    ).toBe(0);
  });
  it("manages Asset and Warehouse lifecycle through tenant-scoped APIs", async () => {
    const warehouseId = (
      await sql(
        alice,
        "select public.create_warehouse($1,'Guild Vault','Rare items') as id",
        [clanA],
      )
    ).rows[0].id;
    await sql(
      alice,
      "select public.update_warehouse_details($1,$2,'Guild Reserve','Updated')",
      [clanA, warehouseId],
    );
    await sql(alice, "select public.set_default_warehouse($1,$2)", [
      clanA,
      warehouseId,
    ]);
    expect(
      (
        await admin.query(
          "select name::text as name,is_default from public.warehouses where id=$1",
          [warehouseId],
        )
      ).rows[0],
    ).toEqual({ name: "Guild Reserve", is_default: true });
    await expect(
      sql(alice, "select public.deactivate_warehouse($1,$2)", [
        clanA,
        warehouseId,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
    await sql(alice, "select public.set_default_warehouse($1,$2)", [
      clanA,
      mainA,
    ]);
    await sql(alice, "select public.deactivate_warehouse($1,$2)", [
      clanA,
      warehouseId,
    ]);

    const assetId = (
      await sql(
        alice,
        "select public.create_asset($1,'GEM','Gem','ITEM','piece',0,false,null) as id",
        [clanA],
      )
    ).rows[0].id;
    await sql(
      alice,
      "select public.update_asset_details($1,$2,'Rare Gem','https://example.test/gem.png')",
      [clanA, assetId],
    );
    await sql(alice, "select public.deactivate_asset($1,$2)", [clanA, assetId]);
    expect(
      (
        await admin.query(
          "select name::text as name,is_active from public.assets where id=$1",
          [assetId],
        )
      ).rows[0],
    ).toEqual({ name: "Rare Gem", is_active: false });

    await expect(
      sql(member, "select public.create_warehouse($1,'No Access',null)", [
        clanA,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(
        member,
        "select public.create_asset($1,'NOPE','No Access','ITEM','piece',0,false,null)",
        [clanA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("prevents deactivating Assets and Warehouses with balances", async () => {
    await deposit("10");
    await expect(
      sql(alice, "select public.deactivate_asset($1,$2)", [clanA, assetA]),
    ).rejects.toMatchObject({ code: "23514" });

    const transferId = await draft(alice, "TRANSFER", [
      { quantity: "5", from: mainA, to: secondA },
    ]);
    await post(alice, transferId);
    await expect(
      sql(alice, "select public.deactivate_warehouse($1,$2)", [clanA, secondA]),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("lets managers edit and archive their Clan but denies ordinary members", async () => {
    await sql(
      alice,
      "select public.update_clan_details($1,'Renamed Clan','GANG')",
      [clanA],
    );
    expect(
      (
        await sql(alice, "select name,type from public.clans where id=$1", [
          clanA,
        ])
      ).rows[0],
    ).toEqual({ name: "Renamed Clan", type: "GANG" });
    await expect(
      sql(member, "select public.update_clan_details($1,'Hacked','CLAN')", [
        clanA,
      ]),
    ).rejects.toMatchObject({ code: "42501" });

    await sql(alice, "select public.archive_clan($1)", [clanA]);
    expect(
      (
        await admin.query("select status from public.clans where id=$1", [
          clanA,
        ])
      ).rows[0].status,
    ).toBe("ARCHIVED");
    expect(
      (await sql(alice, "select * from public.clans where id=$1", [clanA]))
        .rowCount,
    ).toBe(0);
  });
});

describe("actual PostgreSQL RLS isolation", () => {
  it("supports distinct roles for one account in two clans", async () => {
    const rows = (
      await sql(
        alice,
        "select public.has_clan_permission($1,'transaction.deposit') as a, public.has_clan_permission($2,'transaction.deposit') as b",
        [clanA, clanB],
      )
    ).rows[0];
    expect(rows).toEqual({ a: true, b: false });
    await expect(
      draft(
        alice,
        "DEPOSIT",
        [{ quantity: "1", asset: assetB, to: mainB }],
        clanB,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("denies anonymous table access, helpers and privileged RPCs", async () => {
    await expect(
      sql(null, "select * from public.profiles", [], "anon"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(null, "select public.create_clan('X','x','CLAN','X')", [], "anon"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(
        null,
        "select public.add_clan_member($1,'Anonymous')",
        [clanA],
        "anon",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(null, "select public.is_clan_member($1)", [clanA], "anon"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("hides every tenant table, ledger view, and another user's profile", async () => {
    const hiddenId = await draft(
      bob,
      "DEPOSIT",
      [{ quantity: "20", asset: assetB, to: mainB }],
      clanB,
    );
    await post(bob, hiddenId);
    await admin.query(
      "insert into public.clan_invites(clan_id,default_role_id,created_by) select $1,id,$2 from public.clan_roles where clan_id=$1 and name='Member'",
      [clanB, bob],
    );
    await admin.query(
      "insert into public.attachments(clan_id,transaction_id,storage_path,original_name,mime_type,file_size,uploaded_by) values($1,$2,$3,'proof.png','image/png',100,$4)",
      [clanB, hiddenId, clanB + "/" + hiddenId + "/proof.png", bob],
    );
    for (const table of [
      "clan_roles",
      "role_permissions",
      "clan_members",
      "clan_invites",
      "warehouses",
      "assets",
      "transactions",
      "transaction_items",
      "attachments",
      "audit_logs",
      "warehouse_asset_balances",
    ]) {
      expect(
        (
          await sql(
            member,
            "select * from public." + table + " where clan_id=$1",
            [clanB],
          )
        ).rowCount,
        table,
      ).toBe(0);
    }
    expect(
      (await sql(member, "select * from public.clans where id=$1", [clanB]))
        .rowCount,
    ).toBe(0);
    expect(
      (await sql(member, "select * from public.profiles where id=$1", [bob]))
        .rowCount,
    ).toBe(0);
  });
  it("denies cross-tenant writes and posts without leaking existence", async () => {
    expect(
      (
        await sql(
          bob,
          "update public.warehouses set name='Hacked' where id=$1",
          [mainA],
        )
      ).rowCount,
    ).toBe(0);
    await expect(
      draft(bob, "DEPOSIT", [{ quantity: "1", to: mainA }]),
    ).rejects.toMatchObject({ code: "42501" });
    const id = await draft(alice, "DEPOSIT", [{ quantity: "1", to: mainA }]);
    await expect(post(bob, id)).rejects.toMatchObject({ code: "42501" });
    await expect(post(bob, randomUUID())).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("denies Member deposits, withdrawals, transfers, item edits and posts", async () => {
    for (const type of ["DEPOSIT", "WITHDRAW", "TRANSFER"]) {
      await expect(draft(member, type, [])).rejects.toMatchObject({
        code: "42501",
      });
    }
    const id = await draft(alice, "DEPOSIT", [{ quantity: "1", to: mainA }]);
    expect(
      (
        await sql(
          member,
          "update public.transaction_items set quantity=99 where transaction_id=$1",
          [id],
        )
      ).rowCount,
    ).toBe(0);
    await expect(post(member, id)).rejects.toMatchObject({ code: "42501" });
  });
  it("only gives Depositor deposit permission", async () => {
    const id = await draft(depositor, "DEPOSIT", [
      { quantity: "7", to: mainA },
    ]);
    await post(depositor, id);
    expect(await balance(mainA)).toBe("7.0000");
    await expect(draft(depositor, "WITHDRAW", [])).rejects.toMatchObject({
      code: "42501",
    });
    await expect(draft(depositor, "TRANSFER", [])).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("revokes all tenant access for blocked users, removed members and suspended clans", async () => {
    await admin.query(
      "update public.profiles set status='BLOCKED' where id=$1",
      [depositor],
    );
    expect(
      (await sql(depositor, "select * from public.clans where id=$1", [clanA]))
        .rowCount,
    ).toBe(0);
    await expect(
      sql(depositor, "select public.create_clan('X',$1,'CLAN','X')", [
        "x-" + randomUUID(),
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await admin.query(
      "update public.clan_members set status='REMOVED' where clan_id=$1 and user_id=$2",
      [clanA, member],
    );
    expect(
      (await sql(member, "select public.is_clan_member($1) as yes", [clanA]))
        .rows[0].yes,
    ).toBe(false);
    await admin.query(
      "update public.clans set status='SUSPENDED' where id=$1",
      [clanA],
    );
    expect(
      (await sql(alice, "select public.is_clan_member($1) as yes", [clanA]))
        .rows[0].yes,
    ).toBe(false);
  });
  it("cannot forge lifecycle fields, authors, tenant ids or audit logs", async () => {
    await expect(
      sql(
        alice,
        "insert into public.transactions(clan_id,transaction_type,client_request_id,created_by) values($1,'DEPOSIT',$2,$3)",
        [clanA, randomUUID(), bob],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    const id = await draft(alice, "DEPOSIT", []);
    await expect(
      sql(alice, "update public.transactions set status='POSTED' where id=$1", [
        id,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(alice, "update public.transactions set clan_id=$1 where id=$2", [
        clanB,
        id,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(
        alice,
        "insert into public.audit_logs(action,entity_type) values('FAKE','fake')",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(alice, "delete from public.audit_logs where clan_id=$1", [clanA]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      admin.query(
        "update public.audit_logs set action='FAKE' where clan_id=$1",
        [clanA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("ledger posting and concurrency", () => {
  it("excludes drafts; posts a deposit and retries without double counting", async () => {
    const id = await draft(alice, "DEPOSIT", [
      { quantity: "12.34", to: mainA },
    ]);
    expect(await balance(mainA)).toBe("0");
    await post(alice, id);
    await post(alice, id);
    expect(await balance(mainA)).toBe("12.3400");
    const logs = await sql(
      alice,
      "select * from public.audit_logs where entity_id=$1 and after_data->>'status'='POSTED'",
      [id],
    );
    expect(logs.rowCount).toBe(1);
  });
  it("prevents duplicate requests at the database boundary", async () => {
    const request = randomUUID();
    await draft(alice, "DEPOSIT", [], clanA, request);
    await expect(
      draft(alice, "DEPOSIT", [], clanA, request),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("rejects empty transactions, wrong default, direction and cross-clan references", async () => {
    await expect(
      post(alice, await draft(alice, "DEPOSIT", [])),
    ).rejects.toMatchObject({ code: "23514" });
    const wrongDefault = await draft(alice, "DEPOSIT", [
      { quantity: "1", to: secondA },
    ]);
    await expect(post(alice, wrongDefault)).rejects.toMatchObject({
      code: "23514",
    });
    await expect(
      draft(alice, "DEPOSIT", [{ quantity: "1", from: mainA, to: secondA }]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      draft(alice, "DEPOSIT", [{ quantity: "1", asset: assetB, to: mainA }]),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      draft(alice, "DEPOSIT", [{ quantity: "1", to: mainB }]),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      draft(alice, "TRANSFER", [{ quantity: "1", from: mainA, to: mainA }]),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("validates quantities, precision and active assets", async () => {
    await expect(
      draft(alice, "DEPOSIT", [{ quantity: "0", to: mainA }]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      draft(alice, "DEPOSIT", [{ quantity: "NaN", to: mainA }]),
    ).rejects.toMatchObject({ code: "23514" });
    const id = await draft(alice, "DEPOSIT", [
      { quantity: "1.001", to: mainA },
    ]);
    await expect(post(alice, id)).rejects.toMatchObject({ code: "23514" });
    const inactive = await draft(alice, "DEPOSIT", [
      { quantity: "1", to: mainA },
    ]);
    await admin.query("update public.assets set is_active=false where id=$1", [
      assetA,
    ]);
    await expect(post(alice, inactive)).rejects.toMatchObject({
      code: "23514",
    });
  });
  it("transfers atomically and preserves total assets", async () => {
    await deposit();
    const id = await draft(alice, "TRANSFER", [
      { quantity: "30", from: mainA, to: secondA },
    ]);
    await post(alice, id);
    expect(await balance(mainA)).toBe("70.0000");
    expect(await balance(secondA)).toBe("30.0000");
    expect(
      (
        await sql(
          alice,
          "select sum(balance)::text as total from public.warehouse_asset_balances where clan_id=$1",
          [clanA],
        )
      ).rows[0].total,
    ).toBe("100.0000");
  });
  it("aggregates repeated asset lines before checking balance and rolls back failures", async () => {
    await deposit("10");
    const id = await draft(alice, "WITHDRAW", [
      { quantity: "6", from: mainA },
      { quantity: "6", from: mainA },
    ]);
    await expect(post(alice, id)).rejects.toMatchObject({ code: "23514" });
    expect(await balance(mainA)).toBe("10.0000");
    expect(
      (
        await sql(alice, "select status from public.transactions where id=$1", [
          id,
        ])
      ).rows[0].status,
    ).toBe("DRAFT");
  });
  it("rejects insufficient transfer without increasing the destination", async () => {
    await deposit("5");
    const id = await draft(alice, "TRANSFER", [
      { quantity: "6", from: mainA, to: secondA },
    ]);
    await expect(post(alice, id)).rejects.toMatchObject({ code: "23514" });
    expect(await balance(mainA)).toBe("5.0000");
    expect(await balance(secondA)).toBe("0");
  });
  it("allows negative balances only on explicitly configured assets", async () => {
    await admin.query(
      "update public.assets set allow_negative=true where id=$1",
      [assetA],
    );
    await post(
      alice,
      await draft(alice, "WITHDRAW", [{ quantity: "5", from: mainA }]),
    );
    expect(await balance(mainA)).toBe("-5.0000");
  });
  it("keeps posted headers/items immutable and warehouses with history undeletable", async () => {
    const id = await deposit();
    expect(
      (
        await sql(
          alice,
          "update public.transactions set note='Edited' where id=$1",
          [id],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await sql(
          alice,
          "delete from public.transaction_items where transaction_id=$1",
          [id],
        )
      ).rowCount,
    ).toBe(0);
    await expect(
      admin.query(
        "update public.transaction_items set quantity=999 where transaction_id=$1",
        [id],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      admin.query("delete from public.transactions where id=$1", [id]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql(alice, "delete from public.warehouses where id=$1", [mainA]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      admin.query("delete from public.warehouses where id=$1", [mainA]),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("serializes concurrent withdrawals so only one can spend available funds", async () => {
    await deposit("10");
    const a = await draft(alice, "WITHDRAW", [{ quantity: "7", from: mainA }]);
    const b = await draft(alice, "WITHDRAW", [{ quantity: "7", from: mainA }]);
    const results = await Promise.allSettled([post(alice, a), post(alice, b)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await balance(mainA)).toBe("3.0000");
  });
  it("concurrent retries of the same post have one ledger effect", async () => {
    const id = await draft(alice, "DEPOSIT", [{ quantity: "10", to: mainA }]);
    await Promise.all([post(alice, id), post(alice, id)]);
    expect(await balance(mainA)).toBe("10.0000");
  });
  it("requires Approver permission for pending rows and records approval", async () => {
    const id = await draft(depositor, "DEPOSIT", [
      { quantity: "10", to: mainA },
    ]);
    // Fixture preparation only. No pending-submission API is exposed in Phase 2.
    await admin.query(
      "update public.transactions set status='PENDING' where id=$1",
      [id],
    );
    await expect(post(depositor, id)).rejects.toMatchObject({ code: "42501" });
    await post(approver, id);
    const row = (
      await sql(
        approver,
        "select status,approved_by,approved_at from public.transactions where id=$1",
        [id],
      )
    ).rows[0];
    expect(row.status).toBe("POSTED");
    expect(row.approved_by).toBe(approver);
    expect(row.approved_at).not.toBeNull();
  });
});

describe("additional security boundaries", () => {
  it("enables RLS on every public base table and uses an invoker balance view", async () => {
    const tables = await admin.query(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(tables.rows).toEqual([]);
    const view = (
      await admin.query(
        "select reloptions from pg_class where oid='public.warehouse_asset_balances'::regclass",
      )
    ).rows[0];
    expect(view.reloptions).toContain("security_invoker=true");
    await expect(
      sql(alice, "select * from private.default_role_permissions"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("allows custom permissions without granting access to another clan", async () => {
    const role = (
      await sql(
        alice,
        "insert into public.clan_roles(clan_id,name) values($1,'Collector') returning id",
        [clanA],
      )
    ).rows[0].id;
    for (const permission of [
      "clan.view",
      "transaction.view",
      "transaction.deposit",
      "asset.view",
      "warehouse.view",
    ]) {
      await sql(
        alice,
        "insert into public.role_permissions(clan_id,role_id,permission_code) values($1,$2,$3)",
        [clanA, role, permission],
      );
    }
    await sql(
      alice,
      "update public.clan_members set role_id=$1 where clan_id=$2 and user_id=$3",
      [role, clanA, member],
    );
    await post(
      member,
      await draft(member, "DEPOSIT", [{ quantity: "2", to: mainA }]),
    );
    expect(await balance(mainA)).toBe("2.0000");
    await expect(draft(member, "WITHDRAW", [])).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      sql(
        alice,
        "insert into public.role_permissions(clan_id,role_id,permission_code) values($1,$2,'audit.view')",
        [clanB, role],
      ),
    ).rejects.toThrow();
  });
  it("rejects inactive destinations and supports positive/negative adjustments", async () => {
    await deposit("10");
    await admin.query(
      "update public.warehouses set is_active=false where id=$1",
      [secondA],
    );
    await expect(
      post(
        alice,
        await draft(alice, "TRANSFER", [
          { quantity: "1", from: mainA, to: secondA },
        ]),
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await post(
      alice,
      await draft(alice, "ADJUSTMENT", [{ quantity: "2", to: mainA }]),
    );
    await post(
      alice,
      await draft(alice, "ADJUSTMENT", [{ quantity: "3", from: mainA }]),
    );
    expect(await balance(mainA)).toBe("9.0000");
  });
  it("allows an approver to safely retry their already-posted approval", async () => {
    const id = await draft(depositor, "DEPOSIT", [
      { quantity: "3", to: mainA },
    ]);
    await admin.query(
      "update public.transactions set status='PENDING' where id=$1",
      [id],
    );
    await post(approver, id);
    await post(approver, id);
    expect(await balance(mainA)).toBe("3.0000");
  });
  it("waits for an in-flight draft item update and posts the committed quantity", async () => {
    const id = await draft(alice, "DEPOSIT", [{ quantity: "10", to: mainA }]);
    const editor = new pg.Client({
      connectionString: database.connectionString,
    });
    await editor.connect();
    try {
      await editor.query("begin");
      await editor.query("set local role authenticated");
      await editor.query("select set_config('request.jwt.claim.sub',$1,true)", [
        alice,
      ]);
      await editor.query(
        "update public.transaction_items set quantity=20 where transaction_id=$1",
        [id],
      );
      const posting = post(alice, id);
      await editor.query("commit");
      await posting;
      expect(await balance(mainA)).toBe("20.0000");
    } finally {
      await editor.query("rollback");
      await editor.end();
    }
  });
});

describe("Phase 3 authentication database boundaries", () => {
  it("keeps profile avatars private and scoped to the authenticated user", async () => {
    const bucket = (
      await sql(
        null,
        "select public, file_size_limit, allowed_mime_types from storage.buckets where id='avatars'",
        [],
        "postgres",
      )
    ).rows[0];
    expect(bucket.public).toBe(false);
    expect(Number(bucket.file_size_limit)).toBe(5 * 1024 * 1024);
    expect(bucket.allowed_mime_types).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    await sql(
      member,
      "insert into storage.objects(bucket_id,name) values('avatars',$1)",
      [`${member}/avatar`],
      "authenticated",
    );
    expect(
      (
        await sql(
          member,
          "select count(*)::int as count from storage.objects where bucket_id='avatars'",
          [],
          "authenticated",
        )
      ).rows[0].count,
    ).toBe(1);
    expect(
      (
        await sql(
          bob,
          "select count(*)::int as count from storage.objects where bucket_id='avatars'",
          [],
          "authenticated",
        )
      ).rows[0].count,
    ).toBe(0);
    await expect(
      sql(
        member,
        "insert into storage.objects(bucket_id,name) values('avatars',$1)",
        [`${bob}/avatar`],
        "authenticated",
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("removes an unused profile when its auth user is deleted", async () => {
    const userId = randomUUID();
    await sql(
      null,
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, $2, $3::jsonb)`,
      [
        userId,
        `cleanup-${userId}@example.com`,
        JSON.stringify({
          username: `cleanup_${userId.replaceAll("-", "").slice(0, 12)}`,
        }),
      ],
      "postgres",
    );

    await sql(null, "delete from auth.users where id=$1", [userId], "postgres");

    expect(
      (
        await sql(
          null,
          "select count(*)::int as count from public.profiles where id=$1",
          [userId],
          "postgres",
        )
      ).rows[0].count,
    ).toBe(0);
  });

  it("retains an immutable audit actor id after deleting an unused profile", async () => {
    const userId = randomUUID();
    await sql(
      null,
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, $2, $3::jsonb)`,
      [
        userId,
        `audited-${userId}@example.com`,
        JSON.stringify({
          username: `audited_${userId.replaceAll("-", "").slice(0, 12)}`,
        }),
      ],
      "postgres",
    );
    await sql(
      userId,
      "update public.profiles set display_name='Audited update' where id=$1",
      [userId],
      "authenticated",
    );

    await sql(null, "delete from auth.users where id=$1", [userId], "postgres");

    expect(
      (
        await sql(
          null,
          "select count(*)::int as count from public.audit_logs where user_id=$1",
          [userId],
          "postgres",
        )
      ).rows[0].count,
    ).toBeGreaterThan(0);
  });

  it("creates a profile from auth metadata", async () => {
    const id = randomUUID();
    const username = `signup_${id.replaceAll("-", "").slice(0, 12)}`;
    await admin.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [id, `${id}@example.test`, { username, display_name: "New Player" }],
    );
    expect(
      (
        await admin.query(
          "select username::text,display_name,status from public.profiles where id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({
      username,
      display_name: "New Player",
      status: "ACTIVE",
    });
  });

  it("rolls back auth registration for invalid or duplicate usernames", async () => {
    const invalidId = randomUUID();
    await expect(
      admin.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [invalidId, `${invalidId}@example.test`, { username: "!" }],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (await admin.query("select 1 from auth.users where id=$1", [invalidId]))
        .rowCount,
    ).toBe(0);

    const username = (
      await admin.query(
        "select username::text from public.profiles where id=$1",
        [alice],
      )
    ).rows[0].username;
    await expect(
      admin.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [
          randomUUID(),
          `${randomUUID()}@example.test`,
          { username: username.toUpperCase() },
        ],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("lets only service_role resolve active usernames to email", async () => {
    const username = (
      await admin.query(
        "select username::text from public.profiles where id=$1",
        [member],
      )
    ).rows[0].username;
    expect(
      (
        await sql(
          null,
          "select public.resolve_login_email($1) as email",
          [username.toUpperCase()],
          "service_role",
        )
      ).rows[0].email,
    ).toBe(`${member}@example.test`);
    await expect(
      sql(alice, "select public.resolve_login_email($1)", [username]),
    ).rejects.toMatchObject({ code: "42501" });
    await admin.query(
      "update public.profiles set status='BLOCKED' where id=$1",
      [member],
    );
    expect(
      (
        await sql(
          null,
          "select public.resolve_login_email($1) as email",
          [username],
          "service_role",
        )
      ).rows[0].email,
    ).toBeNull();
  });

  it("shares login throttling in PostgreSQL and resets it", async () => {
    const key = "a".repeat(64);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        (
          await sql(
            null,
            "select public.consume_login_rate_limit($1) as allowed",
            [key],
            "service_role",
          )
        ).rows[0].allowed,
      ).toBe(true);
    }
    expect(
      (
        await sql(
          null,
          "select public.consume_login_rate_limit($1) as allowed",
          [key],
          "service_role",
        )
      ).rows[0].allowed,
    ).toBe(false);
    await sql(
      null,
      "select public.reset_login_rate_limit($1)",
      [key],
      "service_role",
    );
    expect(
      (
        await sql(
          null,
          "select public.consume_login_rate_limit($1) as allowed",
          [key],
          "service_role",
        )
      ).rows[0].allowed,
    ).toBe(true);
  });

  it("enforces the login threshold for concurrent attempts", async () => {
    const key = "c".repeat(64);
    const attempts = await Promise.all(
      Array.from(
        { length: 10 },
        async () =>
          (
            await sql(
              null,
              "select public.consume_login_rate_limit($1) as allowed",
              [key],
              "service_role",
            )
          ).rows[0].allowed,
      ),
    );

    expect(attempts.filter(Boolean)).toHaveLength(5);
    expect(attempts.filter((allowed) => !allowed)).toHaveLength(5);
  });

  it("rejects malformed rate-limit keys and non-service callers", async () => {
    await expect(
      sql(
        null,
        "select public.consume_login_rate_limit('bad')",
        [],
        "service_role",
      ),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      sql(
        null,
        "select public.consume_login_rate_limit($1)",
        ["b".repeat(64)],
        "anon",
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("allows self profile edits only on granted columns", async () => {
    expect(
      (
        await sql(
          member,
          "update public.profiles set display_name='Updated' where id=$1",
          [member],
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await sql(
          member,
          "update public.profiles set display_name='Hacked' where id=$1",
          [bob],
        )
      ).rowCount,
    ).toBe(0);
    await expect(
      sql(member, "update public.profiles set username='renamed' where id=$1", [
        member,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
