import { ClusterNode } from "./ClusterNode";
import { TypedEmitter } from "tiny-typed-emitter";
import { DiscordResource, ManagerOptions, Snowflake } from "../Utils";
import type * as Lavalink from "@lavaclient/types";
import type { ConnectEvent, DisconnectEvent, SendGatewayPayload } from "../node/Node";
import type { ConnectionInfo } from "../node/Connection";
import type { Player, VoiceServerUpdate, VoiceStateUpdate } from "../Player";
import type { REST } from "../node/REST";
export declare class Cluster extends TypedEmitter<ClusterEvents> {
    readonly nodes: Map<string, ClusterNode>;
    readonly sendGatewayPayload: SendGatewayPayload;
    userId?: Snowflake;
    constructor(options: ClusterOptions);
    get rest(): REST | null;
    get idealNodes(): ClusterNode[];
    connect(user?: Snowflake | DiscordResource | undefined): void;
    createPlayer(guild: Snowflake | DiscordResource, nodeId?: string): Player<ClusterNode>;
    getPlayer(guild: Snowflake | DiscordResource): Player<ClusterNode> | null;
    destroyPlayer(guild: Snowflake | DiscordResource): boolean;
    handleVoiceUpdate(update: VoiceServerUpdate | VoiceStateUpdate): void;
    getNode(guild: Snowflake | DiscordResource): ClusterNode | null;
}
export interface ClusterEvents {
    nodeConnect: (node: ClusterNode, event: ConnectEvent) => void;
    nodeDisconnect: (node: ClusterNode, event: DisconnectEvent) => void;
    nodeError: (node: ClusterNode, error: Error) => void;
    nodeDebug: (node: ClusterNode, message: string) => void;
    nodeRaw: (node: ClusterNode, message: Lavalink.IncomingMessage) => void;
}
export interface ClusterOptions extends ManagerOptions {
    nodes: ClusterNodeOptions[];
}
export interface ClusterNodeOptions extends ConnectionInfo {
    id: string;
}
