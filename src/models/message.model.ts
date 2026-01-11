// src/models/Message.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: string;
  senderId: string;
  senderDeviceId: string;
  recipientId: string;
  recipientDeviceId?: string;
  
  // Encrypted content
  ciphertext: string;
  nonce: string;
  
  // Metadata (not encrypted)
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  timestamp: Date;
  
  // Delivery status
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: Date;
  readAt?: Date;
  
  // For device sync
  isDeviceSync: boolean;
}

const MessageSchema = new Schema<IMessage>({
  chatId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  senderDeviceId: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  recipientDeviceId: String,
  ciphertext: {
    type: String,
    required: true
  },
  nonce: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: Date,
  readAt: Date,
  isDeviceSync: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
MessageSchema.index({ chatId: 1, timestamp: -1 });
MessageSchema.index({ recipientId: 1, status: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);