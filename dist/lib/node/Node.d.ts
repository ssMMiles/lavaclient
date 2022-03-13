import { Connection, ConnectionInfo } from "./Connection";
import { Dictionary, DiscordResource, ManagerOptions, Snowflake } from "../Utils";
import { NodeState } from "./NodeState";
import { Player, VoiceServerUpdate, VoiceStateUpdate } from "../Player";
import { REST } from "./REST";
import { TypedEmitter } from "tiny-typed-emitter";
import type * as Lavalink from "@lavaclient/types";
export declare class Node extends TypedEmitter<NodeEvents> {
    static DEBUG_FORMAT: string;
    static DEBUG_FORMAT_PLAYER: string;
    static DEFAULT_STATS: Lavalink.StatsData;
    readonly players: Map<string, Player<this>>;
    readonly conn: Connection;
    readonly rest: REST;
    readonly sendGatewayPayload: SendGatewayPayload;
    state: NodeState;
    stats: Lavalink.StatsData;
    userId?: Snowflake;
    constructor(options: NodeOptions);
    get penalties(): number;
    connect(user?: Snowflake | DiscordResource | undefined): void;
    createPlayer(guild: Snowflake | DiscordResource): Player<this>;
    destroyPlayer(guild: Snowflake | DiscordResource): boolean;
    handleVoiceUpdate(update: VoiceStateUpdate | VoiceServerUpdate): void;
    debug(topic: string, message: string, player?: Player): void;
}
export declare type SendGatewayPayload = (id: Snowflake, payload: {
    op: 4;
    d: Dictionary;
}) => void;
export interface NodeEvents {
    connect: (event: ConnectEvent) => void;
    disconnect: (event: DisconnectEvent) => void;
    closed: () => void;
    error: (error: Error) => void;
    debug: (message: string) => void;
    raw: (message: Lavalink.IncomingMessage) => void;
}
export interface ConnectEvent {
    took: number;
    reconnect: boolean;
}
export interface DisconnectEvent {
    code: number;
    reason: string;
    reconnecting: boolean;
    wasClean: boolean;
}
export interface NodeOptions extends ManagerOptions {
    connection: ConnectionInfo;
}
