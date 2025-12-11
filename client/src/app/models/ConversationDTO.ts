export interface ConversationDTO {
    id: number;
    participants: any[];
    lastMessageAt: Date;
    previewMessage: string;
    unreadCount: number;
    title: string;
}
