import { promisify } from "util";
import type { Cluster } from "./cluster/Cluster";
import type { Node, SendGatewayPayload } from "./node/Node";

export type Snowflake = string;
export type DiscordResource = { id: Snowflake };
export type Dictionary<V = any, K extends string | symbol = string> = Record<K, V>;

export type Manager = Node | Cluster;

export const sleep = promisify(setTimeout);

export interface ManagerOptions {
    sendGatewayPayload: SendGatewayPayload;
    user?: Snowflake | DiscordResource;
}

export function getId(value: Snowflake | DiscordResource): Snowflake {
    return typeof value === "string" ? value : value.id;
}

export function randomId(): Snowflake {
    return Math.random().toString(36).slice(2);
}
