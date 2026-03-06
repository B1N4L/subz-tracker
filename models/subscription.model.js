import mongoose from "mongoose";

const subscriptionSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true,'subscription name is required'],
        trim: true,
        unique: false,
        minlength: 2,
        maxlength: 50,
    },
    price: {
        type: Number,
        required: [true,'subscription price is required'],
        min:[0, 'Price must be a positive integer'],
        max:[1000000, 'Price must be a positive integer'],
        currency: {
            type: String,
            enum: ['EUR', 'GBP', 'USD', 'LKR'],
            default: 'USD',
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
        },
        category: {
            type: String,
            enum: ['sports', 'news', 'entertainment', 'lifestyle', 'technology', 'finance', 'political', 'other'],
            required: true,
        }
    },
    paymentMethod: {
        type: String,
        required: [true,'paymentMethod is required'],
        trim: true,
        minlength: 2,
        maxlength: 20,
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'expired'],
        default: 'active',
    },
    startDate: {
        type: Date,
        required: true,
        validate: {
            validator: (value) => value <= new Date(), //checking whether the given date is lower/equal to current date
            message: 'Start date in must be in the past',
        }
    },
    renewalDate: {
        type: Date,
        required: true,
        validate: {
            //wrapping in an arrow function to work with .this
            validator: function (value) {
                return value > this.startDate; //checking whether the given date is lower/equal to current date
            },
            message: 'Renewal date in must be after start date',
        }
    },

    //user who is subscribed
    type: mongoose.Schema.Types.ObjectId, //user will be a reference to the user model
    ref: "User",
    required: [true, 'subscribed user is required'],
    index: true, //optimize queries to by indexing the user field
}, {timestamps: true});

//call certain actions before document SAVE action
subscriptionSchema.pre ( 'save', function (next) {
//auto calculates the renewal date if missing.
    if(!this.renewalDate){
        const renewalPeriods = {
            daily: 1,
            weekly: 7,
            monthly: 30,
            yearly: 365,
        };
        this.renewalDate = new Date(this.startDate);
        // giving custom renewal periods(renewalDate) based on frequency attribute user given.
        // eg: if startDate= jan 1st and frequency= Monthly -> renewalDate= jan 31st.
        this.renewalDate.setDate(this.renewalDate.getDate() + renewalPeriods[this.frequency]);
    }

    // Auto-update status attribute if renewal date has passed.
    if (this.renewalDate<new Date()) {
        this.status = 'expired';
    }

    next();
} )

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;