import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  roomId: text("room_id").primaryKey(),
  itemType: text("item_type").notNull().default("thing"),
  updatedAt: integer("updated_at").notNull(),
});

export const roomItems = sqliteTable("room_items", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  text: text("text").notNull(),
  votes: integer("votes").notNull().default(0),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("room_items_room_idx").on(table.roomId, table.createdAt)]);

export const roomVotes = sqliteTable("room_votes", {
  roomId: text("room_id").notNull(),
  itemId: text("item_id").notNull(),
  clientId: text("client_id").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.itemId, table.clientId] }),
  index("room_votes_room_item_idx").on(table.roomId, table.itemId),
]);

export const roomPresence = sqliteTable("room_presence", {
  roomId: text("room_id").notNull(),
  clientId: text("client_id").notNull(),
  avatarKey: text("avatar_key").notNull(),
  colorKey: text("color_key").notNull(),
  profileId: text("profile_id"),
  profileKey: text("profile_key"),
  profileContentType: text("profile_content_type"),
  lastSeen: integer("last_seen").notNull(),
}, (table) => [
  primaryKey({ columns: [table.roomId, table.clientId] }),
  index("room_presence_active_idx").on(table.roomId, table.lastSeen),
  uniqueIndex("room_presence_profile_id_idx").on(table.profileId),
]);
