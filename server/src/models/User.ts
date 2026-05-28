import { Schema, model } from 'mongoose';

export interface IUser {
  username: string;
  email: string;
  passwordHash: string;
  highscore: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    highscore: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
