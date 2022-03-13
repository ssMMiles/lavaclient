"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getId = void 0;
function getId(value) {
    return typeof value === "string" ? value : value.id;
}
exports.getId = getId;
