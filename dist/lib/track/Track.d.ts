import { DataInput } from "./DataInput";
export declare const TRACK_INFO_VERSIONED = 1, TRACK_INFO_VERSION = 2;
export declare const decoders: Record<number, TrackInfoDecoder>;
export declare function decode(data: Uint8Array | string): TrackInfo | null;
export declare type TrackInfo = import("@lavaclient/types").TrackInfo & {
    version: number;
};
export declare type TrackInfoDecoder = (input: DataInput) => TrackInfo | null;
