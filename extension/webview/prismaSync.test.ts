import { describe, expect, it } from "vitest";
import { parsePrismaDocument, updatePrismaDocument } from "./prismaSync";

const CONTRACT = `// This comment must survive visual edits.
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id    String @id @default(uuid()) @db.Uuid
  email String @unique
  role  Role   @default(USER)
  posts Post[]

  @@map("users")
}

model Post {
  id       Int    @id @default(autoincrement())
  authorId String @db.Uuid
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
}
`;

describe("Prisma two-way synchronization", () => {
  it("parses scalar fields and explicit Prisma relations into canvas state", () => {
    const parsed = parsePrismaDocument(CONTRACT);
    const user = parsed.tables.find((table) => table.name === "User");
    const post = parsed.tables.find((table) => table.name === "Post");

    expect(user?.columns.map((column) => column.name)).toEqual(["id", "email", "role"]);
    expect(user?.columns.find((column) => column.name === "id")?.type).toBe("uuid");
    expect(user?.columns.find((column) => column.name === "role")?.type).toBe("varchar");
    expect(post?.columns.find((column) => column.name === "authorId")?.isForeignKey).toBe(true);
    expect(parsed.relationships).toHaveLength(1);
    expect(parsed.relationships[0].cardinality).toBe("1:N");
  });

  it("preserves comments, enums, model attributes, and relation options on canvas edits", () => {
    const parsed = parsePrismaDocument(CONTRACT);
    const user = parsed.tables.find((table) => table.name === "User")!;
    user.columns.push({
      id: "new_display_name",
      name: "displayName",
      type: "varchar",
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false,
    });

    const updated = updatePrismaDocument(
      CONTRACT,
      parsed.tables,
      parsed.relationships,
      parsed.metadata,
    );

    expect(updated.text).toContain("// This comment must survive visual edits.");
    expect(updated.text).toContain("enum Role");
    expect(updated.text).toContain('@@map("users")');
    expect(updated.text).toContain("onDelete: Cascade");
    expect(updated.text).toMatch(/displayName\s+String\?/);
    expect(() => parsePrismaDocument(updated.text)).not.toThrow();
  });

  it("removes a model from Prisma when it is removed from the canvas", () => {
    const parsed = parsePrismaDocument(CONTRACT);
    const usersOnly = parsed.tables.filter((table) => table.name === "User");
    const updated = updatePrismaDocument(CONTRACT, usersOnly, [], parsed.metadata);

    expect(updated.text).toContain("model User");
    expect(updated.text).not.toContain("model Post");
    expect(updated.text).not.toContain("posts Post[]");
  });

  it("rejects invalid Prisma identifiers rather than corrupting the source file", () => {
    const parsed = parsePrismaDocument(CONTRACT);
    parsed.tables[0].name = "invalid model name";

    expect(() =>
      updatePrismaDocument(CONTRACT, parsed.tables, parsed.relationships, parsed.metadata),
    ).toThrow("Invalid Prisma model name");
  });
});
