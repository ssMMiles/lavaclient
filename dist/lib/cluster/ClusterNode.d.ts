import { Node, NodeEvents } from "../node/Node";
import type { Cluster } from "./Cluster";
import type { ConnectionInfo } from "../node/Connection";
export declare class ClusterNode extends Node {
    readonly cluster: Cluster;
    readonly id: string;
    constructor(cluster: Cluster, id: string, info: ConnectionInfo);
    emit<U extends keyof NodeEvents>(event: U, ...args: Parameters<NodeEvents[U]>): boolean;
}
