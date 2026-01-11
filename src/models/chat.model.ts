// src/models/Chat.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  participants: string[]; // User IDs
  type: 'individual' | 'group';
  
  // Last message preview (encrypted)
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Date;
  };
  
  // Group chat specific
  name?: string;
  icon?: string;
  admins?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>({
  participants: [{
    type: String,
    required: true
  }],
  type: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual'
  },
  lastMessage: {
    text: String,
    senderId: String,
    timestamp: Date
  },
  name: String,
  icon: String,
  admins: [String]
}, {
  timestamps: true
});

// Index for finding chats by participant
ChatSchema.index({ participants: 1 });

export default mongoose.model<IChat>('Chat', ChatSchema);