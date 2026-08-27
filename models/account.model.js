import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Account user is required"],
            index: true,
        },
        serviceName: {
            type: String,
            required: [true, "Service name is required"],
            trim: true,
            minlength: 1,
            maxlength: 100,
        },
        username: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },
        website: {
            type: String,
            trim: true,
            maxlength: 255,
            default: "",
        },
        category: {
            type: String,
            lowercase: true,
            trim: true,
            enum: [
                "streaming",
                "software",
                "gaming",
                "finance",
                "social",
                "utilities",
                "productivity",
                "cloud",
                "other",
            ],
            default: "other",
        },
        tags: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                },
            ],
            default: [],
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
    },
    { timestamps: true }
);

// Compound index for user-scoped service searches and chronologically sorted queries
accountSchema.index({ user: 1, serviceName: 1 });
accountSchema.index({ user: 1, createdAt: -1 });

const Account = mongoose.model("Account", accountSchema);
export default Account;
