import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  roomId: text("room_id").primaryKey(),
  itemType: text("item_type").notNull().default("thing"),
  updatedAt: integer("updated_at").notNull(),
});

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
