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
        hasPassword: {
            type: Boolean,
            default: false,
        },
        passwordLastChanged: {
            type: Date,
            default: null,
        },
        passwordRotationIntervalDays: {
            type: Number,
            default: 90,
            min: 7,
            max: 365,
        },
        rotationReminderEnabled: {
            type: Boolean,
            default: true,
        },
        lastRotationReminderSent: {
            type: Date,
            default: null,
        },
        credential: {
            encryptedPassword: {
                type: String,
                select: false,
                default: null,
            },
            iv: {
                type: String,
                select: false,
                default: null,
            },
            authTag: {
                type: String,
                select: false,
                default: null,
            },
            keyVersion: {
                type: Number,
                select: false,
                default: 1,
            },
        },
    },
    { timestamps: true }
);

// Compound index for user-scoped service searches and chronologically sorted queries
accountSchema.index({ user: 1, serviceName: 1 });
accountSchema.index({ user: 1, createdAt: -1 });

const Account = mongoose.model("Account", accountSchema);
export default Account;
