import {
  getSchema,
  printSchema,
  type Attribute,
  type AttributeArgument,
  type Field,
  type Func,
  type KeyValue,
  type Model,
  type RelationArray,
  type Schema,
  type Value,
} from "@mrleebo/prisma-ast";
import type { Column, ColumnType, Relationship, TableNode } from "@/types/schema";

const DEFAULT_SCHEMA = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

const PRISMA_SCALARS = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

export interface PrismaMetadata {
  tableOrigins: Record<string, string>;
  columnOrigins: Record<
    string,
    { modelName: string; fieldName: string; prismaType: string; mappedType: ColumnType }
  >;
  relationshipOrigins: Record<
    string,
    {
      sourceModelName: string;
      targetModelName: string;
      relationFieldName: string;
      backFieldName?: string;
    }
  >;
}

export interface ParsedPrismaDocument {
  tables: TableNode[];
  relationships: Relationship[];
  metadata: PrismaMetadata;
}

export interface UpdatedPrismaDocument {
  text: string;
  metadata: PrismaMetadata;
}

export function parsePrismaDocument(
  source: string,
  previousTables: TableNode[] = [],
): ParsedPrismaDocument {
  const schema = getSchema(source);
  const models = schema.list.filter((block): block is Model => block.type === "model");
  const modelNames = new Set(models.map((model) => model.name));
  const previousByName = new Map(previousTables.map((table) => [table.name, table]));
  const tableOrigins: PrismaMetadata["tableOrigins"] = {};
  const columnOrigins: PrismaMetadata["columnOrigins"] = {};

  const tables = models.map((model, index) => {
    const previous = previousByName.get(model.name);
    const tableId = previous?.id ?? stableId("table", model.name);
    const previousColumns = new Map(previous?.columns.map((column) => [column.name, column]));

    const columns = model.properties
      .filter(
        (property): property is Field =>
          property.type === "field" &&
          typeof property.fieldType === "string" &&
          !property.array &&
          !modelNames.has(property.fieldType),
      )
      .map((field) => {
        const mappedType = mapPrismaType(field);
        const previousColumn = previousColumns.get(field.name);
        const columnId = previousColumn?.id ?? stableId("column", `${model.name}.${field.name}`);
        const column: Column = {
          id: columnId,
          name: field.name,
          type: mappedType,
          isPrimaryKey: hasAttribute(field, "id"),
          isForeignKey: false,
          isNullable: Boolean(field.optional),
          isUnique: hasAttribute(field, "unique") || hasAttribute(field, "id"),
          defaultValue: getDefaultValue(field),
        };

        columnOrigins[columnId] = {
          modelName: model.name,
          fieldName: field.name,
          prismaType: field.fieldType as string,
          mappedType,
        };
        return column;
      });

    tableOrigins[tableId] = model.name;
    return {
      id: tableId,
      name: model.name,
      columns,
      position: previous?.position ?? {
        x: 80 + (index % 4) * 340,
        y: 80 + Math.floor(index / 4) * 300,
      },
      width: previous?.width ?? 280,
      color: previous?.color,
      groupId: previous?.groupId,
    } satisfies TableNode;
  });

  const tableByName = new Map(tables.map((table) => [table.name, table]));
  const relationshipOrigins: PrismaMetadata["relationshipOrigins"] = {};
  const relationships: Relationship[] = [];

  for (const sourceModel of models) {
    const sourceTable = tableByName.get(sourceModel.name);
    if (!sourceTable) continue;

    for (const relationField of sourceModel.properties.filter(
      (property): property is Field =>
        property.type === "field" &&
        typeof property.fieldType === "string" &&
        modelNames.has(property.fieldType) &&
        Boolean(getRelationKey(property, "fields")?.length),
    )) {
      const targetTable = tableByName.get(relationField.fieldType as string);
      const sourceFieldName = getRelationKey(relationField, "fields")?.[0];
      const targetFieldName = getRelationKey(relationField, "references")?.[0];
      const sourceColumn = sourceTable.columns.find((column) => column.name === sourceFieldName);
      const targetColumn = targetTable?.columns.find((column) => column.name === targetFieldName);
      if (!targetTable || !sourceColumn || !targetColumn) continue;

      const targetModel = models.find((model) => model.name === targetTable.name);
      const relationName = getRelationName(relationField);
      const backField = targetModel?.properties.find(
        (property): property is Field =>
          property.type === "field" &&
          property.fieldType === sourceModel.name &&
          !getRelationKey(property, "fields")?.length &&
          (!relationName || getRelationName(property) === relationName),
      );
      const relationshipId = stableId("relationship", `${sourceModel.name}.${relationField.name}`);

      sourceColumn.isForeignKey = true;
      relationships.push({
        id: relationshipId,
        sourceTableId: sourceTable.id,
        sourceColumnId: sourceColumn.id,
        targetTableId: targetTable.id,
        targetColumnId: targetColumn.id,
        cardinality: backField?.array ? "1:N" : "1:1",
      });
      relationshipOrigins[relationshipId] = {
        sourceModelName: sourceModel.name,
        targetModelName: targetTable.name,
        relationFieldName: relationField.name,
        backFieldName: backField?.name,
      };
    }
  }

  return { tables, relationships, metadata: { tableOrigins, columnOrigins, relationshipOrigins } };
}

