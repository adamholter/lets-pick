"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bird, Bot, Bug, Cat, Check, Dog, Fish, Ghost, Heart, Plus, QrCode as QrIcon, Rabbit, Send, Share2, X } from "lucide-react";
import QRCode from "qrcode";

type PickItem = {
  id: number;
  text: string;
  liked: boolean;
  votes: number;
};

const starterItems: PickItem[] = [
  { id: 1, text: "The Matrix", liked: true, votes: 8 },
  { id: 2, text: "Spirited Away", liked: true, votes: 6 },
  { id: 3, text: "Knives Out", liked: false, votes: 5 },
  { id: 4, text: "The Grand Budapest Hotel", liked: false, votes: 3 },
];

type PresenceUser = {
  clientId: string;
  avatarKey: string;
  colorKey: string;
  profileUrl: string | null;
};

const avatarIcons = { cat: Cat, dog: Dog, rabbit: Rabbit, bird: Bird, fish: Fish, ghost: Ghost, bot: Bot, bug: Bug };
const itemTypes = ["thing", "song", "question", "person", "place"] as const;
type ItemType = typeof itemTypes[number];

export default function Home() {
  const [items, setItems] = useState<PickItem[]>([]);
  const [value, setValue] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [roomUrl, setRoomUrl] = useState("https://lets-pick-together.adamholter.chatgpt.site/friends");
  const [roomId, setRoomId] = useState("friends");
  const [clientId, setClientId] = useState("");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [profileStatus, setProfileStatus] = useState("");
  const [itemType, setItemType] = useState<ItemType>("thing");
  const [qrData, setQrData] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [roomLabel, setRoomLabel] = useState("Friday night");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const room = window.location.pathname.replace(/^\/+|\/+$/g, "") || "friends";
    const syncExactUrl = () => setRoomUrl(window.location.href);
    syncExactUrl();
    window.addEventListener("popstate", syncExactUrl);
    window.addEventListener("hashchange", syncExactUrl);
    setRoomId(room);
    let anonymousId = window.localStorage.getItem("lets-pick:client-id");
    if (!anonymousId) {
      anonymousId = crypto.randomUUID();
      window.localStorage.setItem("lets-pick:client-id", anonymousId);
    }
    setClientId(anonymousId);
    if (room !== "friends") {
      const lastPart = decodeURIComponent(room.split("/").filter(Boolean).at(-1) ?? room);
      const readable = lastPart.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      setRoomLabel(readable || "New room");
    }

    const stored = window.localStorage.getItem(`lets-pick:${room}:concept-one`);
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { /* keep starter items */ }
    } else if (room === "friends") {
      setItems(starterItems);
    } else {
      setItems([]);
    }
    return () => {
      window.removeEventListener("popstate", syncExactUrl);
      window.removeEventListener("hashchange", syncExactUrl);
    };
  }, []);

  useEffect(() => {
    const room = window.location.pathname.replace(/^\/+|\/+$/g, "") || "friends";
    window.localStorage.setItem(`lets-pick:${room}:concept-one`, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    QRCode.toDataURL(roomUrl, {
      width: 720,
      margin: 2,
      color: { dark: "#1d2926", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrData);
  }, [roomUrl]);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    let running = false;
    const heartbeat = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, clientId }),
        });
        if (!response.ok) throw new Error("Presence unavailable");
        const data = await response.json() as { users: PresenceUser[]; itemType?: ItemType };
        if (active) {
          setPresence(data.users);
          if (data.itemType && itemTypes.includes(data.itemType)) setItemType(data.itemType);
        }
      } catch {
        if (active) setPresence((current) => current.length ? current : [{ clientId, avatarKey: "bot", colorKey: "mint", profileUrl: null }]);
      } finally {
        running = false;
      }
    };
    void heartbeat();
    const timer = window.setInterval(heartbeat, 10_000);
    const leave = () => navigator.sendBeacon("/api/presence/leave", JSON.stringify({ roomId, clientId }));
    window.addEventListener("pagehide", leave);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("pagehide", leave);
    };
  }, [clientId, roomId]);

  useEffect(() => {
    if (!qrOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [qrOpen]);

  useEffect(() => {
    if (composerOpen) inputRef.current?.focus();
  }, [composerOpen]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.votes - a.votes || a.id - b.id),
    [items],
  );

  function toggleVote(id: number) {
    setItems((current) => current.map((item) =>
      item.id === id
        ? { ...item, liked: !item.liked, votes: Math.max(0, item.votes + (item.liked ? -1 : 1)) }
        : item
    ));
  }

  function addIdea(event: FormEvent) {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    setItems((current) => [...current, { id: Date.now(), text, liked: false, votes: 0 }]);
    setValue("");
    setComposerOpen(false);
  }

  async function shareRoom() {
    const url = roomUrl;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${roomLabel} picks`, text: "Vote for every movie you would watch.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
      window.setTimeout(() => setShareStatus(""), 1800);
    } catch {
      // Dismissing the native share sheet is not an error the UI needs to surface.
    }
  }

  async function uploadProfile(file: File) {
    const form = new FormData();
    form.append("roomId", roomId);
    form.append("clientId", clientId);
    form.append("file", file);
    setProfileStatus("Uploading…");
    try {
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const data = await response.json() as { profileUrl?: string; error?: string };
      if (!response.ok || !data.profileUrl) throw new Error(data.error || "Upload failed");
      setPresence((current) => current.map((user) => user.clientId === clientId ? { ...user, profileUrl: `${data.profileUrl}?v=${Date.now()}` } : user));
      setProfileStatus("Photo updated");
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Upload failed");
    }
    window.setTimeout(() => setProfileStatus(""), 2200);
  }

  async function changeItemType(nextType: ItemType) {
    const previous = itemType;
    setItemType(nextType);
    try {
      const response = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, itemType: nextType }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setItemType(previous);
      setShareStatus("Couldn’t change the room type");
      window.setTimeout(() => setShareStatus(""), 2200);
    }
  }

  return (
    <main className="pick-app">
      <div className="app-shell">
        <section className="ballot-column">
          <header className="top-header">
            <div>
              <p className="room-label">{roomLabel}</p>
              <h1>
                <span>Pick a </span>
                <span className="type-picker">
                  <select
                    value={itemType}
                    onChange={(event) => void changeItemType(event.target.value as ItemType)}
                    aria-label="What are you picking?"
                  >
                    {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </span>
              </h1>
            </div>
            <div className="header-actions">
              <button className="round-action" onClick={shareRoom} aria-label="Share room" title="Share room">
                <Share2 size={20} strokeWidth={2} />
              </button>
              <button className="round-action qr-action" onClick={() => setQrOpen(true)} aria-label="Show QR code" title="Show QR code">
                <QrIcon size={20} strokeWidth={2} />
              </button>
            </div>
          </header>

          <div className="presence-row">
            <div className="avatar-stack" aria-label={`${presence.length} ${presence.length === 1 ? "person is" : "people are"} in this room`}>
              {presence.slice(0, 5).map((user) => {
                const Icon = avatarIcons[user.avatarKey as keyof typeof avatarIcons] ?? Bot;
                const isSelf = user.clientId === clientId;
                return (
                  <button
                    key={user.clientId}
                    type="button"
                    className={`presence-avatar avatar-${user.colorKey} ${isSelf ? "is-self" : ""}`}
                    onClick={() => isSelf && fileRef.current?.click()}
                    disabled={!isSelf}
                    aria-label={isSelf ? "You — change profile picture" : "Another person in this room"}
                    title={isSelf ? "You — change your picture" : "Someone else voting"}
                  >
                    {user.profileUrl ? <img src={user.profileUrl} alt="" /> : <Icon size={15} strokeWidth={2.3} />}
                  </button>
                );
              })}
              {presence.length > 5 && <span className="presence-more">+{presence.length - 5}</span>}
            </div>
            <span>{presence.length <= 1 ? "Just you here" : `${presence.length} voting now`}</span>
            <input
              ref={fileRef}
              className="profile-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadProfile(file);
                event.currentTarget.value = "";
              }}
            />
          </div>

          <ul className="choice-list" aria-label="Movie choices">
            {sortedItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`choice-card ${item.liked ? "selected" : ""}`}
                  onClick={() => toggleVote(item.id)}
                  aria-pressed={item.liked}
                >
                  <span className="choice-check" aria-hidden="true">{item.liked && <Check size={16} strokeWidth={2.7} />}</span>
                  <span className="choice-name">{item.text}</span>
                  <span className="vote-count">
                    <Heart size={15} strokeWidth={2} fill={item.liked ? "currentColor" : "none"} />
                    {item.votes}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {composerOpen ? (
            <form className="idea-composer" onSubmit={addIdea}>
              <input
                ref={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Movie title"
                aria-label="Movie title"
              />
              <button type="submit" className="composer-send" aria-label="Add idea" disabled={!value.trim()}>
                <Send size={19} />
              </button>
              <button type="button" className="composer-close" onClick={() => setComposerOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </form>
          ) : (
            <button className="add-idea" onClick={() => setComposerOpen(true)}>
              <Plus size={20} />
              <span>Add an idea</span>
              <Send size={18} />
            </button>
          )}
        </section>

        <aside className="desktop-qr" aria-label="Room QR code">
          <p>Scan to join</p>
          {qrData && <img src={qrData} alt={`QR code for ${roomUrl}`} />}
          <strong>{roomLabel}</strong>
          <span>{roomUrl.replace(/^https?:\/\//, "")}</span>
        </aside>
      </div>

      {(shareStatus || profileStatus) && <div className="status-toast" role="status">{shareStatus || profileStatus}</div>}

      {qrOpen && (
        <div className="qr-overlay" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setQrOpen(false);
        }}>
          <section className="qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-title">
            <button className="dialog-close" onClick={() => setQrOpen(false)} aria-label="Close QR code"><X size={20} /></button>
            <p>Scan to join</p>
            <h2 id="qr-title">{roomLabel}</h2>
            {qrData && <img src={qrData} alt={`QR code for ${roomUrl}`} />}
            <span>{roomUrl.replace(/^https?:\/\//, "")}</span>
          </section>
        </div>
      )}
    </main>
  );
}
