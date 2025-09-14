import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema(
  {
    desc: { type: String },
    istrue: { type: Boolean },
  },
  { _id: false }
);

const CreditReportSchema = new mongoose.Schema(
  {
    userId: { type: String },
    isEmailSent: { type: Boolean, default: false },
    preferLanguage: { type: String, default: "en" },
    sessionId: { type: String, default: "" },
    summary: {
      score: Number,
      rating: String,
      tradelines: {
        revolving: { type: Number, default: 0 },
        installment: { type: Number, default: 0 },
        open: { type: Number, default: 0 },
        mortgage: { type: Number, default: 0 },
      },
      paymentHistory: {
        // allCurrent: Boolean,
        missedOrLatePast24Months: Number,
      },
      inquiries: {
        total: String,
        hard: [
          {
            _id: false,
            date: {
              type: String,
            },
            lender: {
              type: String,
            },
            // type: {
            //   type: String,
            // },
            // affectsScore: {
            //   type: Boolean,
            // },
          },
        ],
        soft: [
          {
            _id: false,
            date: {
              type: String,
            },
            lender: {
              type: String,
            },
            // type: {
            //   type: String,
            // },
            // affectsScore: {
            //   type: Boolean,
            // },
          },
        ],
      },
      // collections: Number,
      // judgments: Number,
      creditUtilization: {
        totalLimit: Number, //discuss
        totalBalance: Number, //discuss
        utilizationRate: Number,
        rating: String, //discuss
      },
      creditAge: {
        oldest: { type: mongoose.Schema.Types.Mixed },
        newest: { type: mongoose.Schema.Types.Mixed },
        averageAgeYears: Number,
      },
    },
    accountsAndBalances: [
      {
        _id: false,
        type: { type: String },
        lender: { type: String },
        openDate: { type: String },
        limit: { type: Number },
        balance: { type: Number },
        status: { type: String },
        closed: { type: Boolean },
        pastDue: { type: Number },
      },
    ],
    // publicRecords: {
    //   collections: { type: Number },
    //   judgments: { type: Number },
    // },
    // securedLoan: {
    //   lender: { type: String },
    //   registered: { type: String },
    //   amount: { type: Number, min: 0 },
    //   maturity: { type: String },
    // },
    creditEvaluation: {
      utilization: { type: String },
      creditMix: { type: String },
      paymentHistory: { type: String },
      delinquency: { type: String },
      inquiryFrequency: { type: String },
      derogatoryMarks: { type: String },
      fileDepth: { type: String },
      strengths: { type: Array },
      areaOfImprovements: { type: Array },
    },
    scoreForecast: [
      {
        _id: false,
        action: { type: String },
        estimatedImpact: { type: String },
        timeline: { type: String },
        priority: { type: String },
        confidence: { type: String },
      },
    ],
    scoreChanges: [
      {
        _id: false,
        estimatedImpact: { type: String },
        timeline: { type: String }
      },
    ],
    // actionPlan: [
    //   {
    //     _id: false,
    //     recommendation: { type: String },
    //     description: { type: String },
    //     priority: { type: String },
    //     timeline: { type: String },
    //   },
    // ],
    disputeToolkit: {
      disputeLetter: { type: String },
      goodwillScript: { type: String },
    },
    scoreProgress: {
      creditSummary: {
        onTimePayments: { type: String },
        activeAccounts: { type: Number },
        // derogatoryMarks: { type: Number },
      },
      scoreSimulator: [{ type: mongoose.Schema.Types.Mixed }],
      target: { type: String },
      checklist: {
        payCTB1: checklistItemSchema,
        keepCIBCOpen: checklistItemSchema,
        requestCLI: checklistItemSchema,
        reportRent: checklistItemSchema,
        avoidApplications: checklistItemSchema,
      },
      forecastChart: {
        dataPoints: [{ type: mongoose.Schema.Types.Mixed }],
        // targetScore: { type: Number },
        // targetDate: { type: String },
      },
    },
    reminders: [
      {
        _id: false,
        event: { type: String },
        reminderDate: { type: String },
        action: { type: String },
      },
    ],
    // improvementPotential: {type: Number },
    // rating: { type: String },
    // score: {type: Number },
    // keyAreasForImprovement: [
    //   {
    //     _id: false,
    //     title: { type: String },
    //     priority: { type: String },
    //   },
    // ],
    // filePath: { type: String }
  },
  { timestamps: true }
);
export default mongoose.model("CreditReport", CreditReportSchema);