export function updatePrismaDocument(
  source: string,
  tables: TableNode[],
  relationships: Relationship[],
  metadata: PrismaMetadata,
): UpdatedPrismaDocument {
  validateCanvasNames(tables);
  const schema = getSchema(source.trim() ? source : DEFAULT_SCHEMA);
  const originalModels = schema.list.filter((block): block is Model => block.type === "model");
  const originalModelByName = new Map(originalModels.map((model) => [model.name, model]));
  const representedOriginalModels = new Set(Object.values(metadata.tableOrigins));
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const modelByTableId = new Map<string, Model>();
  const originalNameByTableId = new Map<string, string>();
  const updatedMetadata: PrismaMetadata = {
    tableOrigins: {},
    columnOrigins: {},
    relationshipOrigins: {},
  };

  for (const table of tables) {
    const originalName = metadata.tableOrigins[table.id] ?? table.name;
    let model = originalModelByName.get(originalName);
    if (!model && originalName !== table.name) model = originalModelByName.get(table.name);
    if (!model) {
      model = { type: "model", name: table.name, properties: [] };
      schema.list.push(model);
    }

    originalNameByTableId.set(table.id, model.name);
    modelByTableId.set(table.id, model);
  }

  // Keep implicit/unsupported relation fields valid when a represented model is renamed.
  for (const table of tables) {
    const oldName = originalNameByTableId.get(table.id);
    if (!oldName || oldName === table.name) continue;
    for (const model of originalModels) {
      for (const property of model.properties) {
        if (property.type === "field" && property.fieldType === oldName) {
          property.fieldType = table.name;
        }
      }
    }
  }

  for (const table of tables) {
    const model = modelByTableId.get(table.id)!;
    const oldModelName = originalNameByTableId.get(table.id)!;
    const originalFieldsByName = new Map(
      model.properties
        .filter((property): property is Field => property.type === "field")
        .map((field) => [field.name, field]),
    );
    const representedOriginalFields = new Set(
      Object.values(metadata.columnOrigins)
        .filter((origin) => origin.modelName === oldModelName)
        .map((origin) => origin.fieldName),
    );
    const keptFields = new Set<Field>();

    model.name = table.name;
    updatedMetadata.tableOrigins[table.id] = table.name;

    for (const column of table.columns) {
      const origin = metadata.columnOrigins[column.id];
      let field = origin ? originalFieldsByName.get(origin.fieldName) : undefined;
      field ??= originalFieldsByName.get(column.name);
      field ??= { type: "field", name: column.name, fieldType: prismaTypeForColumn(column.type) };

      const preserveOriginalType =
        origin && origin.mappedType === column.type && typeof field.fieldType === "string";
      field.name = column.name;
      field.fieldType = preserveOriginalType ? origin.prismaType : prismaTypeForColumn(column.type);
      field.array = false;
      field.optional = column.isNullable;
      syncColumnAttributes(field, column, preserveOriginalType);

      if (!model.properties.includes(field)) model.properties.push(field);
      keptFields.add(field);
      updatedMetadata.columnOrigins[column.id] = {
        modelName: table.name,
        fieldName: column.name,
        prismaType: field.fieldType as string,
        mappedType: column.type,
      };
    }

    model.properties = model.properties.filter(
      (property) =>
        property.type !== "field" ||
        keptFields.has(property) ||
        !representedOriginalFields.has(property.name),
    );
  }

  const desiredRelationshipIds = new Set(relationships.map((relationship) => relationship.id));
  for (const [relationshipId, origin] of Object.entries(metadata.relationshipOrigins)) {
    if (desiredRelationshipIds.has(relationshipId)) continue;
    removeNamedField(originalModelByName.get(origin.sourceModelName), origin.relationFieldName);
    if (origin.backFieldName) {
      removeNamedField(originalModelByName.get(origin.targetModelName), origin.backFieldName);
    }
  }

  for (const relationship of relationships) {
    const sourceTable = tableById.get(relationship.sourceTableId);
    const targetTable = tableById.get(relationship.targetTableId);
    const sourceColumn = sourceTable?.columns.find(
      (column) => column.id === relationship.sourceColumnId,
    );
    const targetColumn = targetTable?.columns.find(
      (column) => column.id === relationship.targetColumnId,
    );
    const sourceModel = sourceTable ? modelByTableId.get(sourceTable.id) : undefined;
    const targetModel = targetTable ? modelByTableId.get(targetTable.id) : undefined;
    if (!sourceTable || !targetTable || !sourceColumn || !targetColumn || !sourceModel || !targetModel) {
      continue;
    }

    const origin = metadata.relationshipOrigins[relationship.id];
    const relationFieldName = origin?.relationFieldName ?? uniqueFieldName(sourceModel, camelCase(targetTable.name));
    let relationField = origin
      ? findNamedField(originalModelByName.get(origin.sourceModelName) ?? sourceModel, origin.relationFieldName)
      : undefined;
    relationField ??= findNamedField(sourceModel, relationFieldName);
    relationField ??= { type: "field", name: relationFieldName, fieldType: targetTable.name };
    relationField.name = relationFieldName;
    relationField.fieldType = targetTable.name;
    relationField.array = false;
    relationField.optional = sourceColumn.isNullable;
    relationField.attributes = syncRelationAttribute(
      relationField.attributes,
      sourceColumn.name,
      targetColumn.name,
    );
    if (!sourceModel.properties.includes(relationField)) sourceModel.properties.push(relationField);

    const backFieldName = origin?.backFieldName ??
      uniqueFieldName(targetModel, relationship.cardinality === "1:N" ? pluralize(camelCase(sourceTable.name)) : camelCase(sourceTable.name));
    let backField = origin?.backFieldName
      ? findNamedField(originalModelByName.get(origin.targetModelName) ?? targetModel, origin.backFieldName)
      : undefined;
    backField ??= findNamedField(targetModel, backFieldName);
    backField ??= { type: "field", name: backFieldName, fieldType: sourceTable.name };
    backField.name = backFieldName;
    backField.fieldType = sourceTable.name;
    backField.array = relationship.cardinality === "1:N";
    backField.optional = relationship.cardinality !== "1:N";
    if (!targetModel.properties.includes(backField)) targetModel.properties.push(backField);

    updatedMetadata.relationshipOrigins[relationship.id] = {
      sourceModelName: sourceTable.name,
      targetModelName: targetTable.name,
      relationFieldName,
      backFieldName,
    };
  }

  const keptModels = new Set(modelByTableId.values());
  schema.list = schema.list.filter(
    (block) =>
      block.type !== "model" ||
      keptModels.has(block) ||
      !representedOriginalModels.has(block.name),
  );

  return { text: ensureTrailingNewline(printSchema(schema)), metadata: updatedMetadata };
}

