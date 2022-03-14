/* eslint-disable camelcase */
import Lavalink, { Filter } from "@lavaclient/types";
import { TypedEmitter } from "tiny-typed-emitter";
import type { Node } from "./node/Node";
import { decode } from "./track/Track";
import { DiscordResource, getId, Snowflake } from "./Utils";


/** @internal */
const _voiceUpdate = Symbol.for("Player#_voiceUpdate");
/** @internal */
const _volume = Symbol.for("Player#_volume");

export class Player<N extends Node = Node> extends TypedEmitter<PlayerEvents> {
    static USE_FILTERS = false;

    readonly guildId: Snowflake;

    channelId: string | null = null;
    track?: string;
    trackData?: Lavalink.TrackInfo;
    playing = false;
    playingSince?: number;
    paused = false;
    position?: number;
    connected = false;
    filters: Partial<Lavalink.FilterData> = {};
    lastUpdatedTimestamp?: number;

    private [_voiceUpdate]: Partial<Lavalink.VoiceUpdateData> = {};
    private [_volume] = 100;

    constructor(readonly node: N, guild: Snowflake | DiscordResource) {
        super();

        this.guildId = getId(guild);
    }

    get accuratePosition(): number | undefined {
        if (!this.position) {
            return;
        }

        const accurate = (this.lastUpdatedTimestamp) ? this.position + (Date.now() - this.lastUpdatedTimestamp) : this.position;
        return this.trackData ? Math.min(accurate, this.trackData.length) : accurate;
    }

    get volume(): number {
        return Player.USE_FILTERS
            ? Math.floor((this.filters.volume ?? 1) * 100)
            : this[_volume];
    }

    /* voice connection management. */
    connect(channel: Snowflake | DiscordResource | null, options: ConnectOptions = {}): Promise<this> {
        return new Promise((resolve, reject) => {
            this[_voiceUpdate] = {};

            this.node.debug(
                "voice",
                `updating voice status in guild=${this.guildId}, channel=${this.channelId}`,
                this
            );
            this.node.sendGatewayPayload(this.guildId, {
                op: 4,
                d: {
                    guild_id: this.guildId,
                    channel_id: channel && getId(channel),
                    self_deaf: options.deafened ?? false,
                    self_mute: options.muted ?? false,
                },
            });

            const timeout = setTimeout(() => {
                this.node.debug(
                    "voice",
                    "timeout waiting for voice update",
                );
                reject(new Error(`Timed out waiting for the player to ${channel === null ? "disconnect" : "connect"}.`));
            }, 15000);

            if (channel === null) {
                this.once("channelLeave", () => {
                    clearTimeout(timeout);
                    resolve(this);
                });
            } else {
                this.once("channelJoin", (joinedChannel) => {
                    if (channel !== joinedChannel) reject();

                    clearTimeout(timeout);
                    resolve(this);
                });
            }

            return this;
        });
    }

    disconnect(): Promise<this> {
        this[_voiceUpdate] = {};

        return this.connect(null);
    }

