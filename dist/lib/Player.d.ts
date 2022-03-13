import Lavalink, { Filter } from "@lavaclient/types";
import { TypedEmitter } from "tiny-typed-emitter";
import type { Node } from "./node/Node";
import { DiscordResource, Snowflake } from "./Utils";
export declare class Player<N extends Node = Node> extends TypedEmitter<PlayerEvents> {
    readonly node: N;
    static USE_FILTERS: boolean;
    readonly guildId: Snowflake;
    channelId: string | null;
    track?: string;
    trackData?: Lavalink.TrackInfo;
    playing: boolean;
    playingSince?: number;
    paused: boolean;
    position?: number;
    connected: boolean;
    filters: Partial<Lavalink.FilterData>;
    lastUpdatedTimestamp?: number;
    private [_voiceUpdate];
    private [_volume];
    constructor(node: N, guild: Snowflake | DiscordResource);
    get accuratePosition(): number | undefined;
    get volume(): number;
    connect(channel: Snowflake | DiscordResource | null, options?: ConnectOptions): Promise<this>;
    disconnect(): Promise<this>;
    play(track: string | {
        track: string;
    }, options?: PlayOptions): Promise<this>;
    stop(): Promise<this>;
    pause(state?: boolean): Promise<this>;
    resume(): Promise<this>;
    seek(position: number): Promise<this>;
    destroy(): Promise<this>;
    setVolume(volume: number): Promise<this>;
    setEqualizer(...gains: number[]): Promise<this>;
    setEqualizer(...bands: Lavalink.EqualizerBand[]): Promise<this>;
    setFilters(): Promise<this>;
    setFilters(filters: Partial<Lavalink.FilterData>): Promise<this>;
    setFilters<F extends Filter>(filter: F, data: Lavalink.FilterData[F]): Promise<this>;
    handleVoiceUpdate(update: VoiceStateUpdate | VoiceServerUpdate): Promise<this>;
    handleEvent(event: Lavalink.PlayerEvent): void;
}
export declare type PlayOptions = Omit<Lavalink.PlayData, "track">;
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