function mapPrismaType(field: Field): ColumnType {
  const type = typeof field.fieldType === "string" ? field.fieldType : "String";
  const dbType = field.attributes?.find((attribute) => attribute.group === "db")?.name;
  const defaultValue = getDefaultValue(field);

  if (type === "String") {
    if (dbType === "Uuid" || defaultValue === "uuid()" || defaultValue === "cuid()") return "uuid";
    if (dbType === "VarChar") return "varchar";
    if (dbType === "Char") return "char";
    return "text";
  }
  if (type === "Int") {
    if (defaultValue === "autoincrement()") return "serial";
    if (dbType === "SmallInt") return "smallint";
    return "integer";
  }
  if (type === "BigInt") return defaultValue === "autoincrement()" ? "bigserial" : "bigint";
  if (type === "Boolean") return "boolean";
  if (type === "DateTime") {
    if (dbType === "Date") return "date";
    if (dbType === "Time") return "time";
    if (dbType === "Timestamptz") return "timestamptz";
    return "timestamp";
  }
  if (type === "Json") return dbType === "JsonB" ? "jsonb" : "json";
  if (type === "Float") return "float";
  if (type === "Decimal") return dbType === "Numeric" ? "numeric" : "decimal";
  if (type === "Bytes") return "bytea";
  return "varchar";
}

