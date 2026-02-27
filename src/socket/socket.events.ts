
export const SOCKET_EVENTS = {
    // Connection
    CONNECT: "connect",
    DISCONNECT: "disconnect",

    // Chat room
    JOIN_CHAT: "chat:join",
    LEAVE_CHAT: "chat:leave",

    // Messages
    MESSAGE_SEND: "message:send",
    MESSAGE_NEW: "message:new",
    MESSAGE_DELIVERED: "message:delivered",
    MESSAGE_READ: "message:read",
    MESSAGE_READ_ALL: "message:read_all",
    MESSAGE_DELETED: "message:deleted",
    MESSAGE_EDITED: "message:edited",

    // Typing
    TYPING_START: "typing:start",
    TYPING_STOP: "typing:stop",


    // Online status
    USER_ONLINE_STATUS: "user:online_status",

    // Errors
    ERROR: "error",
} as const;

export type SOCKET_EVENT = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]