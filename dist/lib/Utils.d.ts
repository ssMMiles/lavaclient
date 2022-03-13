import type { Cluster } from "./cluster/Cluster";
import type { Node, SendGatewayPayload } from "./node/Node";
export declare type Snowflake = string;
export declare type DiscordResource = {
    id: Snowflake;
};
export declare type Dictionary<V = any, K extends string | symbol = string> = Record<K, V>;
export declare type Manager = Node | Cluster;
export interface ManagerOptions {
    sendGatewayPayload: SendGatewayPayload;
    user?: Snowflake | DiscordResource;
}
export declare function getId(value: Snowflake | DiscordResource): Snowflake;