function prismaTypeForColumn(type: ColumnType): string {
  if (["uuid", "text", "varchar", "char"].includes(type)) return "String";
  if (["serial", "integer", "smallint"].includes(type)) return "Int";
  if (["bigserial", "bigint"].includes(type)) return "BigInt";
  if (type === "boolean") return "Boolean";
  if (["timestamp", "timestamptz", "date", "time"].includes(type)) return "DateTime";
  if (["json", "jsonb"].includes(type)) return "Json";
  if (["float", "double"].includes(type)) return "Float";
  if (["decimal", "numeric"].includes(type)) return "Decimal";
  if (type === "bytea") return "Bytes";
  return "String";
}

function syncColumnAttributes(field: Field, column: Column, preserveDbAttribute: boolean): void {
  const attributes = (field.attributes ?? []).filter(
    (attribute) =>
      !["id", "unique", "default"].includes(attribute.name) &&
      (preserveDbAttribute || attribute.group !== "db"),
  );

  if (column.isPrimaryKey) attributes.push(makeAttribute("id"));
  if (column.isUnique && !column.isPrimaryKey) attributes.push(makeAttribute("unique"));

  const defaultValue = column.defaultValue?.trim() ||
    (column.isPrimaryKey && column.type === "uuid" ? "uuid()" : undefined) ||
    (column.isPrimaryKey && ["serial", "bigserial"].includes(column.type)
      ? "autoincrement()"
      : undefined);
  if (defaultValue) attributes.push(makeAttribute("default", [parseDefaultValue(defaultValue)]));

  if (!preserveDbAttribute) {
    const dbAttribute = dbAttributeForColumn(column.type);
    if (dbAttribute) attributes.push(dbAttribute);
  }
  field.attributes = attributes.length ? attributes : undefined;
}

function dbAttributeForColumn(type: ColumnType): Attribute | undefined {
  const dbNames: Partial<Record<ColumnType, string>> = {
    uuid: "Uuid",
    varchar: "VarChar",
    char: "Char",
    smallint: "SmallInt",
    timestamptz: "Timestamptz",
    date: "Date",
    time: "Time",
    jsonb: "JsonB",
    numeric: "Numeric",
  };
  const name = dbNames[type];
  return name ? { ...makeAttribute(name), group: "db" } : undefined;
}

function syncRelationAttribute(
  attributes: Attribute[] | undefined,
  sourceField: string,
  targetField: string,
): Attribute[] {
  const existing = attributes?.find((attribute) => attribute.name === "relation");
  const preservedArgs = (existing?.args ?? []).filter((argument) => {
    const value = argument.value;
    return !(isKeyValue(value) && (value.key === "fields" || value.key === "references"));
  });
  const relation = makeAttribute("relation");
  relation.args = [
    ...preservedArgs,
    makeKeyValueArgument("fields", [sourceField]),
    makeKeyValueArgument("references", [targetField]),
  ];
  return [...(attributes ?? []).filter((attribute) => attribute.name !== "relation"), relation];
}

function makeAttribute(name: string, values?: Value[]): Attribute {
  return {
    type: "attribute",
    kind: "field",
    name,
    args: values?.map((value) => ({ type: "attributeArgument", value })),
  };
}

function makeKeyValueArgument(key: string, values: string[]): AttributeArgument {
  return {
    type: "attributeArgument",
    value: {
      type: "keyValue",
      key,
      value: { type: "array", args: values } satisfies RelationArray,
    },
  };
}

