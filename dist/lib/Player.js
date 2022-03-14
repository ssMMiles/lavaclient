"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const types_1 = require("@lavaclient/types");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const Track_1 = require("./track/Track");
const Utils_1 = require("./Utils");
const _voiceUpdate = Symbol.for("Player#_voiceUpdate");
const _volume = Symbol.for("Player#_volume");
class Player extends tiny_typed_emitter_1.TypedEmitter {
    constructor(node, guild) {
        super();
        this.node = node;
        this.channelId = null;
        this.playing = false;
        this.paused = false;
        this.connected = false;
        this.filters = {};
        this[_a] = {};
        this[_b] = 100;
        this.guildId = (0, Utils_1.getId)(guild);
    }
    get accuratePosition() {
        if (!this.position) {
            return;
        }
        const accurate = (this.lastUpdatedTimestamp) ? this.position + (Date.now() - this.lastUpdatedTimestamp) : this.position;
        return this.trackData ? Math.min(accurate, this.trackData.length) : accurate;
    }
    get volume() {
        return Player.USE_FILTERS
            ? Math.floor((this.filters.volume ?? 1) * 100)
            : this[_volume];
    }
    connect(channel, options = {}) {
        return new Promise((resolve, reject) => {
            this[_voiceUpdate] = {};
            this.node.debug("voice", `updating voice status in guild=${this.guildId}, channel=${this.channelId}`, this);
            this.node.sendGatewayPayload(this.guildId, {
                op: 4,
                d: {
                    guild_id: this.guildId,
                    channel_id: channel && (0, Utils_1.getId)(channel),
                    self_deaf: options.deafened ?? false,
                    self_mute: options.muted ?? false,
                },
            });
            const timeout = setTimeout(() => {
                this.node.debug("voice", "timeout waiting for voice update");
                reject(new Error(`Timed out waiting for the player to ${channel === null ? "disconnect" : "connect"}.`));
            }, 15000);
            if (channel === null) {
                this.once("channelLeave", () => {
                    clearTimeout(timeout);
                    resolve(this);
                });
            }
            else {
                this.once("channelJoin", (joinedChannel) => {
                    if (channel !== joinedChannel)
                        reject();
                    clearTimeout(timeout);
                    resolve(this);
                });
            }
            return this;
        });
    }
    disconnect() {
        this[_voiceUpdate] = {};
        return this.connect(null);
    }
    async play(track, options = {}) {
        await this.node.conn.send(false, {
            op: "play",
            track: typeof track === "string" ? track : track.track,
            guildId: this.guildId,
            ...options
        });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.node.debug("voice", "timeout waiting for track start");
                reject(new Error("Timed out waiting for track to start."));
            }, 15000);
            this.once("trackStart", _ => {
                clearTimeout(timeout);
                resolve(this);
            });
        });
    }
    async stop() {
        await this.node.conn.send(false, { op: "stop", guildId: this.guildId });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.node.debug("voice", "timeout waiting for track end");
                reject(new Error("Timed out waiting for track to stop."));
            }, 15000);
            this.once("trackEnd", _ => {
                clearTimeout(timeout);
                resolve(this);
            });
        });
    }
    async pause(state = true) {
        this.paused = state;
        await this.node.conn.send(false, { op: "pause", guildId: this.guildId, pause: state });
        return this;
    }
    resume() {
        return this.pause(false);
    }
    async seek(position) {
        await this.node.conn.send(false, { op: "seek", guildId: this.guildId, position });
        return this;
    }
    async destroy() {
        await this.node.conn.send(false, { op: "destroy", guildId: this.guildId });
        return this;
    }
    async setVolume(volume) {
        if (Player.USE_FILTERS) {
            await this.setFilters(types_1.Filter.Volume, volume > 1 ? volume / 100 : volume);
        }
        else {
            await this.node.conn.send(false, { op: "volume", guildId: this.guildId, volume });
            this[_volume] = volume;
        }
        return this;
    }
    async setEqualizer(arg0, ...arg1) {
        const bands = [];
        if (Array.isArray(arg0)) {
            arg0.forEach((value, index) => {
                bands.push(typeof value === "number" ? { gain: value, band: index } : value);
            });
        }
        else {
            bands.push(typeof arg0 === "number" ? { gain: arg0, band: 0 } : arg0);
            arg1.forEach(value => {
                const band = typeof value === "number" ? { gain: value, band: bands.length } : value;
                bands.push(band);
            });
        }
        const duplicateBand = bands.find(a => bands.filter(b => a.band === b.band).length > 1)?.band;
        if (duplicateBand) {
            throw new Error(`Band ${duplicateBand} is duplicated 1 or more times.`);
        }
        await (Player.USE_FILTERS
            ? this.setFilters(types_1.Filter.Equalizer, bands)
            : this.node.conn.send(false, { op: "equalizer", guildId: this.guildId, bands }));
        return this;
    }
    async setFilters(arg0, arg1) {
        if (typeof arg0 === "object") {
            this.filters = arg0;
        }
        else if (arg0) {
            this.filters[arg0] = arg1;
        }
        await this.node.conn.send(false, {
            op: "filters",
            guildId: this.guildId,
            ...this.filters
        });
        return this;
    }
    async handleVoiceUpdate(update) {
        if ("token" in update) {
            this[_voiceUpdate].event = update;
        }
        else {
            if (update.user_id !== this.node.userId) {
                return this;
            }
            const channel = update.channel_id;
            if (!channel && this.channelId) {
                this.emit("channelLeave", this.channelId);
                this.channelId = null;
                this[_voiceUpdate] = {};
            }
            else if (channel && !this.channelId) {
                this.channelId = update.channel_id;
                this.emit("channelJoin", this.channelId);
            }
            else if (channel !== this.channelId) {
                this.emit("channelMove", this.channelId, update.channel_id);
                this.channelId = update.channel_id;
            }
            if (this[_voiceUpdate].sessionId === update.session_id) {
                return this;
            }
            this[_voiceUpdate].sessionId = update.session_id;
        }
        if (this[_voiceUpdate].event && this[_voiceUpdate].sessionId) {
            this.node.debug("voice", "submitting voice update", this);
            await this.node.conn.send(true, {
                op: "voiceUpdate",
                guildId: this.guildId,
                ...this[_voiceUpdate]
            });
            this.connected = true;
        }
        return this;
    }
    handleEvent(event) {
        switch (event.type) {
            case "TrackStartEvent":
                this.playing = true;
                this.playingSince = Date.now();
                this.track = event.track;
                try {
                    this.trackData = (0, Track_1.decode)(event.track) ?? undefined;
                }
                catch { }
                this.emit("trackStart", event.track);
                break;
            case "TrackEndEvent":
                this.position = 0;
                if (event.reason !== "REPLACED") {
                    this.playing = false;
                    delete this.playingSince;
                }
                delete this.track;
                delete this.trackData;
                this.emit("trackEnd", event.track, event.reason);
                break;
            case "TrackExceptionEvent":
                this.emit("trackException", event.track, new Error(event.error));
                break;
            case "TrackStuckEvent":
                this.emit("trackStuck", event.track, event.thresholdMs);
                break;
            case "WebSocketClosedEvent":
                this.emit("disconnected", event.code, event.reason, event.byRemote);
                break;
        }
    }
}
exports.Player = Player;
_a = _voiceUpdate, _b = _volume;
Player.USE_FILTERS = false;
