// models/Story.ts
import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const StorySchema = new Schema(
  {
    authorName: { type: String, required: true, trim: true, index: true },
    authorEmail: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    authorEmailRaw: { type: String, trim: true },

    textMarkdown: { type: String, required: true },
    textPlain: { type: String, required: true },
    storyLines: [{ type: String }],
    paragraphCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    hasSalutation: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    source: { type: String, default: "import:stories.txt" },
    seed: { type: Number, index: true },
    flowerId: { type: Schema.Types.ObjectId, ref: "Flower" },

    textHash32: { type: Number, index: true },
    uniqueKey: { type: String, unique: true },

    importedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

StorySchema.index({ authorName: 1, textHash32: 1 }, { unique: true });

export type StoryDoc = InferSchemaType<typeof StorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export type StoryModel = Model<StoryDoc>;

export const Story: StoryModel =
  (mongoose.models.Story as StoryModel) || mongoose.model<StoryDoc>("Story", StorySchema);