function parseDefaultValue(raw: string): Value {
  const value = raw.trim();
  const functionMatch = /^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/.exec(value);
  if (functionMatch) {
    const params = functionMatch[2].trim();
    return {
      type: "function",
      name: functionMatch[1],
      params: params ? [params] : undefined,
    } satisfies Func;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function getDefaultValue(field: Field): string | undefined {
  const value = field.attributes?.find((attribute) => attribute.name === "default")?.args?.[0]?.value;
  return value === undefined ? undefined : stringifyValue(value);
}

function stringifyValue(value: Value | KeyValue): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(stringifyValue).join(", ")}]`;
  if (value.type === "function") {
    return `${value.name}(${(value.params ?? []).map(stringifyValue).join(", ")})`;
  }
  if (value.type === "array") return `[${value.args.map(stringifyValue).join(", ")}]`;
  if (value.type === "keyValue") return `${value.key}: ${stringifyValue(value.value)}`;
  if (value.type === "object") {
    return `{ ${value.properties.map(stringifyValue).join(", ")} }`;
  }
  return "";
}

function getRelationKey(field: Field, key: string): string[] | undefined {
  const relation = field.attributes?.find((attribute) => attribute.name === "relation");
  const argument = relation?.args?.find(
    (candidate) => isKeyValue(candidate.value) && candidate.value.key === key,
  );
  const value = argument?.value;
  return isKeyValue(value) && isRelationArray(value.value)
    ? value.value.args.filter((item): item is string => typeof item === "string")
    : undefined;
}

function getRelationName(field: Field): string | undefined {
  const relation = field.attributes?.find((attribute) => attribute.name === "relation");
  const value = relation?.args?.find((argument) => typeof argument.value === "string")?.value;
  return typeof value === "string" ? value : undefined;
}

function hasAttribute(field: Field, name: string): boolean {
  return Boolean(field.attributes?.some((attribute) => attribute.name === name));
}

function isKeyValue(value: unknown): value is KeyValue {
  return Boolean(value && typeof value === "object" && "type" in value && value.type === "keyValue");
}

function isRelationArray(value: unknown): value is RelationArray {
  return Boolean(value && typeof value === "object" && "type" in value && value.type === "array");
}

function findNamedField(model: Model | undefined, name: string): Field | undefined {
  return model?.properties.find(
    (property): property is Field => property.type === "field" && property.name === name,
  );
}

function removeNamedField(model: Model | undefined, name: string): void {
  if (!model) return;
  model.properties = model.properties.filter(
    (property) => !(property.type === "field" && property.name === name),
  );
}

function uniqueFieldName(model: Model, preferred: string): string {
  const existing = new Set(
    model.properties
      .filter((property): property is Field => property.type === "field")
      .map((field) => field.name),
  );
  if (!existing.has(preferred)) return preferred;
  let suffix = 2;
  while (existing.has(`${preferred}${suffix}`)) suffix += 1;
  return `${preferred}${suffix}`;
}

function validateCanvasNames(tables: TableNode[]): void {
  const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const modelNames = new Set<string>();
  for (const table of tables) {
    if (!identifier.test(table.name)) throw new Error(`Invalid Prisma model name: ${table.name}`);
    if (modelNames.has(table.name)) throw new Error(`Duplicate Prisma model name: ${table.name}`);
    modelNames.add(table.name);
    const fieldNames = new Set<string>();
    for (const column of table.columns) {
      if (!identifier.test(column.name)) throw new Error(`Invalid Prisma field name: ${column.name}`);
      if (fieldNames.has(column.name)) {
        throw new Error(`Duplicate field ${column.name} in model ${table.name}`);
      }
      fieldNames.add(column.name);
    }
  }
}

function stableId(kind: string, value: string): string {
  let hash = 2166136261;
  const input = `${kind}:${value}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${kind}_${(hash >>> 0).toString(36)}`;
}

function camelCase(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_]+/g, "_");
  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function pluralize(value: string): string {
  if (value.endsWith("s")) return `${value}List`;
  if (value.endsWith("y") && !/[aeiou]y$/i.test(value)) return `${value.slice(0, -1)}ies`;
  return `${value}s`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function semanticSchemaSignature(
  tables: TableNode[],
  relationships: Relationship[],
): string {
  return JSON.stringify({
    tables: tables.map(({ id, name, columns }) => ({ id, name, columns })),
    relationships,
  });
}