    /* lavalink operations. */
    async play(track: string | { track: string }, options: PlayOptions = {}): Promise<this> {
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

    async stop(): Promise<this> {
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

    async pause(state = true): Promise<this> {
        this.paused = state;
        await this.node.conn.send(false, { op: "pause", guildId: this.guildId, pause: state });
        return this;
    }

    resume(): Promise<this> {
        return this.pause(false);
    }

    async seek(position: number): Promise<this> {
        await this.node.conn.send(false, { op: "seek", guildId: this.guildId, position });
        return this;
    }

    async destroy(): Promise<this> {
        await this.node.conn.send(false, { op: "destroy", guildId: this.guildId });
        return this;
    }

    async setVolume(volume: number): Promise<this> {
        if (Player.USE_FILTERS) {
            await this.setFilters(Filter.Volume, volume > 1 ? volume / 100 : volume);
        } else {
            await this.node.conn.send(false, { op: "volume", guildId: this.guildId, volume });
            this[_volume] = volume;
        }

        return this;
    }

    setEqualizer(...gains: number[]): Promise<this>;
    setEqualizer(...bands: Lavalink.EqualizerBand[]): Promise<this>;
    async setEqualizer(
        arg0: number | Lavalink.EqualizerBand | (Lavalink.EqualizerBand | number)[],
        ...arg1: (number | Lavalink.EqualizerBand)[]
    ): Promise<this> {
        const bands: Lavalink.EqualizerBand[] = [];
        if (Array.isArray(arg0)) {
            arg0.forEach((value, index) => {
                bands.push(typeof value === "number" ? { gain: value, band: index } : value);
            });
        } else {
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

        /* apply the equalizer */
        await (Player.USE_FILTERS
            ? this.setFilters(Filter.Equalizer, bands)
            : this.node.conn.send(false, { op: "equalizer", guildId: this.guildId, bands }));

        return this;
    }

    setFilters(): Promise<this>;
    setFilters(filters: Partial<Lavalink.FilterData>): Promise<this>;
    setFilters<F extends Filter>(filter: F, data: Lavalink.FilterData[F]): Promise<this>;
    async setFilters<F extends Filter>(
        arg0?: Partial<Lavalink.FilterData> | F,
        arg1?: Lavalink.FilterData[F]
    ): Promise<this> {
        if (typeof arg0 === "object") {
            this.filters = arg0;
        } else if (arg0) {
            this.filters[arg0] = arg1;
        }

        await this.node.conn.send(false, {
            op: "filters",
            guildId: this.guildId,
            ...this.filters
        });

        return this;
    }

    /* event handling. */
    async handleVoiceUpdate(update: VoiceStateUpdate | VoiceServerUpdate): Promise<this> {
        if ("token" in update) {
            this[_voiceUpdate].event = update;
        } else {
            if (update.user_id !== this.node.userId) {
                return this;
            }

            const channel = update.channel_id;
            if(!channel && this.channelId) {
                this.emit("channelLeave", this.channelId);
                this.channelId = null;
                this[_voiceUpdate] = {};
            } else if (channel && !this.channelId) {
                this.channelId = update.channel_id;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.emit("channelJoin", this.channelId!);
            } else if (channel !== this.channelId) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.emit("channelMove", this.channelId!, update.channel_id!);
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
                ...this[_voiceUpdate] as Lavalink.VoiceUpdateData
            });

            this.connected = true;
        }

        return this;
    }

    handleEvent(event: Lavalink.PlayerEvent): void {
        switch (event.type) {
            case "TrackStartEvent":
                this.playing = true;
                this.playingSince = Date.now();
                this.track = event.track;
                try {
                    this.trackData = decode(event.track) ?? undefined;
                } catch {/*no-op*/}
                this.emit("trackStart", event.track);
                break;
            case "TrackEndEvent":
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

export type PlayOptions = Omit<Lavalink.PlayData, "track">;

export interface PlayerEvents {
    disconnected: (code: number, reason: string, byRemote: boolean) => void;
    trackStart: (track: string) => void;
    trackEnd: (track: string | null, reason: Lavalink.TrackEndReason) => void;
    trackException: (track: string | null, error: Error) => void;
    trackStuck: (track: string | null, thresholdMs: number) => void;
    channelJoin: (joined: Snowflake) => void;
    channelLeave: (left: Snowflake) => void;
    channelMove: (from: Snowflake, to: Snowflake) => void;
}

export interface ConnectOptions {
    deafened?: boolean;
    muted?: boolean;
}

export interface VoiceServerUpdate {
    token: string;
    endpoint: string;
    guild_id: `${bigint}`;
}

export interface VoiceStateUpdate {
    session_id: string;
    channel_id: `${bigint}` | null;
    guild_id: `${bigint}`;
    user_id: `${bigint}`;
}
