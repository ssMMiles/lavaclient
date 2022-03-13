import type * as Lavalink from "@lavaclient/types";
import type { Node } from "./Node";
export declare class REST {
    readonly node: Node;
    constructor(node: Node);
    private get info();
    get baseUrl(): string;
    loadTracks(identifier: string): Promise<Lavalink.LoadTracksResponse>;
    decodeTracks(...tracks: string[]): Promise<Lavalink.TrackInfo[]>;
    decodeTrack(track: string): Promise<Lavalink.TrackInfo>;
    do<T>(endpoint: string, options?: Options): Promise<T>;
}
export declare type Options = {
    method?: string;
    data?: any;
};
